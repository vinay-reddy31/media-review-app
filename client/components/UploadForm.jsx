// client/components/UploadForm.jsx
"use client";
import React, { useState } from "react";

export default function UploadForm({ token, onUploaded }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError("");
    
    // Check file size (200MB limit)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (selectedFile.size > maxSize) {
      setError("File size must be less than 200MB");
      return;
    }

    // Check file type
    const isVideo = selectedFile.type.startsWith("video/");
    const isImage = selectedFile.type.startsWith("image/");
    
    if (type === "video" && !isVideo) {
      setError("Please select a valid video file");
      return;
    }
    
    if (type === "image" && !isImage) {
      setError("Please select a valid image file");
      return;
    }

    setFile(selectedFile);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    
    if (!title.trim()) {
      setError("Please enter a title for your media.");
      return;
    }

    setLoading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("type", type);

    try {
      // Ensure backend has set up org/client/roles for first-time users before upload
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        await fetch(`${apiUrl}/users/sync`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      } catch (_) {}

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/media/upload`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }

      onUploaded(data.media);
      setTitle("");
      setFile(null);
      setError("");
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-r from-blue-50 to-purple-100 shadow-lg rounded-xl p-6 max-w-md mx-auto space-y-4 border border-gray-200"
    >
      <h2 className="text-2xl font-semibold text-gray-800 text-center">
        Upload Your Media
      </h2>

      {/* Title input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Media Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a descriptive title"
          required
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-700"
        />
      </div>

      {/* Media type select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Media Type
        </label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setFile(null); // Clear file when type changes
          }}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-700"
        >
          <option value="image">📷 Image</option>
          <option value="video">🎥 Video</option>
        </select>
      </div>

      {/* File input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File
        </label>
        <div
          className={`flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg transition-colors ${
            dragActive 
              ? "border-purple-400 bg-purple-50" 
              : "border-gray-300 hover:border-purple-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 mb-2 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 12l6-6m0 0l6 6m-6-6v12"
              />
            </svg>
            <span className="text-sm font-medium text-gray-600">
              {file ? file.name : `Choose a ${type} file or drag & drop`}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              Max size: 200MB
            </span>
            <input
              type="file"
              accept={type === "video" ? "video/*" : "image/*"}
              onChange={(e) => validateAndSetFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Upload button */}
      <button
        type="submit"
        disabled={loading || !file || !title.trim()}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-lg shadow hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Uploading...
          </div>
        ) : (
          "🚀 Upload Media"
        )}
      </button>
    </form>
  );
}
