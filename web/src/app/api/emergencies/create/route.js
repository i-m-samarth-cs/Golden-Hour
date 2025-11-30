import sql from "@/app/api/utils/sql";
import crypto from "crypto";

// Voice Agent: First contact triage and emotional assessment
async function voiceAgentTriage(symptoms, voiceTranscript) {
  // Simulate emotion detection from voice
  const emotionalCues = {
    panic: ["help", "please", "hurry", "dying", "can't breathe"],
    pain: ["hurts", "pain", "ache", "burning", "stabbing"],
    confused: ["don't know", "not sure", "maybe", "think"],
  };

  let emotionalState = "calm";
  const lowerTranscript = voiceTranscript.toLowerCase();

  if (emotionalCues.panic.some((word) => lowerTranscript.includes(word))) {
    emotionalState = "panic";
  } else if (
    emotionalCues.pain.some((word) => lowerTranscript.includes(word))
  ) {
    emotionalState = "pain";
  } else if (
    emotionalCues.confused.some((word) => lowerTranscript.includes(word))
  ) {
    emotionalState = "confused";
  }

  // Determine severity based on symptoms and emotional state
  const criticalSymptoms = [
    "chest pain",
    "can't breathe",
    "unconscious",
    "severe bleeding",
    "stroke",
  ];
  const highSymptoms = [
    "severe pain",
    "broken bone",
    "high fever",
    "head injury",
  ];

  let severity = "low";
  const lowerSymptoms = symptoms.toLowerCase();

  if (
    criticalSymptoms.some((s) => lowerSymptoms.includes(s)) ||
    emotionalState === "panic"
  ) {
    severity = "critical";
  } else if (
    highSymptoms.some((s) => lowerSymptoms.includes(s)) ||
    emotionalState === "pain"
  ) {
    severity = "high";
  } else {
    severity = "medium";
  }

  return { severity, emotionalState };
}

// Identity Agent: Create or retrieve patient identity
async function identityAgentProcess(patientData) {
  const {
    name,
    age,
    bloodType,
    allergies,
    medicalConditions,
    emergencyContact,
  } = patientData;

  // Generate decentralized identifier (DID) - in production this would use a proper DID protocol
  const patientDid = `did:zynd:${crypto.randomBytes(16).toString("hex")}`;

  // Check if patient exists, otherwise create
  const existingPatient = await sql`
    SELECT * FROM patients WHERE name = ${name} AND age = ${age}
  `;

  if (existingPatient.length > 0) {
    // Update consent to allow data sharing in emergency
    await sql`
      UPDATE patients 
      SET consent_status = true 
      WHERE patient_did = ${existingPatient[0].patient_did}
    `;
    return existingPatient[0].patient_did;
  }

  // Create new patient with consent granted
  await sql`
    INSERT INTO patients (patient_did, name, age, blood_type, allergies, medical_conditions, emergency_contact, consent_status)
    VALUES (${patientDid}, ${name}, ${age || null}, ${bloodType || null}, ${allergies || null}, ${medicalConditions || null}, ${emergencyContact || null}, true)
  `;

  return patientDid;
}

// Blockchain logger
async function logAgentAction(
  emergencyId,
  agentType,
  action,
  details,
  previousHash = null,
) {
  const dataToHash = `${emergencyId}${agentType}${action}${JSON.stringify(details)}${Date.now()}`;
  const currentHash = crypto
    .createHash("sha256")
    .update(dataToHash)
    .digest("hex");

  await sql`
    INSERT INTO agent_log (emergency_id, agent_type, action, details, previous_hash, current_hash)
    VALUES (${emergencyId}, ${agentType}, ${action}, ${JSON.stringify(details)}, ${previousHash}, ${currentHash})
  `;

  return currentHash;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { patientData, symptoms, voiceTranscript, location } = body;

    // Voice Agent: Perform triage
    const { severity, emotionalState } = await voiceAgentTriage(
      symptoms,
      voiceTranscript,
    );

    let hash = null;
    hash = await logAgentAction(
      null,
      "voice_agent",
      "initial_triage",
      {
        severity,
        emotionalState,
        symptoms,
      },
      hash,
    );

    // Identity Agent: Create/retrieve patient DID
    const patientDid = await identityAgentProcess(patientData);

    hash = await logAgentAction(
      null,
      "identity_agent",
      "patient_identified",
      {
        patientDid,
        consentGranted: true,
      },
      hash,
    );

    // Create emergency
    const emergency = await sql`
      INSERT INTO emergencies (
        patient_did, 
        status, 
        severity, 
        symptoms, 
        location_lat, 
        location_lng, 
        emotional_state, 
        voice_transcript
      )
      VALUES (
        ${patientDid},
        'active',
        ${severity},
        ${symptoms},
        ${location.lat},
        ${location.lng},
        ${emotionalState},
        ${voiceTranscript}
      )
      RETURNING *
    `;

    const emergencyId = emergency[0].id;

    // Update previous logs with emergency ID
    await sql`
      UPDATE agent_log 
      SET emergency_id = ${emergencyId} 
      WHERE emergency_id IS NULL 
      AND current_hash IN (
        SELECT current_hash FROM agent_log 
        WHERE emergency_id IS NULL 
        ORDER BY timestamp DESC 
        LIMIT 2
      )
    `;

    return Response.json({
      success: true,
      emergency: emergency[0],
      message: `Emergency created with ${severity} severity. Patient ${emotionalState === "panic" ? "appears distressed" : "stable"}. Assigning responders...`,
    });
  } catch (error) {
    console.error("Error creating emergency:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
