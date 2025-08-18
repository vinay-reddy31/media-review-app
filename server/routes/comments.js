// server/routes/comments.js
import express from "express";
import { verifyKeycloakToken } from "../middleware/verifyKeycloakToken.js";
import Comment from "../models/Comment.js";
import Annotation from "../models/Annotation.js";

const router = express.Router();

// fetch comments for a media
router.get("/:mediaId", verifyKeycloakToken, async (req, res) => {
  try {
    const comments = await Comment.find({ mediaId: req.params.mediaId })
      .sort({ createdAt: 1 })
      .lean();
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// fetch annotations for a media
router.get("/:mediaId/annotations", verifyKeycloakToken, async (req, res) => {
  try {
    const annotations = await Annotation.find({ mediaId: req.params.mediaId })
      .sort({ createdAt: 1 })
      .lean();
    res.json(annotations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
