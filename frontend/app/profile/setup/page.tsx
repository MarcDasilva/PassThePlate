"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { ROUTES } from "@/app/lib/routes";
import { Navbar } from "@/app/components/navbar";
import { createClient } from "@/app/lib/supabase/client";
import {
  uploadProfilePicture,
  deleteProfilePicture,
} from "@/app/lib/supabase/profile";
import { ProfilePictureUpload } from "@/app/components/ProfilePictureUpload";

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      if (!authLoading && !user) {
        router.push(ROUTES.SIGN_IN);
        return;
      }

      if (user) {
        // Check if profile already exists
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, about_me")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "not found" error, which is expected for new users
          console.error("Error checking profile:", error);
        }

        if (data) {
          // Profile exists, redirect to map
          router.push(ROUTES.MAP);
          return;
        }

        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!aboutMe.trim()) {
      setError("About me is required");
      return;
    }

    if (!user) {
      setError("You must be logged in to complete profile setup");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        name: name.trim(),
        about_me: aboutMe.trim(),
        email: user.email,
        avatar_url: avatarUrl,
      });

      if (insertError) {
        setError(insertError.message || "Failed to save profile");
        setLoading(false);
        return;
      }

      // Redirect to map after successful profile creation
      router.push(ROUTES.MAP);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      const { data, error: uploadError } = await uploadProfilePicture(
        user.id,
        file
      );

      if (uploadError || !data) {
        setError(uploadError?.message || "Failed to upload image");
        setUploadingAvatar(false);
        return;
      }

      setAvatarUrl(data.path);
      setUploadingAvatar(false);
    } catch (err) {
      setError("An unexpected error occurred");
      setUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (avatarUrl) {
      await deleteProfilePicture(avatarUrl);
    }
    setAvatarUrl(null);
  };

  if (authLoading || checkingProfile) {
    return (
      <main className="min-h-screen bg-[#367230] flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#367230]">
      <Navbar />
      <div className="pt-32 pb-20 px-4 md:px-8 container mx-auto">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold tracking-tighter mb-6 text-black text-center">
            Complete Your Profile
          </h1>
          <p className="text-center text-black/70 mb-8">
            Please provide some information to get started
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <ProfilePictureUpload
                currentAvatarUrl={avatarUrl}
                onUpload={handleAvatarUpload}
                onRemove={avatarUrl ? handleAvatarRemove : undefined}
                uploading={uploadingAvatar}
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label
                htmlFor="aboutMe"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                About Me
              </label>
              <textarea
                id="aboutMe"
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                required
                rows={4}
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50 resize-none"
                placeholder="Tell us about yourself"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-3 bg-black text-white text-sm uppercase tracking-widest hover:bg-[#367230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Complete Setup"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
