// client/components/CommentsPanel.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function CommentsPanel({ socket, mediaId, userRole = "owner", user }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
  const [deletingComment, setDeletingComment] = useState(null);

  // Debug session data
  useEffect(() => {
    console.log("Session data:", session);
    console.log("User prop:", user);
    console.log("User role:", userRole);
  }, [session, user, userRole]);

  // Check if user can comment
  const canComment = userRole !== "viewer";
  // Check if user can delete (owner can delete any comment)
  const canDelete = (commentUserId) => {
    console.log("Checking if user can delete comment:");
    console.log("User role:", userRole);
    console.log("Comment user ID:", commentUserId);
    console.log("Current user ID:", session?.user?.id || session?.user?.sub);
    console.log("Session user:", session?.user);
    
    // Owner can delete any comment
    if (userRole === "owner") {
      console.log("User is owner, can delete any comment");
      return true;
    }
    
    console.log("User cannot delete this comment (not owner)");
    return false;
  };

  useEffect(() => {
    if (!socket) return;

    // Socket event listeners
    socket.on("commentAdded", (comment) => {
      console.log("Comment added:", comment);
      console.log("Comment structure:", {
        _id: comment._id,
        userId: comment.userId,
        userName: comment.userName,
        text: comment.text,
        timeInMedia: comment.timeInMedia,
        createdAt: comment.createdAt
      });
      setComments(prev => [...prev, comment]);
    });

    socket.on("commentDeleted", (data) => {
      console.log("Comment deleted:", data);
      setComments(prev => prev.filter(c => c._id !== data.commentId));
      setDeletingComment(null);
    });

    socket.on("commentDeleteError", (data) => {
      console.error("Comment delete error:", data);
      setDeletingComment(null);
      // Optionally show error message to user
      alert(`Failed to delete comment: ${data.error}`);
    });

    socket.on("existingComments", (existingComments) => {
      console.log("Loading existing comments:", existingComments);
      if (existingComments && existingComments.length > 0) {
        console.log("First comment structure:", {
          _id: existingComments[0]._id,
          userId: existingComments[0].userId,
          userName: existingComments[0].userName,
          text: existingComments[0].text
        });
      }
      setComments(existingComments);
      setLoading(false);
    });

    socket.on("userTyping", (data) => {
      if (data.mediaId === mediaId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u !== data.userName);
          return [...filtered, data.userName];
        });
        
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== data.userName));
        }, 3000);
      }
    });

    return () => {
      socket.off("commentAdded");
      socket.off("commentDeleted");
      socket.off("commentDeleteError");
      socket.off("existingComments");
      socket.off("userTyping");
    };
  }, [socket, mediaId]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !canComment) return;

    setSending(true);
    try {
      const player = document.getElementById("main-player");
      const timeInMedia = player?.currentTime ? Math.floor(player.currentTime) : 0;

      const commentData = {
        mediaId,
        text: newComment,
        timeInMedia,
        userName: user?.name || user?.username || session?.user?.name || "Anonymous",
      };

      if (socket) {
        socket.emit("newComment", commentData);
      }

      setNewComment("");
    } catch (error) {
      console.error("Error sending comment:", error);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!socket || !commentId) return;
    
    console.log("Attempting to delete comment:", commentId);
    console.log("Comment ID type:", typeof commentId);
    console.log("Current session user:", session?.user);
    console.log("Current user role:", userRole);
    
    // Find the comment to see its data
    const commentToDelete = comments.find(c => c._id === commentId);
    if (commentToDelete) {
      console.log("Comment to delete:", commentToDelete);
      console.log("Comment user ID:", commentToDelete.userId);
      console.log("Comment user ID type:", typeof commentToDelete.userId);
    }
    
    setDeletingComment(commentId);
    
    try {
      socket.emit("deleteComment", { commentId, mediaId });
      setShowDeleteMenu(null);
      
      // Don't do optimistic update - wait for server confirmation
      // The comment will be removed when we receive the commentDeleted event
    } catch (error) {
      console.error("Error deleting comment:", error);
      setDeletingComment(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const seekToTime = (timeInMedia) => {
    const player = document.getElementById("main-player");
    if (player) {
      player.currentTime = timeInMedia;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Comments</h3>
        <div className="text-sm text-gray-300">
          {comments.length} comment{comments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {comments.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No comments yet</p>
            {!canComment && (
              <p className="text-xs mt-2">Viewers cannot add comments</p>
            )}
          </div>
        ) : (
          comments.map((comment, index) => (
            <div key={comment._id || index} className="bg-white/10 rounded-lg p-3 relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-semibold">
                    {comment.userName?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <span className="font-medium text-sm">{comment.userName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {comment.timeInMedia !== undefined && (
                    <button
                      onClick={() => seekToTime(comment.timeInMedia)}
                      className="text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded transition-colors"
                    >
                      {formatTime(comment.timeInMedia)}
                    </button>
                  )}
                  {/* Three dots menu for deletion */}
                  {canDelete(comment.userId) && (
                    <div className="relative">
                      <button
                        onClick={() => setShowDeleteMenu(showDeleteMenu === comment._id ? null : comment._id)}
                        className="text-gray-400 hover:text-white p-1 rounded"
                        disabled={deletingComment === comment._id}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {showDeleteMenu === comment._id && (
                        <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            disabled={deletingComment === comment._id}
                            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg disabled:opacity-50"
                          >
                            {deletingComment === comment._id ? "🗑️ Deleting..." : "🗑️ Delete Comment"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-200">{comment.text}</p>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(comment.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <div className="mb-3 text-sm text-gray-300 italic">
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Comment Input - Only show if user can comment */}
      {canComment ? (
        <div className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              // Emit typing indicator
              if (socket) {
                socket.emit("userTyping", {
                  mediaId,
                  userName: user?.name || user?.username || session?.user?.name || "Anonymous"
                });
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Add a comment... (Enter to send, Shift+Enter for new line)"
            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-300 resize-none"
            rows={3}
            disabled={sending}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">
              Press Enter to send
            </span>
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || sending}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-500/20 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-300">👁️ Read-only mode</p>
          <p className="text-xs text-gray-400 mt-1">Viewers cannot add comments</p>
        </div>
      )}
    </div>
  );
}
