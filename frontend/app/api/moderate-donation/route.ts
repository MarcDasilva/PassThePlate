import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { title, description, category, imageBase64 } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

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

    // Build the prompt for content moderation
    let prompt = `You are a content moderation system for a donation platform. Analyze the following donation posting and determine if it is acceptable or malicious/troll content.

Donation Details:
- Title: "${title}"
- Description: "${description}"
${category ? `- Category: "${category}"` : ""}

Rules for acceptable donations:
1. Must be a legitimate item that can be donated (food, clothing, furniture, electronics, books, etc.)
2. Must not contain offensive, hateful, or inappropriate content
3. Must not be spam, scams, or fake listings
4. Must not contain personal attacks or harassment
5. Must be relevant to the donation platform purpose
6. Must not contain profanity or explicit content
7. Must not be a joke, prank, or trolling attempt

Respond with ONLY a JSON object in this exact format:
{
  "isAcceptable": true or false,
  "reason": "Brief explanation (only if isAcceptable is false)"
}

If the donation is acceptable, set isAcceptable to true and reason to an empty string.
If the donation is malicious, trolling, or inappropriate, set isAcceptable to false and provide a brief reason.`;

    // Prepare request body
    const requestBody: any = {
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

    // If image is provided, add it to the analysis
    if (imageBase64) {
      let mimeType = "image/jpeg";
      let base64Image = imageBase64;

      if (imageBase64.includes(",")) {
        const [header, data] = imageBase64.split(",");
        base64Image = data;
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Image,
        },
      });

      // Update prompt to include image analysis
      requestBody.contents[0].parts[0].text = `You are a content moderation system for a donation platform. Analyze the following donation posting including the image and determine if it is acceptable or malicious/troll content.

Donation Details:
- Title: "${title}"
- Description: "${description}"
${category ? `- Category: "${category}"` : ""}
- Image: (analyze the uploaded image)

Rules for acceptable donations:
1. Must be a legitimate item that can be donated (food, clothing, furniture, electronics, books, etc.)
2. Must not contain offensive, hateful, or inappropriate content
3. Must not be spam, scams, or fake listings
4. Must not contain personal attacks or harassment
5. Must be relevant to the donation platform purpose
6. Must not contain profanity or explicit content
7. Must not be a joke, prank, or trolling attempt
8. Image must match the description and show a real, donatable item
9. Image must not contain inappropriate, offensive, or fake content

Respond with ONLY a JSON object in this exact format:
{
  "isAcceptable": true or false,
  "reason": "Brief explanation (only if isAcceptable is false)"
}

If the donation is acceptable, set isAcceptable to true and reason to an empty string.
If the donation is malicious, trolling, or inappropriate, set isAcceptable to false and provide a brief reason.`;
    }

    // Try different model endpoints
    const modelsToTry = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${apiKey}`,
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

    // Try to extract JSON from the response
    let jsonData;
    try {
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      jsonData = JSON.parse(cleanedText);
    } catch (parseError) {
      // If JSON parsing fails, try to extract fields manually
      console.warn("Failed to parse JSON, attempting manual extraction");
      const acceptableMatch = text.match(/"isAcceptable":\s*(true|false)/i);
      const reasonMatch = text.match(/"reason":\s*"([^"]*)"/);

      jsonData = {
        isAcceptable: acceptableMatch
          ? acceptableMatch[1].toLowerCase() === "true"
          : true, // Default to acceptable if we can't parse
        reason: reasonMatch ? reasonMatch[1] : "",
      };
    }

    // Ensure the response has the correct structure
    if (typeof jsonData.isAcceptable !== "boolean") {
      jsonData.isAcceptable = true; // Default to acceptable
    }

    return NextResponse.json(jsonData);
  } catch (error) {
    console.error("Error moderating donation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

