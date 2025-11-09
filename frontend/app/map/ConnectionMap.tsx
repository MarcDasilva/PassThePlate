"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { MonetaryDonation } from "@/app/lib/supabase/monetary-donations";
import {
  getOrCreateLocationName,
  getLocationNamesBatch,
  convertCoordinatesToLocationName,
} from "@/app/lib/supabase/locations";

// Dynamically import Globe component to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

interface ConnectionMapProps {
  donations: MonetaryDonation[];
}

// Helper function to get location name from database or convert using Gemini
// This function uses the locations table which is populated by Gemini
async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    return await getOrCreateLocationName(lat, lng);
  } catch (error) {
    console.error("Error getting location name:", error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function ConnectionMap({ donations }: ConnectionMapProps) {
  const globeRef = useRef<any>(null);
  const [dots, setDots] = useState<Array<{ x: number; y: number }>>([]);
  const [locationNames, setLocationNames] = useState<
    Map<string, { from: string; to: string }>
  >(new Map());
  const [shuffledDonations, setShuffledDonations] = useState<
    MonetaryDonation[]
  >([]);
  const [locationNamesLoaded, setLocationNamesLoaded] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate grey dots symmetrically across the background
    const generatedDots: Array<{ x: number; y: number }> = [];
    const numDotsX = 20;
    const numDotsY = 20;

    for (let i = 0; i < numDotsX; i++) {
      for (let j = 0; j < numDotsY; j++) {
        const x = (i / (numDotsX - 1)) * 100;
        const y = (j / (numDotsY - 1)) * 100;
        generatedDots.push({ x, y });
      }
    }

    setDots(generatedDots);
  }, []);

  useEffect(() => {
    // Wait for globe to be fully initialized before setting controls
    const setupControls = () => {
      if (globeRef.current) {
        try {
          const controls = globeRef.current.controls();
          if (controls) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
            controls.enableZoom = true;
            controls.minDistance = 100;
            controls.maxDistance = 2000;
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
  }, [donations]); // Re-run when donations change (globe might re-render)

  // Shuffle donations randomly
  useEffect(() => {
    if (donations.length > 0) {
      const shuffled = [...donations].sort(() => Math.random() - 0.5);
      setShuffledDonations(shuffled);
    }
  }, [donations]);

  // Fetch location names for all donations - optimized with batch fetching
  useEffect(() => {
    const fetchLocationNames = async () => {
      setLocationNamesLoaded(false);
      const newLocationNames = new Map<string, { from: string; to: string }>();

      const donationsToProcess =
        shuffledDonations.length > 0 ? shuffledDonations : donations;

      if (donationsToProcess.length === 0) {
        setLocationNames(newLocationNames);
        setLocationNamesLoaded(true);
        return;
      }

      // Collect all unique coordinates
      const allCoordinates = new Set<string>();

      donationsToProcess.forEach((donation) => {
        const fromKey = `${donation.from_latitude},${donation.from_longitude}`;
        const toKey = `${donation.to_latitude},${donation.to_longitude}`;

        allCoordinates.add(fromKey);
        allCoordinates.add(toKey);
      });

      // Convert Set to Array for batch fetching
      const coordArray = Array.from(allCoordinates).map((key) => {
        const [lat, lng] = key.split(",").map(Number);
        return { latitude: lat, longitude: lng };
      });

      // Batch fetch all location names from database
      const cachedLocations = await getLocationNamesBatch(coordArray);

      // Find coordinates that need to be converted
      const missingCoords: Array<{ latitude: number; longitude: number }> = [];
      coordArray.forEach((coord) => {
        const key = `${coord.latitude},${coord.longitude}`;
        if (!cachedLocations.has(key)) {
          missingCoords.push(coord);
        }
      });

      // Convert missing coordinates using Gemini API (in parallel, but limited)
      const conversionPromises = missingCoords.map((coord) =>
        convertCoordinatesToLocationName(coord.latitude, coord.longitude).then(
          (name) => ({
            key: `${coord.latitude},${coord.longitude}`,
            name,
          })
        )
      );

      const convertedLocations = await Promise.all(conversionPromises);
      convertedLocations.forEach(({ key, name }) => {
        cachedLocations.set(key, name);
      });

      // Build the location names map for donations
      donationsToProcess.forEach((donation) => {
        const fromKey = `${donation.from_latitude},${donation.from_longitude}`;
        const toKey = `${donation.to_latitude},${donation.to_longitude}`;

        const fromName =
          cachedLocations.get(fromKey) ||
          `${donation.from_latitude.toFixed(
            4
          )}, ${donation.from_longitude.toFixed(4)}`;
        const toName =
          cachedLocations.get(toKey) ||
          `${donation.to_latitude.toFixed(4)}, ${donation.to_longitude.toFixed(
            4
          )}`;

        newLocationNames.set(donation.id, { from: fromName, to: toName });
      });

      setLocationNames(newLocationNames);
      // Wait for next frame to ensure DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setLocationNamesLoaded(true);
        });
      });
    };

    if (shuffledDonations.length > 0 || donations.length > 0) {
      fetchLocationNames();
    }
  }, [donations, shuffledDonations]);

  // Auto-scroll for vertical list (large screens)
  useEffect(() => {
    if (
      !scrollContainerRef.current ||
      (shuffledDonations.length === 0 && donations.length === 0) ||
      !locationNamesLoaded
    ) {
      setScrollReady(false);
      return;
    }

    const container = scrollContainerRef.current;
    let scrollPosition = 0;
    const scrollSpeed = 0.25; // pixels per frame
    let firstSetHeight = 0;
    let animationFrameId: number | null = null;
    let stableFrames = 0;
    const REQUIRED_STABLE_FRAMES = 3; // Wait for 3 stable frames before starting

    // Calculate height of first set of items (before duplicates)
    const calculateFirstSetHeight = (): number => {
      const content = container.querySelector("div.space-y-3");
      if (content) {
        const children = Array.from(content.children);
        const halfPoint = Math.ceil(children.length / 2);
        let height = 0;
        for (let i = 0; i < halfPoint; i++) {
          const child = children[i] as HTMLElement;
          height += child.offsetHeight + 12; // 12px for gap (space-y-3)
        }
        return height;
      }
      return 0;
    };

    // Wait for DOM to stabilize before starting scroll
    const checkStability = () => {
      const currentHeight = calculateFirstSetHeight();

      if (currentHeight > 0) {
        // Check if height is stable
        if (currentHeight === firstSetHeight) {
          stableFrames++;
          if (stableFrames >= REQUIRED_STABLE_FRAMES) {
            // Start smooth scrolling
            firstSetHeight = currentHeight;
            setScrollReady(true);
            const scroll = () => {
              scrollPosition += scrollSpeed;

              // Reset when we've scrolled through the first set (seamless loop)
              if (scrollPosition >= firstSetHeight) {
                scrollPosition = scrollPosition - firstSetHeight;
              }

              container.scrollTop = scrollPosition;
              animationFrameId = requestAnimationFrame(scroll);
            };

            animationFrameId = requestAnimationFrame(scroll);
            return;
          }
        } else {
          stableFrames = 0;
          firstSetHeight = currentHeight;
        }
      }

      // Continue checking stability
      animationFrameId = requestAnimationFrame(checkStability);
    };

    // Start checking after a brief delay to ensure DOM is ready
    setTimeout(() => {
      firstSetHeight = calculateFirstSetHeight();
      animationFrameId = requestAnimationFrame(checkStability);
    }, 100);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [shuffledDonations, donations, locationNames, locationNamesLoaded]);

  // Auto-scroll for horizontal list (small screens)
  useEffect(() => {
    if (
      !horizontalScrollRef.current ||
      (shuffledDonations.length === 0 && donations.length === 0) ||
      !locationNamesLoaded
    ) {
      setScrollReady(false);
      return;
    }

    const container = horizontalScrollRef.current;
    let scrollPosition = 0;
    const scrollSpeed = 0.25; // pixels per frame
    let firstSetWidth = 0;
    let animationFrameId: number | null = null;
    let stableFrames = 0;
    const REQUIRED_STABLE_FRAMES = 3; // Wait for 3 stable frames before starting

    // Calculate width of first set of items (before duplicates)
    const calculateFirstSetWidth = (): number => {
      const content = container.querySelector("div.flex.gap-3");
      if (content) {
        const children = Array.from(content.children);
        const halfPoint = Math.ceil(children.length / 2);
        let width = 0;
        for (let i = 0; i < halfPoint; i++) {
          const child = children[i] as HTMLElement;
          width += child.offsetWidth + 12; // 12px for gap (gap-3)
        }
        return width;
      }
      return 0;
    };

    // Wait for DOM to stabilize before starting scroll
    const checkStability = () => {
      const currentWidth = calculateFirstSetWidth();

      if (currentWidth > 0) {
        // Check if width is stable
        if (currentWidth === firstSetWidth) {
          stableFrames++;
          if (stableFrames >= REQUIRED_STABLE_FRAMES) {
            // Start smooth scrolling
            firstSetWidth = currentWidth;
            setScrollReady(true);
            const scroll = () => {
              scrollPosition += scrollSpeed;

              // Reset when we've scrolled through the first set (seamless loop)
              if (scrollPosition >= firstSetWidth) {
                scrollPosition = scrollPosition - firstSetWidth;
              }

              container.scrollLeft = scrollPosition;
              animationFrameId = requestAnimationFrame(scroll);
            };

            animationFrameId = requestAnimationFrame(scroll);
            return;
          }
        } else {
          stableFrames = 0;
          firstSetWidth = currentWidth;
        }
      }

      // Continue checking stability
      animationFrameId = requestAnimationFrame(checkStability);
    };

    // Start checking after a brief delay to ensure DOM is ready
    setTimeout(() => {
      firstSetWidth = calculateFirstSetWidth();
      animationFrameId = requestAnimationFrame(checkStability);
    }, 100);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [shuffledDonations, donations, locationNames, locationNamesLoaded]);

  // Convert donations to arcs format for react-globe.gl - memoized to prevent recreation
  const arcs = useMemo(() => {
    return donations.map((donation) => {
      // Use grey color for all arcs
      const color = "#808080"; // Grey color
      return {
        startLat: donation.from_latitude,
        startLng: donation.from_longitude,
        endLat: donation.to_latitude,
        endLng: donation.to_longitude,
        color: [color, color], // Same color for start and end
      };
    });
  }, [donations]);

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
      {/* Globe with arcs - showing earth model */}
      <div className="relative w-full h-full" style={{ paddingTop: "90px" }}>
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={false}
          enablePointerInteraction={true}
          showGlobe={true}
          showGraticules={false}
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcStroke={0.5}
          arcDashLength={0.4}
          arcDashGap={0.1}
          arcDashAnimateTime={10000}
          arcCurveResolution={64}
        />
      </div>

      {/* Donations List - Right side on large screens, bottom on small screens */}
      {(shuffledDonations.length > 0 || donations.length > 0) && (
        <>
          {/* Large screens - Right side, vertical auto-scroll */}
          <div className="hidden lg:block absolute top-0 right-0 h-full w-80 z-10 pointer-events-none">
            <div
              className={`h-full border border-black bg-transparent p-4 transition-opacity duration-1000 ${
                scrollReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <div
                ref={scrollContainerRef}
                className="h-full overflow-y-auto scrollbar-hide pointer-events-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="space-y-3">
                  {(shuffledDonations.length > 0
                    ? shuffledDonations
                    : donations
                  ).map((donation) => {
                    const location = locationNames.get(donation.id);
                    return (
                      <div
                        key={donation.id}
                        className="bg-white border border-black p-3 text-black"
                      >
                        <div className="text-xs mb-1">
                          <span className="font-semibold">From:</span>{" "}
                          {location?.from ||
                            `${donation.from_latitude.toFixed(
                              4
                            )}, ${donation.from_longitude.toFixed(4)}`}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold">To:</span>{" "}
                          {location?.to ||
                            `${donation.to_latitude.toFixed(
                              4
                            )}, ${donation.to_longitude.toFixed(4)}`}
                        </div>
                      </div>
                    );
                  })}
                  {/* Duplicate items for seamless loop */}
                  {(shuffledDonations.length > 0
                    ? shuffledDonations
                    : donations
                  ).map((donation) => {
                    const location = locationNames.get(donation.id);
                    return (
                      <div
                        key={`duplicate-${donation.id}`}
                        className="bg-white border border-black p-3 text-black"
                      >
                        <div className="text-xs mb-1">
                          <span className="font-semibold">From:</span>{" "}
                          {location?.from ||
                            `${donation.from_latitude.toFixed(
                              4
                            )}, ${donation.from_longitude.toFixed(4)}`}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold">To:</span>{" "}
                          {location?.to ||
                            `${donation.to_latitude.toFixed(
                            4
                          )}, ${donation.to_longitude.toFixed(4)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Small screens - Bottom, horizontal auto-scroll */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 h-32 z-10 pointer-events-none">
            <div
              className={`h-full border border-black bg-transparent p-4 transition-opacity duration-1000 ${
                scrollReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <div
                ref={horizontalScrollRef}
                className="h-full overflow-x-auto scrollbar-hide pointer-events-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="flex gap-3 h-full">
                  {(shuffledDonations.length > 0
                    ? shuffledDonations
                    : donations
                  ).map((donation) => {
                    const location = locationNames.get(donation.id);
                    return (
                      <div
                        key={donation.id}
                        className="bg-white border border-black p-3 text-black flex-shrink-0"
                      >
                        <div className="text-xs mb-1">
                          <span className="font-semibold">From:</span>{" "}
                          {location?.from ||
                            `${donation.from_latitude.toFixed(
                              4
                            )}, ${donation.from_longitude.toFixed(4)}`}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold">To:</span>{" "}
                          {location?.to ||
                            `${donation.to_latitude.toFixed(
                              4
                            )}, ${donation.to_longitude.toFixed(4)}`}
                        </div>
                      </div>
                    );
                  })}
                  {/* Duplicate items for seamless loop */}
                  {(shuffledDonations.length > 0
                    ? shuffledDonations
                    : donations
                  ).map((donation) => {
                    const location = locationNames.get(donation.id);
                    return (
                      <div
                        key={`duplicate-${donation.id}`}
                        className="bg-white border border-black p-3 text-black flex-shrink-0"
                      >
                        <div className="text-xs mb-1">
                          <span className="font-semibold">From:</span>{" "}
                          {location?.from ||
                            `${donation.from_latitude.toFixed(
                              4
                            )}, ${donation.from_longitude.toFixed(4)}`}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold">To:</span>{" "}
                          {location?.to ||
                            `${donation.to_latitude.toFixed(
                              4
                            )}, ${donation.to_longitude.toFixed(4)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

