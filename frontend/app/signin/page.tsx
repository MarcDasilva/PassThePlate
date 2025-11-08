"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { Navbar } from "@/app/components/navbar";
import { ROUTES } from "@/app/lib/routes";
import { hasProfile } from "@/app/lib/supabase/profile";
import { createClient } from "@/app/lib/supabase/client";

export default function SignInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    signIn,
    signUp,
    signInWithGoogle,
    user,
    loading: authLoading,
  } = useAuth();
  const router = useRouter();

  // Redirect if user is already authenticated
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!authLoading && user) {
        const profileExists = await hasProfile(user.id);
        window.location.href = profileExists ? ROUTES.MAP : ROUTES.ACCOUNT;
      }
    };
    checkAndRedirect();
  }, [user, authLoading]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      setLoading(true);
      const { error } = await signUp(email, password);

      if (error) {
        setLoading(false);
        setError(error.message);
      } else {
        // Wait a moment for session to be established, then check profile
        setTimeout(async () => {
          const supabase = createClient();
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();
          if (currentUser) {
            const profileExists = await hasProfile(currentUser.id);
            window.location.href = profileExists ? ROUTES.MAP : ROUTES.ACCOUNT;
          } else {
            window.location.href = ROUTES.MAP;
          }
        }, 500);
      }
    } else {
      setLoading(true);
      const { error } = await signIn(email, password);

      if (error) {
        setLoading(false);
        setError(error.message);
      } else {
        // Wait a moment for session to be established, then check profile
        setTimeout(async () => {
          const supabase = createClient();
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();
          if (currentUser) {
            const profileExists = await hasProfile(currentUser.id);
            window.location.href = profileExists ? ROUTES.MAP : ROUTES.ACCOUNT;
          } else {
            window.location.href = ROUTES.MAP;
          }
        }, 500);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    await signInWithGoogle();
  };

  return (
    <main className="min-h-screen bg-[#367230]">
      <Navbar />
      <div className="pt-32 pb-20 px-4 md:px-8 container mx-auto">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold tracking-tighter mb-6 text-black text-center">
            {isSignUp ? "Sign Up" : "Sign In"}
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm uppercase tracking-widest mb-2 text-black"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignUp ? 6 : undefined}
                className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50"
                placeholder="••••••"
              />
            </div>

            {isSignUp && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm uppercase tracking-widest mb-2 text-black"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-b-2 border-black py-2 px-0 focus:outline-none focus:border-[#367230] text-black placeholder-black/50"
                  placeholder="••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-3 bg-black text-white text-sm uppercase tracking-widest hover:bg-[#367230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isSignUp
                  ? "Signing up..."
                  : "Signing in..."
                : isSignUp
                ? "Sign Up"
                : "Sign In"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-black uppercase tracking-widest">
                  Or
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleAuth}
              className="mt-6 w-full px-8 py-3 border-2 border-black text-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              {isSignUp ? "Sign up with Google" : "Sign in with Google"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-black">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setPassword("");
                setConfirmPassword("");
              }}
              className="underline hover:text-[#367230]"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
