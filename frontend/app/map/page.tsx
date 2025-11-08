"use client";

import React from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { ROUTES } from "@/app/lib/routes";
import { Navbar } from "@/app/components/navbar";
import { hasProfile, getProfile, Profile } from "@/app/lib/supabase/profile";
import {
  getAvailableDonations,
  getUserDonations,
  deleteDonation,
  updateDonationStatus,
  getDonationsClaimedByUser,
  Donation,
} from "@/app/lib/supabase/donations";
import {
  getAvailableRequests,
  getUserRequests,
  deleteRequest,
  Request,
} from "@/app/lib/supabase/requests";
import PostDonationModal from "./PostDonationModal";
import RequestDonationModal from "./RequestDonationModal";
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
  requests?: Request[];
  radius?: number;
  onDonationPickedUp?: (donationId: string) => void;
}>;

// Dynamically import Globe component to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

// Helper function to calculate distance between two coordinates in kilometers using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
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
}

// Group requests by location (within 50km radius)
function groupRequestsByLocation(requests: Request[]): Array<{
  lat: number;
  lng: number;
  count: number;
  requests: Request[];
}> {
  const groups: Array<{
    lat: number;
    lng: number;
    count: number;
    requests: Request[];
  }> = [];
  const processed = new Set<string>();

  requests.forEach((request) => {
    if (processed.has(request.id)) return;

    // Find all requests within 50km of this request
    const nearbyRequests = requests.filter((r) => {
      const distance = calculateDistance(
        request.latitude,
        request.longitude,
        r.latitude,
        r.longitude
      );
      return distance <= 50; // 50km radius
    });

    // Mark all nearby requests as processed
    nearbyRequests.forEach((r) => processed.add(r.id));

    // Calculate center point (average of all nearby requests)
    const avgLat =
      nearbyRequests.reduce((sum, r) => sum + r.latitude, 0) /
      nearbyRequests.length;
    const avgLng =
      nearbyRequests.reduce((sum, r) => sum + r.longitude, 0) /
      nearbyRequests.length;

    groups.push({
      lat: avgLat,
      lng: avgLng,
      count: nearbyRequests.length,
      requests: nearbyRequests,
    });
  });

  return groups;
}

// World Globe Component
interface WorldGlobeProps {
  requests: Request[];
  onPinClick?: (count: number, requests: Request[]) => void;
}

