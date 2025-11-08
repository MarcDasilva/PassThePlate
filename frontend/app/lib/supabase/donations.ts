import { createClient } from "./client";

export interface Donation {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  image_url: string | null;
  status: "available" | "claimed" | "completed";
  created_at: string;
  updated_at: string;
}

/**
 * Get all available donations
 */
export async function getAvailableDonations(): Promise<Donation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching donations:", error);
    return [];
  }

  return data as Donation[];
}

/**
 * Get all donations (including claimed/completed) - for admin or own donations
 */
export async function getAllDonations(): Promise<Donation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching donations:", error);
    return [];
  }

  return data as Donation[];
}

/**
 * Get donations by status
 */
export async function getDonationsByStatus(
  status: "available" | "claimed" | "completed"
): Promise<Donation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching donations:", error);
    return [];
  }

  return data as Donation[];
}

