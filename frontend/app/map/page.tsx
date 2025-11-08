"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/app/lib/routes";
import { Navbar } from "@/app/components/navbar";
import { hasProfile } from "@/app/lib/supabase/profile";

export default function MapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      if (!loading && !user) {
        router.push(ROUTES.SIGN_IN);
        return;
      }

      if (user) {
        // Check if user has completed profile
        const profileExists = await hasProfile(user.id);
        if (!profileExists) {
          router.push(ROUTES.PROFILE_SETUP);
          return;
        }
        setCheckingProfile(false);
      }
    };

    checkAuthAndProfile();
  }, [user, loading, router]);

  if (loading || checkingProfile) {
    return (
      <main className="min-h-screen bg-[#367230] flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#367230]">
      <Navbar />
      <div className="pt-32 pb-20 px-4 md:px-8 container mx-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold tracking-tighter mb-8 text-white">
            Map
          </h1>
          <div className="space-y-4">
            <div>
              <p className="text-xl text-white mb-2">Welcome,</p>
              <Link
                href={ROUTES.ACCOUNT}
                className="text-2xl font-bold text-white hover:text-[#244b20] transition-colors underline"
              >
                {user.email}
              </Link>
            </div>
            <p className="text-lg text-white">This is your map.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
