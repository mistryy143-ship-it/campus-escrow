// CampusEscrow API server. Blockchain sync happens in listener.js
// (run "npm run listener" in a second terminal).
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { ensureSchemaAndSeed } = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/disputes", require("./routes/disputes"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/audit", require("./routes/audit"));

app.get("/api/health", (req, res) => res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } }));

// Serve built frontend assets directly (Single Deployment)
const distPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(distPath));

// For non-API routes, serve React index.html for client-side routing
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal server error" });
});

ensureSchemaAndSeed()
  .then(() => app.listen(PORT, () => console.log(`CampusEscrow API listening on http://localhost:${PORT}`)))
  .catch((e) => {
    console.error("\n[db] Could not connect to PostgreSQL.");
    console.error("[db] Check DATABASE_URL in backend/.env (port 1429, your password) and that the database exists:");
    console.error("       CREATE DATABASE campus_escrow;\n");
    console.error(e.message);
    process.exit(1);
  });