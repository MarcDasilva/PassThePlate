"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { getAvatarUrl } from "@/app/lib/supabase/profile";

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null;
  onUpload?: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  uploading?: boolean;
  editable?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  onUpload,
  onRemove,
  uploading = false,
  editable = true,
  size = "md",
}: ProfilePictureUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      onUpload(file);
    }
  };

  const handleRemove = async () => {
    if (onRemove) {
      await onRemove();
    }
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = preview || getAvatarUrl(currentAvatarUrl);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-black bg-gray-200`}
      >
        <Image
          src={displayUrl}
          alt="Profile picture"
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      {editable && onUpload && (
        <div className="flex gap-3">
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <span className="px-4 py-2 border border-black text-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors inline-block disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading
                ? "Uploading..."
                : currentAvatarUrl
                ? "Change"
                : "Upload"}
            </span>
          </label>
          {currentAvatarUrl && onRemove && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="px-4 py-2 border border-red-600 text-red-600 text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
