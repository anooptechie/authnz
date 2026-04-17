// const { randomUUID } = require("crypto");

// const traceIdMiddleware = (req, res, next) => {
//   const traceId = randomUUID();

//   req.traceId = traceId;
//   res.setHeader("X-Trace-Id", traceId);

//   next();
// };

// module.exports = traceIdMiddleware;

const { randomUUID } = require("crypto");

const traceIdMiddleware = (req, res, next) => {
  // 🔥 Use incoming traceId if present
  const incomingTraceId = req.headers["x-trace-id"];

  const traceId = incomingTraceId || randomUUID();

  // Attach to request
  req.traceId = traceId;

  // Set response header
  res.setHeader("X-Trace-Id", traceId);

  next();
};

module.exports = traceIdMiddleware;
