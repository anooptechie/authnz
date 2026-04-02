const bcrypt = require("bcrypt");
const userModel = require("../models/user.model");
const tokenService = require("./tokenService");
const auditLog = require("../models/auditLog.model");
const refreshTokenModel = require("../models/refreshToken.model");

const SALT_ROUNDS = 12;

const register = async (email, password) => {
    const existing = await userModel.findByEmail(email);
    if (existing) {
        throw { status: 409, message: "Email already registered" };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await userModel.create({ email, passwordHash });

    return user;
};

const login = async (email, password, meta) => {
    const user = await userModel.findByEmail(email);

    if (!user || !user.is_active) {
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

    const refreshTokenModel = require("../models/refreshToken.model");

    await refreshTokenModel.create({
        userId: user.id,
        tokenHash,
        expiresAt,
    });

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
  const hash = tokenService.hashRefreshToken(refreshToken);

  const token = await refreshTokenModel.findByHash(hash);

  if (!token) {
    throw { status: 401, message: "Invalid refresh token" };
  }

  if (token.revoked) {
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

  const user = { id: token.user_id, role: "viewer" }; // minimal

  const { token: accessToken } = tokenService.issueAccessToken(user);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
  };
};

module.exports = { register, login, refresh};