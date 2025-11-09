"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Request } from "@/app/lib/supabase/requests";
import { groupRequestsByLocation } from "./utils";

// Dynamically import Globe component to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

export interface HighestNeedLocation {
  latitude: number;
  longitude: number;
  location_name: string;
  predicted_need_score: number;
  confidence: number;
  month: number;
  season: string;
  food_insecurity_rate?: number;
  poverty_rate?: number;
}

interface WorldGlobeProps {
  requests: Request[];
  onPinClick?: (
    count: number,
    requests: Request[],
    coordinates: [number, number]
  ) => void;
  highestNeedLocation?: HighestNeedLocation | null;
  onHighestNeedClick?: (location: HighestNeedLocation) => void;
}

export default function WorldGlobe({
  requests,
  onPinClick,
  highestNeedLocation,
  onHighestNeedClick,
}: WorldGlobeProps) {
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
  const [mlPin, setMlPin] = useState<{
    lat: number;
    lng: number;
    data: HighestNeedLocation;
  } | null>(null);

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
    // Set ML pin if highest need location is available
    if (highestNeedLocation) {
      setMlPin({
        lat: highestNeedLocation.latitude,
        lng: highestNeedLocation.longitude,
        data: highestNeedLocation,
      });
    } else {
      setMlPin(null);
    }
  }, [highestNeedLocation]);

  useEffect(() => {
    // Wait for globe to be fully initialized before setting controls
    const setupControls = () => {
      if (globeRef.current) {
        try {
          const controls = globeRef.current.controls();
          if (controls) {
            // Enable auto-rotate
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
            controls.enableZoom = true;
            // Increase zoom capability - allow much closer zoom
            controls.minDistance = 100;
            controls.maxDistance = 2000;
            // Make zoom more sensitive for better control
            controls.zoomSpeed = 1.2;
            return true;
          }
        } catch (error) {
          // Controls not ready yet
          return false;
        }
      }
      return false;
    };

    // Use requestAnimationFrame to wait for the globe to be fully rendered
    let frameId: number | null = null;
    let attempts = 0;
    const maxAttempts = 20; // Increased attempts for first load

    const trySetup = () => {
      attempts++;
      if (setupControls() || attempts >= maxAttempts) {
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
        }
        return;
      }
      frameId = requestAnimationFrame(trySetup);
    };

    // Start trying immediately and also after a short delay
    frameId = requestAnimationFrame(trySetup);
    const timeoutId = setTimeout(() => {
      if (frameId === null) {
        // If not set up yet, try again
        frameId = requestAnimationFrame(trySetup);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [pins, mlPin]); // Re-run when pins or ML pin change (globe might re-render)

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
      <div className="relative w-full h-full" style={{ paddingTop: "80px" }}>
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={false}
          enablePointerInteraction={true}
          htmlElementsData={[...pins, ...(mlPin ? [mlPin] : [])]}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={(d: any) => {
            // Check if this is the ML pin (has data property with predicted_need_score)
            const isMlPin =
              d.data && typeof d.data.predicted_need_score === "number";

            if (isMlPin) {
              // Purple dot for ML highest need location
              const el = document.createElement("div");
              el.style.width = "60px";
              el.style.height = "60px";
              el.style.cursor = "pointer";
              el.style.position = "relative";
              el.style.pointerEvents = "auto";
              el.style.zIndex = "1001";
              el.style.display = "flex";
              el.style.alignItems = "center";
              el.style.justifyContent = "center";
              el.innerHTML = `
                <div style="
                  width: 60px;
                  height: 60px;
                  border-radius: 50%;
                  background: radial-gradient(circle, rgba(147, 51, 234, 0.9) 0%, rgba(147, 51, 234, 0.6) 30%, rgba(147, 51, 234, 0.3) 60%, rgba(147, 51, 234, 0) 100%);
                  pointer-events: none;
                  position: relative;
                  animation: pulse 2s infinite;
                ">
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: rgba(147, 51, 234, 1);
                    box-shadow: 0 0 8px rgba(147, 51, 234, 0.8), 0 0 16px rgba(147, 51, 234, 0.4);
                  "></div>
                </div>
              `;

              // Store the data in the element
              (el as any).__data = d.data;

              // Click handler for ML pin
              const clickHandler = (e: Event) => {
                e.stopPropagation();
                e.preventDefault();
                const data = (e.currentTarget as any).__data;
                if (onHighestNeedClick && data) {
                  onHighestNeedClick(data);
                }
              };

              el.addEventListener("click", clickHandler, true);
              el.addEventListener(
                "mousedown",
                (e) => {
                  e.stopPropagation();
                },
                true
              );
              el.addEventListener(
                "touchend",
                (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const data = (e.currentTarget as any).__data;
                  if (onHighestNeedClick && data) {
                    onHighestNeedClick(data);
                  }
                },
                true
              );

              return el;
            }

            // Regular red pins for requests
            // Calculate max count for intensity scaling
            const maxCount = Math.max(...pins.map((p) => p.count), 1);
            const isMax = d.count === maxCount;

            // Opacity depends on whether this pin has the max count
            // Max count pins have full opacity (1.0), others scale based on ratio
            const intensity = maxCount > 0 ? d.count / maxCount : 0;
            const opacity = isMax ? 1.0 : Math.max(0.3, intensity * 0.7 + 0.3);

            // Calculate opacity values based on whether it's the max
            const centerOpacity = opacity; // Full opacity for max, scaled for others
            const gradientCenter = opacity * 0.8;
            const gradient30 = opacity * 0.5;
            const gradient60 = opacity * 0.3;

            const el = document.createElement("div");
            el.style.width = "50px";
            el.style.height = "50px";
            el.style.cursor = "pointer";
            el.style.position = "relative";
            el.style.pointerEvents = "auto";
            el.style.zIndex = "1000";
            el.style.display = "flex";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";
            el.innerHTML = `
              <div style="
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(220, 38, 38, ${gradientCenter}) 0%, rgba(220, 38, 38, ${gradient30}) 30%, rgba(220, 38, 38, ${gradient60}) 60%, rgba(220, 38, 38, 0) 100%);
                pointer-events: none;
                position: relative;
              ">
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 4px;
                  height: 4px;
                  border-radius: 50%;
                  background: rgba(220, 38, 38, ${centerOpacity});
                  box-shadow: 0 0 4px rgba(220, 38, 38, ${centerOpacity * 0.5});
                "></div>
              </div>
            `;

            // Store the data in the element for access in the click handler
            (el as any).__data = d;

            // Use addEventListener with capture phase to ensure it fires
            const clickHandler = (e: Event) => {
              e.stopPropagation();
              e.preventDefault();
              const data = (e.currentTarget as any).__data;
              if (onPinClick && data) {
                onPinClick(data.count, data.requests, [data.lat, data.lng]);
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
                  onPinClick(data.count, data.requests, [data.lat, data.lng]);
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
