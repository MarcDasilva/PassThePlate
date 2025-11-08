"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/providers/AuthProvider";

export const navLinkClasses =
  "text-sm uppercase tracking-widest hover:text-red-600 transition-colors";

const navItems = [
  { label: "Home", href: "/#Home" },
  { label: "Mission", href: "/#mission" },
];

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-black text-black">
      <div className="container mx-auto px-1 md:px-2 py-4 flex justify-between items-center">
        <Link href="/">
          <Image
            src="/LargeLogo.png"
            alt="Helvetica Logo"
            width={120}
            height={80}
          />
        </Link>
        <div className="flex items-center space-x-3">
          {navItems.map(({ label, href }) => (
            <Link key={label} href={href} className={navLinkClasses}>
              {label}
            </Link>
          ))}
          {user ? (
            <>
              <span className="text-sm uppercase tracking-widest">
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className="text-sm uppercase tracking-widest border border-black px-5 py-2 transition-colors hover:bg-black hover:text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
