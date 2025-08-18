// server/routes/media.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Media from "../models/Media.js";
import { verifyKeycloakToken } from "../middleware/verifyKeycloakToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// Ensure uploads dir
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB

// Upload (owner only)
router.post(
  "/upload",
  verifyKeycloakToken,
  requireRole("owner"),
  upload.single("file"),
  async (req, res) => {
    try {
      const { title, type } = req.body;
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const filePath = `/uploads/${req.file.filename}`;
      
      // Create media record
      const media = await Media.create({
        title,
        filePath,
        type,
        ownerId: req.user.sub, // your verifyKeycloakToken sets decoded to req.user
      });

      res.json({ success: true, media });
    } catch (err) {
      console.error("upload error", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// My media list (owner only)
router.get(
  "/my-media",
  verifyKeycloakToken,
  requireRole("owner"),
  async (req, res) => {
    try {
      const list = await Media.findAll({
        where: { ownerId: req.user.sub },
        order: [["createdAt", "DESC"]],
      });
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Get all media (for reviewers and viewers)
router.get("/all", verifyKeycloakToken, async (req, res) => {
  try {
    const list = await Media.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(list);
  } catch (err) {
    console.error("Error fetching all media:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single media by id
router.get("/:id", verifyKeycloakToken, async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);
    if (!media) return res.status(404).json({ error: "Not found" });
    res.json(media);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete media (owner only)
router.delete("/:id", verifyKeycloakToken, requireRole("owner"), async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);
    if (!media) return res.status(404).json({ error: "Media not found" });
    
    // Check if user owns this media
    if (media.ownerId !== req.user.sub) {
      return res.status(403).json({ error: "You can only delete your own media" });
    }

    // Delete the file from uploads directory
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), media.filePath.replace("/uploads", "uploads"));
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await media.destroy();
    
    res.json({ success: true, message: "Media deleted successfully" });
  } catch (err) {
    console.error("Delete media error", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
