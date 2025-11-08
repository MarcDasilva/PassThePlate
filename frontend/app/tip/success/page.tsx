"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/app/components/navbar";
import { ROUTES } from "@/app/lib/routes";

function TipSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Wait a moment for the webhook to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#367230]">
      <Navbar />
      <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 container mx-auto">
        <div className="max-w-md mx-auto bg-white border border-black p-8 text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#367230] mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-700">
                Processing your tip...
              </p>
            </>
          ) : (
            <>
              <svg
                className="w-16 h-16 text-[#367230] mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-2xl font-bold tracking-tighter text-black mb-2">
                Tip Payment Successful!
              </h2>
              <p className="text-gray-700 mb-6">
                Thank you for your generous tip. Your pickup has been confirmed.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => router.push(ROUTES.MAP)}
                  className="px-6 py-3 bg-[#367230] text-white uppercase tracking-widest hover:bg-[#244b20] transition-colors font-medium text-sm"
                >
                  Back to Map
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function TipSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#367230]">
          <Navbar />
          <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 container mx-auto">
            <div className="max-w-md mx-auto bg-white border border-black p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#367230] mx-auto"></div>
            </div>
          </div>
        </main>
      }
    >
      <TipSuccessContent />
    </Suspense>
  );
}

