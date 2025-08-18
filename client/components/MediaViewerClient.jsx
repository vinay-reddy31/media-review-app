// client/app/dashboard/owner/[mediaId]/MediaViewerClient.jsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { createSocket } from "@/components/createSocket";
import CommentsPanel from "@/components/CommentsPanel";
import AnnotationsPanel from "@/components/AnnotationsPanel";
import AnnotationCanvas from "@/components/AnnotationCanvas";

export default function MediaViewerClient({ mediaId, userRole = "owner" }) {
  const { data: session } = useSession();
  const [media, setMedia] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("comments"); // "comments" or "annotations"
  const videoRef = useRef(null);

  useEffect(() => {
    if (!session?.accessToken) return;

    // Fetch media info
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/${mediaId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch media');
        return r.json();
      })
      .then(setMedia)
      .catch((err) => {
        console.error("Error fetching media:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));

    // Setup socket
    const s = createSocket(session.accessToken);
    setSocket(s);
    
    console.log("Socket created:", s);
    console.log("Joining media room:", mediaId);
    
    s.emit("joinMediaRoom", mediaId);

    s.on("connect_error", (err) => {
      console.error("Socket error", err);
      setError("Failed to connect to real-time features");
    });

    s.on("connect", () => {
      console.log("Socket connected successfully");
    });

    s.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      s.emit("leaveMediaRoom", mediaId);
      s.disconnect();
    };
  }, [session?.accessToken, mediaId]);

  if (!session) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
        <p className="text-gray-300">You need to be authenticated to view this media.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading media...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2>
        <p className="text-gray-300">{error}</p>
      </div>
    </div>
  );

  if (!media) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Media not found</h2>
        <p className="text-gray-300">The requested media could not be found.</p>
      </div>
    </div>
  );

  const getBackgroundGradient = () => {
    switch (userRole) {
      case "reviewer":
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
      case "viewer":
        return "bg-gradient-to-br from-gray-900 to-slate-800";
      default:
        return "bg-gradient-to-br from-purple-900 to-indigo-900";
    }
  };

  const getRoleInstructions = () => {
    switch (userRole) {
      case "reviewer":
        return {
          title: "🎨 How to Review & Annotate:",
          items: [
            "• <strong>Click anywhere</strong> on the video/image to add text annotations",
            "• <strong>Blue dots</strong> will appear where you click (like Loom)",
            "• <strong>Comments:</strong> Add time-stamped feedback in the Comments tab",
            "• <strong>Annotations:</strong> View all annotations in the Annotations tab",
            "• <strong>Real-time:</strong> See changes live as others collaborate"
          ]
        };
      case "viewer":
        return {
          title: "👁️ Read-Only Mode:",
          items: [
            "• View all annotations and comments in real-time",
            "• Watch collaboration happen live",
            "• No editing or commenting permissions",
            "• Observe how teams work together",
            "• See typing indicators and user presence"
          ]
        };
      default:
        return {
          title: "🎨 How to Annotate:",
          items: [
            "• <strong>Click anywhere</strong> on the video/image to add text annotations",
            "• <strong>Blue dots</strong> will appear where you click (like Loom)",
            "• <strong>Comments:</strong> Add time-stamped feedback in the Comments tab",
            "• <strong>Annotations:</strong> View all annotations in the Annotations tab",
            "• <strong>Real-time:</strong> See changes live as others collaborate"
          ]
        };
    }
  };

  const instructions = getRoleInstructions();

  return (
    <div className={`min-h-screen ${getBackgroundGradient()} text-white p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{media.title}</h1>
          <p className="text-gray-300">
            {media.type === "video" ? "🎥 Video" : "📷 Image"} • 
            Uploaded on {new Date(media.createdAt).toLocaleDateString()}
            {media.ownerName && ` • By: ${media.ownerName}`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Media Player Section */}
          <div className="lg:col-span-3">
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
              <div className="relative" style={{ minHeight: "400px" }}>
                {media.type === "video" ? (
                  <video
                    ref={videoRef}
                    id="main-player"
                    src={`${process.env.NEXT_PUBLIC_API_URL}${media.filePath}`}
                    controls
                    className="w-full rounded-lg shadow-lg"
                    style={{ maxHeight: "70vh" }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <img
                    id="main-player"
                    src={`${process.env.NEXT_PUBLIC_API_URL}${media.filePath}`}
                    alt={media.title}
                    className="w-full rounded-lg shadow-lg"
                    style={{ maxHeight: "70vh", objectFit: "contain" }}
                  />
                )}

                <AnnotationCanvas
                  socket={socket}
                  mediaId={mediaId}
                  playerId="main-player"
                  videoRef={videoRef}
                  user={session?.user}
                  userRole={userRole}
                />
              </div>
              
              {/* Role-specific Instructions */}
              <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
                <h4 className="text-white font-semibold mb-2" dangerouslySetInnerHTML={{ __html: instructions.title }}></h4>
                <ul className="text-sm text-gray-200 space-y-1">
                  {instructions.items.map((item, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: item }}></li>
                  ))}
                </ul>
                <div className="mt-2 text-xs text-gray-300">
                  💡 <strong>Debug:</strong> Check browser console for annotation events
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar with Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg h-fit sticky top-6">
              {/* Tab Navigation */}
              <div className="flex border-b border-white/20">
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "comments"
                      ? "bg-blue-500/20 text-white border-b-2 border-blue-500"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  💬 Comments
                </button>
                <button
                  onClick={() => setActiveTab("annotations")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "annotations"
                      ? "bg-green-500/20 text-white border-b-2 border-green-500"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  ✏️ Annotations
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === "comments" ? (
                  <CommentsPanel 
                    socket={socket} 
                    mediaId={mediaId} 
                    userRole={userRole}
                    user={session?.user}
                  />
                ) : (
                  <AnnotationsPanel 
                    socket={socket} 
                    mediaId={mediaId} 
                    userRole={userRole}
                    user={session?.user}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
