const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const config = require("../config/env");
const crypto = require("crypto")

const issueAccessToken = (user) => {
  const jti = randomUUID();

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    jti,
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  return { token, jti };
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const getTokenExpiry = (decoded) => {
  return decoded.exp - Math.floor(Date.now() / 1000);
};

module.exports = {
  issueAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getTokenExpiry,
};

// module.exports = { issueAccessToken, generateRefreshToken, hashRefreshToken };