const bcrypt = require("bcrypt");
const userModel = require("../models/user.model");

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

module.exports = { register };