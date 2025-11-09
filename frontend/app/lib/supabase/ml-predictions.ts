import { createClient } from "./client";

export interface MLPrediction {
  id?: string;
  latitude: number;
  longitude: number;
  location_name: string;
  predicted_need_score: number;
  confidence: number;
  month: number;
  season: string;
  food_insecurity_rate?: number | null;
  poverty_rate?: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Store or update ML prediction in Supabase
 * Uses upsert to update if prediction for this location already exists
 */
export async function upsertMLPrediction(
  prediction: MLPrediction
): Promise<{ data: MLPrediction | null; error: any }> {
  const supabase = createClient();

  // Use upsert to insert or update based on latitude/longitude
  // We'll use a unique constraint on (latitude, longitude) to identify existing records
  const { data, error } = await supabase
    .from("ml_predictions")
    .upsert(
      {
        latitude: prediction.latitude,
        longitude: prediction.longitude,
        location_name: prediction.location_name,
        predicted_need_score: prediction.predicted_need_score,
        confidence: prediction.confidence,
        month: prediction.month,
        season: prediction.season,
        food_insecurity_rate: prediction.food_insecurity_rate ?? null,
        poverty_rate: prediction.poverty_rate ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "latitude,longitude",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting ML prediction:", error);
    return { data: null, error };
  }

  return { data: data as MLPrediction, error: null };
}

/**
 * Get the latest ML prediction for a location
 */
export async function getMLPrediction(
  latitude: number,
  longitude: number
): Promise<{ data: MLPrediction | null; error: any }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("ml_predictions")
    .select("*")
    .eq("latitude", latitude)
    .eq("longitude", longitude)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return { data: null, error: null };
    }
    console.error("Error getting ML prediction:", error);
    return { data: null, error };
  }

  return { data: data as MLPrediction, error: null };
}

/**
 * Get all ML predictions
 */
export async function getAllMLPredictions(): Promise<{
  data: MLPrediction[] | null;
  error: any;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("ml_predictions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error getting all ML predictions:", error);
    return { data: null, error };
  }

  return { data: (data || []) as MLPrediction[], error: null };
}
