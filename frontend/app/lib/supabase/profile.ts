import { createClient } from "./client";
import { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  name: string;
  about_me: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Check if a user has completed their profile
 */
export async function hasProfile(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Get user profile
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

/**
 * Create or update user profile
 */
export async function upsertProfile(
  userId: string,
  profile: { name: string; about_me: string; email: string }
): Promise<{ error: any }> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    ...profile,
    updated_at: new Date().toISOString(),
  });

  return { error };
}
