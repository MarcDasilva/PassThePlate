"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/app/components/navbar";
import { ROUTES } from "@/app/lib/routes";

export default function DonationCancelPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#367230]">
      <Navbar />
      <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 container mx-auto">
        <div className="max-w-md mx-auto bg-white border border-black p-8 text-center">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-black">
              Donation Cancelled
            </h1>
            <p className="text-gray-600">
              Your donation was cancelled. No payment was processed.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.push(ROUTES.MAP)}
                className="flex-1 px-4 py-2 bg-[#367230] text-white uppercase tracking-widest text-sm hover:bg-[#244b20] transition-colors"
              >
                Back to Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

