// client/components/UploadForm.jsx
"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { 
  CloudArrowUpIcon, 
  PhotoIcon, 
  VideoCameraIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function UploadForm({ token, onUploaded, onUploadStart }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      const errorMsg = "File size must be less than 200MB";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Check file type
    const isVideo = selectedFile.type.startsWith("video/");
    const isImage = selectedFile.type.startsWith("image/");
    
    if (type === "video" && !isVideo) {
      const errorMsg = "Please select a valid video file";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    if (type === "image" && !isImage) {
      const errorMsg = "Please select a valid image file";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setFile(selectedFile);
    toast.success(`${selectedFile.name} selected successfully!`);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      const errorMsg = "Please choose a file to upload.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    if (!title.trim()) {
      const errorMsg = "Please enter a title for your media.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress(0);
    onUploadStart && onUploadStart();

    const uploadToast = toast.loading('Uploading media...', {
      duration: Infinity,
    });

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

      toast.success('Media uploaded successfully!', {
        id: uploadToast,
      });
      
      onUploaded(data.media);
      setTitle("");
      setFile(null);
      setError("");
      setUploadProgress(0);
    } catch (err) {
      const errorMsg = "Upload failed: " + err.message;
      setError(errorMsg);
      toast.error(errorMsg, {
        id: uploadToast,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title input */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Media Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a descriptive title for your media"
          required
          className="input"
          disabled={loading}
        />
      </div>

      {/* Media type select */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Media Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setType("image");
              setFile(null);
              toast.success('Switched to Image mode');
            }}
            className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center space-y-2 ${
              type === "image"
                ? "border-blue-500 bg-blue-500/20 text-blue-300"
                : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10"
            }`}
            disabled={loading}
          >
            <PhotoIcon className="w-6 h-6" />
            <span className="text-sm font-medium">Image</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setType("video");
              setFile(null);
              toast.success('Switched to Video mode');
            }}
            className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center space-y-2 ${
              type === "video"
                ? "border-purple-500 bg-purple-500/20 text-purple-300"
                : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10"
            }`}
            disabled={loading}
          >
            <VideoCameraIcon className="w-6 h-6" />
            <span className="text-sm font-medium">Video</span>
          </button>
        </div>
      </div>

      {/* File input */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Select File
        </label>
        <div
          className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
            dragActive 
              ? "border-blue-400 bg-blue-500/10" 
              : "border-white/30 hover:border-white/50 bg-white/5"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/60">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    toast.success('File removed');
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                  disabled={loading}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center p-8 cursor-pointer">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <CloudArrowUpIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white mb-1">
                  Choose a {type} file or drag & drop
                </p>
                <p className="text-xs text-white/60">
                  Max size: 200MB • {type === "video" ? "MP4, MOV, AVI" : "JPG, PNG, GIF"}
                </p>
              </div>
              <input
                type="file"
                accept={type === "video" ? "video/*" : "image/*"}
                onChange={(e) => validateAndSetFile(e.target.files[0])}
                className="hidden"
                disabled={loading}
              />
            </label>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
          <XMarkIcon className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Progress */}
      {loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        type="submit"
        disabled={loading || !file || !title.trim()}
        className="w-full btn-primary flex items-center justify-center space-x-2 py-4 text-lg"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Uploading Media...</span>
          </>
        ) : (
          <>
            <CloudArrowUpIcon className="w-5 h-5" />
            <span>Upload Media</span>
          </>
        )}
      </button>

      {/* Upload tips */}
      <div className="bg-white/5 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-2 flex items-center space-x-2">
          <DocumentTextIcon className="w-4 h-4" />
          <span>Upload Tips</span>
        </h4>
        <ul className="text-xs text-white/60 space-y-1">
          <li>• Use descriptive titles for better organization</li>
          <li>• Supported formats: {type === "video" ? "MP4, MOV, AVI" : "JPG, PNG, GIF"}</li>
          <li>• Maximum file size: 200MB</li>
          <li>• You can share media with reviewers and viewers after upload</li>
        </ul>
      </div>
    </form>
  );
}
