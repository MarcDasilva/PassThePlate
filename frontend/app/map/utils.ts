/**
 * Utility functions for map calculations
 */

import { Request } from "@/app/lib/supabase/requests";

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Group requests by location (within 50km radius)
 */
export function groupRequestsByLocation(requests: Request[]): Array<{
  lat: number;
  lng: number;
  count: number;
  requests: Request[];
}> {
  const groups: Array<{
    lat: number;
    lng: number;
    count: number;
    requests: Request[];
  }> = [];
  const processed = new Set<string>();

  requests.forEach((request) => {
    if (processed.has(request.id)) return;

    // Find all requests within 50km of this request
    const nearbyRequests = requests.filter((r) => {
      const distance = calculateDistance(
        request.latitude,
        request.longitude,
        r.latitude,
        r.longitude
      );
      return distance <= 50; // 50km radius
    });

    // Mark all nearby requests as processed
    nearbyRequests.forEach((r) => processed.add(r.id));

    // Calculate center point (average of all nearby requests)
    const avgLat =
      nearbyRequests.reduce((sum, r) => sum + r.latitude, 0) /
      nearbyRequests.length;
    const avgLng =
      nearbyRequests.reduce((sum, r) => sum + r.longitude, 0) /
      nearbyRequests.length;

    groups.push({
      lat: avgLat,
      lng: avgLng,
      count: nearbyRequests.length,
      requests: nearbyRequests,
    });
  });

  return groups;
}

