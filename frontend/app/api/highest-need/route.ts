import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Get ML API URL from environment variable
    const mlApiUrl =
      process.env.NEXT_PUBLIC_ML_API_URL || "http://18.209.63.122:8000";

    // Fetch from ML API
    const response = await fetch(`${mlApiUrl}/highest-need`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Server-side fetch doesn't have CORS issues
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ML API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch highest need location", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Store/update prediction in Supabase
    try {
      const supabase = await createClient();

      // Check if prediction already exists for this location
      const { data: existingPrediction, error: fetchError } = await supabase
        .from("ml_predictions")
        .select("*")
        .eq("latitude", data.latitude)
        .eq("longitude", data.longitude)
        .single();

      // Check if prediction has changed (different location or different data)
      const hasChanged =
        !existingPrediction ||
        existingPrediction.predicted_need_score !== data.predicted_need_score ||
        existingPrediction.confidence !== data.confidence ||
        existingPrediction.month !== data.month ||
        existingPrediction.season !== data.season ||
        existingPrediction.location_name !== (data.location_name || "");

      if (hasChanged || fetchError?.code === "PGRST116") {
        // Use upsert to insert or update based on latitude/longitude
        const { error: dbError } = await supabase.from("ml_predictions").upsert(
          {
            latitude: data.latitude,
            longitude: data.longitude,
            location_name: data.location_name || "",
            predicted_need_score: data.predicted_need_score,
            confidence: data.confidence,
            month: data.month,
            season: data.season,
            food_insecurity_rate: data.food_insecurity_rate ?? null,
            poverty_rate: data.poverty_rate ?? null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "latitude,longitude",
            ignoreDuplicates: false,
          }
        );

        if (dbError) {
          console.error("Error storing ML prediction in Supabase:", dbError);
          // Don't fail the request if DB storage fails, just log it
        } else {
          console.log(
            existingPrediction
              ? "ML prediction updated in Supabase"
              : "ML prediction stored in Supabase"
          );
        }
      } else {
        console.log("ML prediction unchanged, skipping update");
      }
    } catch (dbError: any) {
      console.error("Error storing ML prediction:", dbError);
      // Don't fail the request if DB storage fails
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching highest need location:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch highest need location",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
