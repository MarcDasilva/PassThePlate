"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES } from "@/app/lib/routes";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(ROUTES.SIGN_IN);
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push(ROUTES.SIGN_IN);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#367230] flex items-center justify-center">
        <p className="text-white text-xl">Sign In</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#367230]">
      <div className="flex h-screen">
        {/* Left Sidebar with Logout */}
        <div className="w-64 bg-[#244b20] p-8 flex flex-col">
          <button
            onClick={handleLogout}
            className="mt-auto px-6 py-3 bg-white text-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 text-white">
          <h1 className="text-6xl font-bold tracking-tighter mb-8">
            Dashboard
          </h1>
          <div className="space-y-4">
            <p className="text-xl">Welcome, {user.email}</p>
            <p className="text-lg">This is your dashboard.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
