import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { verifyKeycloakToken } from "./middleware/verifyKeycloakToken.js";
import { requireRole } from "./middleware/requireRole.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((e) => console.error("Mongo error", e));

app.get("/", (_req, res) => res.send("API OK"));

app.get("/api/me", verifyKeycloakToken, (req, res) => {
  res.json({
    sub: req.user.sub,
    email: req.user.email,
    roles: req.user?.realm_access?.roles || [],
  });
});

app.get("/api/owner-only", verifyKeycloakToken, requireRole("owner"), (_req, res) => {
  res.json({ ok: true, message: "Owner content" });
});

app.get("/api/reviewer-only", verifyKeycloakToken, requireRole("reviewer"), (_req, res) => {
  res.json({ ok: true, message: "Reviewer content" });
});

app.get("/api/viewer-only", verifyKeycloakToken, requireRole("viewer"), (_req, res) => {
  res.json({ ok: true, message: "Viewer content" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 API on http://localhost:${PORT}`));
