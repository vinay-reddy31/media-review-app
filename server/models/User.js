import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  keycloakId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  role: { type: String, default: "user" }
});

export default mongoose.model("User", userSchema);
