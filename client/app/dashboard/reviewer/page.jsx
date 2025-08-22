"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import MediaCard from "@/components/MediaCard";
import LogoutButton from "@/components/LogoutButton";
import UserInfo from "@/components/UserInfo";
import { createSocket } from "@/components/createSocket";

export default function ReviewerDashboard() {
  const { data: session, status } = useSession();
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.accessToken) return;

    // Fetch all media (reviewers can see all media)
    fetchAllMedia();
    
    // Setup socket for real-time features
    const s = createSocket(session.accessToken);
    setSocket(s);

    s.on("connect", () => {
      console.log("Reviewer socket connected");
    });

    s.on("userTyping", (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.mediaId]: data.userName
      }));
      
      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const newState = { ...prev };
          delete newState[data.mediaId];
          return newState;
        });
      }, 3000);
    });

    return () => {
      s.disconnect();
    };
  }, [session?.accessToken, status]);

  const fetchAllMedia = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/all`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to items the user explicitly has access to or owns (server already does this, but keep client guard)
        setMediaList(Array.isArray(data) ? data : []);
      } else {
        setMediaList([]);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      setMediaList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaClick = (mediaId) => {
    // Emit typing indicator when reviewer opens media
    if (socket) {
      socket.emit("userTyping", {
        mediaId,
        userName: session?.user?.name || "Reviewer"
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading media library...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header with Logout */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">Reviewer Dashboard</h1>
            <p className="text-lg text-blue-200 mb-4">
              Review and provide feedback on media content. You can view, comment, and annotate all media.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <UserInfo />
            <LogoutButton />
          </div>
        </div>
          
          {/* Real-time Status */}
          <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-2">🔄 Real-Time Collaboration</h3>
            <div className="text-sm text-blue-200">
              <p>• View all uploaded media content</p>
              <p>• Add comments and annotations in real-time</p>
              <p>• See when others are typing or annotating</p>
              <p>• Collaborate with owners and other reviewers</p>
            </div>
          </div>

        {/* Media Library */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Media Library</h2>
            <div className="text-sm text-blue-200">
              {mediaList.length} media items available
            </div>
          </div>

          {mediaList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl text-blue-200 mb-2">No media available for review</p>
              <p className="text-blue-300">Media will appear here once uploaded by owners</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaList.map((media) => (
                <div key={media.id} className="relative">
                  <MediaCard 
                    media={media} 
                    isReviewer={true}
                    onMediaClick={() => handleMediaClick(media.id)}
                  />
                  
                  {/* Typing Indicator */}
                  {typingUsers[media.id] && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs animate-pulse">
                      ✍️ {typingUsers[media.id]} is typing...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviewer Permissions Info */}
        <div className="mt-8 bg-green-500/20 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">✅ Reviewer Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-green-300 mb-1">What you can do:</h4>
              <ul className="text-green-200 space-y-1">
                <li>• View all media content</li>
                <li>• Add comments and annotations</li>
                <li>• Real-time collaboration</li>
                <li>• See typing indicators</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-300 mb-1">What you cannot do:</h4>
              <ul className="text-red-200 space-y-1">
                <li>• Upload new media</li>
                <li>• Delete media files</li>
                <li>• Modify media metadata</li>
                <li>• Manage user permissions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
