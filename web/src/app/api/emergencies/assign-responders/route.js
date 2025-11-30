import sql from "@/app/api/utils/sql";
import crypto from "crypto";

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Role Assignment Agent: Match best responders based on skills, proximity, and availability
async function roleAssignmentAgent(emergency) {
  const { location_lat, location_lng, severity, symptoms } = emergency;

  // Determine required skills based on symptoms
  const requiredSkills = [];
  const lowerSymptoms = symptoms.toLowerCase();

  if (lowerSymptoms.includes("chest") || lowerSymptoms.includes("heart")) {
    requiredSkills.push("cardiac", "cardiac_care");
  }
  if (lowerSymptoms.includes("stroke") || lowerSymptoms.includes("head")) {
    requiredSkills.push("stroke", "head_trauma");
  }
  if (lowerSymptoms.includes("trauma") || lowerSymptoms.includes("injury")) {
    requiredSkills.push("trauma");
  }

  // Get available ambulances
  const ambulances = await sql`
    SELECT * FROM responders 
    WHERE type = 'ambulance' 
    AND available = true 
    AND current_capacity < max_capacity
  `;

  // Find closest ambulance with matching skills
  let bestAmbulance = null;
  let minDistance = Infinity;

  for (const ambulance of ambulances) {
    const distance = calculateDistance(
      location_lat,
      location_lng,
      ambulance.latitude,
      ambulance.longitude,
    );

    const ambulanceSkills = ambulance.skills || [];
    const hasRequiredSkill =
      requiredSkills.length === 0 ||
      requiredSkills.some((skill) => ambulanceSkills.includes(skill));

    if (hasRequiredSkill && distance < minDistance) {
      minDistance = distance;
      bestAmbulance = ambulance;
    }
  }

  // Get hospitals with available capacity
  const hospitals = await sql`
    SELECT r.*, res.available_count as beds_available
    FROM responders r
    LEFT JOIN resources res ON r.id = res.responder_id AND res.resource_type = 'emergency_bed'
    WHERE r.type = 'hospital'
    AND (res.available_count > 0 OR res.available_count IS NULL)
  `;

  // Find best hospital with matching specialty
  let bestHospital = null;
  let minHospitalDistance = Infinity;

  for (const hospital of hospitals) {
    const distance = calculateDistance(
      location_lat,
      location_lng,
      hospital.latitude,
      hospital.longitude,
    );

    const hospitalSkills = hospital.skills || [];
    const hasRequiredSkill =
      requiredSkills.length === 0 ||
      requiredSkills.some((skill) => hospitalSkills.includes(skill));

    if (hasRequiredSkill && distance < minHospitalDistance) {
      minHospitalDistance = distance;
      bestHospital = hospital;
    }
  }

  // Calculate ETA (assuming 60 km/h average speed for ambulance)
  const etaMinutes = bestAmbulance ? Math.ceil((minDistance / 60) * 60) : null;
  const estimatedArrival = etaMinutes
    ? new Date(Date.now() + etaMinutes * 60000).toISOString()
    : null;

  return {
    ambulance: bestAmbulance,
    hospital: bestHospital,
    ambulanceDistance: minDistance,
    hospitalDistance: minHospitalDistance,
    estimatedArrival,
    etaMinutes,
  };
}

// Resource Pooling Agent: Update resource availability
async function resourcePoolingAgent(hospitalId) {
  // Decrease available bed count
  await sql`
    UPDATE resources 
    SET available_count = available_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE responder_id = ${hospitalId} 
    AND resource_type = 'emergency_bed'
    AND available_count > 0
  `;

  // Get updated resource status
  const resources = await sql`
    SELECT * FROM resources 
    WHERE responder_id = ${hospitalId}
  `;

  return resources;
}

// Blockchain logger
async function logAgentAction(emergencyId, agentType, action, details) {
  const lastLog = await sql`
    SELECT current_hash FROM agent_log 
    WHERE emergency_id = ${emergencyId} 
    ORDER BY timestamp DESC 
    LIMIT 1
  `;

  const previousHash = lastLog.length > 0 ? lastLog[0].current_hash : null;
  const dataToHash = `${emergencyId}${agentType}${action}${JSON.stringify(details)}${Date.now()}`;
  const currentHash = crypto
    .createHash("sha256")
    .update(dataToHash)
    .digest("hex");

  await sql`
    INSERT INTO agent_log (emergency_id, agent_type, action, details, previous_hash, current_hash)
    VALUES (${emergencyId}, ${agentType}, ${action}, ${JSON.stringify(details)}, ${previousHash}, ${currentHash})
  `;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { emergencyId } = body;

    // Get emergency details
    const emergencies = await sql`
      SELECT * FROM emergencies WHERE id = ${emergencyId}
    `;

    if (emergencies.length === 0) {
      return Response.json({ error: "Emergency not found" }, { status: 404 });
    }

    const emergency = emergencies[0];

    // Role Assignment Agent: Find best responders
    const assignment = await roleAssignmentAgent(emergency);

    if (!assignment.ambulance) {
      return Response.json(
        {
          error: "No available ambulances found",
          hospital: assignment.hospital,
        },
        { status: 404 },
      );
    }

    // Update emergency with assignments
    await sql`
      UPDATE emergencies 
      SET assigned_responder_id = ${assignment.ambulance.id},
          assigned_hospital_id = ${assignment.hospital?.id || null},
          estimated_arrival_time = ${assignment.estimatedArrival},
          status = 'assigned',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${emergencyId}
    `;

    // Update ambulance availability
    await sql`
      UPDATE responders 
      SET current_capacity = current_capacity + 1,
          available = CASE WHEN current_capacity + 1 >= max_capacity THEN false ELSE true END
      WHERE id = ${assignment.ambulance.id}
    `;

    // Log role assignment
    await logAgentAction(
      emergencyId,
      "role_assignment_agent",
      "responders_assigned",
      {
        ambulance: assignment.ambulance.name,
        hospital: assignment.hospital?.name,
        distance: assignment.ambulanceDistance,
        eta: assignment.etaMinutes,
      },
    );

    // Resource Pooling Agent: Reserve hospital bed
    if (assignment.hospital) {
      const resources = await resourcePoolingAgent(assignment.hospital.id);

      await logAgentAction(
        emergencyId,
        "resource_pooling_agent",
        "resources_allocated",
        {
          hospital: assignment.hospital.name,
          resources: resources.map((r) => ({
            type: r.resource_type,
            available: r.available_count,
            total: r.total_count,
          })),
        },
      );
    }

    return Response.json({
      success: true,
      assignment: {
        ambulance: assignment.ambulance.name,
        hospital: assignment.hospital?.name,
        eta: `${assignment.etaMinutes} minutes`,
        distance: `${assignment.ambulanceDistance.toFixed(1)} km`,
      },
    });
  } catch (error) {
    console.error("Error assigning responders:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
