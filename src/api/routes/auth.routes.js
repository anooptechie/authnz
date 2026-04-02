const express = require("express");
const router = express.Router();

const { isValidEmail, isStrongPassword } = require("../../utils/validate");
const authService = require("../../services/authService");
const jwt = require("jsonwebtoken");
const blocklist = require("../../services/blocklistService");
const tokenService = require("../../services/tokenService");
const config = require("../../config/env");

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

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const result = await authService.login(email, password, {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });

        res.status(200).json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            tokenType: "Bearer",
            expiresIn: result.expiresIn,
        });
    } catch (err) {
        res.status(err.status || 500).json({
            error: err.message || "Internal server error",
        });
    }
});

router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: "Missing refresh token" });
        }

        const result = await authService.refresh(refreshToken, {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });

        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({
            error: err.message || "Internal server error",
        });
    }
});

router.post("/logout", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(400).json({ error: "Missing token" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, config.jwt.secret);

        const ttl = tokenService.getTokenExpiry(decoded);

        await blocklist.addToBlocklist(decoded.jti, ttl);

        res.json({ message: "Logged out successfully" });

    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
});


module.exports = router;