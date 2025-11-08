"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/app/components/navbar";
import { ROUTES } from "@/app/lib/routes";

function DonationSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Wait a moment for the webhook to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#367230]">
      <Navbar />
      <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 container mx-auto">
        <div className="max-w-md mx-auto bg-white border border-black p-8 text-center">
          {loading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#367230] mx-auto"></div>
              <p className="text-gray-600">Processing your donation...</p>
            </div>
          ) : (
            <div className="space-y-6">
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
              <h1 className="text-2xl font-bold text-black">
                Donation Successful!
              </h1>
              <p className="text-gray-600">
                Thank you for your generous donation. Your contribution helps
                make a difference.
              </p>
              {sessionId && (
                <p className="text-xs text-gray-500">
                  Session ID: {sessionId}
                </p>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => router.push(ROUTES.MAP)}
                  className="flex-1 px-4 py-2 bg-[#367230] text-white uppercase tracking-widest text-sm hover:bg-[#244b20] transition-colors"
                >
                  Back to Map
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function DonationSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#367230]">
        <Navbar />
        <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 container mx-auto">
          <div className="max-w-md mx-auto bg-white border border-black p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#367230] mx-auto"></div>
          </div>
        </div>
      </main>
    }>
      <DonationSuccessContent />
    </Suspense>
  );
}

