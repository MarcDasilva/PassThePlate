"use client";

import { useEffect, useState } from "react";
import {
  getPublicProfile,
  getAvatarUrl,
  Profile,
} from "@/app/lib/supabase/profile";

interface ProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({
  userId,
  isOpen,
  onClose,
}: ProfileModalProps) {
  const [profile, setProfile] = useState<Omit<Profile, "email"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      setError(null);
      getPublicProfile(userId)
        .then((profileData) => {
          setProfile(profileData);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching profile:", err);
          setError("Failed to load profile");
          setLoading(false);
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>

          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading profile...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {profile && !loading && !error && (
            <div className="space-y-4">
              {/* Profile Picture */}
              <div className="flex justify-center">
                <img
                  src={getAvatarUrl(profile.avatar_url)}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              </div>

              {/* Name */}
              <h2 className="text-2xl font-bold text-center">{profile.name}</h2>

              {/* About Me */}
              {profile.about_me && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    About
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {profile.about_me}
                  </p>
                </div>
              )}

              {/* Rating and Achievements Section */}
              <div className="pt-4 border-t space-y-4">
                {/* Rating */}
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Rating
                  </h3>
                  {profile.rating !== null && profile.rating !== undefined ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-2xl font-bold text-[#367230]">
                        {profile.rating.toFixed(1)}
                      </span>
                      <span className="text-gray-400">/ 5.0</span>
                      <span className="text-yellow-400 text-xl">★</span>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No rating yet</p>
                  )}
                </div>

                {/* Achievements */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider text-center">
                    Achievements
                  </h3>
                  {profile.achievements ? (
                    <div className="text-center">
                      <p className="text-gray-600">{profile.achievements}</p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm text-center">
                      No achievements yet
                    </p>
                  )}
                </div>
              </div>

              {/* Member Since */}
              {profile.created_at && (
                <div className="text-sm text-gray-500 text-center pt-4 border-t">
                  Member since{" "}
                  {new Date(profile.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
