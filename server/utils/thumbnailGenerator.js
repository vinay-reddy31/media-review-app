// server/utils/thumbnailGenerator.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple thumbnail generation for images
export const generateImageThumbnail = async (inputPath, outputPath, maxWidth = 300, maxHeight = 300) => {
  try {
    // For now, we'll just copy the image and resize it using a simple approach
    // In production, you'd want to use a proper image processing library like Sharp
    const fs = await import("fs");
    const inputBuffer = fs.readFileSync(inputPath);
    
    // Create thumbnails directory if it doesn't exist
    const thumbDir = path.dirname(outputPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    
    // For now, just copy the original file as thumbnail
    // TODO: Implement proper image resizing with Sharp or similar
    fs.writeFileSync(outputPath, inputBuffer);
    
    return true;
  } catch (error) {
    console.error("Error generating image thumbnail:", error);
    return false;
  }
};

// Generate thumbnail path
export const getThumbnailPath = (originalPath, mediaId) => {
  const ext = path.extname(originalPath);
  const thumbDir = path.join(process.cwd(), "uploads", "thumbnails");
  
  // Create thumbnails directory if it doesn't exist
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }
  
  return path.join(thumbDir, `thumb_${mediaId}${ext}`);
};

// Get thumbnail URL path
export const getThumbnailUrlPath = (mediaId, ext) => {
  return `/uploads/thumbnails/thumb_${mediaId}${ext}`;
};

// Generate thumbnail for any media type
export const generateThumbnail = async (filePath, mediaId, type) => {
  try {
    const ext = path.extname(filePath);
    const thumbnailPath = getThumbnailPath(filePath, mediaId);
    const thumbnailUrlPath = getThumbnailUrlPath(mediaId, ext);
    
    if (type === "image") {
      await generateImageThumbnail(filePath, thumbnailPath);
    } else if (type === "video") {
      // For videos, we'll create a placeholder thumbnail
      // In production, you'd use FFmpeg to extract a frame
      await generateVideoPlaceholder(thumbnailPath, ext);
    }
    
    return thumbnailUrlPath;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
};

// Generate a simple placeholder for videos
const generateVideoPlaceholder = async (outputPath, ext) => {
  try {
    // Create a simple SVG placeholder for videos
    const svgContent = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#2d3748"/>
        <circle cx="150" cy="100" r="40" fill="#4a5568"/>
        <polygon points="140,80 140,120 170,100" fill="#e2e8f0"/>
        <text x="150" y="160" text-anchor="middle" fill="#e2e8f0" font-family="Arial" font-size="14">Video</text>
      </svg>
    `;
    
    const fs = await import("fs");
    fs.writeFileSync(outputPath.replace(ext, '.svg'), svgContent);
    
    // Return the SVG path instead of the original extension
    return outputPath.replace(ext, '.svg');
  } catch (error) {
    console.error("Error generating video placeholder:", error);
    return null;
  }
};
