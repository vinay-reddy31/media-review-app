// client/components/UserInfo.jsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  ShieldCheckIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

export default function UserInfo({ className = "" }) {
  const { data: session, status } = useSession();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session) {
      fetchUserInfo();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [session, status]);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/dashboard-info`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.data);
      } else {
        console.error('Failed to fetch user info:', response.statusText);
        // Fallback to session data
        setUserInfo({
          username: session.user?.name || session.user?.email || 'Unknown User',
          organization: 'Loading...',
          role: 'Loading...',
          hasAccess: false
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Fallback to session data
      setUserInfo({
        username: session.user?.name || session.user?.email || 'Unknown User',
        organization: 'Error',
        role: 'Error',
        hasAccess: false
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className={`flex items-center space-x-3 text-white/60 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!userInfo) {
    return (
      <div className={`flex items-center space-x-3 text-white/60 ${className}`}>
        <span className="text-sm">User info unavailable</span>
      </div>
    );
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'from-purple-500 to-purple-600';
      case 'admin':
        return 'from-red-500 to-red-600';
      case 'reviewer':
        return 'from-blue-500 to-blue-600';
      case 'viewer':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className={`flex items-center space-x-4 text-sm ${className}`}>
      {/* User Avatar */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
          {userInfo.username?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white">
            {userInfo.username}
          </span>
          <span className="text-xs text-white/60">
            Active session
          </span>
        </div>
      </div>

      {/* Organization Info */}
      {userInfo.hasAccess && (
        <div className="hidden md:flex items-center space-x-2 text-white/80">
          <BuildingOfficeIcon className="w-4 h-4" />
          <span className="font-medium">{userInfo.organization}</span>
        </div>
      )}

      {/* Role Badge */}
      {userInfo.hasAccess && (
        <div className="hidden sm:flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getRoleColor(userInfo.role)} text-white shadow-lg`}>
            <div className="flex items-center space-x-1">
              <ShieldCheckIcon className="w-3 h-3" />
              <span className="capitalize">{userInfo.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Organizations Indicator */}
      {userInfo.organizations && userInfo.organizations.length > 1 && (
        <div className="hidden lg:flex items-center space-x-1 text-xs text-white/60">
          <InformationCircleIcon className="w-3 h-3" />
          <span>{userInfo.organizations.length} organizations</span>
        </div>
      )}
    </div>
  );
}
