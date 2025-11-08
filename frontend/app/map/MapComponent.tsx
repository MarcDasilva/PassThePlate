"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { Donation } from "@/app/lib/supabase/donations";

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

// Helper function to escape HTML to prevent XSS
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

interface MapComponentProps {
  center: [number, number];
  donations?: Donation[];
}

export default function MapComponent({
  center,
  donations = [],
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const donationMarkersRef = useRef<L.Marker[]>([]);

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
    userMarker.bindPopup("Your Location").openPopup();
    userMarkerRef.current = userMarker;

    mapRef.current = map;

    // Cleanup function
    return () => {
      // Remove user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      // Remove donation markers
      donationMarkersRef.current.forEach((marker) => marker.remove());
      donationMarkersRef.current = [];
      // Remove map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center]);

  // Update map center and user marker position when center prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      // Use zoom level 16 when updating view
      mapRef.current.setView(center, 16);

      // Update user marker position
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(center);
      } else if (mapRef.current) {
        // If marker doesn't exist yet, create it
        userMarkerRef.current = L.marker(center).addTo(mapRef.current);
        userMarkerRef.current.bindPopup("Your Location");
      }
    }
  }, [center]);

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

      // Create popup content with escaped HTML
      const popupContent = `
        <div style="min-width: 200px;">
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
              ? `<p style="margin: 0; font-size: 12px;"><strong>Address:</strong> ${escapeHtml(
                  donation.address
                )}</p>`
              : ""
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      donationMarkersRef.current.push(marker);
    });
  }, [donations]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ minHeight: "100%" }}
    />
  );
}
