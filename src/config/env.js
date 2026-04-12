require("dotenv").config();

const required = [
  "PORT",
  "POSTGRES_HOST",
  "POSTGRES_PORT",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "REDIS_URL", // ← changed from REDIS_HOST + REDIS_PORT
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing env variable: ${key}`);
  }
});

module.exports = Object.freeze({
  port: process.env.PORT,
  postgres: {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: { rejectUnauthorized: false }, // ← added for Supabase
  },
  redis: {
    url: process.env.REDIS_URL, // ← changed
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
});
