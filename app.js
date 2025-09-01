// app.js
require("dotenv").config(); // Must be first

const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const twilio = require("twilio");

const User = require("./config/mongodb");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper: normalize names
const normalizeName = (str) => str.replace(/\s+/g, ' ').trim();

// In-memory store for answered calls
const answeredCalls = {}; // { phone: true }

// Home page
app.get("/", (req, res) => {
  res.render("index", { error: null });
});

// Call submission
app.post("/call", async (req, res) => {
  try {
    let usernameInput = req.body.username;
    if (!usernameInput) {
      return res.render("index", { error: "❌ Please enter a name!" });
    }
    usernameInput = normalizeName(usernameInput);

    const user = await User.findOne({ name: { $regex: `^${usernameInput}$`, $options: "i" } });

    if (!user) {
      return res.render("index", { error: "❌ You are not registered!" });
    }

    // If already answered
    if (answeredCalls[user.phone]) {
      return res.redirect("/thankyou");
    }

    // Make Twilio call
    await client.calls.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone,
      url: `https://api.vapi.ai/twilio/outbound_call?assistantId=198cf54e-0414-4789-88a8-cab50e37e697`,
      statusCallback: `${process.env.BASE_URL}/call-status?userId=${user.phone}`,
      statusCallbackEvent: ["ringing", "answered", "completed"],
    });

    res.render("call-processing", { user });

  } catch (err) {
    console.error("Full error:", err);
    res.status(500).send(`❌ Something went wrong! ${err.message}`);
  }
});

// Twilio status webhook
app.post("/call-status", (req, res) => {
  const status = req.body.CallStatus;
  const userId = req.query.userId;

  console.log(`📞 Webhook for ${userId}: Status=${status}`);

  if (status === "in-progress") {
    answeredCalls[userId] = true;
    io.emit("callAnswered", { userId });
  }

  res.sendStatus(200);
});

// WebSocket connection
io.on("connection", (socket) => {
  console.log("✨ User connected via WebSocket");
});

app.get("/call-check", (req, res) => {
  const phone = req.query.phone;
  const answered = !!answeredCalls[phone.replace(/\s/g, '')];
  res.json({ answered });
});


// Thank you page
app.get("/thankyou", (req, res) => {
  res.render("thankyou");
});

// Use Render port or 3000 locally
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));





