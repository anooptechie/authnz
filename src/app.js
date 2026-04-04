const express = require("express");

const authRoutes = require("./api/routes/auth.routes");
const userRoutes = require("./api/routes/user.routes");

const authenticate = require("./api/middlewares/authenticate");
const authorize = require("./api/middlewares/authorize");

const pinoHttp = require("pino-http");
const logger = require("./config/logger");

const traceIdMiddleware = require("./api/middlewares/traceId");
const db = require("./db/postgres");
const redis = require("./db/redis");

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

app.get("/health", async (req, res) => {
  let postgresStatus = "connected";
  let redisStatus = "connected";

  // 🔹 Check Postgres
  try {
    await db.query("SELECT 1");
  } catch (err) {
    postgresStatus = "disconnected";
    logger.error({ err, traceId: req.traceId }, "Postgres health check failed");
  }

  // 🔹 Check Redis
  try {
    await redis.ping();
  } catch (err) {
    redisStatus = "disconnected";
    logger.error({ err, traceId: req.traceId }, "Redis health check failed");
  }

  // 🔹 Overall status
  const isHealthy =
    postgresStatus === "connected" && redisStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    postgres: postgresStatus,
    redis: redisStatus,
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