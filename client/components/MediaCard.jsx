// client/components/MediaCard.jsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function MediaCard({ media, onDelete, isReviewer = false, isViewer = false, onMediaClick }) {
  const { data: session } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("reviewer");
  const [inviteMode, setInviteMode] = useState("media"); // 'media' | 'org'
  const [generatedLink, setGeneratedLink] = useState("");
  const [generating, setGenerating] = useState(false);

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
          onClick={() => setShowShare(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-colors font-medium"
        >
          🔗 Share
        </button>

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

      {showShare && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.15s_ease]"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-black">Share via link</h3>
              <button
                onClick={() => setShowShare(false)}
                className="p-2 rounded hover:bg-black/5 text-black"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Invitee Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full border rounded px-3 py-2 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-black"
                > 
                  <option value="reviewer" className="text-black">Reviewer</option>
                  <option value="viewer" className="text-black">Viewer</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-black text-sm">Mode:</label>
                  <select
                    value={inviteMode}
                    onChange={(e) => setInviteMode(e.target.value)}
                    className="border rounded px-2 py-1 text-black"
                  >
                    <option value="media" className="text-black">Media Share</option>
                    <option value="org" className="text-black">Organization Invite</option>
                  </select>
                </div>
              </div>

              {/* No org ID needed; backend will infer/create inviter's org */}

              <div className="flex items-center gap-3 pt-1">
                <button
                  
                  disabled={generating}
                  onClick={async () => {
                    try {
                      setGenerating(true);
                      setGeneratedLink("");
                      let url = "";
                      if (inviteMode === "media") {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/${media.id}/share-links`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session?.accessToken}`,
                          },
                          body: JSON.stringify({ inviteeEmail: inviteEmail, role: inviteRole, expiresInDays: 7 }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || "Failed to create link");
                        }
                        const data = await res.json();
                        url = data.url;
                      } else {
                        if (!inviteEmail || !inviteRole) {
                          throw new Error("Email and role are required for organization invites");
                        }
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invites`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session?.accessToken}`,
                          },
                          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          throw new Error(data.error || "Failed to create invite");
                        }
                        url = data.url;
                      }
                      setGeneratedLink(url);
                    } catch (e) {
                      alert(e.message);
                    } finally {
                      setGenerating(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
                >
                  {generating ? "Generating..." : "Generate link"}
                </button>
                <button
                  onClick={() => setShowShare(false)}
                  className="px-3 py-2 rounded-lg border text-black hover:bg-black/5"
                >
                  Close
                </button>
              </div>

              {generatedLink && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1 text-black">Share link</label>
                  <div className="flex gap-2">
                    <input readOnly value={generatedLink} className="flex-1 border rounded px-3 py-2 text-black bg-gray-50" />
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedLink)}
                      className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-black">Also sent to {inviteEmail || "the invitee"} if email provided. Expires in 7 days.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
