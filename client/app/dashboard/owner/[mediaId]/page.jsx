"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MediaViewerClient from "@/components/MediaViewerClient";
import LogoutButton from "@/components/LogoutButton";

export default function MediaViewerPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.accessToken) return;

    fetchMedia();
  }, [session?.accessToken, status, params.mediaId]);

  const fetchMedia = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/${params.mediaId}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMedia(data);
      } else {
        console.error("Failed to fetch media");
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading media...</p>
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Media not found</h2>
          <Link href="/dashboard/owner" className="text-purple-300 hover:text-purple-200">
            ← Back to Owner Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Back Button and Logout */}
      <div className="absolute top-6 left-6 z-20 flex items-center space-x-4">
        <Link
          href="/dashboard/owner"
          className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/70 transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </Link>
        <LogoutButton className="bg-black/50 backdrop-blur-sm hover:bg-black/70" />
      </div>
      
      <MediaViewerClient mediaId={params.mediaId} userRole="owner" />
    </div>
  );
}
