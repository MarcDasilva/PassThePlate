"use client";

import React, { useState } from "react";

interface DonationSliderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (amount: number) => Promise<void>;
  fromCoordinates: [number, number] | null;
  toCoordinates: [number, number] | null;
}

export default function DonationSliderModal({
  isOpen,
  onClose,
  onSend,
  fromCoordinates,
  toCoordinates,
}: DonationSliderModalProps) {
  const [amount, setAmount] = useState<number>(5);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!fromCoordinates || !toCoordinates) {
      alert("Location information is missing");
      return;
    }

    setIsSending(true);
    try {
      await onSend(amount);
      setAmount(5); // Reset to default
      onClose();
    } catch (error) {
      console.error("Error sending donation:", error);
      alert("Failed to send donation. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1002] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-100 transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 bg-red-900 bg-opacity-10">
          <h3 className="text-xl font-bold tracking-tighter text-black">
            Send Donation
          </h3>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Amount: ${amount}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-900"
              style={{
                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${
                  ((amount - 1) / 9) * 100
                }%, #e5e7eb ${((amount - 1) / 9) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$1</span>
              <span>$10</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSending}
              className="flex-1 text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-black"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !fromCoordinates || !toCoordinates}
              className="flex-1 text-sm uppercase tracking-widest border border-red-900 px-5 py-2 transition-colors bg-red-900 bg-opacity-10 hover:bg-red-900 hover:text-white text-red-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-900 disabled:hover:bg-opacity-10 disabled:hover:text-red-900"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

