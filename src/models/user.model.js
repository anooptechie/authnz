const db = require("../db/postgres");

// 🔹 Existing
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

// 🔹 NEW — Find by ID
const findById = async (id) => {
  const result = await db.query(
    "SELECT id, email, role, is_active FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0];
};

// 🔹 NEW — Get all users (admin)
const findAll = async () => {
  const result = await db.query(
    "SELECT id, email, role, is_active FROM users ORDER BY created_at DESC"
  );
  return result.rows;
};

// 🔹 NEW — Update role
const updateRole = async (id, role) => {
  const result = await db.query(
    `UPDATE users 
     SET role = $1 
     WHERE id = $2 
     RETURNING id, email, role`,
    [role, id]
  );
  return result.rows[0];
};

// 🔹 NEW — Deactivate user (soft delete)
const deactivate = async (id) => {
  const result = await db.query(
    `UPDATE users 
     SET is_active = false 
     WHERE id = $1 
     RETURNING id, email, is_active`,
    [id]
  );
  return result.rows[0];
};

module.exports = {
  findByEmail,
  create,
  findById,
  findAll,
  updateRole,
  deactivate,
};