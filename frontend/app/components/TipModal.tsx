"use client";

import { useState } from "react";

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tipAmount: number | null) => void;
  onTipCheckout: (tipAmount: number) => Promise<void>;
  donationTitle: string;
  donationId: string;
  userId: string | null;
  userLocation: [number, number] | null;
  donationLocation: [number, number];
}

export default function TipModal({
  isOpen,
  onClose,
  onConfirm,
  onTipCheckout,
  donationTitle,
  donationId,
  userId,
  userLocation,
  donationLocation,
}: TipModalProps) {
  const [tipAmount, setTipAmount] = useState<number>(1); // Default to $1
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // If tip is selected (always true since default is 1), redirect to Stripe checkout
    if (tipAmount > 0) {
      setIsSubmitting(true);
      try {
        await onTipCheckout(tipAmount);
      } catch (error) {
        console.error("Error redirecting to checkout:", error);
        alert("Failed to redirect to payment. Please try again.");
        setIsSubmitting(false);
      }
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    await onConfirm(null);
    setIsSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[1002] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-md w-full mx-4 border border-black transition-all duration-300 scale-100 animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-black bg-[#367230] bg-opacity-10">
          <h3 className="text-xl font-bold tracking-tighter text-black">
            Leave a Tip?
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Confirm you picked up: {donationTitle}
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tip Amount: ${tipAmount}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={tipAmount}
              onChange={(e) => setTipAmount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 appearance-none cursor-pointer accent-[#367230]"
              style={{
                background: `linear-gradient(to right, #367230 0%, #367230 ${
                  (tipAmount - 1) / 4 * 100
                }%, #e5e7eb ${(tipAmount - 1) / 4 * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$1</span>
              <span>$5</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 text-sm uppercase tracking-widest border border-[#367230] px-5 py-2 transition-colors bg-[#367230] bg-opacity-10 hover:bg-[#367230] hover:text-white text-[#367230] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Confirming..." : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

