import { createClient } from "./client";

/**
 * Upload donation image to Supabase Storage
 */
export async function uploadDonationImage(
  userId: string,
  file: File
): Promise<{ data: { path: string } | null; error: any }> {
  const supabase = createClient();

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { data: null, error: new Error("File must be an image") };
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { data: null, error: new Error("File size must be less than 5MB") };
  }

  // Create a unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from("donations")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    // Provide helpful error message for missing bucket
    if (
      error.message?.includes("Bucket not found") ||
      error.message?.includes("The resource was not found")
    ) {
      return {
        data: null,
        error: new Error(
          "Storage bucket 'donations' not found. Please create it in your Supabase dashboard under Storage."
        ),
      };
    }
    return { data: null, error };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("donations").getPublicUrl(filePath);

  return { data: { path: publicUrl }, error: null };
}

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
  expiry_date: string | null;
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

/**
 * Create a new donation
 */
export async function createDonation(
  userId: string,
  donation: {
    title: string;
    description: string;
    category?: string | null;
    latitude: number;
    longitude: number;
    address?: string | null;
    image_url?: string | null;
    expiry_date?: string | null;
  }
): Promise<{ data: Donation | null; error: any }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .insert({
      user_id: userId,
      title: donation.title,
      description: donation.description,
      category: donation.category || null,
      latitude: donation.latitude,
      longitude: donation.longitude,
      address: donation.address || null,
      image_url: donation.image_url || null,
      expiry_date: donation.expiry_date || null,
      status: "available",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating donation:", error);
    return { data: null, error };
  }

  return { data: data as Donation, error: null };
}
