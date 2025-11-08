"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/app/components/navbar";
import { ROUTES } from "@/app/lib/routes";

export default function TipCancelPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#367230]">
      <Navbar />
      <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 container mx-auto">
        <div className="max-w-md mx-auto bg-white border border-black p-8 text-center">
          <svg
            className="w-16 h-16 text-red-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-bold tracking-tighter text-black mb-2">
            Tip Payment Cancelled
          </h2>
          <p className="text-gray-700 mb-6">
            Your tip payment was not completed. You can try again or return to
            the map.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push(ROUTES.MAP)}
              className="px-6 py-3 bg-black text-white uppercase tracking-widest hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              Back to Map
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

