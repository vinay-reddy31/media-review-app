// server/models/Annotation.js
import mongoose from "mongoose";

const annotationSchema = new mongoose.Schema(
  {
    mediaId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    type: {
      type: String,
      enum: ["freehand", "arrow", "rect", "highlight", "circle", "text"], // added circle, text
      required: true,
    },
    data: {
      // Flexible data depending on type
      path: [{ x: Number, y: Number }], // freehand
      start: { x: Number, y: Number },  // arrow, circle
      end: { x: Number, y: Number },    // arrow, circle
      rect: {
        x: Number,
        y: Number,
        width: Number,
        height: Number,
      }, // rect, highlight
      text: String,                     // text annotations
      position: { x: Number, y: Number }, // where text is placed
      color: String,
      width: Number,
    },
    timeInMedia: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Annotation", annotationSchema);
