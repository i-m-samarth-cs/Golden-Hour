import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const emergencies = await sql`
      SELECT 
        e.*,
        p.name as patient_name,
        p.age as patient_age,
        p.blood_type,
        p.allergies,
        p.medical_conditions,
        p.emergency_contact,
        r1.name as ambulance_name,
        r1.latitude as ambulance_lat,
        r1.longitude as ambulance_lng,
        r2.name as hospital_name,
        r2.latitude as hospital_lat,
        r2.longitude as hospital_lng
      FROM emergencies e
      LEFT JOIN patients p ON e.patient_did = p.patient_did
      LEFT JOIN responders r1 ON e.assigned_responder_id = r1.id
      LEFT JOIN responders r2 ON e.assigned_hospital_id = r2.id
      WHERE e.id = ${id}
    `;

    if (emergencies.length === 0) {
      return Response.json({ error: "Emergency not found" }, { status: 404 });
    }

    // Get agent logs for this emergency
    const logs = await sql`
      SELECT * FROM agent_log 
      WHERE emergency_id = ${id} 
      ORDER BY timestamp ASC
    `;

    // Get follow-up tasks
    const tasks = await sql`
      SELECT * FROM follow_up_tasks 
      WHERE emergency_id = ${id}
      ORDER BY created_at ASC
    `;

    return Response.json({
      emergency: emergencies[0],
      agentLogs: logs,
      followUpTasks: tasks,
    });
  } catch (error) {
    console.error("Error getting emergency:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
