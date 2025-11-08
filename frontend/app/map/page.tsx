"use client";

import React from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ROUTES } from "@/app/lib/routes";
import { Navbar } from "@/app/components/navbar";
import { hasProfile, getProfile, Profile } from "@/app/lib/supabase/profile";
import { getAvailableDonations, Donation } from "@/app/lib/supabase/donations";
import PostDonationModal from "./PostDonationModal";
import "leaflet/dist/leaflet.css";

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-200">
      <p className="text-gray-600">Loading map...</p>
    </div>
  ),
}) as React.ComponentType<{
  center: [number, number];
  donations?: Donation[];
  radius?: number;
}>;

// Testing flag - set to true to use default location when geolocation is unavailable
const USE_DEFAULT_LOCATION_FOR_TESTING = true;
// Princeton University coordinates
const PRINCETON_UNIVERSITY_LOCATION: [number, number] = [40.3431, -74.6553];

export default function MapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isPostDonationModalOpen, setIsPostDonationModalOpen] = useState(false);
  const [toggleEnabled, setToggleEnabled] = useState(false);
  const [radius, setRadius] = useState<number>(500); // Default 500m

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
          // Location unavailable
          console.warn("Geolocation error:", error);
          if (USE_DEFAULT_LOCATION_FOR_TESTING) {
            // For testing: use Princeton University as default location
            setUserLocation(PRINCETON_UNIVERSITY_LOCATION);
            setLocationUnavailable(false);
          } else {
            // Production: show unavailable message
            setLocationUnavailable(true);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Geolocation not supported
      if (USE_DEFAULT_LOCATION_FOR_TESTING) {
        // For testing: use Princeton University as default location
        setUserLocation(PRINCETON_UNIVERSITY_LOCATION);
        setLocationUnavailable(false);
      } else {
        // Production: show unavailable message
        setLocationUnavailable(true);
      }
    }
  }, []);

  // Fetch donations when user is authenticated
  useEffect(() => {
    const fetchDonations = async () => {
      if (user && !checkingProfile) {
        const availableDonations = await getAvailableDonations();
        setDonations(availableDonations);
      }
    };

    fetchDonations();
  }, [user, checkingProfile]);

  const handlePostDonation = () => {
    if (!userLocation) {
      alert("Please enable location services to post a donation");
      return;
    }
    setIsPostDonationModalOpen(true);
  };

  const handleDonationPosted = async () => {
    // Refresh donations list
    if (user && !checkingProfile) {
      const availableDonations = await getAvailableDonations();
      setDonations(availableDonations);
    }
  };

  const handleFilter = () => {
    // TODO: Open filter modal or sidebar
    console.log("Filter clicked");
  };

  // Calculate distance between two coordinates in kilometers using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
    <main className="fixed inset-0 w-full h-full bg-[#367230]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `,
        }}
      />
      <Navbar />

      {/* Full screen map */}
      <div className="absolute inset-0 w-full h-full z-0">
        {userLocation ? (
          <MapComponent
            center={userLocation}
            donations={donations}
            radius={radius}
          />
        ) : locationUnavailable ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center px-4">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-gray-600 font-medium">Location unavailable</p>
              <p className="text-sm text-gray-500 mt-1">Check back later</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#367230] mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Overlay controls - positioned on top of map */}
      <div className="absolute top-20 md:top-24 left-2 md:left-4 z-10">
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-6 space-y-2 md:space-y-4 border border-gray-100 w-48 md:w-64">
          {/* Post a Donation Button */}
          <div className="bg-gradient-to-br from-[#367230] to-[#244b20] rounded-lg p-2 md:p-4 shadow-md hover:shadow-lg transition-shadow">
            <button
              onClick={handlePostDonation}
              className="w-full text-xs md:text-sm font-semibold uppercase tracking-wider text-white py-2 md:py-3 px-2 md:px-4 rounded-md transition-all hover:opacity-90 active:scale-95"
            >
              Post a Donation
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={handleFilter}
            className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-3 md:px-5 py-2 transition-colors hover:bg-black hover:text-white rounded-md"
          >
            Filter
          </button>

          {/* Toggle Switch */}
          <div className="bg-gray-50 rounded-lg p-2 md:p-4 border border-gray-200">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs md:text-sm font-medium text-gray-700">
                Toggle
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={toggleEnabled}
                  onChange={(e) => setToggleEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`relative w-9 h-5 md:w-11 md:h-6 rounded-full transition-colors duration-200 ease-in-out ${
                    toggleEnabled ? "bg-[#367230]" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      toggleEnabled
                        ? "translate-x-4 md:translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </label>
          </div>

          {/* Radius Selection Card */}
          <div className="bg-gray-50 rounded-lg p-2 md:p-4 border border-gray-200">
            <div className="flex flex-row md:flex-col gap-3 md:gap-0">
              {/* Radius Slider - Left side on mobile, full width on desktop */}
              <div className="flex-1 md:mb-3">
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1 md:mb-2">
                  Radius:{" "}
                  {radius >= 1000
                    ? `${(radius / 1000).toFixed(1)}km`
                    : `${radius}m`}
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                      ((radius - 100) / (2000 - 100)) * 100
                    }%, #e5e7eb ${
                      ((radius - 100) / (2000 - 100)) * 100
                    }%, #e5e7eb 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>100m</span>
                  <span>2km</span>
                </div>
              </div>

              {/* In Range Count - Right side on mobile, below on desktop */}
              <div className="flex items-center justify-between md:justify-start md:pt-3 md:border-t md:border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    In Range
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {userLocation
                      ? donations.filter((donation) => {
                          const distance = calculateDistance(
                            userLocation[0],
                            userLocation[1],
                            donation.latitude,
                            donation.longitude
                          );
                          // Convert distance from km to meters for comparison
                          return distance * 1000 <= radius;
                        }).length
                      : 0}
                  </p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-lg flex items-center justify-center opacity-50 ml-2 md:ml-0">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post Donation Modal */}
      <PostDonationModal
        isOpen={isPostDonationModalOpen}
        onClose={() => setIsPostDonationModalOpen(false)}
        onSuccess={handleDonationPosted}
        currentLocation={userLocation}
      />
    </main>
  );
}
