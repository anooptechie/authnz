const jwt = require("jsonwebtoken");
const config = require("../../config/env");
const blocklist = require("../../services/blocklistService");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.jwt.secret);

    const blocked = await blocklist.isBlocked(decoded.jti);

    if (blocked) {
      return res.status(401).json({ error: "Token revoked" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authenticate;