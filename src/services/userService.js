const userModel = require("../models/user.model");
const refreshTokenModel = require("../models/refreshToken.model");
const auditLog = require("../models/auditLog.model");
const logger = require("../config/logger");

// 🔹 Get current user
const getMe = async (userId) => {
    const user = await userModel.findById(userId);

    if (!user || !user.is_active) {
        throw { status: 404, message: "User not found" };
    }

    return user;
};

// 🔹 Get all users (admin)
const getAllUsers = async () => {
    return await userModel.findAll();
};

// 🔹 Update role (admin)
const updateUserRole = async (targetUserId, role, meta) => {
    const updated = await userModel.updateRole(targetUserId, role);

    if (!updated) {
        throw { status: 404, message: "User not found" };
    }

    // Audit log
    await auditLog.create({
        userId: targetUserId,
        action: "ROLE_UPDATED",
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: { newRole: role },
    });

    logger.info({ userId: targetUserId, role }, "User role updated");

    return updated;
};

// 🔹 Deactivate user (admin)
const deactivateUser = async (targetUserId, meta) => {
    const user = await userModel.deactivate(targetUserId);

    if (!user) {
        throw { status: 404, message: "User not found" };
    }

    // Revoke all refresh tokens
    await refreshTokenModel.revokeAllByUserId(targetUserId);

    // Audit log
    await auditLog.create({
        userId: targetUserId,
        action: "USER_DEACTIVATED",
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: {},
    });

    logger.warn({ userId: targetUserId }, "User deactivated");

    return user;
};

module.exports = {
    getMe,
    getAllUsers,
    updateUserRole,
    deactivateUser,
};