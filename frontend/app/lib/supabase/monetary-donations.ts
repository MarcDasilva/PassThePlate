import { createClient } from "./client";

export interface MonetaryDonation {
  id: string;
  user_id: string;
  from_latitude: number;
  from_longitude: number;
  to_latitude: number;
  to_longitude: number;
  amount: number;
  created_at: string;
}

/**
 * Create a monetary donation
 */
export async function createMonetaryDonation(
  userId: string,
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
  amount: number
): Promise<{ data: MonetaryDonation | null; error: any }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("monetary_donations")
    .insert({
      user_id: userId,
      from_latitude: fromLatitude,
      from_longitude: fromLongitude,
      to_latitude: toLatitude,
      to_longitude: toLongitude,
      amount: amount,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating monetary donation:", error);
    return { data: null, error };
  }

  return { data: data as MonetaryDonation, error: null };
}

