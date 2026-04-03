const db = require("../db/postgres");
const logger = require("../config/logger");

const create = async ({ userId, action, ipAddress, userAgent, metadata }) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, ipAddress, userAgent, JSON.stringify(metadata)]
    );

    // 🔹 Log audit event (non-sensitive, structured)
    logger.info(
      {
        userId,
        action,
        ipAddress,
      },
      "Audit log recorded"
    );

  } catch (err) {
    // 🔹 Important: audit failures should not break main flow
    logger.error(
      { err, userId, action },
      "Failed to write audit log"
    );
  }
};

module.exports = { create };