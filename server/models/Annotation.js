import mongoose from "mongoose";

const annotationSchema = new mongoose.Schema(
  {
    mediaId: { type: String, required: true },       // Reference to Postgres media.id
    userId: { type: String, required: true },
    username: { type: String, default: "Anonymous" }, // matches frontend payload
    type: { type: String, enum: ["point"], default: "point" }, // simplified
    coordinates: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    text: { type: String, required: true },          // actual annotation note
    timestamp: { type: Number },                     // optional, for video
  },
  { timestamps: true }
);

export default mongoose.model("Annotation", annotationSchema);