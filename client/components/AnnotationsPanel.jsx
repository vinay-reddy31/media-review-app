// client/components/AnnotationsPanel.jsx
"use client";

import React, { useEffect, useState } from "react";

export default function AnnotationsPanel({ socket, mediaId, userRole = "owner", user }) {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket) {
      setLoading(false);
      return;
    }

    // Socket event listeners
    socket.on("annotationAdded", (annotation) => {
      console.log("✅ Annotation added:", annotation);
      setAnnotations(prev => [...prev, annotation]);
    });

    socket.on("annotationsCleared", () => {
      console.log("🗑️ Annotations cleared");
      setAnnotations([]);
    });

    socket.on("existingAnnotations", (existingAnnotations) => {
      console.log("📥 Loading existing annotations:", existingAnnotations);
      setAnnotations(existingAnnotations || []);
      setLoading(false);
    });

    // Set a timeout to stop loading if no annotations are received
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log("⏰ Loading timeout - no annotations received");
        setLoading(false);
      }
    }, 3000);

    return () => {
      clearTimeout(loadingTimeout);
      socket.off("annotationAdded");
      socket.off("annotationsCleared");
      socket.off("existingAnnotations");
    };
  }, [socket, loading]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const seekToTime = (timeInMedia) => {
    const player = document.getElementById("main-player");
    if (player) {
      player.currentTime = timeInMedia;
      console.log(`⏰ Seeking to time: ${formatTime(timeInMedia)}`);
    }
  };

  const getAnnotationIcon = (type) => {
    switch (type) {
      case "text": return "🔵";
      case "freehand": return "✏️";
      case "arrow": return "➡️";
      case "rect": return "⬛";
      case "circle": return "⭕";
      case "highlight": return "🟡";
      default: return "📍";
    }
  };

  const getAnnotationDescription = (annotation) => {
    if (annotation.type === "text" && annotation.data?.text) {
      return annotation.data.text;
    }
    
    switch (annotation.type) {
      case "freehand": return "Freehand drawing";
      case "arrow": return "Arrow pointing";
      case "rect": return "Rectangle shape";
      case "circle": return "Circle shape";
      case "highlight": return "Highlighted area";
      case "text": return "Text annotation";
      default: return "Annotation";
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading annotations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Annotations</h3>
        <div className="text-sm text-gray-300">
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {annotations.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No annotations yet</p>
            {userRole === "viewer" && (
              <p className="text-xs mt-2">Viewers cannot create annotations</p>
            )}
            {userRole !== "viewer" && (
              <p className="text-xs mt-2">Click anywhere on the video/image to add annotations</p>
            )}
          </div>
        ) : (
          annotations.map((annotation, index) => (
            <div key={annotation._id || index} className="bg-white/10 rounded-lg p-3 border-l-4 border-blue-500 hover:bg-white/20 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getAnnotationIcon(annotation.type)}</span>
                  <span className="font-medium text-sm">{annotation.userName}</span>
                </div>
                {annotation.timeInMedia !== undefined && (
                  <button
                    onClick={() => seekToTime(annotation.timeInMedia)}
                    className="text-xs bg-green-500 hover:bg-green-600 px-2 py-1 rounded transition-colors cursor-pointer"
                    title={`Click to jump to ${formatTime(annotation.timeInMedia)}`}
                  >
                    {formatTime(annotation.timeInMedia)}
                  </button>
                )}
              </div>
              
              {/* Annotation Text */}
              <div className="bg-blue-500/20 rounded p-2 mb-2">
                <p className="text-sm text-white font-medium">
                  {getAnnotationDescription(annotation)}
                </p>
              </div>
              
              {/* Position Info */}
              {annotation.data?.position && (
                <div className="text-xs text-gray-400 mb-2">
                  Position: ({Math.round(annotation.data.position.x)}, {Math.round(annotation.data.position.y)})
                </div>
              )}
              
              <div className="text-xs text-gray-400">
                {new Date(annotation.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-500/20 rounded-lg p-3">
        <h4 className="text-sm font-semibold mb-2">💡 How to use:</h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Click anywhere on the video/image to add text annotations</li>
          <li>• Click on timestamps to jump to that point in the video</li>
          <li>• Annotations are created in real-time as you add them</li>
          <li>• Each annotation shows as a blue dot on the media</li>
          <li>• Use the annotation tools on the left to create new ones</li>
        </ul>
      </div>
    </div>
  );
}
