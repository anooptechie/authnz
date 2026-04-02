const isValidEmail = (email) => {
  return /\S+@\S+\.\S+/.test(email);
};

const isStrongPassword = (password) => {
  return password.length >= 8 && /\d/.test(password);
};

module.exports = { isValidEmail, isStrongPassword };