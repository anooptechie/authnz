const express = require("express");

const authRoutes = require("./api/routes/auth.routes");

const authenticate = require("./api/middlewares/authenticate");
const authorize = require("./api/middlewares/authorize");
const pinoHttp = require("pino-http");
const logger = require("./config/logger");

const app = express();

// 🔹 Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));

// 🔹 Routes
app.use("/auth", authRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

// Protected route
app.get("/protected", authenticate, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

// Admin route
app.get("/admin", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

// 🔹 Global Error Handler (NEW)
app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;