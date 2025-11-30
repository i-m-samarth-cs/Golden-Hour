import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let emergencies;

    if (status && status !== "all") {
      emergencies = await sql`
        SELECT 
          e.*,
          p.name as patient_name,
          p.age as patient_age,
          p.blood_type,
          p.allergies,
          r1.name as ambulance_name,
          r1.type as ambulance_type,
          r2.name as hospital_name,
          r2.type as hospital_type
        FROM emergencies e
        LEFT JOIN patients p ON e.patient_did = p.patient_did
        LEFT JOIN responders r1 ON e.assigned_responder_id = r1.id
        LEFT JOIN responders r2 ON e.assigned_hospital_id = r2.id
        WHERE e.status = ${status}
        ORDER BY e.created_at DESC
      `;
    } else {
      emergencies = await sql`
        SELECT 
          e.*,
          p.name as patient_name,
          p.age as patient_age,
          p.blood_type,
          p.allergies,
          r1.name as ambulance_name,
          r1.type as ambulance_type,
          r2.name as hospital_name,
          r2.type as hospital_type
        FROM emergencies e
        LEFT JOIN patients p ON e.patient_did = p.patient_did
        LEFT JOIN responders r1 ON e.assigned_responder_id = r1.id
        LEFT JOIN responders r2 ON e.assigned_hospital_id = r2.id
        ORDER BY e.created_at DESC
        LIMIT 50
      `;
    }

    return Response.json({ emergencies });
  } catch (error) {
    console.error("Error listing emergencies:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
