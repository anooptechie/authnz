const db = require("../db/postgres");

const create = async ({ userId, tokenHash, expiresAt }) => {
    await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );
};

const findByHash = async (hash) => {
    const result = await db.query(
        "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false",
        [hash]
    );
    return result.rows[0];
};

const revokeByHash = async (hash) => {
    await db.query(
        "UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1",
        [hash]
    );
};

const revokeAllByUserId = async (userId) => {
    await db.query(
        "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",
        [userId]
    );
};

module.exports = {
    create,
    findByHash,
    revokeByHash,
    revokeAllByUserId,
};