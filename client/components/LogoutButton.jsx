"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Ask server for Keycloak logout URL
      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let logoutUrl = '/';
      if (logoutResponse.ok) {
        const data = await logoutResponse.json();
        logoutUrl = data.logoutUrl || '/';
      }

      // Clear local storage/session caches
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("idToken");
        sessionStorage.clear();
      }

      // Clear NextAuth session but do not redirect yet
      await signOut({ redirect: false });

      // Hard redirect to Keycloak end-session endpoint
      window.location.href = logoutUrl;
    } catch (error) {
      console.error("Logout error:", error);
      try {
        await signOut({ callbackUrl: "/", redirect: true });
      } catch (_) {}
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
