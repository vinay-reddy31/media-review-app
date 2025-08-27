"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import UploadForm from "@/components/UploadForm";
import MediaCard from "@/components/MediaCard";
import LogoutButton from "@/components/LogoutButton";
import UserInfo from "@/components/UserInfo";
import DashboardNavigation from "@/components/DashboardNavigation";
import { 
  PlusIcon, 
  PhotoIcon, 
  VideoCameraIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

export default function OwnerDashboard() {
  const { data: session, status } = useSession();
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.accessToken) return;

    // Ensure backend has created org/client/roles and DB mappings before loading
    preSync().then(() => fetchMediaList());
  }, [session?.accessToken, status]);

  const preSync = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      await fetch(`${apiUrl}/users/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" },
      });
    } catch (e) {
      // best-effort
    }
  };

  const fetchMediaList = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/media/my-media`, {
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
    setUploading(false);
  };

  const handleDeleteMedia = (mediaId) => {
    setMediaList(prev => prev.filter(media => media.id !== mediaId));
  };

  const stats = [
    {
      label: "Total Media",
      value: mediaList.length,
      icon: DocumentIcon,
      color: "from-blue-500 to-blue-600"
    },
    {
      label: "Images",
      value: mediaList.filter(m => m.type === 'image').length,
      icon: PhotoIcon,
      color: "from-green-500 to-green-600"
    },
    {
      label: "Videos",
      value: mediaList.filter(m => m.type === 'video').length,
      icon: VideoCameraIcon,
      color: "from-purple-500 to-purple-600"
    }
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <DashboardNavigation />
        <div className="lg:ml-64 p-6">
          <div className="container-responsive">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white/80 text-lg">Loading your media library...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <DashboardNavigation />
      
      <div className="lg:ml-64 p-6 pb-20 lg:pb-6">
        <div className="container-responsive">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  <span className="text-gradient-primary">Owner</span> Dashboard
                </h1>
                <p className="text-lg text-white/70 max-w-2xl">
                  Upload and manage your media with ease. You have full control over your workspace and can share content with reviewers and viewers.
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

          {/* Upload Section */}
          <div className="card-glass p-8 mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <CloudArrowUpIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Upload New Media</h2>
                <p className="text-white/70">Add images, videos, or documents to your library</p>
              </div>
            </div>
            
            <UploadForm 
              token={session?.accessToken} 
              onUploaded={handleUploadSuccess}
              onUploadStart={() => setUploading(true)}
            />
          </div>

          {/* Media Library Section */}
          <div className="card-glass p-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Your Media Library</h2>
                  <p className="text-white/70">{mediaList.length} items in your collection</p>
                </div>
              </div>
            </div>

            {mediaList.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <DocumentIcon className="w-12 h-12 text-white/50" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No media uploaded yet</h3>
                <p className="text-white/60 mb-6 max-w-md mx-auto">
                  Upload your first video or image to get started! You can then share it with reviewers and viewers.
                </p>
                <div className="flex items-center justify-center space-x-2 text-white/40">
                  <PhotoIcon className="w-5 h-5" />
                  <span>•</span>
                  <VideoCameraIcon className="w-5 h-5" />
                  <span>•</span>
                  <DocumentIcon className="w-5 h-5" />
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
                      onDelete={handleDeleteMedia}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-glass p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white">
                  <div className="flex items-center space-x-3">
                    <PlusIcon className="w-5 h-5" />
                    <span>Upload New Media</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white">
                  <div className="flex items-center space-x-3">
                    <PhotoIcon className="w-5 h-5" />
                    <span>View All Images</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white">
                  <div className="flex items-center space-x-3">
                    <VideoCameraIcon className="w-5 h-5" />
                    <span>View All Videos</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="card-glass p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {mediaList.slice(0, 3).map((media) => (
                  <div key={media.id} className="flex items-center space-x-3 p-2 rounded-lg bg-white/5">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      {media.type === 'image' ? (
                        <PhotoIcon className="w-4 h-4 text-white" />
                      ) : (
                        <VideoCameraIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{media.name}</p>
                      <p className="text-xs text-white/60">Uploaded recently</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
