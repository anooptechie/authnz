const bcrypt = require("bcrypt");
const userModel = require("../models/user.model");
const tokenService = require("./tokenService");
const auditLog = require("../models/auditLog.model");
const refreshTokenModel = require("../models/refreshToken.model");
const logger = require("../config/logger");

const SALT_ROUNDS = 12;

const register = async (email, password) => {
  logger.info({ email }, "Register attempt");

  const existing = await userModel.findByEmail(email);
  if (existing) {
    logger.warn({ email }, "Register failed: Email already exists");
    throw { status: 409, message: "Email already registered" };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await userModel.create({ email, passwordHash });

  logger.info({ userId: user.id, email }, "User registered successfully");

  return user;
};

const login = async (email, password, meta) => {
  logger.info({ email, ip: meta.ip }, "Login attempt");

  const user = await userModel.findByEmail(email);

  if (!user || !user.is_active) {
    logger.warn({ email }, "Login failed: Invalid credentials");

    await auditLog.create({
      userId: user?.id || null,
      action: "LOGIN_FAILED",
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: { reason: "INVALID_CREDENTIALS", email },
    });

    throw { status: 401, message: "Invalid credentials" };
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    logger.warn({ userId: user.id }, "Login failed: Invalid password");

    await auditLog.create({
      userId: user.id,
      action: "LOGIN_FAILED",
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: { reason: "INVALID_PASSWORD" },
    });

    throw { status: 401, message: "Invalid credentials" };
  }

  // 🔹 Access Token
  const { token } = tokenService.issueAccessToken(user);

  // 🔹 Refresh Token
  const refreshToken = tokenService.generateRefreshToken();
  const tokenHash = tokenService.hashRefreshToken(refreshToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await refreshTokenModel.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  logger.info({ userId: user.id }, "Login successful");

  // fire-and-forget audit log
  auditLog.create({
    userId: user.id,
    action: "LOGIN",
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    metadata: {},
  });

  return {
    accessToken: token,
    refreshToken,
    expiresIn: 900,
  };
};

const refresh = async (refreshToken, meta) => {
  logger.info({ ip: meta.ip }, "Refresh token attempt");

  const hash = tokenService.hashRefreshToken(refreshToken);

  const token = await refreshTokenModel.findByHash(hash);

  if (!token) {
    logger.warn("Refresh failed: Token not found");
    throw { status: 401, message: "Invalid refresh token" };
  }

  if (token.revoked) {
    logger.error(
      { userId: token.user_id },
      "Refresh token reuse detected (THEFT)",
    );

    // THEFT DETECTED
    await refreshTokenModel.revokeAllByUserId(token.user_id);

    await auditLog.create({
      userId: token.user_id,
      action: "TOKEN_THEFT_DETECTED",
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: {},
    });

    throw { status: 401, message: "Invalid refresh token" };
  }

  if (new Date(token.expires_at) < new Date()) {
    logger.warn({ userId: token.user_id }, "Refresh failed: Token expired");
    throw { status: 401, message: "Token expired" };
  }

  // rotate token
  await refreshTokenModel.revokeByHash(hash);

  const newRefreshToken = tokenService.generateRefreshToken();
  const newHash = tokenService.hashRefreshToken(newRefreshToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await refreshTokenModel.create({
    userId: token.user_id,
    tokenHash: newHash,
    expiresAt,
  });

  // 🔹 Fetch real user (CRITICAL FIX)
  const user = await userModel.findById(token.user_id);

  if (!user || !user.is_active) {
    throw { status: 401, message: "User not found or inactive" };
  }

  const { token: accessToken } = tokenService.issueAccessToken(user);

  logger.info({ userId: token.user_id }, "Refresh token rotated successfully");

  // 🔥 NEW: Audit log for TOKEN_REFRESH
  await auditLog.create({
    userId: token.user_id,
    action: "TOKEN_REFRESH",
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    metadata: {},
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
  };
};

module.exports = { register, login, refresh };
