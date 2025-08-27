// client/components/MediaCard.jsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { 
  PlayIcon, 
  PhotoIcon, 
  TrashIcon, 
  ShareIcon,
  EyeIcon,
  PencilIcon,
  CalendarIcon,
  UserIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function MediaCard({ media, onDelete, isReviewer = false, isViewer = false, onMediaClick }) {
  const { data: session } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("reviewer");
  const [inviteMode, setInviteMode] = useState("media"); // 'media' | 'org'
  const [generatedLink, setGeneratedLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const getMediaIcon = () => {
    return media.type === "video" ? PlayIcon : PhotoIcon;
  };

  const getMediaPreview = () => {
    // Use the actual media file path instead of thumbnail
    if (media.filePath) {
      return `${process.env.NEXT_PUBLIC_API_URL}${media.filePath}`;
    }
    return null;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this media? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    const deleteToast = toast.loading('Deleting media...', {
      duration: Infinity,
    });

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/${media.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      if (response.ok) {
        toast.success('Media deleted successfully!', {
          id: deleteToast,
        });
        onDelete(media.id);
      } else {
        const errorMsg = "Failed to delete media";
        toast.error(errorMsg, {
          id: deleteToast,
        });
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      const errorMsg = "Error deleting media";
      toast.error(errorMsg, {
        id: deleteToast,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  const getActionButton = () => {
    if (isViewer) {
      return (
        <Link
          href={`/dashboard/viewer/${media.id}`}
          className="flex-1 btn-primary flex items-center justify-center space-x-2 text-sm"
          onClick={() => {
            onMediaClick && onMediaClick();
            toast.success('Opening media for viewing');
          }}
        >
          <EyeIcon className="w-4 h-4" />
          <span>View</span>
        </Link>
      );
    }

    if (isReviewer) {
      return (
        <Link
          href={`/dashboard/reviewer/${media.id}`}
          className="flex-1 btn-secondary flex items-center justify-center space-x-2 text-sm"
          onClick={() => {
            onMediaClick && onMediaClick();
            toast.success('Opening media for review');
          }}
        >
          <PencilIcon className="w-4 h-4" />
          <span>Review</span>
        </Link>
      );
    }

    // Owner - can delete
    return (
      <div className="flex gap-2">
        <Link
          href={`/dashboard/owner/${media.id}`}
          className="flex-1 btn-primary flex items-center justify-center space-x-2 text-sm"
          onClick={() => toast.success('Opening media for annotation')}
        >
          <PlayIcon className="w-4 h-4" />
          <span>Open</span>
        </Link>
        <button
          onClick={() => {
            setShowShare(true);
            toast.success('Opening share dialog');
          }}
          className="btn-accent flex items-center space-x-2 px-3 text-sm"
        >
          <ShareIcon className="w-4 h-4" />
          <span>Share</span>
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-400 disabled:to-red-500 text-white px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center space-x-2 text-sm"
        >
          {deleting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>...</span>
            </>
          ) : (
            <>
              <TrashIcon className="w-4 h-4" />
              <span>Delete</span>
            </>
          )}
        </button>
      </div>
    );
  };

  const getRoleBadge = () => {
    if (isViewer) {
      return (
        <div className="absolute top-3 left-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center space-x-1">
          <EyeIcon className="w-3 h-3" />
          <span>VIEWER</span>
        </div>
      );
    }
    if (isReviewer) {
      return (
        <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center space-x-1">
          <PencilIcon className="w-3 h-3" />
          <span>REVIEWER</span>
        </div>
      );
    }
    return (
      <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
        {media.type.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="card-glass overflow-hidden hover-lift group w-full min-w-[320px]">
      <div className="relative">
        {getMediaPreview() ? (
          media.type === "video" ? (
            <video
              src={getMediaPreview()}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
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
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <getMediaIcon className="w-16 h-16 text-white/80" />
          </div>
        )}
        {getRoleBadge()}
      </div>
      
      <div className="p-6">
        <h3 className="text-lg font-semibold text-white mb-3 truncate group-hover:text-gradient-primary transition-all duration-300">
          {media.title}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-white/70 text-sm">
            <CalendarIcon className="w-4 h-4" />
            <span>Uploaded: {formatDate(media.createdAt)}</span>
          </div>
          
          {media.ownerName && (
            <div className="flex items-center space-x-2 text-white/70 text-sm">
              <UserIcon className="w-4 h-4" />
              <span>By: {media.ownerName}</span>
            </div>
          )}
          
          {/* Show shared by information for reviewer/viewer media */}
          {media.sharedBy && (
            <div className="flex items-center space-x-2 text-blue-300 text-sm">
              <LinkIcon className="w-4 h-4" />
              <span>Shared by: {media.sharedBy.split('(')[0]}</span>
            </div>
          )}
          
          {media.sharedAt && (
            <div className="flex items-center space-x-2 text-blue-300 text-sm">
              <CalendarIcon className="w-4 h-4" />
              <span>Shared on: {formatDate(media.sharedAt)}</span>
            </div>
          )}
        </div>

        {getActionButton()}
      </div>

      {/* Share Modal */}
      {showShare && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowShare(false)}
        >
          <div
            className="card w-full max-w-md overflow-hidden animate-scale-in"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Share Media</h3>
              <button
                onClick={() => setShowShare(false)}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-white">Invitee Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-white">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input"
                > 
                  <option value="reviewer">Reviewer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-neutral-900 dark:text-white">Mode:</label>
                <select
                  value={inviteMode}
                  onChange={(e) => setInviteMode(e.target.value)}
                  className="input flex-1"
                >
                  <option value="media">Media Share</option>
                  <option value="org">Organization Invite</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
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
                          body: JSON.stringify({ email: inviteEmail, role: inviteRole, mediaId: media.id }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          throw new Error(data.error || "Failed to create invite");
                        }
                        url = data.url;
                      }
                      setGeneratedLink(url);
                      toast.success('Share link generated successfully!');
                    } catch (e) {
                      toast.error(e.message);
                    } finally {
                      setGenerating(false);
                    }
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span>Generate Link</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowShare(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>

              {generatedLink && (
                <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-white">Share Link</label>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={generatedLink} 
                      className="input flex-1 bg-white dark:bg-neutral-900" 
                    />
                    <button
                      onClick={handleCopyLink}
                      className="btn-primary flex items-center space-x-2 px-4"
                    >
                      {copied ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    Link expires in 7 days. {inviteEmail && `Also sent to ${inviteEmail}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
