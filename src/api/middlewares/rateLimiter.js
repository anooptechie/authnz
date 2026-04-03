const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").default;
const redisClient = require("../../db/redis"); // your redis connection

const createRateLimiter = ({ windowMs, max }) =>
  rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests, please try again later",
    },
  });

// Different limits per route
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
});

const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
});

const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
};

