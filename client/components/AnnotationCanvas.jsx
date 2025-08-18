// client/components/AnnotationCanvas.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";

export default function AnnotationCanvas({ socket, mediaId, playerId, videoRef, user, userRole = "owner" }) {
  const canvasRef = useRef(null);
  const [annotations, setAnnotations] = useState([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [clickPosition, setClickPosition] = useState(null);
  const [color, setColor] = useState("#3B82F6"); // Blue color like Loom

  // Check if user can annotate
  const canAnnotate = userRole !== "viewer";

  // Initial setup & resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        console.log(`📐 Canvas resized to: ${rect.width}x${rect.height}`);
        redrawAnnotations();
      }
    };
    
    // Initial resize
    resize();
    
    // Resize on window resize
    window.addEventListener("resize", resize);
    
    // Also resize when parent changes
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
    
    return () => {
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
    };
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("annotationAdded", (ann) => {
      console.log("✅ Received annotation:", ann);
      setAnnotations((prev) => [...prev, ann]);
      drawAnnotation(ann);
    });

    socket.on("annotationsCleared", () => {
      console.log("🗑️ Annotations cleared");
      setAnnotations([]);
      clearCanvas();
    });

    socket.on("existingAnnotations", (existingAnns) => {
      console.log("📥 Loading existing annotations:", existingAnns);
      setAnnotations(existingAnns || []);
      clearCanvas();
      if (existingAnns && existingAnns.length > 0) {
        existingAnns.forEach(ann => drawAnnotation(ann));
      }
    });

    return () => {
      socket.off("annotationAdded");
      socket.off("annotationsCleared");
      socket.off("existingAnnotations");
    };
  }, [socket]);

  // Helpers
  const getCtx = () => canvasRef.current?.getContext("2d");
  const clearCanvas = () => {
    const ctx = getCtx();
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      console.log("🧹 Canvas cleared");
    }
  };
  const redrawAnnotations = () => {
    clearCanvas();
    annotations.forEach((ann) => drawAnnotation(ann));
    console.log(`🔄 Redrew ${annotations.length} annotations`);
  };

  // Drawing functions - Draw blue dots with text like Loom
  const drawAnnotation = (ann) => {
    const ctx = getCtx();
    if (!ctx || !ann.data) {
      console.warn("⚠️ Cannot draw annotation:", ann);
      return;
    }

    const { position, text, color: annColor } = ann.data;
    if (!position) {
      console.warn("⚠️ No position data for annotation:", ann);
      return;
    }

    console.log(`🎨 Drawing annotation at (${position.x}, ${position.y}) with text: "${text}"`);

    // Draw blue dot (like Loom)
    ctx.beginPath();
    ctx.arc(position.x, position.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = annColor || color;
    ctx.fill();
    
    // Add white border for better visibility
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw text annotation if it exists
    if (text) {
      ctx.font = "14px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      
      // Draw text with black outline for better visibility
      ctx.strokeText(text, position.x + 15, position.y + 5);
      ctx.fillText(text, position.x + 15, position.y + 5);
    }
  };

  const getCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log(`📍 Raw click: (${e.clientX}, ${e.clientY}), Canvas rect: (${rect.left}, ${rect.top}), Calculated: (${x}, ${y})`);
    return { x, y };
  };

  // Click handler for adding annotations
  const handleCanvasClick = (e) => {
    console.log("🎯 Canvas click event triggered");
    
    if (!canAnnotate) {
      console.log("🚫 User cannot annotate (viewer role)");
      return;
    }

    // Prevent the event from bubbling to the video player
    e.preventDefault();
    e.stopPropagation();

    const coords = getCoordinates(e);
    console.log(`🖱️ Click detected at coordinates: (${coords.x}, ${coords.y})`);
    setClickPosition(coords);
    setShowTextInput(true);
  };

  // Mouse down handler to prevent video interaction
  const handleMouseDown = (e) => {
    if (canAnnotate) {
      console.log("🖱️ Mouse down on canvas");
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Mouse up handler to prevent video interaction
  const handleMouseUp = (e) => {
    if (canAnnotate) {
      console.log("🖱️ Mouse up on canvas");
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim() || !clickPosition) {
      console.log("⚠️ Cannot submit: missing text or position");
      return;
    }

    const player = document.getElementById(playerId);
    const timeInMedia = player?.currentTime ? Math.floor(player.currentTime) : 0;

    console.log(`📝 Creating annotation at time ${timeInMedia}s, position (${clickPosition.x}, ${clickPosition.y})`);

    const annotationData = {
      type: "text",
      text: textInput,
      position: clickPosition,
      color: color
    };

    const payload = {
      mediaId,
      type: "text",
      data: annotationData,
      timeInMedia,
      userName: user?.name || user?.username || "Anonymous",
    };

    console.log("📤 Sending annotation payload:", payload);

    if (socket) {
      socket.emit("newAnnotation", payload);
      console.log("✅ Annotation sent via socket");
    } else {
      console.error("❌ No socket connection available");
    }
    
    setTextInput("");
    setClickPosition(null);
    setShowTextInput(false);
  };

  const handleTextCancel = () => {
    console.log("❌ Annotation cancelled");
    setTextInput("");
    setClickPosition(null);
    setShowTextInput(false);
  };

  const handleClearAll = () => {
    console.log("🗑️ Clearing all annotations");
    setAnnotations([]);
    clearCanvas();
    if (socket) {
      socket.emit("clearAnnotations", { mediaId });
      console.log("✅ Clear request sent via socket");
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Toolbar - Only show if user can annotate */}
      {canAnnotate && (
        <div className="absolute top-2 left-2 z-20 bg-black/50 text-white rounded p-2 flex gap-2 items-center">
          <span className="text-sm">📝 Click anywhere to add annotation</span>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            className="w-8 h-8 rounded cursor-pointer"
            title="Annotation color"
          />
          <button 
            onClick={handleClearAll}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
            title="Clear all annotations"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Read-only indicator for viewers */}
      {!canAnnotate && (
        <div className="absolute top-2 left-2 z-20 bg-gray-500/80 text-white rounded p-2">
          <span className="text-sm">👁️ Read-only mode</span>
        </div>
      )}

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 min-w-[300px] shadow-xl">
            <h3 className="text-white font-semibold mb-3">Add Annotation</h3>
            <div className="mb-3 text-sm text-gray-300">
              Click at position: ({Math.round(clickPosition?.x)}, {Math.round(clickPosition?.y)})
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your annotation text..."
              className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 mb-3 resize-none"
              rows={3}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleTextCancel}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
              >
                Add Annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="absolute top-2 right-2 z-20 bg-black/50 text-white rounded p-2 text-xs">
        <div>Annotations: {annotations.length}</div>
        <div>Can annotate: {canAnnotate ? "Yes" : "No"}</div>
        <div>Color: {color}</div>
        <div>Canvas size: {canvasRef.current?.width || 0} x {canvasRef.current?.height || 0}</div>
      </div>

      {/* Test click area - only show in development */}
      {process.env.NODE_ENV === 'development' && canAnnotate && (
        <div className="absolute top-2 left-2 z-20 bg-red-500/50 text-white rounded p-2 text-xs">
          <div>🧪 Test Click Area</div>
          <button 
            onClick={() => {
              console.log("🧪 Test button clicked");
              setClickPosition({ x: 100, y: 100 });
              setShowTextInput(true);
            }}
            className="bg-red-600 px-2 py-1 rounded text-xs mt-1"
          >
            Test Annotation
          </button>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full z-10 ${canAnnotate ? 'cursor-crosshair' : 'cursor-default'}`}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onPointerDown={handleMouseDown}
        onPointerUp={handleMouseUp}
        style={{
          pointerEvents: canAnnotate ? 'auto' : 'none',
          touchAction: canAnnotate ? 'none' : 'auto',
          border: canAnnotate ? '2px solid red' : 'none' // Visual indicator
        }}
        title={canAnnotate ? "Click to add annotation" : "Read-only mode"}
      />
    </div>
  );
}
