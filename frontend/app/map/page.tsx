"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { ROUTES } from "@/app/lib/routes";
import { Navbar } from "@/app/components/navbar";
import { hasProfile } from "@/app/lib/supabase/profile";
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
import {
  getAllMonetaryDonations,
  MonetaryDonation,
} from "@/app/lib/supabase/monetary-donations";
import TipModal from "@/app/components/TipModal";
import { getOrCreateLocationName } from "@/app/lib/supabase/locations";
import PostDonationModal from "./PostDonationModal";
import RequestDonationModal from "./RequestDonationModal";
import DonationSliderModal from "./DonationSliderModal";
import WorldGlobe, { HighestNeedLocation } from "./WorldGlobe";
import ConnectionMap from "./ConnectionMap";
import PinClickModal from "./PinClickModal";
import HighestNeedModal from "./HighestNeedModal";
import { calculateDistance } from "./utils";
import "leaflet/dist/leaflet.css";

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-200">
      <p className="text-gray-600">Loading map...</p>
    </div>
  ),
}) as ComponentType<{
  center: [number, number];
  donations?: Donation[];
  requests?: Request[];
  radius?: number;
  onDonationPickedUp?: (donationId: string) => void;
}>;

// Testing flag - set to true to use default location when geolocation is unavailable
const USE_DEFAULT_LOCATION_FOR_TESTING = true;
// Princeton University coordinates
const PRINCETON_UNIVERSITY_LOCATION: [number, number] = [40.3431, -74.6553];

