"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import MediaCard from "@/components/MediaCard";
import LogoutButton from "@/components/LogoutButton";
import UserInfo from "@/components/UserInfo";
import DashboardNavigation from "@/components/DashboardNavigation";
import { createSocket } from "@/components/createSocket";
import { 
  PencilIcon, 
  ChatBubbleLeftRightIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

export default function ReviewerDashboard() {
  const { data: session, status } = useSession();
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.accessToken) return;

    // Fetch only media shared with user as reviewer
    fetchReviewerMedia();
    
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

  const fetchReviewerMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/reviewer`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMediaList(Array.isArray(data) ? data : []);
      } else {
        setMediaList([]);
      }
    } catch (error) {
      console.error("Error fetching reviewer media:", error);
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

  const stats = [
    {
      label: "Pending Reviews",
      value: mediaList.length,
      icon: ClockIcon,
      color: "from-yellow-500 to-yellow-600"
    },
    {
      label: "Completed Reviews",
      value: 0, // This would come from backend
      icon: CheckCircleIcon,
      color: "from-green-500 to-green-600"
    },
    {
      label: "Active Collaborators",
      value: Object.keys(typingUsers).length,
      icon: UserGroupIcon,
      color: "from-blue-500 to-blue-600"
    }
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <DashboardNavigation />
        <div className="lg:ml-64 p-6">
          <div className="container-responsive">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white/80 text-lg">Loading review content...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <DashboardNavigation />
      
      <div className="lg:ml-64 p-6 pb-20 lg:pb-6">
        <div className="container-responsive">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  <span className="text-gradient-secondary">Reviewer</span> Dashboard
                </h1>
                <p className="text-lg text-white/70 max-w-2xl">
                  Review and provide feedback on media content shared with you. You can view, comment, and annotate shared media in real-time.
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

          {/* Real-time Status */}
          <div className="card-glass p-6 mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">🔄 Real-Time Collaboration</h3>
                <p className="text-white/70">Live collaboration features are active</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-green-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Review media content shared with you</span>
                </div>
                <div className="flex items-center space-x-2 text-green-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Add comments and annotations in real-time</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-green-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>See when others are typing or annotating</span>
                </div>
                <div className="flex items-center space-x-2 text-green-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Collaborate with media owners and other reviewers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Media Library */}
          <div className="card-glass p-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Shared Media for Review</h2>
                  <p className="text-white/70">{mediaList.length} media items shared with you</p>
                </div>
              </div>
            </div>

            {mediaList.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PencilIcon className="w-12 h-12 text-white/50" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No media shared for review</h3>
                <p className="text-white/60 mb-6 max-w-md mx-auto">
                  Media will appear here once owners share content with you as a reviewer. You'll be able to add comments and annotations.
                </p>
                <div className="flex items-center justify-center space-x-2 text-white/40">
                  <PencilIcon className="w-5 h-5" />
                  <span>•</span>
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
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
                      isReviewer={true}
                      onMediaClick={() => handleMediaClick(media.id)}
                    />
                    
                    {/* Typing Indicator */}
                    {typingUsers[media.id] && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs animate-pulse-slow shadow-lg">
                        ✍️ {typingUsers[media.id]} is typing...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewer Permissions Info */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-glass p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <span>What you can do:</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>View shared media content</span>
                </div>
                <div className="flex items-center space-x-3 text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Add comments and annotations</span>
                </div>
                <div className="flex items-center space-x-3 text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Real-time collaboration</span>
                </div>
                <div className="flex items-center space-x-3 text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>See typing indicators</span>
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
                  <span>Delete media files</span>
                </div>
                <div className="flex items-center space-x-3 text-red-300">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Modify media metadata</span>
                </div>
                <div className="flex items-center space-x-3 text-red-300">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Manage user permissions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
