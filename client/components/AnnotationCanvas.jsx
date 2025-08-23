"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Enhanced annotation overlay with text input modal
 * - Owners/Reviewers: click to show text input, then save annotation
 * - Viewers: read-only markers
 * - Subscribes to `existingAnnotations`, `annotationAdded`, `annotationsCleared`.
 */
export default function AnnotationCanvas({ socket, mediaId, playerId, videoRef, user, userRole, isVideo = false }) {
	const containerRef = useRef(null);
	const [annotations, setAnnotations] = useState([]);
	const [showTextInput, setShowTextInput] = useState(false);
	const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
	const [annotationText, setAnnotationText] = useState("");

	const canAnnotate = useMemo(() => userRole === "owner" || userRole === "reviewer", [userRole]);

	useEffect(() => {
		if (!socket) return;

		console.log("🔍 Setting up socket event listeners for AnnotationCanvas");
		console.log("🔍 Socket connected:", socket.connected);
		console.log("🔍 Socket ID:", socket.id);

		const handleExisting = (items) => {
			if (!Array.isArray(items)) return;
			const filtered = items.filter((a) => String(a.mediaId) === String(mediaId));
			console.log("🔍 AnnotationCanvas: Existing annotations received:", filtered);
			setAnnotations(filtered);
		};

		const handleAdded = (annotation) => {
			if (String(annotation.mediaId) !== String(mediaId)) return;
			console.log("🔍 AnnotationCanvas: Annotation added:", annotation);
			setAnnotations((prev) => [...prev, annotation]);
		};

		const handleCleared = () => {
			console.log("🔍 AnnotationCanvas: Annotations cleared");
			setAnnotations([]);
		};

		const handleEdited = (editedAnnotation) => {
			if (String(editedAnnotation.mediaId) !== String(mediaId)) return;
			console.log("🔍 AnnotationCanvas: Annotation edited:", editedAnnotation);
			setAnnotations((prev) => 
				prev.map((a) => a._id === editedAnnotation._id ? editedAnnotation : a)
			);
		};

		const handleDeleted = ({ annotationId }) => {
			console.log("🔍 AnnotationCanvas: Annotation deleted event received:", { annotationId, mediaId });
			console.log("🔍 AnnotationCanvas: Current annotations before deletion:", annotations);
			setAnnotations((prev) => {
				const filtered = prev.filter((a) => a._id !== annotationId);
				console.log("🔍 AnnotationCanvas: Annotations after deletion:", filtered);
				return filtered;
			});
		};

		socket.on("existingAnnotations", handleExisting);
		socket.on("annotationAdded", handleAdded);
		socket.on("annotationsCleared", handleCleared);
		socket.on("annotationEdited", handleEdited);
		socket.on("annotationDeleted", handleDeleted);

		console.log("🔍 AnnotationCanvas: Socket event listeners set up successfully");

		return () => {
			console.log("🔍 AnnotationCanvas: Cleaning up socket event listeners");
			socket.off("existingAnnotations", handleExisting);
			socket.off("annotationAdded", handleAdded);
			socket.off("annotationsCleared", handleCleared);
			socket.off("annotationEdited", handleEdited);
			socket.off("annotationDeleted", handleDeleted);
		};
	}, [socket, mediaId]);

	const getRelativePosition = useCallback((event) => {
		const container = containerRef.current;
		if (!container) return { x: 0, y: 0 };
		const rect = container.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;
		return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
	}, []);

	const handleClick = useCallback(
		(event) => {
			if (!canAnnotate || !socket) return;
			
			// Check if clicking on video controls or bottom area (play button, sound, progress bar, etc.)
			const target = event.target;
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;
			
			// Calculate if click is in the bottom 80px (video controls area)
			const clickY = event.clientY - rect.top;
			const isInControlsArea = clickY > (rect.height - 80);
			
			if (target.tagName === 'BUTTON' || 
				target.closest('button') || 
				target.closest('.video-controls') || 
				target.closest('video') ||
				isInControlsArea) {
				return; // Don't show annotation modal for video controls
			}

			const { x, y } = getRelativePosition(event);
			setClickPosition({ x, y });
			setShowTextInput(true);
		},
		[canAnnotate, socket, getRelativePosition]
	);

	const handleSaveAnnotation = useCallback(() => {
		if (!annotationText.trim() || !socket) return;

		const timeInMedia = videoRef?.current?.currentTime ?? 0;
		const payload = {
			mediaId: String(mediaId),
			text: annotationText.trim(),
			coordinates: clickPosition,
			timeInMedia,
			userName: user?.name || user?.email || "Anonymous",
		};

		console.log("Sending annotation payload:", payload);
		socket.emit("newAnnotation", payload);
		setShowTextInput(false);
		setAnnotationText("");
	}, [annotationText, socket, mediaId, clickPosition, videoRef, user]);

	const handleCancel = useCallback(() => {
		setShowTextInput(false);
		setAnnotationText("");
	}, []);

	// Render markers using percentage positions so they scale with the media element
	return (
		<>
			<div
				ref={containerRef}
				className="absolute left-0 right-0 top-0 select-none z-10"
				style={{ cursor: canAnnotate ? "crosshair" : "default", pointerEvents: "auto", bottom: isVideo ? "80px" : 0 }}
				onClick={handleClick}
			>
				{annotations.map((a) => {
					const pos = a?.coordinates || a?.data?.position;
					if (!pos) return null;
					const left = `${(pos.x || 0) * 100}%`;
					const top = `${(pos.y || 0) * 100}%`;
					return (
						<div
							key={a._id || `${a.mediaId}-${a.createdAt || Math.random()}`}
							className="absolute -translate-x-1/2 -translate-y-1/2 group"
							style={{ left, top }}
						>
							<span 
								className="inline-block h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white shadow cursor-pointer" 
								onClick={() => {
									// Only seek for video annotations with timestamp
									if (isVideo && a.timestamp !== undefined) {
										const player = document.getElementById("main-player");
										if (player) {
											player.currentTime = a.timestamp;
										}
									}
								}}
								title={isVideo && a.timestamp !== undefined ? `Click to seek to ${Math.floor(a.timestamp / 60).toString().padStart(2, '0')}:${(a.timestamp % 60).toString().padStart(2, '0')}` : "Annotation marker"}
							/>
							{/* Tooltip showing annotation text and username */}
							<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 max-w-xs">
								<div className="font-semibold text-blue-300 mb-1">
									{a.username || a.userName || "Anonymous"}
								</div>
								<div className="text-white">
									{a.text || "Annotation"}
								</div>
								{/* Only show timestamp for video annotations */}
								{isVideo && a.timestamp !== undefined && (
									<div className="text-blue-300 text-xs mt-1">
										⏱ {Math.floor(a.timestamp / 60).toString().padStart(2, '0')}:{(a.timestamp % 60).toString().padStart(2, '0')}
									</div>
								)}
								<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Text Input Modal */}
			{showTextInput && (
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
						<h3 className="text-lg font-semibold mb-4 text-black">Add Annotation</h3>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-2 text-black">Annotation Text</label>
								<textarea
									value={annotationText}
									onChange={(e) => setAnnotationText(e.target.value)}
									placeholder="Enter your annotation..."
									className="w-full border rounded-lg px-3 py-2 text-black resize-none"
									rows={3}
									autoFocus
									onKeyDown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											handleSaveAnnotation();
										}
										if (e.key === 'Escape') {
											handleCancel();
										}
									}}
								/>
							</div>
							<div className="flex gap-3">
								<button
									onClick={handleSaveAnnotation}
									disabled={!annotationText.trim()}
									className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
								>
									Save
								</button>
								<button
									onClick={handleCancel}
									className="flex-1 px-4 py-2 rounded-lg border text-black hover:bg-gray-50"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}


