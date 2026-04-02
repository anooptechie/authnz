const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const config = require("../config/env");

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

module.exports = { issueAccessToken };