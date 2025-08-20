// server/routes/media.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Media from "../models/Media.js";
import ShareLink from "../models/ShareLink.js";
import MediaAccess from "../models/MediaAccess.js";
import crypto from "crypto";
import { getUserEffectiveRoleForMedia, hasCapability } from "../utils/accessControl.js";
import { sendShareInvite } from "../utils/mailer.js";
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

// Get media accessible to the current user (owner's own + explicit shares)
router.get("/all", verifyKeycloakToken, async (req, res) => {
  try {
    // Find media where user is the owner
    const owned = await Media.findAll({ where: { ownerId: req.user.sub } });

    // Find media where user has been granted access
    const accessRows = await MediaAccess.findAll({ where: { userId: req.user.sub } });
    const accessMediaIds = accessRows.map((r) => r.mediaId);
    const shared = accessMediaIds.length
      ? await Media.findAll({ where: { id: accessMediaIds } })
      : [];

    const merged = [...owned, ...shared];
    // Sort by createdAt desc
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(merged);
  } catch (err) {
    console.error("Error fetching accessible media:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single media by id
router.get("/:id", verifyKeycloakToken, async (req, res) => {
  try {
    const mediaId = Number(req.params.id);
    const { role, media } = await getUserEffectiveRoleForMedia(req.user, mediaId);
    if (!media) return res.status(404).json({ error: "Not found" });
    if (!hasCapability(role, "view")) return res.status(403).json({ error: "No access" });
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

// Share link routes
router.post(
  "/:id/share-links",
  verifyKeycloakToken,
  requireRole("owner"),
  async (req, res) => {
    try {
      const mediaId = Number(req.params.id);
      const { role, inviteeEmail, expiresInDays, maxUses } = req.body;

      const { role: effectiveRole } = await getUserEffectiveRoleForMedia(req.user, mediaId);
      if (effectiveRole !== "owner") {
        return res.status(403).json({ error: "Only owner can share" });
      }

      if (!role || !["reviewer", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const token = crypto.randomBytes(24).toString("base64url");
      const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86400000) : null;

      const link = await ShareLink.create({
        mediaId,
        grantedRole: role,
        token,
        createdBy: req.user.sub,
        expiresAt,
        maxUses: maxUses ?? null,
        uses: 0,
        inviteeEmail: inviteeEmail ?? null,
        shareType: inviteeEmail ? "email" : "public",
      });

      const url = `${process.env.CLIENT_URL || "http://localhost:3001"}/share/${token}`;

      // fire-and-forget email if inviteeEmail provided
      if (inviteeEmail) {
        sendShareInvite({
          to: inviteeEmail,
          url,
          role,
          mediaTitle: (await Media.findByPk(mediaId))?.title || "Media",
          inviterName: req.user.preferred_username || req.user.name || "Owner",
        }).catch((e) => console.warn("invite email failed", e.message));
      }

      res.json({ url, link });
    } catch (err) {
      console.error("create share link error", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Check share link validity (no auth required)
router.get("/share-links/:token/check", async (req, res) => {
  try {
    const { token } = req.params;
    const link = await ShareLink.findOne({ where: { token } });
    
    if (!link) {
      return res.status(404).json({ error: "Invalid link" });
    }
    
    if (link.expiresAt && new Date() > link.expiresAt) {
      return res.status(410).json({ error: "Link expired" });
    }
    
    if (link.maxUses != null && link.uses >= link.maxUses) {
      return res.status(429).json({ error: "Link exhausted" });
    }

    // Return basic info needed for the client
    res.json({
      valid: true,
      mediaId: link.mediaId,
      grantedRole: link.grantedRole,
      inviteeEmail: link.inviteeEmail,
      shareType: link.shareType,
      expiresAt: link.expiresAt
    });
  } catch (err) {
    console.error("check share link error", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/share-links/:token/accept", verifyKeycloakToken, async (req, res) => {
  try {
    const { token } = req.params;
    const link = await ShareLink.findOne({ where: { token } });
    
    if (!link) {
      return res.status(404).json({ error: "Invalid link" });
    }
    
    if (link.expiresAt && new Date() > link.expiresAt) {
      return res.status(410).json({ error: "Link expired" });
    }
    
    if (link.maxUses != null && link.uses >= link.maxUses) {
      return res.status(429).json({ error: "Link exhausted" });
    }

    // Check if user is already authorized for this media
    const { role: existingRole } = await getUserEffectiveRoleForMedia(req.user, link.mediaId);
    if (existingRole) {
      // User already has access, return the link's intended role for proper redirect
      return res.json({ 
        mediaId: link.mediaId, 
        grantedRole: link.grantedRole,
        existingRole: existingRole 
      });
    }

    // For email-restricted links, verify the user's email matches
    if (link.shareType === "email" && link.inviteeEmail) {
      const userEmail = (req.user.email || "").toLowerCase();
      const inviteeEmail = link.inviteeEmail.toLowerCase();
      
      if (userEmail !== inviteeEmail) {
        return res.status(403).json({ 
          error: "This link is restricted to a specific email",
          expectedEmail: link.inviteeEmail,
          userEmail: req.user.email 
        });
      }
    }

    // Create or update media access
    await MediaAccess.upsert({
      mediaId: link.mediaId,
      userId: req.user.sub,
      role: link.grantedRole,
    });

    // Increment usage count
    link.uses += 1;
    await link.save();

    res.json({ 
      mediaId: link.mediaId, 
      grantedRole: link.grantedRole,
      success: true 
    });
  } catch (err) {
    console.error("accept share link error", err);
    res.status(500).json({ error: err.message });
  }
});
