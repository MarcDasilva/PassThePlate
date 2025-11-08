"use client";

import { useState, useEffect } from "react";
import { createRequest } from "@/app/lib/supabase/requests";
import { useAuth } from "@/app/providers/AuthProvider";

interface RequestDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentLocation: [number, number] | null;
}

export default function RequestDonationModal({
  isOpen,
  onClose,
  onSuccess,
  currentLocation,
}: RequestDonationModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setTitle("");
      setDescription("");
      setAddress("");
      setPhoneNumber("");
      setError(null);
      setLocationError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to create a request");
      return;
    }

    if (!currentLocation) {
      setLocationError(
        "Location is required. Please enable location services."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setLocationError(null);

    try {
      const { data, error: createError } = await createRequest(user.id, {
        title: title.trim(),
        description: description.trim(),
        latitude: currentLocation[0],
        longitude: currentLocation[1],
        address: address.trim() || null,
        phone_number: phoneNumber.trim() || null,
      });

      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Failed to create request");
        setLoading(false);
        return;
      }

      // Success
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating request:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden border border-gray-100 transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 bg-red-900 bg-opacity-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tighter text-black">
              Request a Donation
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {locationError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              {locationError}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-red-900 text-black placeholder-black/50"
                placeholder="What are you requesting?"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-red-900 text-black placeholder-black/50 resize-none"
                placeholder="Describe what you need"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Address (Optional)
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-red-900 text-black placeholder-black/50"
                placeholder="Your address"
              />
            </div>

            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Phone Number (Optional)
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-red-900 text-black placeholder-black/50"
                placeholder="Your phone number"
              />
            </div>

            {currentLocation && (
              <div className="text-xs text-gray-500">
                Location: {currentLocation[0].toFixed(6)},{" "}
                {currentLocation[1].toFixed(6)}
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 bg-red-900 text-white rounded-xl hover:bg-red-800 transition-all font-medium text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
