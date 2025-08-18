"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Sign out from NextAuth (this will clear all tokens)
      await signOut({
        callbackUrl: "/",
        redirect: false,
      });

      // Clear any additional tokens from localStorage if they exist
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("idToken");
        sessionStorage.clear();
      }

      // Navigate to home page
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even if there's an error
      router.push("/");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center space-x-2 ${className}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      <span>Logout</span>
    </button>
  );
}
