"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MediaViewerClient from "@/components/MediaViewerClient";
import LogoutButton from "@/components/LogoutButton";

export default function ReviewerMediaViewer() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading media...</p>
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Media not found</h2>
          <Link href="/dashboard/reviewer" className="text-blue-300 hover:text-blue-200">
            ← Back to Reviewer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
      {/* Header with navigation */}
      <div className="bg-blue-800/50 backdrop-blur-sm border-b border-blue-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard/reviewer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{media.title}</h1>
                <p className="text-sm text-blue-200">Reviewer Mode - You can comment and annotate</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                ✏️ REVIEWER
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Media Viewer */}
      <MediaViewerClient mediaId={params.mediaId} userRole="reviewer" />
    </div>
  );
}
