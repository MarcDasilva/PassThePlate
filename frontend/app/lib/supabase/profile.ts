import { createClient } from "./client";
import { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  name: string;
  about_me: string;
  email: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get default avatar URL
 */
export function getDefaultAvatarUrl(): string {
  return "/pfp.png";
}

/**
 * Get avatar URL with fallback to default
 */
export function getAvatarUrl(avatarUrl?: string | null): string {
  return avatarUrl || getDefaultAvatarUrl();
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
 * Get user profile (can be used to get own or other users' profiles)
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, about_me, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

/**
 * Get public profile (without email) - for viewing other users
 */
export async function getPublicProfile(
  userId: string
): Promise<Omit<Profile, "email"> | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, about_me, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Omit<Profile, "email">;
}

/**
 * Get multiple user profiles (for displaying other users) - excludes email
 */
export async function getProfiles(
  userIds: string[]
): Promise<Omit<Profile, "email">[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, about_me, avatar_url, created_at, updated_at")
    .in("id", userIds);

  if (error || !data) {
    return [];
  }

  return data as Omit<Profile, "email">[];
}

/**
 * Create or update user profile
 */
export async function upsertProfile(
  userId: string,
  profile: {
    name: string;
    about_me: string;
    email: string;
    avatar_url?: string | null;
  }
): Promise<{ error: any }> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    ...profile,
    updated_at: new Date().toISOString(),
  });

  return { error };
}

/**
 * Upload profile picture to Supabase Storage
 */
export async function uploadProfilePicture(
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
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { data: null, error };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return { data: { path: publicUrl }, error: null };
}

/**
 * Delete profile picture from Supabase Storage
 */
export async function deleteProfilePicture(
  avatarUrl: string
): Promise<{ error: any }> {
  const supabase = createClient();

  // Extract file path from URL
  // URL format: https://{project}.supabase.co/storage/v1/object/public/avatars/{userId}/{filename}
  const urlParts = avatarUrl.split("/avatars/");
  if (urlParts.length !== 2) {
    return { error: new Error("Invalid avatar URL") };
  }

  const filePath = urlParts[1].split("?")[0]; // Remove query params if any
  const { error } = await supabase.storage.from("avatars").remove([filePath]);

  return { error };
}
