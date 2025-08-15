const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  keycloakId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  role: { type: String, default: "user" }
});

module.exports = mongoose.model("User", userSchema);