function WorldGlobe({ requests, onPinClick }: WorldGlobeProps) {
  const globeRef = useRef<any>(null);
  const [dots, setDots] = useState<Array<{ x: number; y: number }>>([]);
  const [pins, setPins] = useState<
    Array<{
      lat: number;
      lng: number;
      count: number;
      requests: Request[];
    }>
  >([]);

  useEffect(() => {
    // Generate grey dots symmetrically across the background
    const generatedDots: Array<{ x: number; y: number }> = [];
    const numDotsX = 20; // Number of dots horizontally
    const numDotsY = 20; // Number of dots vertically

    for (let i = 0; i < numDotsX; i++) {
      for (let j = 0; j < numDotsY; j++) {
        // Calculate position as percentage
        const x = (i / (numDotsX - 1)) * 100;
        const y = (j / (numDotsY - 1)) * 100;
        generatedDots.push({ x, y });
      }
    }

    setDots(generatedDots);
  }, []);

  useEffect(() => {
    // Group requests by location and create pins
    if (requests.length > 0) {
      const groupedRequests = groupRequestsByLocation(requests);
      setPins(groupedRequests);
    } else {
      setPins([]);
    }
  }, [requests]);

  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      // Enable auto-rotate
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = true;
      // Increase zoom capability - allow much closer zoom
      controls.minDistance = 100;
      controls.maxDistance = 2000;
      // Make zoom more sensitive for better control
      controls.zoomSpeed = 1.2;
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Grey dots background */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {dots.map((dot, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-gray-500 opacity-30"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: "4px",
              height: "4px",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
      {/* Globe */}
      <div className="relative w-full h-full">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={false}
          enablePointerInteraction={true}
          htmlElementsData={pins}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={(d: any) => {
            const el = document.createElement("div");
            el.style.width = "30px";
            el.style.height = "40px";
            el.style.cursor = "pointer";
            el.style.position = "relative";
            el.style.pointerEvents = "auto";
            el.style.zIndex = "1000";
            el.style.display = "flex";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";
            el.innerHTML = `
              <svg width="30" height="40" viewBox="0 0 30 40" style="
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                pointer-events: none;
              ">
                <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" fill="#dc2626"/>
                <circle cx="15" cy="15" r="6" fill="white"/>
                <text x="15" y="19" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626">${d.count}</text>
              </svg>
            `;

            // Store the data in the element for access in the click handler
            (el as any).__data = d;

            // Use addEventListener with capture phase to ensure it fires
            const clickHandler = (e: Event) => {
              e.stopPropagation();
              e.preventDefault();
              const data = (e.currentTarget as any).__data;
              if (onPinClick && data) {
                onPinClick(data.count, data.requests);
              }
            };

            // Try multiple event types to ensure clicks work
            el.addEventListener("click", clickHandler, true);
            el.addEventListener(
              "mousedown",
              (e) => {
                e.stopPropagation();
              },
              true
            );

            // Also try touch events for mobile
            el.addEventListener(
              "touchend",
              (e) => {
                e.stopPropagation();
                e.preventDefault();
                const data = (e.currentTarget as any).__data;
                if (onPinClick && data) {
                  onPinClick(data.count, data.requests);
                }
              },
              true
            );

            return el;
          }}
        />
      </div>
    </div>
  );
}

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
  const [userDonations, setUserDonations] = useState<Donation[]>([]);
  const [pickingUpDonations, setPickingUpDonations] = useState<Donation[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [userRequests, setUserRequests] = useState<Request[]>([]);
  const [isPostDonationModalOpen, setIsPostDonationModalOpen] = useState(false);
  const [isRequestDonationModalOpen, setIsRequestDonationModalOpen] =
    useState(false);
  const [isMyPostingsOpen, setIsMyPostingsOpen] = useState(false);
  const [isMyRequestsOpen, setIsMyRequestsOpen] = useState(false);
  const [isPickingUpOpen, setIsPickingUpOpen] = useState(false);
  const [unclaimingId, setUnclaimingId] = useState<string | null>(null);
  const [showTipComingSoon, setShowTipComingSoon] = useState(false);
  const [radius, setRadius] = useState<number>(500); // Default 500m
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [donationToDelete, setDonationToDelete] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(
    null
  );
  const [showDeleteRequestConfirm, setShowDeleteRequestConfirm] =
    useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [isWorldMapActive, setIsWorldMapActive] = useState(false);
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);
  const [isRequestMenuMinimized, setIsRequestMenuMinimized] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedPinCount, setSelectedPinCount] = useState<number>(0);
  const [selectedPinRequests, setSelectedPinRequests] = useState<Request[]>([]);

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

  // Fetch donations and requests when user is authenticated
  useEffect(() => {
    const fetchData = async () => {
      if (user && !checkingProfile) {
        const availableDonations = await getAvailableDonations();
        setDonations(availableDonations);

        // Fetch user's own donations
        const myDonations = await getUserDonations(user.id);
        setUserDonations(myDonations);

        // Fetch donations claimed by the current user (filter out items older than 3 days)
        const claimedDonations = await getDonationsClaimedByUser(user.id);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const recentClaimedDonations = claimedDonations.filter((donation) => {
          const updatedAt = new Date(donation.updated_at);
          return updatedAt >= threeDaysAgo;
        });
        setPickingUpDonations(recentClaimedDonations);

        // Fetch available requests
        const availableRequests = await getAvailableRequests();
        setRequests(availableRequests);

        // Fetch user's own requests
        const myRequests = await getUserRequests(user.id);
        setUserRequests(myRequests);
      }
    };

    fetchData();
  }, [user, checkingProfile]);

  const handlePostDonation = () => {
    if (!userLocation) {
      alert("Please enable location services to post a donation");
      return;
    }
    setIsPostDonationModalOpen(true);
  };

  const handleRequestDonation = () => {
    if (!userLocation) {
      alert("Please enable location services to request a donation");
      return;
    }
    setIsRequestDonationModalOpen(true);
  };

  const handleDonationPosted = async () => {
    // Refresh donations list
    if (user && !checkingProfile) {
      const availableDonations = await getAvailableDonations();
      setDonations(availableDonations);

      // Refresh user's donations
      const myDonations = await getUserDonations(user.id);
      setUserDonations(myDonations);
    }
  };

  const handleRequestPosted = async () => {
    // Refresh requests list
    if (user && !checkingProfile) {
      const availableRequests = await getAvailableRequests();
      setRequests(availableRequests);

      // Refresh user's requests
      const myRequests = await getUserRequests(user.id);
      setUserRequests(myRequests);
    }
  };

  const handleDeleteClick = (donationId: string) => {
    setDonationToDelete(donationId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !donationToDelete) return;

    setShowDeleteConfirm(false);
    setDeletingId(donationToDelete);

    const { error } = await deleteDonation(donationToDelete, user.id);

    if (error) {
      alert(`Failed to delete posting: ${error.message}`);
      setDeletingId(null);
      setDonationToDelete(null);
      return;
    }

    // Refresh both lists
    const availableDonations = await getAvailableDonations();
    setDonations(availableDonations);

    const myDonations = await getUserDonations(user.id);
    setUserDonations(myDonations);

    setDeletingId(null);
    setDonationToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDonationToDelete(null);
  };

  const handleMyPostings = () => {
    setIsMyPostingsOpen(!isMyPostingsOpen);
  };

  const handleMyRequests = () => {
    setIsMyRequestsOpen(!isMyRequestsOpen);
  };

  const handleDeleteRequestClick = (requestId: string) => {
    setRequestToDelete(requestId);
    setShowDeleteRequestConfirm(true);
  };

  const handleDeleteRequestConfirm = async () => {
    if (!user || !requestToDelete) return;

    setShowDeleteRequestConfirm(false);
    setDeletingRequestId(requestToDelete);

    const { error } = await deleteRequest(requestToDelete, user.id);

    if (error) {
      alert(`Failed to delete request: ${error.message}`);
      setDeletingRequestId(null);
      setRequestToDelete(null);
      return;
    }

    // Refresh both lists
    const availableRequests = await getAvailableRequests();
    setRequests(availableRequests);

    const myRequests = await getUserRequests(user.id);
    setUserRequests(myRequests);

    setDeletingRequestId(null);
    setRequestToDelete(null);
  };

  const handleDeleteRequestCancel = () => {
    setShowDeleteRequestConfirm(false);
    setRequestToDelete(null);
  };

  const handleDonationPickedUp = async (donationId: string) => {
    if (!user) return;

    // Update donation status to "claimed" and set claimed_by to current user
    const { error } = await updateDonationStatus(
      donationId,
      "claimed",
      user.id
    );

    if (error) {
      alert(`Failed to pick up donation: ${error.message}`);
      return;
    }

    // Refresh all donation lists
    const availableDonations = await getAvailableDonations();
    setDonations(availableDonations);

    // Fetch donations claimed by the current user (filter out items older than 3 days)
    const claimedDonations = await getDonationsClaimedByUser(user.id);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const recentClaimedDonations = claimedDonations.filter((donation) => {
      const updatedAt = new Date(donation.updated_at);
      return updatedAt >= threeDaysAgo;
    });
    setPickingUpDonations(recentClaimedDonations);

    const myDonations = await getUserDonations(user.id);
    setUserDonations(myDonations);
  };

  const handlePickingUp = () => {
    setIsPickingUpOpen(true);
  };

  const handleUnclaimDonation = async (donationId: string) => {
    if (!user) return;

    setUnclaimingId(donationId);

    // Update donation status back to "available" and clear claimed_by
    const { error } = await updateDonationStatus(donationId, "available", null);

    if (error) {
      alert(`Failed to unclaim donation: ${error.message}`);
      setUnclaimingId(null);
      return;
    }

    // Refresh all donation lists
    const availableDonations = await getAvailableDonations();
    setDonations(availableDonations);

    // Fetch donations claimed by the current user (filter out items older than 3 days)
    const claimedDonations = await getDonationsClaimedByUser(user.id);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const recentClaimedDonations = claimedDonations.filter((donation) => {
      const updatedAt = new Date(donation.updated_at);
      return updatedAt >= threeDaysAgo;
    });
    setPickingUpDonations(recentClaimedDonations);

    setUnclaimingId(null);
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
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        @media (min-width: 768px) {
          .slider::-webkit-slider-thumb {
            width: 18px;
            height: 18px;
          }
        }
        @media (min-width: 1024px) {
          .slider::-webkit-slider-thumb {
            width: 20px;
            height: 20px;
          }
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        @media (min-width: 768px) {
          .slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
          }
        }
        @media (min-width: 1024px) {
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
          }
        }
      `,
        }}
      />
      <Navbar />

      {/* World Map Globe - shown when toggle is active */}
      {isWorldMapActive && (
        <div className="absolute inset-0 w-full h-full z-0 bg-black">
          <WorldGlobe
            requests={requests}
            onPinClick={(count, pinRequests) => {
              setSelectedPinCount(count);
              setSelectedPinRequests(pinRequests);
              setShowPinModal(true);
            }}
          />
        </div>
      )}

      {/* Full screen map */}
      {!isWorldMapActive && (
        <div className="absolute inset-0 w-full h-full z-0">
          {userLocation ? (
            <MapComponent
              center={userLocation}
              donations={donations}
              requests={requests}
              radius={radius}
              onDonationPickedUp={handleDonationPickedUp}
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
                <p className="text-gray-600 font-medium">
                  Location unavailable
                </p>
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
      )}

      {/* Overlay controls - positioned on top of map */}
      <div className="absolute top-20 left-2 md:top-24 md:left-4 lg:left-8 z-10">
        {/* World Map Toggle */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-gray-100 w-40 md:w-52 lg:w-64 overflow-hidden mb-2">
          <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-200">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs md:text-sm font-medium text-gray-700">
                World Map Toggle
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isWorldMapActive}
                  onChange={(e) => setIsWorldMapActive(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`relative w-9 h-5 md:w-10 md:h-5 lg:w-11 lg:h-6 rounded-full transition-colors duration-200 ease-in-out ${
                    isWorldMapActive ? "bg-[#367230]" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      isWorldMapActive
                        ? "translate-x-4 md:translate-x-5 lg:translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Post a Donation Menu - only show if world map is not active */}
        {!isWorldMapActive && (
          <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-gray-100 w-40 md:w-52 lg:w-64 overflow-hidden transition-all duration-300">
            {/* Caret/Arrow button at top */}
            <button
              onClick={() => setIsControlsMinimized(!isControlsMinimized)}
              className="w-full py-2 px-3 bg-[#367230] bg-opacity-10 hover:bg-opacity-20 transition-colors flex items-center justify-center border-b border-gray-200"
            >
              <svg
                className={`w-4 h-4 text-[#367230] transition-transform duration-300 ${
                  isControlsMinimized ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Collapsible content */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isControlsMinimized
                  ? "max-h-0 opacity-0"
                  : "max-h-[1000px] opacity-100"
              }`}
            >
              <div className="p-2 md:p-4 lg:p-6 space-y-2 md:space-y-3 lg:space-y-4">
                {/* Post a Donation Button */}
                <div className="bg-[#367230] rounded-md md:rounded-lg p-2 md:p-3 lg:p-4 shadow-md hover:shadow-lg transition-shadow">
                  <button
                    onClick={handlePostDonation}
                    className="w-full text-xs md:text-sm font-semibold uppercase tracking-wider text-white py-1.5 md:py-2 lg:py-3 px-2 md:px-3 lg:px-4 rounded transition-all hover:opacity-90 active:scale-95"
                  >
                    Post a Donation
                  </button>
                </div>

                {/* Filter Button */}
                <button
                  onClick={handleFilter}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white rounded"
                >
                  Filter
                </button>

                {/* My Postings Button */}
                <button
                  onClick={handleMyPostings}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white rounded"
                >
                  My Postings ({userDonations.length})
                </button>

                {/* Picking Up Button */}
                <button
                  onClick={handlePickingUp}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white rounded"
                >
                  Picking Up ({pickingUpDonations.length})
                </button>

                {/* Radius Selection Card */}
                <div className="bg-gray-50 rounded-md md:rounded-lg p-2 md:p-3 lg:p-4 border border-gray-200">
                  <div className="mb-2 md:mb-3">
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
                      className="w-full h-1.5 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                          ((radius - 100) / (2000 - 100)) * 100
                        }%, #e5e7eb ${
                          ((radius - 100) / (2000 - 100)) * 100
                        }%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5 md:mt-1">
                      <span>100m</span>
                      <span>2km</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5 md:mb-1">
                        In Range
                      </p>
                      <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
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
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-md md:rounded-lg flex items-center justify-center opacity-50">
                      <svg
                        className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white"
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
        )}

        {/* Request a Donation Menu - positioned below Post a Donation menu - only show if world map is not active */}
        {!isWorldMapActive && (
          <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-gray-100 w-40 md:w-52 lg:w-64 overflow-hidden transition-all duration-300 mt-2">
            {/* Caret/Arrow button at top */}
            <button
              onClick={() => setIsRequestMenuMinimized(!isRequestMenuMinimized)}
              className="w-full py-2 px-3 bg-red-900 bg-opacity-10 hover:bg-opacity-20 transition-colors flex items-center justify-center border-b border-gray-200"
            >
              <svg
                className={`w-4 h-4 text-red-900 transition-transform duration-300 ${
                  isRequestMenuMinimized ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Collapsible content */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isRequestMenuMinimized
                  ? "max-h-0 opacity-0"
                  : "max-h-[1000px] opacity-100"
              }`}
            >
              <div className="p-2 md:p-4 lg:p-6 space-y-2 md:space-y-3 lg:space-y-4">
                {/* Request a Donation Button */}
                <div className="bg-red-900 rounded-md md:rounded-lg p-2 md:p-3 lg:p-4 shadow-md hover:shadow-lg transition-shadow">
                  <button
                    onClick={handleRequestDonation}
                    className="w-full text-xs md:text-sm font-semibold uppercase tracking-wider text-white py-1.5 md:py-2 lg:py-3 px-2 md:px-3 lg:px-4 rounded transition-all hover:opacity-90 active:scale-95"
                  >
                    Request a Donation
                  </button>
                </div>

                {/* Filter Button */}
                <button
                  onClick={handleFilter}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white rounded"
                >
                  Filter
                </button>

                {/* My Requests Button */}
                <button
                  onClick={handleMyRequests}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white rounded"
                >
                  My Requests ({userRequests.length})
                </button>

                {/* Radius Selection Card */}
                <div className="bg-gray-50 rounded-md md:rounded-lg p-2 md:p-3 lg:p-4 border border-gray-200">
                  <div className="mb-2 md:mb-3">
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
                      className="w-full h-1.5 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #991b1b 0%, #991b1b ${
                          ((radius - 100) / (2000 - 100)) * 100
                        }%, #e5e7eb ${
                          ((radius - 100) / (2000 - 100)) * 100
                        }%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5 md:mt-1">
                      <span>100m</span>
                      <span>2km</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5 md:mb-1">
                        In Range
                      </p>
                      <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                        {userLocation
                          ? requests.filter((request) => {
                              const distance = calculateDistance(
                                userLocation[0],
                                userLocation[1],
                                request.latitude,
                                request.longitude
                              );
                              // Convert distance from km to meters for comparison
                              return distance * 1000 <= radius;
                            }).length
                          : 0}
                      </p>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-red-900 rounded-md md:rounded-lg flex items-center justify-center opacity-50">
                      <svg
                        className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white"
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
        )}
      </div>

      {/* Post Donation Modal */}
      <PostDonationModal
        isOpen={isPostDonationModalOpen}
        onClose={() => setIsPostDonationModalOpen(false)}
        onSuccess={handleDonationPosted}
        currentLocation={userLocation}
      />

      {/* Request Donation Modal */}
      <RequestDonationModal
        isOpen={isRequestDonationModalOpen}
        onClose={() => setIsRequestDonationModalOpen(false)}
        onSuccess={handleRequestPosted}
        currentLocation={userLocation}
      />

      {/* My Postings Modal */}
      {isMyPostingsOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={() => setIsMyPostingsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-gray-100 transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 bg-[#367230] bg-opacity-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tighter text-black">
                  My Postings
                </h2>
                <button
                  onClick={() => setIsMyPostingsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-100px)] p-6">
              {userDonations.length === 0 ? (
                <div className="text-center py-12">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">
                    No postings yet
                  </p>
                  <p className="text-sm text-gray-500">
                    Create your first donation posting to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userDonations.map((donation) => (
                    <div
                      key={donation.id}
                      className="bg-[#367230] bg-opacity-5 rounded-lg p-4 border border-[#367230] border-opacity-20 hover:border-opacity-30 transition-all"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 relative">
                          {donation.image_url && (
                            <img
                              src={donation.image_url}
                              alt={donation.title}
                              className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border-2 border-[#367230] border-opacity-20"
                            />
                          )}
                          <button
                            onClick={() => handleDeleteClick(donation.id)}
                            disabled={deletingId === donation.id}
                            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            title="Delete"
                          >
                            {deletingId === donation.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            ) : (
                              <svg
                                className="w-4 h-4 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-black text-sm md:text-base truncate">
                              {donation.title}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                donation.status === "available"
                                  ? "bg-[#367230] bg-opacity-20 text-[#367230]"
                                  : donation.status === "claimed"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {donation.status}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-gray-700 line-clamp-2 mb-2">
                            {donation.description}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                            {donation.category && (
                              <span className="bg-[#367230] bg-opacity-10 px-2 py-1 rounded border border-[#367230] border-opacity-20 text-black">
                                {donation.category}
                              </span>
                            )}
                            {donation.expiry_date && (
                              <span className="bg-[#367230] bg-opacity-10 px-2 py-1 rounded border border-[#367230] border-opacity-20 text-black">
                                Expires:{" "}
                                {new Date(
                                  donation.expiry_date
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Picking Up Modal */}
      {isPickingUpOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={() => setIsPickingUpOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-gray-100 transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 bg-[#367230] bg-opacity-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tighter text-black">
                    Picking Up
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Items picked up 3 days ago will disappear
                  </p>
                </div>
                <button
                  onClick={() => setIsPickingUpOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-100px)] p-6">
              {pickingUpDonations.length === 0 ? (
                <div className="text-center py-12">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">
                    No items being picked up
                  </p>
                  <p className="text-sm text-gray-500">
                    Pick up donations from the map to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pickingUpDonations.map((donation) => (
                    <div
                      key={donation.id}
                      className="bg-[#367230] bg-opacity-5 rounded-lg p-4 border border-[#367230] border-opacity-20 hover:border-opacity-30 transition-all"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {donation.image_url && (
                            <>
                              <img
                                src={donation.image_url}
                                alt={donation.title}
                                className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border-2 border-[#367230] border-opacity-20"
                              />
                              <button
                                onClick={() => setShowTipComingSoon(true)}
                                className="w-20 md:w-24 mt-2 px-2 py-1.5 bg-[#367230] text-white text-xs font-medium rounded hover:bg-[#244b20] transition-colors"
                              >
                                Tip
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-black text-sm md:text-base truncate">
                              {donation.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 bg-yellow-100 text-yellow-700">
                                claimed
                              </span>
                              <button
                                onClick={() =>
                                  handleUnclaimDonation(donation.id)
                                }
                                disabled={unclaimingId === donation.id}
                                className="text-gray-500 hover:text-red-600 text-xl font-bold w-6 h-6 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Nevermind"
                              >
                                {unclaimingId === donation.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                ) : (
                                  "×"
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs md:text-sm text-gray-700 line-clamp-2 mb-2">
                            {donation.description}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                            {donation.category && (
                              <span className="bg-[#367230] bg-opacity-10 px-2 py-1 rounded border border-[#367230] border-opacity-20 text-black">
                                {donation.category}
                              </span>
                            )}
                            {donation.address && (
                              <span className="bg-[#367230] bg-opacity-10 px-2 py-1 rounded border border-[#367230] border-opacity-20 text-black">
                                📍 {donation.address}
                              </span>
                            )}
                            {donation.expiry_date && (
                              <span className="bg-[#367230] bg-opacity-10 px-2 py-1 rounded border border-[#367230] border-opacity-20 text-black">
                                Expires:{" "}
                                {new Date(
                                  donation.expiry_date
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pin Click Modal */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-gray-100 transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 bg-red-900 bg-opacity-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tighter text-black">
                  Requests in Area ({selectedPinCount})
                </h3>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-150px)] p-6">
              {selectedPinRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 font-medium mb-2">
                    No requests found
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedPinRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-red-900 bg-opacity-5 rounded-lg p-4 border border-red-900 border-opacity-20 hover:border-opacity-30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-black text-sm md:text-base truncate">
                          {request.title}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            request.status === "open"
                              ? "bg-red-900 bg-opacity-20 text-red-900"
                              : request.status === "fulfilled"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-700 line-clamp-2 mb-2">
                        {request.description}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                        {request.address && (
                          <span className="bg-red-900 bg-opacity-10 px-2 py-1 rounded border border-red-900 border-opacity-20 text-black">
                            📍 {request.address}
                          </span>
                        )}
                        {request.phone_number && (
                          <span className="bg-red-900 bg-opacity-10 px-2 py-1 rounded border border-red-900 border-opacity-20 text-black">
                            📞 {request.phone_number}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setIsRequestDonationModalOpen(true);
                  }}
                  className="flex-1 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors font-medium text-sm"
                >
                  Donate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tip Coming Soon Modal */}
      {showTipComingSoon && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={() => setShowTipComingSoon(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-100 transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 bg-[#367230] bg-opacity-10">
              <h3 className="text-xl font-bold tracking-tighter text-black">
                Coming Soon
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                The tip feature is coming soon!
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowTipComingSoon(false)}
                  className="px-4 py-2 bg-[#367230] text-white rounded-lg hover:bg-[#244b20] transition-colors font-medium text-sm"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Requests Modal */}
      {isMyRequestsOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={() => setIsMyRequestsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-gray-100 transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 bg-red-900 bg-opacity-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tighter text-black">
                  My Requests
                </h2>
                <button
                  onClick={() => setIsMyRequestsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-100px)] p-6">
              {userRequests.length === 0 ? (
                <div className="text-center py-12">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">
                    No requests yet
                  </p>
                  <p className="text-sm text-gray-500">
                    Create your first donation request to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-red-900 bg-opacity-5 rounded-lg p-4 border border-red-900 border-opacity-20 hover:border-opacity-30 transition-all"
                    >
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-black text-sm md:text-base truncate">
                              {request.title}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                request.status === "open"
                                  ? "bg-red-900 bg-opacity-20 text-red-900"
                                  : request.status === "fulfilled"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {request.status}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-gray-700 line-clamp-2 mb-2">
                            {request.description}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                            {request.address && (
                              <span className="bg-red-900 bg-opacity-10 px-2 py-1 rounded border border-red-900 border-opacity-20 text-black">
                                📍 {request.address}
                              </span>
                            )}
                            {request.phone_number && (
                              <span className="bg-red-900 bg-opacity-10 px-2 py-1 rounded border border-red-900 border-opacity-20 text-black">
                                📞 {request.phone_number}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteRequestClick(request.id)}
                            disabled={deletingRequestId === request.id}
                            className="mt-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            title="Delete"
                          >
                            {deletingRequestId === request.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                            ) : (
                              <svg
                                className="w-4 h-4 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={handleDeleteCancel}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-100 transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 bg-[#367230] bg-opacity-10">
              <h3 className="text-xl font-bold tracking-tighter text-black">
                Delete Posting
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this posting? This action cannot
                be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Request Confirmation Modal */}
      {showDeleteRequestConfirm && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={handleDeleteRequestCancel}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-100 transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 bg-red-900 bg-opacity-10">
              <h3 className="text-xl font-bold tracking-tighter text-black">
                Delete Request
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this request? This action cannot
                be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteRequestCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRequestConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
