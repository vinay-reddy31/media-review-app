"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export default function AnnotationsPanel({ socket, mediaId, userRole = "owner", user }) {
  const [annotations, setAnnotations] = useState([]);
  const canClear = useMemo(() => userRole === "owner", [userRole]);
  const { data: session } = useSession();

  useEffect(() => {
    if (!socket) return;

    const handleExisting = (items) => {
      if (!Array.isArray(items)) return;
      const filtered = items.filter((a) => String(a.mediaId) === String(mediaId));
      setAnnotations(filtered);
    };

    const handleAdded = (annotation) => {
      if (String(annotation.mediaId) !== String(mediaId)) return;
      setAnnotations((prev) => [...prev, annotation]);
    };

    const handleCleared = () => setAnnotations([]);

    socket.on("existingAnnotations", handleExisting);
    socket.on("annotationAdded", handleAdded);
    socket.on("annotationsCleared", handleCleared);

    return () => {
      socket.off("existingAnnotations", handleExisting);
      socket.off("annotationAdded", handleAdded);
      socket.off("annotationsCleared", handleCleared);
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
    socket.emit("clearAnnotations", { mediaId });
  };

  const formatTime = (seconds = 0) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

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
          annotations.map((a, idx) => (
            <div key={a._id || idx} className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-semibold">
                    {(a.username || a.userName)?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{a.username || a.userName || "Anonymous"}</div>
                    <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-xs bg-blue-500/30 text-blue-100 px-2 py-1 rounded">
                  ⏱ {formatTime(a.timestamp || a.timeInMedia)}
                </div>
              </div>
              <div className="text-sm text-gray-200 mt-2">
                {a.text || a?.data?.text || "Annotation"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}