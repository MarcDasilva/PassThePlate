"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  uploading?: boolean;
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  onUpload,
  onRemove,
  uploading = false,
}: ProfilePictureUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const displayUrl = preview || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-black bg-gray-200">
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt="Profile picture"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <span className="text-4xl text-gray-600">?</span>
          </div>
        )}
      </div>

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
          <span className="px-4 py-2 border border-black text-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors inline-block">
            {uploading ? "Uploading..." : displayUrl ? "Change" : "Upload"}
          </span>
        </label>
        {displayUrl && onRemove && (
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="px-4 py-2 border border-red-600 text-red-600 text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
