const axios = require("axios");

const RATE_LIMITER_URL =
  process.env.RATE_LIMITER_URL || "http://localhost:3000";

async function checkRateLimit({
  key,
  algorithm,
  limit,
  window,
  cost = 1,
  traceId,
}) {
  try {
    const response = await axios.post(
      `${RATE_LIMITER_URL}/check`,
      { key, algorithm, limit, window, cost },
      {
        timeout: 200,
        headers: {
          "x-trace-id": traceId, // 🔥 propagate
        },
      },
    );

    return response.data;
  } catch (err) {
    // 🔥 If rate limited (429), return response
    if (err.response?.status === 429) {
      return err.response.data;
    }

    // 🔥 FAIL-OPEN (VERY IMPORTANT)
    return {
      allowed: true,
      reason: "rate-limiter-unavailable",
    };
  }
}

module.exports = checkRateLimit;