export default function MapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingProfile, setCheckingProfile] = useState(true);
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
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [donationToConfirm, setDonationToConfirm] = useState<Donation | null>(
    null
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
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
  const [isConnectionMapActive, setIsConnectionMapActive] = useState(false);
  const [monetaryDonations, setMonetaryDonations] = useState<
    MonetaryDonation[]
  >([]);
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);
  const [isRequestMenuMinimized, setIsRequestMenuMinimized] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedPinCount, setSelectedPinCount] = useState<number>(0);
  const [selectedPinRequests, setSelectedPinRequests] = useState<Request[]>([]);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [estimatedStats, setEstimatedStats] = useState<{
    totalRequestsLast4Weeks: number;
    donationGoalUSD: number;
    peopleHelped: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showDonationSlider, setShowDonationSlider] = useState(false);
  const [selectedPinCoordinates, setSelectedPinCoordinates] = useState<
    [number, number] | null
  >(null);
  const [showTooFarAwayModal, setShowTooFarAwayModal] = useState(false);
  const [tooFarAwayDistance, setTooFarAwayDistance] = useState<number | null>(
    null
  );
  const [highestNeedLocation, setHighestNeedLocation] =
    useState<HighestNeedLocation | null>(null);
  const [loadingHighestNeed, setLoadingHighestNeed] = useState(false);
  const [showHighestNeedModal, setShowHighestNeedModal] = useState(false);

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

        // Fetch monetary donations for connection map
        const monetaryDonationsData = await getAllMonetaryDonations();
        setMonetaryDonations(monetaryDonationsData);
      }
    };

    fetchData();
  }, [user, checkingProfile]);

  // Fetch ML API highest need location when world map is active
  useEffect(() => {
    const fetchHighestNeed = async () => {
      if (isWorldMapActive && !isConnectionMapActive) {
        setLoadingHighestNeed(true);
        try {
          // Use Next.js API route as proxy to avoid CORS and HTTP/HTTPS issues
          const response = await fetch("/api/highest-need", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Highest need location fetched:", data);
            setHighestNeedLocation(data);
          } else {
            const errorData = await response.json();
            console.error(
              "Failed to fetch highest need location:",
              response.status,
              errorData
            );
            setHighestNeedLocation(null);
          }
        } catch (error: any) {
          console.error("Error fetching highest need location:", error);
          setHighestNeedLocation(null);
        } finally {
          setLoadingHighestNeed(false);
        }
      } else {
        // Reset when world map is not active
        setHighestNeedLocation(null);
      }
    };

    fetchHighestNeed();
  }, [isWorldMapActive, isConnectionMapActive]);

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

    // Check if user location is available
    if (!userLocation) {
      setTooFarAwayDistance(null);
      setShowTooFarAwayModal(true);
      return;
    }

    // Find the donation to get its coordinates
    const donation = donations.find((d) => d.id === donationId);
    if (!donation) {
      setTooFarAwayDistance(null);
      setShowTooFarAwayModal(true);
      return;
    }

    // Calculate distance between user location and donation location
    const distance = calculateDistance(
      userLocation[0],
      userLocation[1],
      donation.latitude,
      donation.longitude
    );

    // Check if donation is within 5km
    if (distance > 5) {
      setTooFarAwayDistance(distance);
      setShowTooFarAwayModal(true);
      return;
    }

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

      {/* World Map Globe - shown when toggle is active and connection map is not active */}
      {isWorldMapActive && !isConnectionMapActive && (
        <div className="absolute inset-0 w-full h-full z-0 bg-black">
          <WorldGlobe
            requests={requests}
            highestNeedLocation={highestNeedLocation}
            onHighestNeedClick={(location) => {
              setShowHighestNeedModal(true);
            }}
            onPinClick={async (count, pinRequests, coordinates) => {
              setSelectedPinCount(count);
              setSelectedPinRequests(pinRequests);
              setSelectedPinCoordinates(coordinates);
              setEstimatedStats(null);
              setLoadingStats(true);

              // Fetch location name and estimate statistics
              try {
                const [nameResult, statsResult] = await Promise.all([
                  getOrCreateLocationName(coordinates[0], coordinates[1]).catch(
                    () => null
                  ),
                  fetch("/api/estimate-statistics", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      descriptions: pinRequests.map((r) => r.description || ""),
                    }),
                  })
                    .then((res) => res.json())
                    .catch(() => null),
                ]);

                // Extract country from location name
                if (nameResult) {
                  const country =
                    nameResult.split(",").pop()?.trim() || nameResult;
                  setLocationName(country);
                }

                // Set estimated statistics
                if (statsResult && !statsResult.error) {
                  setEstimatedStats({
                    totalRequestsLast4Weeks:
                      statsResult.totalRequestsLast4Weeks || 0,
                    donationGoalUSD: statsResult.donationGoalUSD || 0,
                    peopleHelped: statsResult.peopleHelped || 0,
                  });
                }
              } catch (error) {
                console.error("Error fetching data:", error);
                setLocationName(null);
              } finally {
                setLoadingStats(false);
              }

              // Show modal after data is fetched
              setShowPinModal(true);
            }}
          />
        </div>
      )}

      {/* Connection Map - shown when both world map and connection map toggles are active */}
      {isWorldMapActive && isConnectionMapActive && (
        <div className="absolute inset-0 w-full h-full z-0 bg-black">
          <ConnectionMap donations={monetaryDonations} />
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
      <div className="absolute top-24 left-2 md:top-24 md:left-4 lg:left-8 z-10">
        {/* World Map Toggle */}
        <div className="bg-white border border-black w-40 md:w-52 lg:w-64 overflow-hidden mb-2">
          <div className="p-3 md:p-4 border-b border-black">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs md:text-sm uppercase tracking-widest text-black">
                World Map
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

        {/* Connection Map Toggle - only show when world map is active */}
        {isWorldMapActive && (
          <div className="bg-white border border-black w-40 md:w-52 lg:w-64 overflow-hidden mb-2">
            <div className="p-3 md:p-4 border-b border-black">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs md:text-sm uppercase tracking-widest text-black">
                  Connection Map
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isConnectionMapActive}
                    onChange={(e) => setIsConnectionMapActive(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`relative w-9 h-5 md:w-10 md:h-5 lg:w-11 lg:h-6 rounded-full transition-colors duration-200 ease-in-out ${
                      isConnectionMapActive ? "bg-[#367230]" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        isConnectionMapActive
                          ? "translate-x-4 md:translate-x-5 lg:translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Post a Donation Menu - only show if world map is not active */}
        {!isWorldMapActive && (
          <div className="bg-white border border-black w-40 md:w-52 lg:w-64 overflow-hidden transition-all duration-300">
            {/* Caret/Arrow button at top */}
            <button
              onClick={() => setIsControlsMinimized(!isControlsMinimized)}
              className="w-full py-2 px-3 bg-[#367230] bg-opacity-10 hover:bg-opacity-20 transition-colors flex items-center justify-center border-b border-black"
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
                <div className="bg-[#367230] border border-black p-2 md:p-3 lg:p-4">
                  <button
                    onClick={handlePostDonation}
                    className="w-full text-xs md:text-sm uppercase tracking-widest text-white py-1.5 md:py-2 lg:py-3 px-2 md:px-3 lg:px-4 transition-colors hover:opacity-90"
                  >
                    Post a Donation
                  </button>
                </div>

                {/* Filter Button */}
                <button
                  onClick={handleFilter}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white"
                >
                  Filter
                </button>

                {/* My Postings Button */}
                <button
                  onClick={handleMyPostings}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white"
                >
                  My Postings ({userDonations.length})
                </button>

                {/* Picking Up Button */}
                <button
                  onClick={handlePickingUp}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white"
                >
                  Picking Up ({pickingUpDonations.length})
                </button>

                {/* Radius Selection Card */}
                <div className="bg-white p-2 md:p-3 lg:p-4 border border-black">
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
          <div className="bg-white border border-black w-40 md:w-52 lg:w-64 overflow-hidden transition-all duration-300 mt-2">
            {/* Caret/Arrow button at top */}
            <button
              onClick={() => setIsRequestMenuMinimized(!isRequestMenuMinimized)}
              className="w-full py-2 px-3 bg-red-900 bg-opacity-10 hover:bg-opacity-20 transition-colors flex items-center justify-center border-b border-black"
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
                <div className="bg-red-900 border border-black p-2 md:p-3 lg:p-4">
                  <button
                    onClick={handleRequestDonation}
                    className="w-full text-xs md:text-sm uppercase tracking-widest text-white py-1.5 md:py-2 lg:py-3 px-2 md:px-3 lg:px-4 transition-colors hover:opacity-90"
                  >
                    Request a Donation
                  </button>
                </div>

                {/* Filter Button */}
                <button
                  onClick={handleFilter}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white"
                >
                  Filter
                </button>

                {/* My Requests Button */}
                <button
                  onClick={handleMyRequests}
                  className="w-full text-xs md:text-sm uppercase tracking-widest bg-white text-black border border-black px-2 md:px-3 lg:px-5 py-1.5 md:py-2 transition-colors hover:bg-black hover:text-white"
                >
                  My Requests ({userRequests.length})
                </button>

                {/* Radius Selection Card */}
                <div className="bg-white p-2 md:p-3 lg:p-4 border border-black">
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
            className="bg-white max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-black transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-black bg-[#367230] bg-opacity-10">
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
                      className="bg-[#367230] bg-opacity-5 p-4 border border-black"
                    >
                      <div className="flex gap-4 relative">
                        {donation.image_url && (
                          <div className="flex-shrink-0">
                            <img
                              src={donation.image_url}
                              alt={donation.title}
                              className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border-2 border-[#367230] border-opacity-20"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-black text-sm md:text-base truncate">
                              {donation.title}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium flex-shrink-0 border border-black ${
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
                              <span className="bg-[#367230] bg-opacity-10 px-2 py-1 border border-black text-black">
                                {donation.category}
                              </span>
                            )}
                            {donation.expiry_date && (
                              <span className="bg-[#367230] bg-opacity-10 px-2 py-1 border border-black text-black">
                                Expires:{" "}
                                {new Date(
                                  donation.expiry_date
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(donation.id)}
                          disabled={deletingId === donation.id}
                          className="absolute bottom-0 right-0 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
            className="bg-white max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-black transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-black bg-[#367230] bg-opacity-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tighter text-black">
                    Picking Up
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Items picked up 3 days ago will disappear
                  </p>
                  <p className="text-xs font-semibold text-black mt-2">
                    Limit: {pickingUpDonations.length}/3
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
                      className="bg-[#367230] bg-opacity-5 p-4 border border-black"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {donation.image_url && (
                            <img
                              src={donation.image_url}
                              alt={donation.title}
                              className="w-20 h-20 md:w-24 md:h-24 object-cover border-2 border-black"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-black text-sm md:text-base truncate">
                              {donation.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 text-xs font-medium flex-shrink-0 bg-yellow-100 text-yellow-700 border border-black">
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
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                setDonationToConfirm(donation);
                                setIsTipModalOpen(true);
                              }}
                              disabled={confirmingId === donation.id}
                              className="w-full px-4 py-2 bg-[#367230] text-white text-sm uppercase tracking-widest hover:bg-[#244b20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black"
                            >
                              {confirmingId === donation.id
                                ? "Confirming..."
                                : "Confirm Picked Up"}
                            </button>
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

      {/* Tip Modal */}
      {donationToConfirm && (
        <TipModal
          isOpen={isTipModalOpen}
          onClose={() => {
            setIsTipModalOpen(false);
            setDonationToConfirm(null);
          }}
          onConfirm={async (tipAmount: number | null) => {
            if (!donationToConfirm || !user) return;

            setConfirmingId(donationToConfirm.id);

            try {
              // Update donation status to "completed" (no tip case)
              const { error } = await updateDonationStatus(
                donationToConfirm.id,
                "completed"
              );

              if (error) {
                alert(`Failed to confirm pickup: ${error.message}`);
                setConfirmingId(null);
                return;
              }

              // Refresh all donation lists
              const availableDonations = await getAvailableDonations();
              setDonations(availableDonations);

              const claimedDonations = await getDonationsClaimedByUser(user.id);
              const threeDaysAgo = new Date();
              threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
              const recentClaimedDonations = claimedDonations.filter(
                (donation) => {
                  const updatedAt = new Date(donation.updated_at);
                  return updatedAt >= threeDaysAgo;
                }
              );
              setPickingUpDonations(recentClaimedDonations);

              const myDonations = await getUserDonations(user.id);
              setUserDonations(myDonations);

              // Refresh monetary donations if on connection map
              if (isConnectionMapActive) {
                const allMonetaryDonations = await getAllMonetaryDonations();
                setMonetaryDonations(allMonetaryDonations);
              }

              setIsTipModalOpen(false);
              setDonationToConfirm(null);
              setConfirmingId(null);
            } catch (error: any) {
              console.error("Error confirming pickup:", error);
              alert("Failed to confirm pickup. Please try again.");
              setConfirmingId(null);
            }
          }}
          onTipCheckout={async (tipAmount: number) => {
            if (!donationToConfirm || !user || !userLocation) {
              alert("Location information is missing");
              return;
            }

            try {
              // Create Stripe checkout session for tip
              const response = await fetch("/api/create-tip-checkout-session", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  amount: tipAmount,
                  userId: user.id,
                  donationId: donationToConfirm.id,
                  fromLatitude: userLocation[0],
                  fromLongitude: userLocation[1],
                  toLatitude: donationToConfirm.latitude,
                  toLongitude: donationToConfirm.longitude,
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.error || "Failed to create checkout session"
                );
              }

              // Redirect to Stripe checkout
              if (data.url) {
                window.location.href = data.url;
              } else {
                throw new Error("No checkout URL returned");
              }
            } catch (error: any) {
              console.error("Error creating tip checkout session:", error);
              alert("Failed to process tip payment. Please try again.");
              throw error;
            }
          }}
          donationTitle={donationToConfirm.title}
          donationId={donationToConfirm.id}
          userId={user?.id || null}
          userLocation={userLocation}
          donationLocation={[
            donationToConfirm.latitude,
            donationToConfirm.longitude,
          ]}
        />
      )}

      {/* Pin Click Modal */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300 animate-fadeIn"
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="bg-white max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-black transition-all duration-300 scale-100 animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-black bg-red-900 bg-opacity-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tighter text-black">
                  Requests in Area{locationName ? `, ${locationName}` : ""}
                </h3>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            {/* Statistics and Requests List */}
            <div className="p-3 md:p-6 border-b border-black bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                {/* Left Side - Statistics */}
                <div className="flex-shrink-0">
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                    {/* Stat 1: Total Requests (Last 4 Weeks) */}
                    <div className="bg-white border border-black p-2 md:p-3">
                      <div className="text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                        Total Requests
                      </div>
                      <div className="text-base md:text-xl font-bold text-gray-900">
                        {loadingStats ? (
                          <span className="text-gray-400">...</span>
                        ) : estimatedStats ? (
                          estimatedStats.totalRequestsLast4Weeks
                        ) : (
                          selectedPinCount * 4
                        )}
                      </div>
                      <div className="text-[9px] md:text-xs text-gray-600 mt-0.5">
                        Last 4 weeks
                      </div>
                    </div>

                    {/* Stat 2: Donation Goal */}
                    <div className="bg-white border border-black p-2 md:p-3">
                      <div className="text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                        Donation Goal
                      </div>
                      <div className="text-base md:text-xl font-bold text-gray-900">
                        {loadingStats ? (
                          <span className="text-gray-400">...</span>
                        ) : estimatedStats ? (
                          `$${Math.round(
                            estimatedStats.donationGoalUSD
                          ).toLocaleString()}`
                        ) : (
                          `$${(selectedPinCount * 6 * 10).toLocaleString()}`
                        )}
                      </div>
                      <div className="text-[9px] md:text-xs text-gray-600 mt-0.5">
                        Target amount
                      </div>
                    </div>

                    {/* Stat 3: People Helped */}
                    <div className="bg-white border border-black p-2 md:p-3">
                      <div className="text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                        People Helped
                      </div>
                      <div className="text-base md:text-xl font-bold text-gray-900">
                        {loadingStats ? (
                          <span className="text-gray-400">...</span>
                        ) : estimatedStats ? (
                          estimatedStats.peopleHelped
                        ) : (
                          selectedPinCount * 3
                        )}
                      </div>
                      <div className="text-[9px] md:text-xs text-gray-600 mt-0.5">
                        Estimated impact
                      </div>
                    </div>

                    {/* Stat 4: Current Requests */}
                    <div className="bg-white border border-black p-2 md:p-3">
                      <div className="text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                        Current Requests
                      </div>
                      <div className="text-base md:text-xl font-bold text-gray-900">
                        {selectedPinCount}
                      </div>
                      <div className="text-[9px] md:text-xs text-gray-600 mt-0.5">
                        In this area
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Scrollable Requests List */}
                <div className="flex-1 overflow-y-auto pr-1 md:pr-2 scrollbar-hide max-h-[300px] md:max-h-[400px]">
                  {selectedPinRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-600 font-medium mb-2">
                        No requests found
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 md:space-y-3">
                      {selectedPinRequests.map((request) => (
                        <div
                          key={request.id}
                          className="bg-red-900 bg-opacity-5 p-3 md:p-4 border border-black hover:bg-opacity-10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-black text-xs md:text-sm lg:text-base truncate flex-1">
                              {request.title}
                            </h3>
                            <span
                              className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-medium flex-shrink-0 border border-black ${
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
                          <p className="text-[11px] md:text-xs lg:text-sm text-gray-700 line-clamp-2 mb-2">
                            {request.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-600">
                            {request.address && (
                              <span className="bg-red-900 bg-opacity-10 px-1.5 md:px-2 py-0.5 md:py-1 border border-black text-black">
                                📍 {request.address}
                              </span>
                            )}
                            {request.phone_number && (
                              <span className="bg-red-900 bg-opacity-10 px-1.5 md:px-2 py-0.5 md:py-1 border border-black text-black">
                                📞 {request.phone_number}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-black">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setShowDonationSlider(true);
                  }}
                  className="flex-1 text-sm uppercase tracking-widest border border-red-900 px-5 py-2 transition-colors bg-red-900 bg-opacity-10 hover:bg-red-900 hover:text-white text-red-900"
                >
                  Donate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Highest Need Location Modal (ML API) */}
      {showHighestNeedModal && highestNeedLocation && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300 animate-fadeIn"
          onClick={() => setShowHighestNeedModal(false)}
        >
          <div
            className="bg-white max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-black transition-all duration-300 scale-100 animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-black bg-purple-900 bg-opacity-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tighter text-black">
                  Highest Need Location
                  {highestNeedLocation.location_name
                    ? `, ${highestNeedLocation.location_name}`
                    : ""}
                </h3>
                <button
                  onClick={() => setShowHighestNeedModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            {/* Statistics */}
            <div className="p-3 md:p-6 border-b border-black bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                {/* Stat 1: Need Score */}
                <div className="bg-white border border-black p-2 md:p-3">
                  <div className="text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                    Need Score
                  </div>
                  <div className="text-base md:text-xl font-bold text-gray-900">
                    {(highestNeedLocation.predicted_need_score * 100).toFixed(
                      1
                    )}
                    %
                  </div>
                  <div className="text-[9px] md:text-xs text-gray-600 mt-0.5">
                    {highestNeedLocation.predicted_need_score >= 0.6
                      ? "High need"
                      : highestNeedLocation.predicted_need_score >= 0.3
                      ? "Medium need"
                      : "Low need"}
                  </div>
                </div>

                {/* Stat 2: Confidence */}
                <div className="bg-white border border-black p-2 md:p-3">
                  <div className="text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                    Confidence
                  </div>
                  <div className="text-base md:text-xl font-bold text-gray-900">
                    {(highestNeedLocation.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-[9px] md:text-xs text-gray-600 mt-0.5">
                    Model confidence
                  </div>
                </div>

                {/* Stat 3: Food Insecurity Rate */}
                {highestNeedLocation.food_insecurity_rate !== undefined && (
                  <div className="bg-white border border-black p-2 md:p-3">
                    <div className="text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                      Food Insecurity
                    </div>
                    <div className="text-base md:text-xl font-bold text-gray-900">
                      {(highestNeedLocation.food_insecurity_rate * 100).toFixed(
                        1
                      )}
                      %
                    </div>
                    <div className="text-[9px] md:text-xs text-gray-600 mt-0.5">
                      Estimated rate
                    </div>
                  </div>
                )}

                {/* Stat 4: Season */}
                <div className="bg-white border border-black p-2 md:p-3">
                  <div className="text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                    Season
                  </div>
                  <div className="text-base md:text-xl font-bold text-gray-900 capitalize">
                    {highestNeedLocation.season}
                  </div>
                  <div className="text-[9px] md:text-xs text-gray-600 mt-0.5"></div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-black">
              <div className="mb-4">
                <p className="text-xs text-gray-600">
                  The prediction is based on a custom ML model that analyzes
                  geographic factors, seasonal patterns, and food insecurity
                  rates on historical data patterns.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHighestNeedModal(false)}
                  className="flex-1 text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white"
                >
                  Close
                </button>
                {user && userLocation && (
                  <button
                    onClick={() => {
                      setShowHighestNeedModal(false);
                      setSelectedPinCoordinates([
                        highestNeedLocation.latitude,
                        highestNeedLocation.longitude,
                      ]);
                      setShowDonationSlider(true);
                    }}
                    className="flex-1 text-sm uppercase tracking-widest border border-purple-900 px-5 py-2 transition-colors bg-purple-900 bg-opacity-10 hover:bg-purple-900 hover:text-white text-purple-900"
                  >
                    Donate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Donation Slider Modal */}
      {showDonationSlider && user && userLocation && selectedPinCoordinates && (
        <DonationSliderModal
          isOpen={showDonationSlider}
          onClose={() => setShowDonationSlider(false)}
          fromCoordinates={userLocation}
          toCoordinates={selectedPinCoordinates}
          userId={user.id}
        />
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
            className="bg-white max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-black transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-black bg-red-900 bg-opacity-10">
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
                      className="bg-red-900 bg-opacity-5 p-4 border border-black"
                    >
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-black text-sm md:text-base truncate">
                              {request.title}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium flex-shrink-0 border border-black ${
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
                              <span className="bg-red-900 bg-opacity-10 px-2 py-1 border border-black text-black">
                                📍 {request.address}
                              </span>
                            )}
                            {request.phone_number && (
                              <span className="bg-red-900 bg-opacity-10 px-2 py-1 border border-black text-black">
                                📞 {request.phone_number}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteRequestClick(request.id)}
                            disabled={deletingRequestId === request.id}
                            className="mt-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-xs text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-black"
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

      {/* Too Far Away Modal */}
      {showTooFarAwayModal && (
        <div
          className="fixed inset-0 z-[1002] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={() => setShowTooFarAwayModal(false)}
        >
          <div
            className="bg-white max-w-md w-full mx-4 border border-black transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-black bg-red-900 bg-opacity-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tighter text-black">
                  Oops... You're too far away
                </h3>
                <button
                  onClick={() => setShowTooFarAwayModal(false)}
                  className="w-6 h-6 rounded-full border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                >
                  <span className="text-sm font-bold">×</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                {tooFarAwayDistance
                  ? `This donation is ${tooFarAwayDistance.toFixed(
                      1
                    )}km away. You can only pick up donations within 5km of your location.`
                  : "Location unavailable. Please enable location services to pick up donations."}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
