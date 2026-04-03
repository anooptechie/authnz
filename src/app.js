const express = require("express");

const authRoutes = require("./api/routes/auth.routes");
const userRoutes = require("./api/routes/user.routes");

const authenticate = require("./api/middlewares/authenticate");
const authorize = require("./api/middlewares/authorize");

const pinoHttp = require("pino-http");
const logger = require("./config/logger");

const app = express();

// 🔹 Core Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));

// 🔹 Health / Root (optional but good placement)
app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

// 🔹 Feature Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

// 🔹 Test / Debug Routes (optional)
app.get("/protected", authenticate, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

app.get("/admin", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

// 🔹 Global Error Handler (MUST BE LAST)
app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;