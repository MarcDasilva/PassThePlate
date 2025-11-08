"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES } from "@/app/lib/routes";
import { Navbar } from "@/app/components/navbar";

export default function AccountPage() {
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
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold tracking-tighter mb-8 text-black text-center">
            Account
          </h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm uppercase tracking-widest mb-2 text-black">
                Email
              </label>
              <p className="text-lg text-black">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm uppercase tracking-widest mb-2 text-black">
                User ID
              </label>
              <p className="text-sm text-black/70 font-mono break-all">
                {user.id}
              </p>
            </div>

            <div className="pt-6 border-t border-black">
              <button
                onClick={handleLogout}
                className="w-full px-8 py-3 bg-black text-white text-sm uppercase tracking-widest hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
