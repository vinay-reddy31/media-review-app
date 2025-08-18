// client/components/MediaCard.jsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function MediaCard({ media, onDelete, isReviewer = false, isViewer = false, onMediaClick }) {
  const { data: session } = useSession();
  const [deleting, setDeleting] = useState(false);

  const getMediaIcon = () => {
    return media.type === "video" ? "🎥" : "📷";
  };

  const getMediaPreview = () => {
    // Use the actual media file path instead of thumbnail
    if (media.filePath) {
      return `${process.env.NEXT_PUBLIC_API_URL}${media.filePath}`;
    }
    return null;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this media? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/${media.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      if (response.ok) {
        onDelete(media.id);
      } else {
        alert("Failed to delete media");
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Error deleting media");
    } finally {
      setDeleting(false);
    }
  };

  const getActionButton = () => {
    if (isViewer) {
      return (
        <Link
          href={`/dashboard/viewer/${media.id}`}
          className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-center py-2 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium"
          onClick={() => onMediaClick && onMediaClick()}
        >
          👁️ View Only
        </Link>
      );
    }

    if (isReviewer) {
      return (
        <Link
          href={`/dashboard/reviewer/${media.id}`}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-2 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium"
          onClick={() => onMediaClick && onMediaClick()}
        >
          ✏️ Review & Comment
        </Link>
      );
    }

    // Owner - can delete
    return (
      <>
        <Link
          href={`/dashboard/owner/${media.id}`}
          className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-center py-2 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Open & Annotate
        </Link>
        
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white px-3 py-2 rounded-lg transition-colors font-medium"
        >
          {deleting ? "..." : "🗑️"}
        </button>
      </>
    );
  };

  const getRoleBadge = () => {
    if (isViewer) {
      return (
        <div className="absolute top-2 left-2 bg-gray-500 text-white px-2 py-1 rounded text-xs">
          👁️ VIEWER
        </div>
      );
    }
    if (isReviewer) {
      return (
        <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
          ✏️ REVIEWER
        </div>
      );
    }
    return (
      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
        {media.type.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/10">
      <div className="relative">
        {getMediaPreview() ? (
          media.type === "video" ? (
            <video
              src={getMediaPreview()}
              className="w-full h-48 object-cover"
              muted
              preload="metadata"
              onLoadedData={(e) => {
                // Set video to first frame
                e.target.currentTime = 0;
              }}
            />
          ) : (
            <img
              src={getMediaPreview()}
              alt={media.title}
              className="w-full h-48 object-cover"
            />
          )
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-6xl">{getMediaIcon()}</span>
          </div>
        )}
        {getRoleBadge()}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-2 truncate">
          {media.title}
        </h3>
        
        <div className="text-sm text-gray-300 mb-4">
          <p>Uploaded: {formatDate(media.createdAt)}</p>
          {media.ownerName && (
            <p className="text-xs text-gray-400">By: {media.ownerName}</p>
          )}
        </div>

        <div className="flex gap-2">
          {getActionButton()}
        </div>
      </div>
    </div>
  );
}
