"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function DashboardNavigation() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [hasReviewerMedia, setHasReviewerMedia] = useState(false);
  const [hasViewerMedia, setHasViewerMedia] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;

    // Check if user has any reviewer or viewer media
    checkMediaAccess();
  }, [session?.accessToken]);

  const checkMediaAccess = async () => {
    try {
      setLoading(true);
      
      // Check reviewer access
      try {
        const reviewerResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/reviewer`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (reviewerResponse.ok) {
          const reviewerData = await reviewerResponse.json();
          setHasReviewerMedia(reviewerData.length > 0);
        }
      } catch (error) {
        console.warn("Could not check reviewer access:", error);
      }

      // Check viewer access
      try {
        const viewerResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/viewer`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (viewerResponse.ok) {
          const viewerData = await viewerResponse.json();
          setHasViewerMedia(viewerData.length > 0);
        }
      } catch (error) {
        console.warn("Could not check viewer access:", error);
      }
    } catch (error) {
      console.error("Error checking media access:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center mb-6">
        <div className="animate-pulse bg-white/20 rounded-lg px-4 py-2">
          <div className="h-4 w-32 bg-white/30 rounded"></div>
        </div>
      </div>
    );
  }

  const getTabClasses = (isActive) => {
    return `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
      isActive
        ? "bg-white/20 text-white shadow-lg"
        : "bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white"
    }`;
  };

  return (
    <div className="flex justify-center mb-6">
      <div className="flex space-x-2 bg-white/5 backdrop-blur-sm rounded-lg p-1">
        {/* Owner tab - always visible */}
        <Link
          href="/dashboard/owner"
          className={getTabClasses(pathname === "/dashboard/owner")}
        >
          👑 Owner
        </Link>

        {/* Reviewer tab - only if user has reviewer media */}
        {hasReviewerMedia && (
          <Link
            href="/dashboard/reviewer"
            className={getTabClasses(pathname === "/dashboard/reviewer")}
          >
            ✏️ Reviewer
          </Link>
        )}

        {/* Viewer tab - only if user has viewer media */}
        {hasViewerMedia && (
          <Link
            href="/dashboard/viewer"
            className={getTabClasses(pathname === "/dashboard/viewer")}
          >
            👁️ Viewer
          </Link>
        )}
      </div>
    </div>
  );
}
