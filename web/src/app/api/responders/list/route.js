import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let responders;

    if (type) {
      responders = await sql`
        SELECT r.*, 
               res.resource_type,
               res.available_count,
               res.total_count
        FROM responders r
        LEFT JOIN resources res ON r.id = res.responder_id
        WHERE r.type = ${type}
        ORDER BY r.name ASC
      `;
    } else {
      responders = await sql`
        SELECT r.*,
               res.resource_type,
               res.available_count,
               res.total_count
        FROM responders r
        LEFT JOIN resources res ON r.id = res.responder_id
        ORDER BY r.type, r.name ASC
      `;
    }

    // Group resources by responder
    const responderMap = new Map();

    responders.forEach((row) => {
      if (!responderMap.has(row.id)) {
        responderMap.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.type,
          specialty: row.specialty,
          latitude: row.latitude,
          longitude: row.longitude,
          available: row.available,
          skills: row.skills,
          currentCapacity: row.current_capacity,
          maxCapacity: row.max_capacity,
          resources: [],
        });
      }

      if (row.resource_type) {
        responderMap.get(row.id).resources.push({
          type: row.resource_type,
          available: row.available_count,
          total: row.total_count,
        });
      }
    });

    return Response.json({
      responders: Array.from(responderMap.values()),
    });
  } catch (error) {
    console.error("Error listing responders:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
