const { randomUUID } = require("crypto");

const traceIdMiddleware = (req, res, next) => {
  const traceId = randomUUID();

  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);

  next();
};

module.exports = traceIdMiddleware;