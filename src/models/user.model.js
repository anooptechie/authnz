const db = require("../db/postgres");

const findByEmail = async (email) => {
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0];
};

const create = async ({ email, passwordHash }) => {
  const result = await db.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id`,
    [email, passwordHash]
  );
  return result.rows[0];
};

module.exports = { findByEmail, create };