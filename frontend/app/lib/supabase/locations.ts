import { createClient } from "./client";

export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  location_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get location name for a coordinate pair from the database
 */
export async function getLocationName(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("location_name")
    .eq("latitude", latitude)
    .eq("longitude", longitude)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found - this is fine, we'll need to create it
      return null;
    }
    console.error("Error fetching location:", error);
    return null;
  }

  return data?.location_name || null;
}

/**
 * Get location names for multiple coordinate pairs from the database
 * Uses a more efficient batch query approach
 */
export async function getLocationNamesBatch(
  coordinates: Array<{ latitude: number; longitude: number }>
): Promise<Map<string, string>> {
  const supabase = createClient();
  const locationMap = new Map<string, string>();

  if (coordinates.length === 0) {
    return locationMap;
  }

  // Create a map of coordinate keys for quick lookup
  const coordKeys = new Set<string>();
  coordinates.forEach((coord) => {
    const key = `${coord.latitude},${coord.longitude}`;
    coordKeys.add(key);
  });

  // Fetch all locations in batches (Supabase has limits on OR conditions)
  // We'll fetch in chunks of 50 coordinates at a time
  const batchSize = 50;
  for (let i = 0; i < coordinates.length; i += batchSize) {
    const batch = coordinates.slice(i, i + batchSize);
    
    // Build OR conditions for this batch
    const orConditions = batch.map(
      (coord) => `and(latitude.eq.${coord.latitude},longitude.eq.${coord.longitude})`
    ).join(",");

    const { data, error } = await supabase
      .from("locations")
      .select("latitude, longitude, location_name")
      .or(orConditions);

    if (error) {
      console.error("Error fetching locations batch:", error);
      continue;
    }

    if (data) {
      data.forEach((location) => {
        const key = `${location.latitude},${location.longitude}`;
        locationMap.set(key, location.location_name);
      });
    }
  }

  return locationMap;
}

/**
 * Convert coordinates to location name using Gemini API and store in database
 */
export async function convertCoordinatesToLocationName(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const response = await fetch("/api/convert-coordinates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to convert coordinates");
    }

    const data = await response.json();
    return data.location_name;
  } catch (error) {
    console.error("Error converting coordinates:", error);
    // Fallback to coordinate string if conversion fails
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

/**
 * Get or create location name for coordinates
 * First checks database, then uses Gemini API if not found
 */
export async function getOrCreateLocationName(
  latitude: number,
  longitude: number
): Promise<string> {
  // First, try to get from database
  const cachedName = await getLocationName(latitude, longitude);
  if (cachedName) {
    return cachedName;
  }

  // If not found, use Gemini API to convert and store
  return await convertCoordinatesToLocationName(latitude, longitude);
}

