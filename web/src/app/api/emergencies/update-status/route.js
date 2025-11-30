import sql from "@/app/api/utils/sql";
import crypto from "crypto";

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

// Follow-up Agent: Create automated tasks when emergency is resolved
async function createFollowUpTasks(emergency) {
  const tasks = [];

  // Schedule specialist consultation if needed
  if (emergency.severity === "critical" || emergency.severity === "high") {
    const consultDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    tasks.push({
      type: "specialist_consultation",
      scheduledDate: consultDate.toISOString(),
      details: {
        reason: `Follow-up for ${emergency.symptoms}`,
        severity: emergency.severity,
      },
    });
  }

  // Create EHR update task
  tasks.push({
    type: "ehr_update",
    scheduledDate: new Date().toISOString(),
    details: {
      emergency_id: emergency.id,
      diagnosis: emergency.symptoms,
      treatment_provided: "Emergency care",
    },
  });

  // Create insurance claim task
  tasks.push({
    type: "insurance_claim",
    scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    details: {
      emergency_type: emergency.severity,
      hospital: emergency.assigned_hospital_id,
    },
  });

  // Insert tasks into database
  for (const task of tasks) {
    await sql`
      INSERT INTO follow_up_tasks (
        emergency_id, 
        patient_did, 
        task_type, 
        scheduled_date, 
        details
      )
      VALUES (
        ${emergency.id},
        ${emergency.patient_did},
        ${task.type},
        ${task.scheduledDate},
        ${JSON.stringify(task.details)}
      )
    `;
  }

  return tasks;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { emergencyId, status } = body;

    // Valid statuses: 'active', 'assigned', 'in_transit', 'at_hospital', 'resolved'
    const validStatuses = [
      "active",
      "assigned",
      "in_transit",
      "at_hospital",
      "resolved",
    ];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get current emergency
    const emergencies = await sql`
      SELECT e.*, r.name as ambulance_name 
      FROM emergencies e
      LEFT JOIN responders r ON e.assigned_responder_id = r.id
      WHERE e.id = ${emergencyId}
    `;

    if (emergencies.length === 0) {
      return Response.json({ error: "Emergency not found" }, { status: 404 });
    }

    const emergency = emergencies[0];

    // Update status
    await sql`
      UPDATE emergencies 
      SET status = ${status}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${emergencyId}
    `;

    // Log status change
    await logAgentAction(emergencyId, "coordination_agent", "status_updated", {
      previousStatus: emergency.status,
      newStatus: status,
      timestamp: new Date().toISOString(),
    });

    // If resolved, create follow-up tasks
    if (status === "resolved") {
      const tasks = await createFollowUpTasks(emergency);

      await logAgentAction(emergencyId, "follow_up_agent", "tasks_created", {
        taskCount: tasks.length,
        tasks: tasks.map((t) => ({ type: t.type, scheduled: t.scheduledDate })),
      });

      // Release ambulance capacity
      if (emergency.assigned_responder_id) {
        await sql`
          UPDATE responders 
          SET current_capacity = GREATEST(current_capacity - 1, 0),
              available = true
          WHERE id = ${emergency.assigned_responder_id}
        `;
      }

      // Release hospital bed
      if (emergency.assigned_hospital_id) {
        await sql`
          UPDATE resources 
          SET available_count = LEAST(available_count + 1, total_count)
          WHERE responder_id = ${emergency.assigned_hospital_id} 
          AND resource_type = 'emergency_bed'
        `;
      }
    }

    return Response.json({
      success: true,
      status,
      followUpTasks:
        status === "resolved"
          ? await sql`
        SELECT * FROM follow_up_tasks WHERE emergency_id = ${emergencyId}
      `
          : [],
    });
  } catch (error) {
    console.error("Error updating emergency status:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
