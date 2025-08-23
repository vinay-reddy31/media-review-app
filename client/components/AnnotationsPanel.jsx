"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export default function AnnotationsPanel({ socket, mediaId, userRole = "owner", user, media }) {
  const [annotations, setAnnotations] = useState([]);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [editText, setEditText] = useState("");
  const canClear = useMemo(() => userRole === "owner", [userRole]);
  const { data: session } = useSession();

  // Check if user can delete (users can delete their own annotations, owners can delete any annotation)
  const canDelete = (annotationUserId) => {
    const currentUserId = session?.user?.id || session?.user?.sub;
    
    // Owner can delete any annotation
    if (userRole === "owner") return true;
    
    // Users can delete their own annotations
    if (String(annotationUserId) === String(currentUserId)) return true;
    
    return false;
  };

  // Check if user can edit (users can edit their own annotations)
  const canEdit = (annotationUserId) => {
    const currentUserId = session?.user?.id || session?.user?.sub;
    return String(annotationUserId) === String(currentUserId);
  };

  useEffect(() => {
    if (!socket) return;

    console.log("🔍 Setting up socket event listeners for AnnotationsPanel");
    console.log("🔍 Socket connected:", socket.connected);
    console.log("🔍 Socket ID:", socket.id);

    const handleExisting = (items) => {
      if (!Array.isArray(items)) return;
      const filtered = items.filter((a) => String(a.mediaId) === String(mediaId));
      console.log("🔍 Existing annotations received:", filtered);
      setAnnotations(filtered);
    };

    const handleAdded = (annotation) => {
      if (String(annotation.mediaId) !== String(mediaId)) return;
      console.log("🔍 Annotation added:", annotation);
      setAnnotations((prev) => [...prev, annotation]);
    };

    const handleCleared = () => {
      console.log("🔍 Annotations cleared");
      setAnnotations([]);
    };

    const handleEdited = (editedAnnotation) => {
      if (String(editedAnnotation.mediaId) !== String(mediaId)) return;
      console.log("🔍 Annotation edited:", editedAnnotation);
      setAnnotations((prev) => 
        prev.map((a) => a._id === editedAnnotation._id ? editedAnnotation : a)
      );
    };

    const handleDeleted = ({ annotationId }) => {
      console.log("🔍 Annotation deleted event received:", { annotationId, mediaId });
      console.log("🔍 Current annotations before deletion:", annotations);
      setAnnotations((prev) => {
        const filtered = prev.filter((a) => a._id !== annotationId);
        console.log("🔍 Annotations after deletion:", filtered);
        return filtered;
      });
    };

    socket.on("existingAnnotations", handleExisting);
    socket.on("annotationAdded", handleAdded);
    socket.on("annotationsCleared", handleCleared);
    socket.on("annotationEdited", handleEdited);
    socket.on("annotationDeleted", handleDeleted);

    // Error handlers
    socket.on("annotationEditError", ({ error, annotationId }) => {
      console.error("Annotation edit error:", error);
      alert(`Failed to edit annotation: ${error}`);
    });

    socket.on("annotationDeleteError", ({ error, annotationId }) => {
      console.error("Annotation delete error:", error);
      alert(`Failed to delete annotation: ${error}`);
    });

    console.log("🔍 Socket event listeners set up successfully");

    return () => {
      console.log("🔍 Cleaning up socket event listeners");
      socket.off("existingAnnotations", handleExisting);
      socket.off("annotationAdded", handleAdded);
      socket.off("annotationsCleared", handleCleared);
      socket.off("annotationEdited", handleEdited);
      socket.off("annotationDeleted", handleDeleted);
      socket.off("annotationEditError");
      socket.off("annotationDeleteError");
    };
  }, [socket, mediaId]);

  // Ensure initial load via REST so tab shows data on refresh
  useEffect(() => {
    const load = async () => {
      if (!mediaId || !session?.accessToken) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comments/${mediaId}/annotations`, {
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`
          },
        });
        if (res.ok) {
          const data = await res.json();
          setAnnotations(Array.isArray(data) ? data : []);
          console.log("Loaded annotations from REST API:", data);
        }
      } catch (e) {
        console.error("Failed to fetch initial annotations", e);
      }
    };
    load();
  }, [mediaId, session?.accessToken]);

  const clearAll = () => {
    if (!socket || !canClear) return;
    socket.emit("clearAnnotations", mediaId);
  };

  const handleEditAnnotation = async (annotationId) => {
    if (!socket || !annotationId || !editText.trim()) return;
    
    try {
      socket.emit("editAnnotation", { annotationId, mediaId, newText: editText.trim() });
      setEditingAnnotation(null);
      setEditText("");
    } catch (error) {
      console.error("Error editing annotation:", error);
    }
  };

  const handleDeleteAnnotation = async (annotationId) => {
    if (!socket || !annotationId) return;
    
    console.log("🔍 Attempting to delete annotation:", { annotationId, mediaId });
    console.log("🔍 Socket connected:", socket.connected);
    console.log("🔍 Socket ID:", socket.id);
    
    try {
      socket.emit("deleteAnnotation", { annotationId, mediaId });
      console.log("🔍 deleteAnnotation event emitted");
    } catch (error) {
      console.error("Error deleting annotation:", error);
    }
  };

  const startEditAnnotation = (annotation) => {
    setEditingAnnotation(annotation._id);
    setEditText(annotation.text);
  };

  const cancelEditAnnotation = () => {
    setEditingAnnotation(null);
    setEditText("");
  };

  const formatTime = (seconds = 0) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const [showDeleteMenu, setShowDeleteMenu] = useState(null);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Annotations</h3>
        {canClear && (
          <button
            onClick={clearAll}
            className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-2">
        {annotations.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No annotations yet</div>
        ) : (
          annotations.map((annotation, index) => (
            <div key={annotation._id || index} className="bg-white/10 rounded-lg p-3 relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-semibold">
                    {annotation.username?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <span className="font-medium text-sm">{annotation.username}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Only show timeline for video annotations */}
                  {annotation.timestamp !== undefined && media?.type === "video" && (
                    <button
                      onClick={() => {
                        const player = document.getElementById("main-player");
                        if (player) {
                          player.currentTime = annotation.timestamp;
                        }
                      }}
                      className="text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded transition-colors"
                    >
                      {Math.floor(annotation.timestamp / 60).toString().padStart(2, '0')}:{(annotation.timestamp % 60).toString().padStart(2, '0')}
                    </button>
                  )}
                  {/* Three dots menu for edit/delete */}
                  {(canEdit(annotation.userId) || canDelete(annotation.userId)) && (
                    <div className="relative">
                      <button
                        onClick={() => setShowDeleteMenu(showDeleteMenu === annotation._id ? null : annotation._id)}
                        className="text-gray-400 hover:text-white p-1 rounded"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {showDeleteMenu === annotation._id && (
                        <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
                          {canEdit(annotation.userId) && (
                            <button
                              onClick={() => startEditAnnotation(annotation)}
                              className="block w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-700 rounded-lg"
                            >
                              ✏️ Edit Annotation
                            </button>
                          )}
                          {canDelete(annotation.userId) && (
                            <button
                              onClick={() => handleDeleteAnnotation(annotation._id)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg"
                            >
                              ��️ Delete Annotation
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-200">
                {editingAnnotation === annotation._id ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={cancelEditAnnotation}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleEditAnnotation(annotation._id);
                      }
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-300 resize-none"
                    rows={3}
                  />
                ) : (
                  annotation.text
                )}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(annotation.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}