import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { descriptions } = await request.json();

    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return NextResponse.json(
        { error: "Descriptions array is required" },
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

    // Combine all descriptions into a single text
    const combinedDescriptions = descriptions.join("\n\n");

    // Create prompt for Gemini to estimate statistics
    const prompt = `Based on the following donation request descriptions, estimate the following statistics:

Descriptions:
${combinedDescriptions}

Please provide estimates in JSON format with the following structure:
{
  "totalRequestsLast4Weeks": <number>,
  "donationGoalUSD": <number>,
  "peopleHelped": <number>
}

Guidelines:
- totalRequestsLast4Weeks: Estimate how many requests would have been made in the last 4 weeks based on the current requests (consider typical request frequency)
- donationGoalUSD: Estimate the total dollar amount needed to fulfill these requests (consider typical item costs, quantities needed, etc.)
- peopleHelped: Estimate how many people would be helped by fulfilling these requests (consider family sizes, community impact, etc.)

Return ONLY valid JSON, no additional text or explanation.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      return NextResponse.json(
        { error: "Failed to get estimates from Gemini API" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const responseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!responseText) {
      return NextResponse.json(
        { error: "No response from Gemini API" },
        { status: 500 }
      );
    }

    // Extract JSON from response (might have markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    try {
      const estimates = JSON.parse(jsonText);
      
      // Validate and return estimates
      return NextResponse.json({
        totalRequestsLast4Weeks: estimates.totalRequestsLast4Weeks || 0,
        donationGoalUSD: estimates.donationGoalUSD || 0,
        peopleHelped: estimates.peopleHelped || 0,
      });
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Response text:", jsonText);
      return NextResponse.json(
        { error: "Failed to parse estimates from API response" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error estimating statistics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to estimate statistics" },
      { status: 500 }
    );
  }
}

