"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import MediaCard from "@/components/MediaCard";
import LogoutButton from "@/components/LogoutButton";
import UserInfo from "@/components/UserInfo";
import DashboardNavigation from "@/components/DashboardNavigation";
import { createSocket } from "@/components/createSocket";
import { 
  EyeIcon, 
  ClockIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon
} from "@heroicons/react/24/outline";

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
      setLoading(true);
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

  const stats = [
    {
      label: "Available Media",
      value: mediaList.length,
      icon: EyeIcon,
      color: "from-green-500 to-green-600"
    },
    {
      label: "Active Viewers",
      value: Object.keys(activeUsers).length,
      icon: UserGroupIcon,
      color: "from-blue-500 to-blue-600"
    },
    {
      label: "Recent Activity",
      value: mediaList.length > 0 ? "Live" : "None",
      icon: ClockIcon,
      color: "from-purple-500 to-purple-600"
    }
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
        <DashboardNavigation />
        <div className="lg:ml-64 p-6">
          <div className="container-responsive">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white/80 text-lg">Loading viewing content...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      <DashboardNavigation />
      
      <div className="lg:ml-64 p-6 pb-20 lg:pb-6">
        <div className="container-responsive">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  <span className="text-gradient-primary">Viewer</span> Dashboard
                </h1>
                <p className="text-lg text-white/70 max-w-2xl">
                  Browse and view media content shared with you. Read-only access for content consumption with real-time collaboration visibility.
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <UserInfo />
                <LogoutButton />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="card-glass p-6 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Read-Only Status */}
          <div className="card-glass p-6 mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                <EyeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">👁️ Read-Only Access</h3>
                <p className="text-white/70">View and observe collaboration in real-time</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-blue-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>View media content shared with you</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>See real-time annotations and comments</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-blue-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Watch collaboration in action</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Observe real-time user activity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Media Library */}
          <div className="card-glass p-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Shared Media for Viewing</h2>
                  <p className="text-white/70">{mediaList.length} media items shared with you</p>
                </div>
              </div>
            </div>

            {mediaList.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-gray-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <EyeIcon className="w-12 h-12 text-white/50" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No media shared for viewing</h3>
                <p className="text-white/60 mb-6 max-w-md mx-auto">
                  Media will appear here once owners share content with you as a viewer. You'll be able to observe real-time collaboration.
                </p>
                <div className="flex items-center justify-center space-x-2 text-white/40">
                  <EyeIcon className="w-5 h-5" />
                  <span>•</span>
                  <PlayIcon className="w-5 h-5" />
                  <span>•</span>
                  <UserGroupIcon className="w-5 h-5" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {mediaList.map((media, index) => (
                  <div
                    key={media.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${500 + index * 50}ms` }}
                  >
                    <MediaCard 
                      media={media} 
                      isViewer={true}
                      onMediaClick={() => handleMediaClick(media.id)}
                    />
                    
                    {/* Active User Indicator */}
                    {activeUsers[media.id] && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                        👤 {activeUsers[media.id]} is viewing
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Viewer Permissions Info */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-glass p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 text-blue-400" />
                <span>What you can do:</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-blue-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>View shared media content</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>See real-time annotations</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Read comments and feedback</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Watch collaboration in action</span>
                </div>
              </div>
            </div>

            <div className="card-glass p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                <span>What you cannot do:</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-red-300">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Upload new media</span>
                </div>
                <div className="flex items-center space-x-3 text-red-300">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Add comments or annotations</span>
                </div>
                <div className="flex items-center space-x-3 text-red-300">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Delete or modify content</span>
                </div>
                <div className="flex items-center space-x-3 text-red-300">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Edit media metadata</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Collaboration Status */}
          <div className="mt-6 card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <PlayIcon className="w-5 h-5 text-green-400" />
              <span>🔄 Live Collaboration</span>
            </h3>
            <p className="text-white/70 mb-4">
              You can see real-time annotations and comments being added by owners and reviewers. 
              Watch the collaboration happen in real-time as teams work together on media content.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-green-300">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live annotations</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-300">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Real-time comments</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-300">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span>User activity</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
