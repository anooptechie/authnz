const bcrypt = require("bcrypt");
const userModel = require("../models/user.model");
const tokenService = require("./tokenService");
const auditLog = require("../models/auditLog.model");

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

    const { token } = tokenService.issueAccessToken(user);

    // fire-and-forget audit log
    auditLog.create({
        userId: user.id,
        action: "LOGIN",
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: {},
    });

    return { accessToken: token, expiresIn: 900 };
};


module.exports = { register, login };