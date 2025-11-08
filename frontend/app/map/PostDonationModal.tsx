"use client";

import { useState, useEffect, useRef } from "react";
import {
  createDonation,
  uploadDonationImage,
} from "@/app/lib/supabase/donations";
import { useAuth } from "@/app/providers/AuthProvider";

interface PostDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentLocation: [number, number] | null;
}

export default function PostDonationModal({
  isOpen,
  onClose,
  onSuccess,
  currentLocation,
}: PostDonationModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [describingWithAI, setDescribingWithAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setTitle("");
      setDescription("");
      setCategory("");
      setAddress("");
      setImageFile(null);
      setImagePreview(null);
      setError(null);
      setLocationError(null);
      setDescribingWithAI(false);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("File must be an image");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      setImageFile(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDescribeWithAI = async () => {
    if (!imageFile || !imagePreview) {
      setError("Please upload an image first");
      return;
    }

    setDescribingWithAI(true);
    setError(null);

    try {
      // Send the full data URL (includes mime type)
      const response = await fetch("/api/describe-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64: imagePreview }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to describe image");
      }

      const data = await response.json();

      // Auto-fill form fields
      if (data.title) {
        setTitle(data.title);
      }
      if (data.description) {
        setDescription(data.description);
      }
      if (data.category) {
        setCategory(data.category);
      }
    } catch (err: any) {
      console.error("Error describing image:", err);
      setError(err.message || "Failed to describe image with AI");
    } finally {
      setDescribingWithAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("You must be logged in to post a donation");
      return;
    }

    if (!currentLocation) {
      setLocationError(
        "Location is required. Please enable location services."
      );
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setLoading(true);
    let uploadedImageUrl: string | null = null;

    try {
      // Upload image if one was selected
      if (imageFile) {
        setUploadingImage(true);
        const { data: uploadData, error: uploadError } =
          await uploadDonationImage(user.id, imageFile);

        if (uploadError || !uploadData) {
          let errorMessage = uploadError?.message || "Failed to upload image";
          // Provide helpful message for bucket not found
          if (
            errorMessage.includes("Bucket not found") ||
            errorMessage.includes("Storage bucket")
          ) {
            errorMessage =
              "Storage bucket 'donations' not found. Please create it in your Supabase dashboard under Storage → Create Bucket. Name it 'donations' and make it public.";
          }
          setError(errorMessage);
          setLoading(false);
          setUploadingImage(false);
          return;
        }

        uploadedImageUrl = uploadData.path;
        setUploadingImage(false);
      }

      const { data, error: createError } = await createDonation(user.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        latitude: currentLocation[0],
        longitude: currentLocation[1],
        address: address.trim() || null,
        image_url: uploadedImageUrl,
      });

      if (createError) {
        setError(createError.message || "Failed to create donation");
        setLoading(false);
        return;
      }

      // Success - close modal and refresh donations
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating donation:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>

          <h2 className="text-3xl font-bold tracking-tighter mb-6 text-black">
            Post a Donation
          </h2>

          {locationError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {locationError}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo section - moved to top */}
            <div>
              <label
                htmlFor="image"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Photo
              </label>
              {!imagePreview ? (
                <div>
                  <input
                    ref={fileInputRef}
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:uppercase file:tracking-widest file:bg-black file:text-white hover:file:bg-[#367230] file:cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max file size: 5MB. Accepted formats: JPG, PNG, GIF, etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-40 h-40 object-cover rounded border-2 border-black"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-red-700"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                    {/* Describe with Gemini button */}
                    <div className="flex flex-col justify-center">
                      <button
                        type="button"
                        onClick={handleDescribeWithAI}
                        disabled={describingWithAI}
                        className="h-40 px-4 py-2 bg-[#367230] text-white text-sm uppercase tracking-widest hover:bg-[#244b20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded flex flex-col items-center justify-center"
                      >
                        {describingWithAI ? (
                          "Analyzing..."
                        ) : (
                          <>
                            <span>Describe</span>
                            <span>with</span>
                            <span>Gemini</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {uploadingImage && (
                    <p className="text-sm text-gray-600">Uploading image...</p>
                  )}
                </div>
              )}
            </div>

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
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50"
                placeholder="Whats being saved?"
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
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50 resize-none"
                placeholder="Describe what you're donating"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Category
              </label>
              <input
                id="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50"
                placeholder="e.g., Canned Goods, Produce, Household Items"
              />
            </div>

            <div>
              <label
                htmlFor="Additional Info"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50"
                placeholder="Pickup location details"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                disabled={loading || !currentLocation}
                className="flex-1 px-6 py-3 bg-black text-white text-sm uppercase tracking-widest hover:bg-[#367230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Posting..." : "Post Donation"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 border border-black text-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
