"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/app/lib/routes";
import { Navbar } from "@/app/components/navbar";
import {
  hasProfile,
  getProfile,
  upsertProfile,
  uploadProfilePicture,
  deleteProfilePicture,
} from "@/app/lib/supabase/profile";
import { Profile } from "@/app/lib/supabase/profile";
import { ProfilePictureUpload } from "@/app/components/ProfilePictureUpload";

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [editedAbout, setEditedAbout] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Setup mode state for first-time users
  const [setupMode, setSetupMode] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupAboutMe, setSetupAboutMe] = useState("");
  const [setupAvatarUrl, setSetupAvatarUrl] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      if (!loading && !user) {
        router.push(ROUTES.SIGN_IN);
        return;
      }

      if (user) {
        // Check if user has completed profile
        const profileExists = await hasProfile(user.id);
        if (!profileExists) {
          // Show setup form instead of redirecting
          setSetupMode(true);
          setCheckingProfile(false);
          return;
        }

        // Load profile data
        const profileData = await getProfile(user.id);
        setProfile(profileData);
        if (profileData) {
          setEditedAbout(profileData.about_me);
        }
        setSetupMode(false);
        setCheckingProfile(false);
      }
    };

    checkAuthAndProfile();
  }, [user, loading, router]);

  const handleEditAbout = () => {
    setIsEditingAbout(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditingAbout(false);
    if (profile) {
      setEditedAbout(profile.about_me);
    }
    setError(null);
  };

  const handleSaveAbout = async () => {
    if (!user || !profile) return;

    if (!editedAbout.trim()) {
      setError("About me cannot be empty");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await upsertProfile(user.id, {
        name: profile.name,
        about_me: editedAbout.trim(),
        email: user.email || profile.email,
        avatar_url: profile.avatar_url,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update about me");
        setSaving(false);
        return;
      }

      // Refresh profile data
      const updatedProfile = await getProfile(user.id);
      if (updatedProfile) {
        setProfile(updatedProfile);
        setEditedAbout(updatedProfile.about_me);
      }

      setIsEditingAbout(false);
      setSaving(false);
    } catch (err) {
      setError("An unexpected error occurred");
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user || !profile) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      // Upload image to Supabase Storage
      const { data, error: uploadError } = await uploadProfilePicture(
        user.id,
        file
      );

      if (uploadError || !data) {
        setError(uploadError?.message || "Failed to upload image");
        setUploadingAvatar(false);
        return;
      }

      // Delete old avatar if it exists
      if (profile.avatar_url) {
        await deleteProfilePicture(profile.avatar_url);
      }

      // Update profile with new avatar URL
      const { error: updateError } = await upsertProfile(user.id, {
        name: profile.name,
        about_me: profile.about_me,
        email: user.email || profile.email,
        avatar_url: data.path,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update profile picture");
        setUploadingAvatar(false);
        return;
      }

      // Refresh profile data
      const updatedProfile = await getProfile(user.id);
      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      setUploadingAvatar(false);
    } catch (err) {
      setError("An unexpected error occurred");
      setUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user || !profile || !profile.avatar_url) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      // Delete avatar from storage
      await deleteProfilePicture(profile.avatar_url);

      // Update profile to remove avatar URL
      const { error: updateError } = await upsertProfile(user.id, {
        name: profile.name,
        about_me: profile.about_me,
        email: user.email || profile.email,
        avatar_url: null,
      });

      if (updateError) {
        setError(updateError.message || "Failed to remove profile picture");
        setUploadingAvatar(false);
        return;
      }

      // Refresh profile data
      const updatedProfile = await getProfile(user.id);
      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      setUploadingAvatar(false);
    } catch (err) {
      setError("An unexpected error occurred");
      setUploadingAvatar(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!setupName.trim()) {
      setError("Name is required");
      return;
    }

    if (!setupAboutMe.trim()) {
      setError("About me is required");
      return;
    }

    if (!user) {
      setError("You must be logged in to complete profile setup");
      return;
    }

    setSetupLoading(true);

    try {
      const { error: insertError } = await upsertProfile(user.id, {
        name: setupName.trim(),
        about_me: setupAboutMe.trim(),
        email: user.email || "",
        avatar_url: setupAvatarUrl,
      });

      if (insertError) {
        setError(insertError.message || "Failed to save profile");
        setSetupLoading(false);
        return;
      }

      // Load the newly created profile
      const profileData = await getProfile(user.id);
      setProfile(profileData);
      if (profileData) {
        setEditedAbout(profileData.about_me);
      }
      setSetupMode(false);
      setSetupLoading(false);
    } catch (err) {
      setError("An unexpected error occurred");
      setSetupLoading(false);
    }
  };

  const handleSetupAvatarUpload = async (file: File) => {
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

      setSetupAvatarUrl(data.path);
      setUploadingAvatar(false);
    } catch (err) {
      setError("An unexpected error occurred");
      setUploadingAvatar(false);
    }
  };

  const handleSetupAvatarRemove = async () => {
    if (setupAvatarUrl) {
      await deleteProfilePicture(setupAvatarUrl);
    }
    setSetupAvatarUrl(null);
  };

  const handleLogout = async () => {
    await signOut();
    router.push(ROUTES.SIGN_IN);
  };

  if (loading || checkingProfile) {
    return (
      <main className="min-h-screen bg-[#367230] flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  // Show setup form for first-time users
  if (setupMode) {
    return (
      <main className="min-h-screen bg-[#367230]">
        <Navbar />
        <div className="pt-32 pb-20 px-4 md:px-8 container mx-auto">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 lg:p-10 border border-gray-100">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 text-black text-center">
                Complete Your Profile
              </h1>
              <p className="text-center text-black/70 mb-8 text-lg">
                Please provide some information to get started
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSetupSubmit} className="space-y-6">
                <div className="flex justify-center">
                  <ProfilePictureUpload
                    currentAvatarUrl={setupAvatarUrl}
                    onUpload={handleSetupAvatarUpload}
                    onRemove={
                      setupAvatarUrl ? handleSetupAvatarRemove : undefined
                    }
                    uploading={uploadingAvatar}
                  />
                </div>

                <div>
                  <label
                    htmlFor="setupName"
                    className="block text-sm uppercase tracking-widest mb-2 text-black"
                  >
                    Name *
                  </label>
                  <input
                    id="setupName"
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    required
                    className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="setupAboutMe"
                    className="block text-sm uppercase tracking-widest mb-2 text-black"
                  >
                    About Me *
                  </label>
                  <textarea
                    id="setupAboutMe"
                    value={setupAboutMe}
                    onChange={(e) => setSetupAboutMe(e.target.value)}
                    required
                    rows={4}
                    className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50 resize-none"
                    placeholder="Tell us about yourself"
                  />
                </div>

                <button
                  type="submit"
                  disabled={setupLoading}
                  className="w-full px-8 py-3 bg-[#367230] text-white text-sm uppercase tracking-widest hover:bg-[#244b20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold"
                >
                  {setupLoading ? "Saving..." : "Complete Setup"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#367230]">
      <Navbar />
      <div className="pt-32 pb-20 px-4 md:px-8 container mx-auto">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Profile Background Header */}
          <div className="relative h-48 md:h-64 w-full overflow-hidden">
            <img
              src="/bg.jpg"
              alt="Profile background"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
          </div>

          {/* Profile Picture - Overlapping the background */}
          <div className="relative -mt-24 md:-mt-32 flex justify-center mb-6">
            <div className="relative z-10">
              <ProfilePictureUpload
                currentAvatarUrl={profile.avatar_url}
                onUpload={handleAvatarUpload}
                onRemove={profile.avatar_url ? handleAvatarRemove : undefined}
                uploading={uploadingAvatar}
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <h1 className="text-4xl font-bold tracking-tighter mb-8 text-black text-center">
              Account
            </h1>

            <div className="space-y-6">
              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm uppercase tracking-widest mb-2 text-black">
                  Name
                </label>
                <p className="text-lg text-black">{profile.name}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm uppercase tracking-widest text-black">
                    About Me
                  </label>
                  {!isEditingAbout && (
                    <button
                      onClick={handleEditAbout}
                      className="text-sm uppercase tracking-widest text-black hover:text-[#367230] transition-colors underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {isEditingAbout ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedAbout}
                      onChange={(e) => setEditedAbout(e.target.value)}
                      rows={4}
                      className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50 resize-none"
                      placeholder="Tell us about yourself"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveAbout}
                        disabled={saving}
                        className="px-6 py-2 bg-black text-white text-sm uppercase tracking-widest hover:bg-[#367230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-6 py-2 border border-black text-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-lg text-black whitespace-pre-wrap">
                    {profile.about_me}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm uppercase tracking-widest mb-2 text-black">
                  Email
                </label>
                <p className="text-lg text-black">{user.email}</p>
              </div>

              {/* Rating and Achievements Section */}
              <div className="pt-6 border-t border-black space-y-6">
                {/* Rating */}
                <div>
                  <label className="block text-sm uppercase tracking-widest mb-2 text-black">
                    Rating
                  </label>
                  {profile.rating !== null && profile.rating !== undefined ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-[#367230]">
                        {profile.rating.toFixed(1)}
                      </span>
                      <span className="text-gray-500">/ 5.0</span>
                      <span className="text-yellow-400 text-xl">★</span>
                    </div>
                  ) : (
                    <p className="text-lg text-gray-500">No rating yet</p>
                  )}
                </div>

                {/* Achievements */}
                <div>
                  <label className="block text-sm uppercase tracking-widest mb-2 text-black">
                    Achievements
                  </label>
                  {profile.achievements ? (
                    <p className="text-lg text-black whitespace-pre-wrap">
                      {profile.achievements}
                    </p>
                  ) : (
                    <p className="text-lg text-gray-500">No achievements yet</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-black">
                <button
                  onClick={handleLogout}
                  className="w-full px-8 py-3 bg-black text-white text-sm uppercase tracking-widest hover:bg-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-8 bg-black text-white">
        <div className="container mx-auto flex justify-center items-center">
          <p className="text-sm">
            © 2025 PassThePlate. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
