const db = require("../db/postgres");

const create = async ({ userId, action, ipAddress, userAgent, metadata }) => {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, ipAddress, userAgent, JSON.stringify(metadata)]
  );
};

module.exports = { create };