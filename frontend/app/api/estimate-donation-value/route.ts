import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, title, description, category } = await request.json();

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

    // Extract mime type and base64 data from data URL if needed
    let mimeType = "image/jpeg";
    let base64Image = imageBase64;

    if (imageBase64 && imageBase64.includes(",")) {
      const [header, data] = imageBase64.split(",");
      base64Image = data;
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }

    // Build the prompt with text information
    const textInfo = `
Title: ${title || "Not provided"}
Description: ${description || "Not provided"}
${category ? `Category: ${category}` : ""}
`.trim();

    // Prepare the request body
    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: `Analyze this donation item and estimate its approximate dollar value on the LOWER end (conservative estimate).

${textInfo}

${
  imageBase64
    ? "An image of the item is provided below."
    : "No image provided - base your estimate on the text description only."
}

IMPORTANT RULES FOR estimated_value:
- Estimate the approximate dollar value of the item on the LOWER end (conservative estimate)
- Consider the item's condition, age, and market value based on:
  * The title and description provided
  * ${imageBase64 ? "The image provided" : "The text description only"}
  * The category (if provided)
- Return a number (e.g., 5, 10, 25, 50, 100) - do not include dollar signs or currency symbols
- For items with no significant value (e.g., free items, very worn items), return 0
- Be conservative - estimate on the lower end

Respond with ONLY a JSON object in this exact format:
{
  "estimated_value": <number>
}

Example responses:
- A used book in good condition: {"estimated_value": 5}
- A piece of furniture in fair condition: {"estimated_value": 25}
- Electronics in working condition: {"estimated_value": 50}
- Food items: {"estimated_value": 10}
- Very worn or damaged items: {"estimated_value": 0}`,
            },
          ],
        },
      ],
    };

    // Add image if provided
    if (imageBase64 && base64Image) {
      // Validate image size (Gemini has limits)
      const imageSizeInBytes = (base64Image.length * 3) / 4;
      const maxSizeInMB = 4;
      if (imageSizeInBytes > maxSizeInMB * 1024 * 1024) {
        return NextResponse.json(
          {
            error: `Image is too large. Maximum size is ${maxSizeInMB}MB.`,
          },
          { status: 400 }
        );
      }

      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Image,
        },
      });
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

      // Ensure estimated_value is always present (default to 0 if missing)
      if (!jsonData.hasOwnProperty("estimated_value")) {
        jsonData.estimated_value = 0;
      }

      // Ensure estimated_value is a number
      if (typeof jsonData.estimated_value !== "number") {
        jsonData.estimated_value = parseFloat(jsonData.estimated_value) || 0;
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract value manually
      console.warn("Failed to parse JSON, attempting manual extraction");
      const valueMatch = text.match(/"estimated_value":\s*(\d+(?:\.\d+)?)/);
      const estimatedValue = valueMatch ? parseFloat(valueMatch[1]) || 0 : 0;

      jsonData = {
        estimated_value: estimatedValue,
      };
    }

    console.log(
      "Gemini value estimation response:",
      JSON.stringify(jsonData, null, 2)
    );

    return NextResponse.json(jsonData);
  } catch (error) {
    console.error("Error estimating donation value:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
