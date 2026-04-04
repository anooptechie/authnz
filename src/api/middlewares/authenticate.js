const jwt = require("jsonwebtoken");
const config = require("../../config/env");
const blocklist = require("../../services/blocklistService");

// 🔹 Allowed roles (keep in sync with your system)
const VALID_ROLES = ["admin", "manager", "viewer"];

// 🔹 Simple UUID validation (good enough for this layer)
const isUUID = (value) => {
  return /^[0-9a-fA-F-]{36}$/.test(value);
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token format" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.jwt.secret);

    // 🔴 CLAIMS VALIDATION STARTS HERE

    // 1. userId validation
    if (!decoded.userId || !isUUID(decoded.userId)) {
      return res.status(401).json({ error: "Invalid token claims (userId)" });
    }

    // 2. role validation
    if (!VALID_ROLES.includes(decoded.role)) {
      return res.status(401).json({ error: "Invalid token claims (role)" });
    }

    // 3. isActive validation
    if (decoded.isActive !== true) {
      return res.status(401).json({ error: "Account deactivated" });
    }

    // 🔴 CLAIMS VALIDATION ENDS HERE

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