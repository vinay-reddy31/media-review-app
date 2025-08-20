import express from "express";
import Annotation from "../models/Annotation.js";

const router = express.Router();

// ==============================
// GET /api/annotations?media_id=uuid
// ==============================
router.get("/", async (req, res) => {
  const { media_id } = req.query;
  if (!media_id) {
    return res.status(400).json({ error: "media_id is required" });
  }

  try {
    const annotations = await Annotation.find({ mediaId: media_id })
      .sort({ createdAt: 1 })
      .lean();
    res.json(annotations);
  } catch (err) {
    console.error("❌ Error fetching annotations:", err);
    res.status(500).json({ error: "Failed to fetch annotations" });
  }
});

// ==============================
// POST /api/annotations
// ==============================
router.post("/", async (req, res) => {
  const { media_id, user_id, username, coordinates, timestamp, text } = req.body;

  if (!media_id || coordinates?.x === undefined || coordinates?.y === undefined) {
    return res.status(400).json({ error: "media_id and coordinates are required" });
  }

  try {
    const annotationData = {
      mediaId: media_id,
      userId: user_id || "anonymous",
      username: username || "Anonymous",
      type: "point",
      coordinates,
      text,
    };

    // Add timestamp if video annotation
    if (timestamp !== undefined && timestamp >= 0) {
      annotationData.timestamp = timestamp;
    }

    const annotation = new Annotation(annotationData);
    const savedAnnotation = await annotation.save();

    res.status(201).json(savedAnnotation);
  } catch (err) {
    console.error("❌ Error creating annotation:", err);
    res.status(500).json({ error: "Failed to create annotation" });
  }
});

// ==============================
// GET /api/annotations/timeline/:media_id?start=0&end=30
// ==============================
router.get("/timeline/:media_id", async (req, res) => {
  const { media_id } = req.params;
  const { start, end } = req.query;

  try {
    const query = { mediaId: media_id, timestamp: { $exists: true } };

    if (start !== undefined && end !== undefined) {
      query.timestamp = {
        $gte: parseFloat(start),
        $lte: parseFloat(end),
      };
    }

    const annotations = await Annotation.find(query)
      .sort({ timestamp: 1 })
      .lean();

    res.json(annotations);
  } catch (err) {
    console.error("❌ Error fetching timeline annotations:", err);
    res.status(500).json({ error: "Failed to fetch timeline annotations" });
  }
});

export default router;