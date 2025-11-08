"use client";

import React from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ROUTES } from "@/app/lib/routes";
import { Navbar } from "@/app/components/navbar";
import { hasProfile, getProfile, Profile } from "@/app/lib/supabase/profile";
import "leaflet/dist/leaflet.css";

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-200">
      <p className="text-gray-600">Loading map...</p>
    </div>
  ),
}) as React.ComponentType<{ center: [number, number] }>;

export default function MapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [locationUnavailable, setLocationUnavailable] = useState(false);

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
          router.push(ROUTES.PROFILE_SETUP);
          return;
        }
        // Load profile data
        const profileData = await getProfile(user.id);
        setProfile(profileData);
        setCheckingProfile(false);
      }
    };

    checkAuthAndProfile();
  }, [user, loading, router]);

  useEffect(() => {
    // Ask for user's location for map centering
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([
            position.coords.latitude,
            position.coords.longitude,
          ]);
          setLocationUnavailable(false);
        },
        (error) => {
          // Location unavailable - don't set a default location
          console.warn("Geolocation error:", error);
          setLocationUnavailable(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Geolocation not supported
      setLocationUnavailable(true);
    }
  }, []);

  const handlePostDonation = () => {
    // TODO: Navigate to post donation page or open modal
    console.log("Post a Donation clicked");
  };

  const handleFilter = () => {
    // TODO: Open filter modal or sidebar
    console.log("Filter clicked");
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

  return (
    <main className="min-h-screen bg-[#367230] relative">
      <Navbar />
      <div className="pt-24 pb-20 px-4 md:px-8 container mx-auto">
        <div className="max-w-6xl mx-auto relative z-0">
          <h1 className="text-6xl font-bold tracking-tighter mb-8 text-white relative z-0">
            Map
          </h1>

          <div className="flex gap-6 relative z-0">
            {/* Left side buttons */}
            <div className="flex flex-col gap-4 min-w-[200px] relative z-0">
              <button
                onClick={handlePostDonation}
                className="text-sm uppercase tracking-widest bg-white text-black border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white relative z-0"
              >
                Post a Donation
              </button>
              <button
                onClick={handleFilter}
                className="text-sm uppercase tracking-widest bg-white text-black border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white relative z-0"
              >
                Filter
              </button>
            </div>

            {/* Map container - square frame */}
            <div className="flex-1 relative z-0">
              <div className="aspect-square w-full max-w-[600px] bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-white relative z-0">
                {userLocation ? (
                  <MapComponent center={userLocation} />
                ) : locationUnavailable ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <p className="text-gray-600 text-center px-4">
                      Location unavailable, check back later
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
