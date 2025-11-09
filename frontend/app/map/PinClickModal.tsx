"use client";

import React from "react";
import { Request } from "@/app/lib/supabase/requests";

interface EstimatedStats {
  totalRequestsLast4Weeks: number;
  donationGoalUSD: number;
  peopleHelped: number;
}

interface PinClickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDonate: () => void;
  locationName: string | null;
  selectedPinCount: number;
  selectedPinRequests: Request[];
  loadingStats: boolean;
  estimatedStats: EstimatedStats | null;
}

export default function PinClickModal({
  isOpen,
  onClose,
  onDonate,
  locationName,
  selectedPinCount,
  selectedPinRequests,
  loadingStats,
  estimatedStats,
}: PinClickModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
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
              onClick={onClose}
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
                      `$${Math.round(estimatedStats.donationGoalUSD).toLocaleString()}`
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
                  <p className="text-gray-600 font-medium mb-2">No requests found</p>
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
              onClick={onClose}
              className="flex-1 text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white"
            >
              Close
            </button>
            <button
              onClick={onDonate}
              className="flex-1 text-sm uppercase tracking-widest border border-red-900 px-5 py-2 transition-colors bg-red-900 bg-opacity-10 hover:bg-red-900 hover:text-white text-red-900"
            >
              Donate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

