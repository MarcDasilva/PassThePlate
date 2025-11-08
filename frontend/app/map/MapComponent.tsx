"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Donation } from "@/app/lib/supabase/donations";
import { Request } from "@/app/lib/supabase/requests";
import ProfileModal from "./ProfileModal";

// Fix for Leaflet default icon in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// Custom icon for donation markers (different color)
const donationIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom red icon for request markers
const requestIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Helper function to escape HTML to prevent XSS
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

interface MapComponentProps {
  center: [number, number];
  donations?: Donation[];
  requests?: Request[];
  radius?: number;
  onDonationPickedUp?: (donationId: string) => void;
}

export default function MapComponent({
  center,
  donations = [],
  requests = [],
  radius = 500,
  onDonationPickedUp,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const donationMarkersRef = useRef<L.Marker[]>([]);
  const requestMarkersRef = useRef<L.Marker[]>([]);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showDirectionsWarning, setShowDirectionsWarning] = useState(false);
  const [directionsLocation, setDirectionsLocation] = useState<
    [number, number] | null
  >(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize the map
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 17,
      scrollWheelZoom: true,
      zoomControl: true,
      doubleClickZoom: true,
      dragging: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add marker at the center location (user's location)
    const userMarker = L.marker(center).addTo(map);
    userMarkerRef.current = userMarker;

    // Add radius circle (radius is already in meters)
    const radiusCircle = L.circle(center, {
      radius: radius,
      fillColor: "#3b82f6", // Light blue
      fillOpacity: 0.2,
      color: "#3b82f6",
      weight: 2,
      opacity: 0.5,
    }).addTo(map);
    radiusCircleRef.current = radiusCircle;

    mapRef.current = map;

    // Cleanup function
    return () => {
      // Remove user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      // Remove radius circle
      if (radiusCircleRef.current) {
        radiusCircleRef.current.remove();
        radiusCircleRef.current = null;
      }
      // Remove donation markers
      donationMarkersRef.current.forEach((marker) => marker.remove());
      donationMarkersRef.current = [];
      // Remove request markers
      requestMarkersRef.current.forEach((marker) => marker.remove());
      requestMarkersRef.current = [];
      // Remove map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update map center, user marker position, and radius circle when center or radius changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Update map center if center changes
    if (center) {
      mapRef.current.setView(center, mapRef.current.getZoom());

      // Update user marker position
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(center);
      } else {
        // If marker doesn't exist yet, create it
        userMarkerRef.current = L.marker(center).addTo(mapRef.current);
      }
    }

    // Update or create radius circle (radius is already in meters)
    if (radiusCircleRef.current) {
      if (center) {
        radiusCircleRef.current.setLatLng(center);
      }
      radiusCircleRef.current.setRadius(radius);
    } else if (mapRef.current && center) {
      // If circle doesn't exist yet, create it
      radiusCircleRef.current = L.circle(center, {
        radius: radius,
        fillColor: "#3b82f6", // Light blue
        fillOpacity: 0.2,
        color: "#3b82f6",
        weight: 2,
        opacity: 0.5,
      }).addTo(mapRef.current);
    }
  }, [center, radius]);

  // Update donation markers when donations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing donation markers
    donationMarkersRef.current.forEach((marker) => marker.remove());
    donationMarkersRef.current = [];

    // Add new donation markers
    donations.forEach((donation) => {
      const marker = L.marker([donation.latitude, donation.longitude], {
        icon: donationIcon,
      }).addTo(mapRef.current!);

      // Calculate expiry date display if available
      let expiryDateHtml = "";
      if (donation.expiry_date) {
        const expiryDate = new Date(donation.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        const formattedDate = expiryDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        let statusText = "";
        let statusColor = "#666";
        if (daysUntilExpiry < 0) {
          statusText = ` (Expired ${Math.abs(daysUntilExpiry)} day${
            Math.abs(daysUntilExpiry) !== 1 ? "s" : ""
          } ago)`;
          statusColor = "#dc2626";
        } else if (daysUntilExpiry === 0) {
          statusText = " (Expires today)";
          statusColor = "#dc2626";
        } else if (daysUntilExpiry <= 3) {
          statusText = ` (Expires in ${daysUntilExpiry} day${
            daysUntilExpiry !== 1 ? "s" : ""
          })`;
          statusColor = "#f59e0b";
        } else {
          statusText = ` (Expires in ${daysUntilExpiry} days)`;
        }
        expiryDateHtml = `<div style="
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%);
          color: #15803d;
          padding: 6px 10px;
          border-radius: 6px;
          margin: 8px 0 12px 0;
          font-size: 11px;
          font-weight: 500;
          text-align: center;
          letter-spacing: 0.3px;
          opacity: 0.7;
        ">
          <strong>Expires:</strong> ${escapeHtml(formattedDate)}${escapeHtml(
          statusText
        )}
        </div>`;
      }

      // Create popup content with escaped HTML and view profile button
      const popupContent = document.createElement("div");
      popupContent.style.minWidth = "250px";
      popupContent.style.maxWidth = "400px";
      popupContent.innerHTML = `
        <div>
          ${
            donation.image_url
              ? `<img 
                  src="${escapeHtml(donation.image_url)}" 
                  alt="${escapeHtml(donation.title)}" 
                  style="
                    width: 100%; 
                    height: 120px; 
                    object-fit: cover; 
                    border-radius: 4px; 
                    margin-bottom: 0;
                    border: 1px solid #ddd;
                  "
                  onerror="this.style.display='none'"
                />`
              : ""
          }
          ${expiryDateHtml}
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${escapeHtml(
            donation.title
          )}</h3>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${escapeHtml(
            donation.description
          )}</p>
          ${
            donation.category
              ? `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Category:</strong> ${escapeHtml(
                  donation.category
                )}</p>`
              : ""
          }
          ${
            donation.address
              ? `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Address:</strong> ${escapeHtml(
                  donation.address
                )}</p>`
              : ""
          }
          <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
            <button 
              id="view-profile-${donation.id}" 
              style="
                flex: 1;
                min-width: 80px;
                padding: 8px 12px; 
                background-color: #367230; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
              "
              onmouseover="this.style.backgroundColor='#244b20'"
              onmouseout="this.style.backgroundColor='#367230'"
            >
              View Profile
            </button>
            <button 
              id="directions-${donation.id}" 
              style="
                flex: 1;
                min-width: 80px;
                padding: 8px 12px; 
                background-color: #3b82f6; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
              "
              onmouseover="this.style.backgroundColor='#2563eb'"
              onmouseout="this.style.backgroundColor='#3b82f6'"
            >
              Directions
            </button>
            ${
              donation.status === "available"
                ? `<button 
                    id="pick-up-${donation.id}" 
                    style="
                      flex: 1;
                      min-width: 80px;
                      padding: 8px 12px; 
                      background-color: #10b981; 
                      color: white; 
                      border: none; 
                      border-radius: 4px; 
                      cursor: pointer; 
                      font-size: 14px;
                      font-weight: 500;
                      transition: background-color 0.2s;
                    "
                    onmouseover="this.style.backgroundColor='#059669'"
                    onmouseout="this.style.backgroundColor='#10b981'"
                  >
                    Pick Up
                  </button>`
                : ""
            }
          </div>
        </div>
      `;

      // Add click handler for view profile button
      const viewProfileBtn = popupContent.querySelector(
        `#view-profile-${donation.id}`
      ) as HTMLButtonElement;
      if (viewProfileBtn) {
        viewProfileBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Open profile modal without closing the popup
          setSelectedUserId(donation.user_id);
          setIsProfileModalOpen(true);
        });
      }

      // Add click handler for directions button
      const directionsBtn = popupContent.querySelector(
        `#directions-${donation.id}`
      ) as HTMLButtonElement;
      if (directionsBtn) {
        directionsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Show warning modal first
          setDirectionsLocation([donation.latitude, donation.longitude]);
          setShowDirectionsWarning(true);
        });
      }

      // Add click handler for pick up button
      const pickUpBtn = popupContent.querySelector(
        `#pick-up-${donation.id}`
      ) as HTMLButtonElement;
      if (pickUpBtn && onDonationPickedUp) {
        pickUpBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Call the callback to handle pick up
          onDonationPickedUp(donation.id);
        });
      }

      marker.bindPopup(popupContent);
      donationMarkersRef.current.push(marker);
    });
  }, [donations, onDonationPickedUp]);

  // Update request markers when requests change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing request markers
    requestMarkersRef.current.forEach((marker) => marker.remove());
    requestMarkersRef.current = [];

    // Add new request markers
    requests.forEach((request) => {
      const marker = L.marker([request.latitude, request.longitude], {
        icon: requestIcon,
      }).addTo(mapRef.current!);

      // Create popup content with escaped HTML and view profile button
      const popupContent = document.createElement("div");
      popupContent.style.minWidth = "250px";
      popupContent.style.maxWidth = "400px";
      popupContent.innerHTML = `
        <div>
          <h3 style="font-weight: bold; margin-bottom: 8px; color: #dc2626;">
            ${escapeHtml(request.title)}
          </h3>
          <p style="margin-bottom: 12px; color: #666; font-size: 14px;">
            ${escapeHtml(request.description)}
          </p>
          ${
            request.address
              ? `<p style="margin-bottom: 8px; color: #888; font-size: 12px;">
                  📍 ${escapeHtml(request.address)}
                </p>`
              : ""
          }
          ${
            request.phone_number
              ? `<p style="margin-bottom: 8px; color: #888; font-size: 12px;">
                  📞 ${escapeHtml(request.phone_number)}
                </p>`
              : ""
          }
          <div style="
            display: flex;
            gap: 8px;
            margin-top: 12px;
          ">
            <button 
              id="view-profile-request-${request.id}" 
              style="
                flex: 1;
                padding: 8px 12px; 
                background-color: #dc2626; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
              "
              onmouseover="this.style.backgroundColor='#b91c1c'"
              onmouseout="this.style.backgroundColor='#dc2626'"
            >
              View Profile
            </button>
            <button 
              id="directions-request-${request.id}" 
              style="
                flex: 1;
                padding: 8px 12px; 
                background-color: #3b82f6; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
              "
              onmouseover="this.style.backgroundColor='#2563eb'"
              onmouseout="this.style.backgroundColor='#3b82f6'"
            >
              Directions
            </button>
          </div>
        </div>
      `;

      // Add click handler for view profile button
      const viewProfileBtn = popupContent.querySelector(
        `#view-profile-request-${request.id}`
      ) as HTMLButtonElement;
      if (viewProfileBtn) {
        viewProfileBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Open profile modal without closing the popup
          setSelectedUserId(request.user_id);
          setIsProfileModalOpen(true);
        });
      }

      // Add click handler for directions button
      const directionsBtn = popupContent.querySelector(
        `#directions-request-${request.id}`
      ) as HTMLButtonElement;
      if (directionsBtn) {
        directionsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Show warning modal first
          setDirectionsLocation([request.latitude, request.longitude]);
          setShowDirectionsWarning(true);
        });
      }

      marker.bindPopup(popupContent);
      requestMarkersRef.current.push(marker);
    });
  }, [requests]);

  const handleDirectionsConfirm = () => {
    if (directionsLocation) {
      // Open Google Maps with directions to the location
      const [lat, lng] = directionsLocation;
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(googleMapsUrl, "_blank");
    }
    setShowDirectionsWarning(false);
    setDirectionsLocation(null);
  };

  const handleDirectionsCancel = () => {
    setShowDirectionsWarning(false);
    setDirectionsLocation(null);
  };

  return (
    <>
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0"
        style={{ minHeight: "100vh" }}
      />
      {selectedUserId && (
        <ProfileModal
          userId={selectedUserId}
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedUserId(null);
          }}
        />
      )}

      {/* Directions Warning Modal */}
      {showDirectionsWarning && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={handleDirectionsCancel}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 relative transition-all duration-300 scale-100 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-800">
                  Warning
                </h3>
              </div>

              <div className="bg-amber-50 rounded-xl p-5 mb-6 border border-amber-100">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 mt-1">•</span>
                    <span className="leading-relaxed">
                      Do not consume tampered goods
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 mt-1">•</span>
                    <span className="leading-relaxed">
                      Exercise caution when picking up items
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 mt-1">•</span>
                    <span className="leading-relaxed">
                      Verify the donor's profile before picking up
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDirectionsCancel}
                  className="flex-1 px-5 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDirectionsConfirm}
                  className="flex-1 px-5 py-3 bg-[#3b82f6] text-white rounded-xl hover:bg-[#2563eb] transition-all font-medium text-sm shadow-md hover:shadow-lg"
                >
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
