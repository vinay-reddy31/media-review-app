"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import MediaCard from "@/components/MediaCard";
import LogoutButton from "@/components/LogoutButton";
import UserInfo from "@/components/UserInfo";
import DashboardNavigation from "@/components/DashboardNavigation";
import { createSocket } from "@/components/createSocket";

export default function ViewerDashboard() {
  const { data: session, status } = useSession();
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState({});

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.accessToken) return;

    // Fetch only media shared with user as viewer
    fetchViewerMedia();
    
    // Setup socket for viewing presence only
    const s = createSocket(session.accessToken);
    setSocket(s);

    s.on("connect", () => {
      console.log("Viewer socket connected");
    });

    s.on("userViewing", (data) => {
      setActiveUsers(prev => ({
        ...prev,
        [data.mediaId]: data.userName
      }));
    });

    s.on("userLeft", (data) => {
      setActiveUsers(prev => {
        const newState = { ...prev };
        delete newState[data.mediaId];
        return newState;
      });
    });

    return () => {
      s.disconnect();
    };
  }, [session?.accessToken, status]);

  const fetchViewerMedia = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/viewer`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMediaList(Array.isArray(data) ? data : []);
      } else {
        setMediaList([]);
      }
    } catch (error) {
      console.error("Error fetching viewer media:", error);
      setMediaList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaClick = (mediaId) => {
    // Emit viewing presence when viewer opens media
    if (socket) {
      socket.emit("userViewing", {
        mediaId,
        userName: session?.user?.name || "Viewer"
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white px-6 py-12">
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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header with Logout */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">Viewer Dashboard</h1>
            <p className="text-lg text-gray-300 mb-4">
              Browse and view media content shared with you. Read-only access for content consumption.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <UserInfo />
            <LogoutButton />
          </div>
        </div>

        {/* Dashboard Navigation */}
        <DashboardNavigation />
          
        {/* Read-Only Status */}
        <div className="bg-gray-500/20 backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">👁️ Read-Only Access</h3>
          <div className="text-sm text-gray-300">
            <p>• View media content shared with you</p>
            <p>• See real-time annotations and comments</p>
            <p>• Watch collaboration in action</p>
            <p>• No editing or commenting permissions</p>
          </div>
        </div>

        {/* Media Library */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Shared Media for Viewing</h2>
            <div className="text-sm text-gray-300">
              {mediaList.length} media items shared with you
            </div>
          </div>

          {mediaList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📺</div>
              <p className="text-xl text-gray-300 mb-2">No media shared for viewing</p>
              <p className="text-gray-400">Media will appear here once owners share content with you as a viewer</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaList.map((media) => (
                <div key={media.id} className="relative">
                  <MediaCard 
                    media={media} 
                    isViewer={true}
                    onMediaClick={() => handleMediaClick(media.id)}
                  />
                  
                  {/* Active User Indicator */}
                  {activeUsers[media.id] && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                      👤 {activeUsers[media.id]} is viewing
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Viewer Permissions Info */}
        <div className="mt-8 bg-gray-500/20 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">👁️ Viewer Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-300 mb-1">What you can do:</h4>
              <ul className="text-blue-200 space-y-1">
                <li>• View shared media content</li>
                <li>• See real-time annotations</li>
                <li>• Read comments and feedback</li>
                <li>• Watch collaboration in action</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-300 mb-1">What you cannot do:</h4>
              <ul className="text-red-200 space-y-1">
                <li>• Upload new media</li>
                <li>• Add comments or annotations</li>
                <li>• Delete or modify content</li>
                <li>• Edit media metadata</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Real-Time Collaboration Status */}
        <div className="mt-6 bg-blue-500/10 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">🔄 Live Collaboration</h3>
          <p className="text-sm text-gray-300">
            You can see real-time annotations and comments being added by owners and reviewers. 
            Watch the collaboration happen in real-time as teams work together on media content.
          </p>
        </div>
      </div>
    </main>
  );
}
