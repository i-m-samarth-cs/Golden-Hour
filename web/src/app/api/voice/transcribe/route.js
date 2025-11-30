// Eleven Labs Voice API integration for transcription
const ELEVEN_LABS_API_KEY =
  "sk_69a7d19910af18d451c7d5768e20b3ffabb043d150460e09";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      return Response.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    // Convert audio to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use Eleven Labs Speech-to-Text API
    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_LABS_API_KEY,
          "Content-Type": "audio/mpeg",
        },
        body: buffer,
      },
    );

    if (!response.ok) {
      throw new Error(`Eleven Labs API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Analyze emotion from transcript
    const transcript = data.text || "";
    const emotionalCues = {
      panic: ["help", "please", "hurry", "dying", "can't breathe", "emergency"],
      pain: ["hurts", "pain", "ache", "burning", "stabbing"],
      confused: ["don't know", "not sure", "maybe", "think"],
    };

    let emotionalState = "calm";
    const lowerTranscript = transcript.toLowerCase();

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

    return Response.json({
      transcript,
      emotionalState,
      confidence: data.confidence || 0.9,
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return Response.json(
      {
        error: error.message,
        fallback: true,
        transcript: "Emergency assistance needed",
        emotionalState: "unknown",
      },
      { status: 500 },
    );
  }
}
