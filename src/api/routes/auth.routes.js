const express = require("express");
const router = express.Router();

const { isValidEmail, isStrongPassword } = require("../../utils/validate");
const authService = require("../../services/authService");

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: "Weak password" });
    }

    const user = await authService.register(email, password);

    res.status(201).json({
      message: "User registered successfully",
      userId: user.id,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  }
});

module.exports = router;