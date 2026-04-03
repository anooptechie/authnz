const express = require("express");

const authRoutes = require("./api/routes/auth.routes");
const userRoutes = require("./api/routes/user.routes");

const authenticate = require("./api/middlewares/authenticate");
const authorize = require("./api/middlewares/authorize");

const pinoHttp = require("pino-http");
const logger = require("./config/logger");

const traceIdMiddleware = require("./api/middlewares/traceId");

const app = express();

// 🔹 Core Middleware
app.use(express.json());

// 🔥 IMPORTANT: traceId BEFORE logger
app.use(traceIdMiddleware);

// 🔥 Attach traceId to logs
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({
      traceId: req.traceId,
    }),
  })
);

// 🔹 Health / Root
app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 🔹 Feature Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

// 🔹 Test / Debug Routes
app.get("/protected", authenticate, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

app.get("/admin", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

// 🔹 Global Error Handler (MUST BE LAST)
app.use((err, req, res, next) => {
  logger.error(
    {
      err,
      url: req.url,
      method: req.method,
      traceId: req.traceId, // 🔥 include traceId here too
    },
    "Unhandled error"
  );

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;