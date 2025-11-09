"use client";

import React from "react";
import { HighestNeedLocation } from "./WorldGlobe";

interface HighestNeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDonate: () => void;
  highestNeedLocation: HighestNeedLocation | null;
  user: any;
  userLocation: [number, number] | null;
}

export default function HighestNeedModal({
  isOpen,
  onClose,
  onDonate,
  highestNeedLocation,
  user,
  userLocation,
}: HighestNeedModalProps) {
  if (!isOpen || !highestNeedLocation) return null;

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
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
              onClick={onClose}
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
                {(highestNeedLocation.predicted_need_score * 100).toFixed(1)}%
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
                  {(highestNeedLocation.food_insecurity_rate * 100).toFixed(1)}%
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
              <div className="text-[9px] md:text-xs text-gray-600 mt-0.5">
                Month {highestNeedLocation.month}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-black">
          <div className="mb-4">
            <p className="text-xs text-gray-600">
              The prediction is based on geographic factors, seasonal patterns,
              food insecurity rates, and historical data patterns.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white"
            >
              Close
            </button>
            {user && userLocation && (
              <button
                onClick={onDonate}
                className="flex-1 text-sm uppercase tracking-widest border border-purple-900 px-5 py-2 transition-colors bg-purple-900 bg-opacity-10 hover:bg-purple-900 hover:text-white text-purple-900"
              >
                Donate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

