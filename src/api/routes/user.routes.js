const express = require("express");
const router = express.Router();

const userService = require("../../services/userService");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const logger = require("../../config/logger");

// 🔹 Get current user
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await userService.getMe(req.user.userId);
    res.json(user);
  } catch (err) {
    logger.error({ err, route: "/users/me" }, "GetMe error");
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 🔹 Get all users (admin)
router.get("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (err) {
    logger.error({ err, route: "/users" }, "GetAllUsers error");
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 🔹 Update role (admin)
router.patch("/:id/role", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    const updated = await userService.updateUserRole(
      req.params.id,
      role,
      {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      }
    );

    res.json(updated);
  } catch (err) {
    logger.error({ err, route: "/users/:id/role" }, "UpdateRole error");
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 🔹 Deactivate user (admin)
router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const result = await userService.deactivateUser(
      req.params.id,
      {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      }
    );

    res.json({ message: "User deactivated", user: result });
  } catch (err) {
    logger.error({ err, route: "/users/:id" }, "DeactivateUser error");
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;