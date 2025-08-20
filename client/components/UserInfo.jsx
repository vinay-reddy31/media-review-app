// client/components/UserInfo.jsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

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
      <div className={`flex items-center space-x-3 text-gray-600 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Loading user info...</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!userInfo) {
    return (
      <div className={`flex items-center space-x-3 text-gray-600 ${className}`}>
        <span>User info unavailable</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-4 text-sm ${className}`}>
      {/* User Avatar */}
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
          {userInfo.username?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">
            {userInfo.username}
          </span>
          <span className="text-xs text-gray-500">
            Logged in
          </span>
        </div>
      </div>

      {/* Organization Info */}
      {userInfo.hasAccess && (
        <div className="flex items-center space-x-2 text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="font-medium">{userInfo.organization}</span>
        </div>
      )}

      {/* Role Badge */}
      {userInfo.hasAccess && (
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            userInfo.role === 'owner' ? 'bg-purple-100 text-purple-800' :
            userInfo.role === 'admin' ? 'bg-red-100 text-red-800' :
            userInfo.role === 'reviewer' ? 'bg-blue-100 text-blue-800' :
            userInfo.role === 'viewer' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {userInfo.role}
          </span>
        </div>
      )}

      {/* Multiple Organizations Indicator */}
      {userInfo.organizations && userInfo.organizations.length > 1 && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{userInfo.organizations.length} orgs</span>
        </div>
      )}
    </div>
  );
}
