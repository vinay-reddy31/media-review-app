"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();

  const handleLogout = async () => {
    const logoutToast = toast.loading('Signing out...', {
      duration: Infinity,
    });

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

      toast.success('Signed out successfully!', {
        id: logoutToast,
      });

      // Hard redirect to Keycloak end-session endpoint
      window.location.href = logoutUrl;
    } catch (error) {
      console.error("Logout error:", error);
      toast.error('Error signing out', {
        id: logoutToast,
      });
      
      try {
        await signOut({ callbackUrl: "/", redirect: true });
      } catch (_) {}
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-2 py-1 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50 font-medium flex items-center space-x-2 shadow-lg hover:shadow-xl ${className}`}
    >
      <ArrowRightOnRectangleIcon className="w-4 h-4" />
      <span>Sign Out</span>
    </button>
  );
}
