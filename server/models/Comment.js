// server/models/Comment.js
import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    mediaId: { type: String, required: true }, // uses Media.id (Sequelize PK)
    userId: String,
    userName: String,
    text: String,
    timeInMedia: Number, // seconds into video (optional)
  },
  { timestamps: true }
);

export default mongoose.models.Comment ||
  mongoose.model("Comment", CommentSchema);
