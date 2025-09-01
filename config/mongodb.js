// config/mongodb.js
const mongoose = require("mongoose");

const mongoURI = process.env.MONGODB_URI;


mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
});

// Explicit collection name 'contacts'
const User = mongoose.model("User", userSchema, "contacts");

module.exports = User;





