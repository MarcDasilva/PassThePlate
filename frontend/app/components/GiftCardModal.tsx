"use client";

import { useState } from "react";

interface GiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRewards: number;
  onRedeemSuccess: () => void;
}

const GIFT_CARDS = [
  { id: "starbucks", name: "Starbucks", image: "/starbucks.png" },
  { id: "wawa", name: "Wawa", image: "/wawa.png" },
  { id: "walmart", name: "Walmart", image: "/walmart.png" },
  { id: "target", name: "Target", image: "/target.png" },
  { id: "dunkin", name: "Dunkin'", image: "/dunkin.png" },
  { id: "amazon", name: "Amazon", image: "/amazon.png" },
];

const REQUIRED_POINTS = 50;
const GIFT_CARD_VALUE = "$5";

export default function GiftCardModal({
  isOpen,
  onClose,
  currentRewards,
  onRedeemSuccess,
}: GiftCardModalProps) {
  const [selectedGiftCard, setSelectedGiftCard] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const canRedeem = currentRewards >= REQUIRED_POINTS;

  const handleRedeem = async () => {
    if (!selectedGiftCard || !canRedeem) return;

    setIsRedeeming(true);
    try {
      const response = await fetch("/api/redeem-gift-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ giftCardType: selectedGiftCard }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to redeem gift card");
      }

      // Show success message
      setShowSuccess(true);
      
      // Call success callback to refresh profile
      onRedeemSuccess();

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedGiftCard(null);
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error("Error redeeming gift card:", error);
      alert(error.message || "Failed to redeem gift card. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-md w-full mx-4 border border-black transition-all duration-300 scale-100 animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-black bg-[#367230] bg-opacity-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tighter text-black">
              Redeem Gift Card
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {showSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-black">
                Email Confirmation Sent
              </h4>
              <p className="text-gray-600 text-sm">
                Your {GIFT_CARDS.find((gc) => gc.id === selectedGiftCard)?.name}{" "}
                gift card will be sent to your email shortly.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="bg-[#367230] bg-opacity-10 border border-black p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-600 mb-1">
                        Your Rewards
                      </p>
                      <p className="text-2xl font-bold text-[#367230]">
                        {currentRewards || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-gray-600 mb-1">
                        Required
                      </p>
                      <p className="text-2xl font-bold text-black">
                        {REQUIRED_POINTS}
                      </p>
                    </div>
                  </div>
                </div>

                {!canRedeem && (
                  <div className="bg-red-50 border border-red-200 p-3 mb-4">
                    <p className="text-sm text-red-700">
                      You need {REQUIRED_POINTS - currentRewards} more points to
                      redeem a gift card.
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Select Gift Card ({GIFT_CARD_VALUE} value):
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {GIFT_CARDS.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedGiftCard(card.id)}
                        disabled={!canRedeem}
                        className={`p-3 border-2 transition-all flex flex-col items-center justify-center relative ${
                          selectedGiftCard === card.id
                            ? "border-[#367230] bg-[#367230] bg-opacity-10"
                            : "border-black hover:bg-gray-50"
                        } ${
                          !canRedeem
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                      >
                        <img
                          src={card.image}
                          alt={card.name}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-1 left-0 right-0 text-xs font-semibold text-black bg-white bg-opacity-80 px-1 py-0.5">
                          {card.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isRedeeming}
                  className="flex-1 text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeem}
                  disabled={!selectedGiftCard || !canRedeem || isRedeeming}
                  className="flex-1 text-sm uppercase tracking-widest border border-[#367230] px-5 py-2 transition-colors bg-[#367230] bg-opacity-10 hover:bg-[#367230] hover:text-white text-[#367230] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#367230] disabled:hover:bg-opacity-10 disabled:hover:text-[#367230]"
                >
                  {isRedeeming ? "Processing..." : "Redeem"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

