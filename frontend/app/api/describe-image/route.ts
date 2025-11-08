import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
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

    // Extract mime type and base64 data from data URL
    let mimeType = "image/jpeg"; // default
    let base64Image = imageBase64;

    if (imageBase64.includes(",")) {
      const [header, data] = imageBase64.split(",");
      base64Image = data;
      // Extract mime type from data URL header (e.g., "data:image/png;base64")
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }

    // Validate image size (Gemini has limits)
    const imageSizeInBytes = (base64Image.length * 3) / 4;
    const maxSizeInMB = 4; // Gemini 1.5 Flash supports up to ~4MB
    if (imageSizeInBytes > maxSizeInMB * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `Image is too large. Maximum size is ${maxSizeInMB}MB. Please compress or resize your image.`,
        },
        { status: 400 }
      );
    }

    // Prepare the request body
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Analyze this image of a donation item and provide a JSON response with the following structure. You MUST include all fields, including expiry_date:
{
  "title": "A short, descriptive title (max 50 characters)",
  "description": "A brief description of the item and its condition (1-2 sentences)",
  "category": "A single category name (e.g., "Food", "Clothing", "Furniture", "Electronics", "Books", "Toys", "Household Items")",
  "expiry_date": "YYYY-MM-DD format date OR null"
}

IMPORTANT RULES FOR expiry_date:
- If the item is perishable food (fresh produce, dairy, meat, baked goods, etc.), predict when it will expire based on:
  * The item type and typical shelf life
  * Visible condition (freshness, packaging, expiration labels if visible)
  * Today's date is ${new Date().toISOString().split("T")[0]}
  * Return a future date in YYYY-MM-DD format (e.g., "2024-12-25")
- If the item is non-perishable (canned goods, dry goods, clothing, furniture, electronics, etc.), return null
- ALWAYS include the expiry_date field in your JSON response (either a date string or null)

Be specific and helpful. Focus on what the item is, its condition, and why someone would want it.`,
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    };

    // Try different model endpoints - using models that support vision
    // Gemini 1.5 models are deprecated, using Gemini 2.5 models instead
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
          break; // Success, exit loop
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

    // Check for errors in response
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
      // Remove markdown code blocks if present
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      jsonData = JSON.parse(cleanedText);

      // Ensure expiry_date is always present (even if null)
      if (!jsonData.hasOwnProperty("expiry_date")) {
        jsonData.expiry_date = null;
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract fields manually
      console.warn("Failed to parse JSON, attempting manual extraction");
      const titleMatch = text.match(/"title":\s*"([^"]+)"/);
      const descMatch = text.match(/"description":\s*"([^"]+)"/);
      const catMatch = text.match(/"category":\s*"([^"]+)"/);

      // Improved regex to match expiry_date as string or null
      const expiryStringMatch = text.match(/"expiry_date":\s*"([^"]+)"/);
      const expiryNullMatch = text.match(/"expiry_date":\s*null/);

      let expiryDate = null;
      if (expiryStringMatch && expiryStringMatch[1]) {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(expiryStringMatch[1])) {
          expiryDate = expiryStringMatch[1];
        }
      } else if (expiryNullMatch) {
        expiryDate = null;
      }

      jsonData = {
        title: titleMatch ? titleMatch[1] : "",
        description: descMatch ? descMatch[1] : "",
        category: catMatch ? catMatch[1] : "",
        expiry_date: expiryDate,
      };
    }

    return NextResponse.json(jsonData);
  } catch (error) {
    console.error("Error describing image:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
