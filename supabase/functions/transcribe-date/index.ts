import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedDate {
  iso: string;
  display: string;
  day: number;
  month: number;
  year: number;
  confidence: "high" | "medium" | "low";
  interpretation: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // Step 1: Transcribe with Whisper
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile, "audio.webm");
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", "en");
    whisperFormData.append("prompt", "This is someone saying their date of birth. Examples: July 3rd 1987, the 25th of December 1995, March 2nd 2003, 15th of August 1990.");

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("Whisper API error:", whisperResponse.status, errorText);

      // Parse OpenAI error for user-friendly message
      let userMessage = "Voice transcription service is temporarily unavailable. Please use the date picker.";
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.code === "insufficient_quota") {
          userMessage = "Voice transcription is temporarily unavailable. Please use the date picker below.";
        }
      } catch { /* use default message */ }

      return new Response(JSON.stringify({
        success: false,
        error: userMessage,
        transcript: null,
        parsed: null,
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const whisperData = await whisperResponse.json();
    const transcript = whisperData.text;

    if (!transcript || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No speech detected. Please try again.",
        transcript: null,
        parsed: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Interpret with GPT-4 for accurate date parsing and verification
    const interpretResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a date parser for a birth date input system. Your job is to interpret what the user said and extract a valid birth date.

Rules:
1. The date MUST be in the past (before today's date)
2. The date should be a plausible birth date (between 1900 and today)
3. Handle various formats: "July 3rd 1987", "3rd of July 1987", "03/07/1987", "the 25th of December 1995", "March 2nd 03" (interpret 03 as 2003 if it makes sense as a birth year)
4. If the year is ambiguous (like "03"), interpret it as 2003 if that's a valid birth year, otherwise 1903
5. Be generous in interpretation but accurate in output

Respond with ONLY valid JSON in this exact format:
{
  "success": true/false,
  "day": number (1-31),
  "month": number (1-12),
  "year": number (4 digits),
  "confidence": "high"/"medium"/"low",
  "interpretation": "Brief explanation of how you interpreted the input",
  "error": "Only if success is false - explain what was unclear"
}

Today's date is ${new Date().toISOString().split('T')[0]}.`
          },
          {
            role: "user",
            content: `Parse this spoken date: "${transcript}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!interpretResponse.ok) {
      const errorText = await interpretResponse.text();
      console.error("GPT API error:", interpretResponse.status, errorText);
      return new Response(JSON.stringify({
        success: false,
        error: "Could not parse the date. Please use the date picker below.",
        transcript,
        parsed: null,
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const interpretData = await interpretResponse.json();
    const gptContent = interpretData.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(gptContent);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = gptContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse GPT response");
      }
    }

    if (!parsed.success) {
      return new Response(JSON.stringify({
        success: false,
        error: parsed.error || "Could not understand the date. Please try again.",
        transcript,
        parsed: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the parsed date
    const { day, month, year } = parsed;
    const date = new Date(year, month - 1, day);
    const today = new Date();

    if (isNaN(date.getTime())) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid date. Please try again.",
        transcript,
        parsed: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (date > today) {
      return new Response(JSON.stringify({
        success: false,
        error: "Birth date cannot be in the future.",
        transcript,
        parsed: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (year < 1900) {
      return new Response(JSON.stringify({
        success: false,
        error: "Please provide a birth year after 1900.",
        transcript,
        parsed: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format the response
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const display = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const result: ParsedDate = {
      iso,
      display,
      day,
      month,
      year,
      confidence: parsed.confidence,
      interpretation: parsed.interpretation,
    };

    return new Response(JSON.stringify({
      success: true,
      transcript,
      parsed: result,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || "Failed to process audio",
      transcript: null,
      parsed: null,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
