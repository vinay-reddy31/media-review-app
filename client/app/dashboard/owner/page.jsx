"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import UploadForm from "@/components/UploadForm";
import MediaCard from "@/components/MediaCard";
import LogoutButton from "@/components/LogoutButton";

export default function OwnerDashboard() {
  const { data: session, status } = useSession();
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.accessToken) return;

    // Fetch user's media
    fetchMediaList();
  }, [session?.accessToken, status]);

  const fetchMediaList = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/my-media`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMediaList(data);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newMedia) => {
    setMediaList(prev => [newMedia, ...prev]);
  };

  const handleDeleteMedia = (mediaId) => {
    setMediaList(prev => prev.filter(media => media.id !== mediaId));
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header with Logout */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">Owner Dashboard</h1>
            <p className="text-lg text-gray-300">
              Upload and manage your media with ease. You have full control over
              your workspace.
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Upload Section */}
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">Upload New Media</h2>
          <UploadForm 
            token={session?.accessToken} 
            onUploaded={handleUploadSuccess}
          />
        </div>

        {/* Media List Section */}
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-6">Your Media Library</h2>
          {mediaList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300 mb-4">No media uploaded yet.</p>
              <p className="text-gray-400">Upload your first video or image to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaList.map((media) => (
                <MediaCard key={media.id} media={media} onDelete={handleDeleteMedia} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
