"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  HomeIcon, 
  SparklesIcon, 
  PencilIcon, 
  EyeIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  CogIcon
} from "@heroicons/react/24/outline";

export default function DashboardNavigation() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [hasReviewerMedia, setHasReviewerMedia] = useState(null);
  const [hasViewerMedia, setHasViewerMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
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

  const navigationItems = [
    {
      name: "Owner",
      href: "/dashboard/owner",
      icon: SparklesIcon,
      color: "from-purple-500 to-purple-600",
      hoverColor: "from-purple-600 to-purple-700",
      alwaysVisible: true,
      description: "Manage your media library"
    },
    {
      name: "Reviewer",
      href: "/dashboard/reviewer",
      icon: PencilIcon,
      color: "from-blue-500 to-blue-600",
      hoverColor: "from-blue-600 to-blue-700",
      alwaysVisible: true,
      hasMedia: hasReviewerMedia,
      description: "Review shared content"
    },
    {
      name: "Viewer",
      href: "/dashboard/viewer",
      icon: EyeIcon,
      color: "from-green-500 to-green-600",
      hoverColor: "from-green-600 to-green-700",
      alwaysVisible: true,
      hasMedia: hasViewerMedia,
      description: "View shared content"
    }
  ];

  const getNavItemClasses = (isActive, item) => {
    const baseClasses = "flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 group";
    
    if (isActive) {
      return `${baseClasses} bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`;
    }
    
    return `${baseClasses} text-gray-300 hover:text-white hover:bg-white/10 hover:transform hover:scale-105`;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center space-x-3 px-6 py-6 border-b border-white/10">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-white">MediaReview</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={getNavItemClasses(isActive, item)}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-6 h-6" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{item.name}</div>
                <div className="text-xs opacity-70">
                  {item.description}
                  {item.hasMedia === false && (
                    <span className="text-yellow-400 ml-1">• No content yet</span>
                  )}
                  {item.hasMedia === null && (
                    <span className="text-gray-400 ml-1">• Loading...</span>
                  )}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
          <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name || "User"}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {session?.user?.email || "user@example.com"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-t border-white/20 z-50 lg:hidden">
      <div className="flex justify-around py-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'text-white bg-white/20' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
              {item.hasMedia === false && (
                <span className="text-xs text-yellow-400">No content</span>
              )}
              {item.hasMedia === null && (
                <span className="text-xs text-gray-400">Loading...</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="lg:hidden">
        <div className="flex justify-center mb-6">
          <div className="animate-pulse bg-white/20 rounded-lg px-4 py-2">
            <div className="h-4 w-32 bg-white/30 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-r border-white/10 z-40">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setSidebarOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-r border-white/10">
            <div className="flex justify-end p-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-3 rounded-lg bg-white/10 backdrop-blur-lg hover:bg-white/20 transition-colors"
        >
          <Bars3Icon className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Main content margin for desktop */}
      <div className="lg:ml-64">
        {/* Content goes here */}
      </div>
    </>
  );
}
