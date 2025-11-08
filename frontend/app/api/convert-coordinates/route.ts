import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Latitude and longitude must be numbers" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if location already exists in database
    const { data: existingLocation, error: fetchError } = await supabase
      .from("locations")
      .select("location_name")
      .eq("latitude", latitude)
      .eq("longitude", longitude)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "not found" which is fine
      console.error("Error fetching location:", fetchError);
    }

    if (existingLocation) {
      // Location already exists, return it
      return NextResponse.json({
        location_name: existingLocation.location_name,
        cached: true,
      });
    }

    // Use Gemini to convert coordinates to location name
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file.",
        },
        { status: 500 }
      );
    }

    const prompt = `Convert the following geographic coordinates to a human-readable location name.

Coordinates:
- Latitude: ${latitude}
- Longitude: ${longitude}

Please provide a location name in the format: "City, State/Province, Country" or similar format that clearly identifies the location.

Examples:
- "New York, NY, USA"
- "London, England, UK"
- "Tokyo, Japan"
- "Paris, France"

If the coordinates are in the ocean or a remote area, provide the nearest major location or a descriptive name.

Respond with ONLY the location name, nothing else. No explanations, no JSON, just the location name.`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    // Try different model endpoints
    const modelsToTry = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
    ];

    let response: Response | null = null;
    let lastError: string = "";

    for (const endpoint of modelsToTry) {
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          break;
        } else {
          try {
            const errorData = await response.json();
            lastError = errorData.error?.message || `HTTP ${response.status}`;
          } catch {
            const errorText = await response.text();
            lastError = errorText || `HTTP ${response.status}`;
          }
          console.warn(`Model endpoint failed: ${endpoint}`, lastError);
        }
      } catch (err: any) {
        lastError = err.message || "Network error";
        console.warn(`Model endpoint error: ${endpoint}`, err);
        continue;
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        {
          error:
            lastError ||
            "All model endpoints failed. Please check your API key and try again.",
        },
        { status: response?.status || 500 }
      );
    }

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API response error:", data.error);
      return NextResponse.json(
        { error: data.error.message || "API returned an error" },
        { status: 500 }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error(
        "No text in Gemini response:",
        JSON.stringify(data, null, 2)
      );
      return NextResponse.json(
        { error: "No response from AI. Please try again." },
        { status: 500 }
      );
    }

    // Clean up the response - remove any markdown, quotes, or extra whitespace
    const locationName = text
      .trim()
      .replace(/^["']|["']$/g, "") // Remove surrounding quotes
      .replace(/^```[\s\S]*?```/g, "") // Remove code blocks
      .trim();

    // Store the location in the database
    // First check if it exists, then update or insert
    const { data: existing, error: checkError } = await supabase
      .from("locations")
      .select("id")
      .eq("latitude", latitude)
      .eq("longitude", longitude)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" which is fine
      console.error("Error checking location:", checkError);
    }

    let insertError;
    if (existing) {
      // Update existing location
      const { error } = await supabase
        .from("locations")
        .update({ location_name: locationName })
        .eq("id", existing.id);
      insertError = error;
    } else {
      // Insert new location
      const { error } = await supabase
        .from("locations")
        .insert({
          latitude,
          longitude,
          location_name: locationName,
        });
      insertError = error;
    }

    if (insertError) {
      console.error("Error storing location:", insertError);
      // Still return the location name even if storage fails
    }

    return NextResponse.json({
      location_name: locationName,
      cached: false,
    });
  } catch (error) {
    console.error("Error converting coordinates:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

