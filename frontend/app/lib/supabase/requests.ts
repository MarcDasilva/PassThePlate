import { createClient } from "./client";

export interface Request {
  id: string;
  user_id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string | null;
  phone_number: string | null;
  status: "open" | "fulfilled" | "closed";
  created_at: string;
  updated_at: string;
}

export interface CreateRequestData {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  phone_number?: string | null;
}

/**
 * Get all available requests (status = 'open')
 */
export async function getAvailableRequests(): Promise<Request[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching requests:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all requests (for admin or testing purposes)
 */
export async function getAllRequests(): Promise<Request[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all requests:", error);
    return [];
  }

  return data || [];
}

/**
 * Get requests by user ID
 */
export async function getUserRequests(userId: string): Promise<Request[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user requests:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new request
 */
export async function createRequest(
  userId: string,
  requestData: CreateRequestData
): Promise<{ data: Request | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("requests")
    .insert({
      user_id: userId,
      title: requestData.title,
      description: requestData.description,
      latitude: requestData.latitude,
      longitude: requestData.longitude,
      address: requestData.address || null,
      phone_number: requestData.phone_number || null,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating request:", error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Update a request
 */
export async function updateRequest(
  requestId: string,
  userId: string,
  updates: Partial<CreateRequestData & { status?: "open" | "fulfilled" | "closed" }>
): Promise<{ data: Request | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("requests")
    .update(updates)
    .eq("id", requestId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating request:", error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Delete a request
 */
export async function deleteRequest(
  requestId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting request:", error);
    return { error: new Error(error.message) };
  }

  return { error: null };
}

