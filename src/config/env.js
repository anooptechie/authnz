require("dotenv").config();

const required = [
  "PORT",
  "POSTGRES_HOST",
  "POSTGRES_PORT",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "REDIS_HOST",
  "REDIS_PORT",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET" // 🔥 ADD THIS
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
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET, // 🔥 ADD THIS
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
});