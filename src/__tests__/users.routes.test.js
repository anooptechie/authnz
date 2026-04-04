const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const config = require("../config/env");

// 🔥 Mock Postgres (IMPORTANT)
jest.mock("../db/postgres", () => ({
    query: jest.fn(),
}));

const db = require("../db/postgres");

// 🔥 Valid UUID (required by authenticate middleware)
const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("User Routes (RBAC)", () => {
    const generateToken = (payload) =>
        jwt.sign(payload, config.jwt.secret);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should allow admin to access users route", async () => {
        // 🔹 Mock DB response
        db.query.mockResolvedValueOnce({
            rows: [
                { id: "1", email: "test@example.com" },
                { id: "2", email: "user@example.com" },
            ],
        });

        const token = generateToken({
            userId: VALID_USER_ID,
            role: "admin",
            isActive: true,
            jti: "test-jti",
        });

        const res = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("should reject request without token", async () => {
        const res = await request(app).get("/users");

        expect(res.statusCode).toBe(401);
    });

    it("should reject user with insufficient role", async () => {
        const token = generateToken({
            userId: VALID_USER_ID,
            role: "viewer", // ❌ not allowed
            isActive: true,
            jti: "test-jti",
        });

        const res = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(403); // 🔥 comes from authorize middleware
    });

    it("should reject inactive user", async () => {
        const token = generateToken({
            userId: VALID_USER_ID,
            role: "admin",
            isActive: false, // ❌ inactive
            jti: "test-jti",
        });

        const res = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(401);
    });

    it("should reject token with invalid userId", async () => {
        const token = generateToken({
            userId: "123", // ❌ not UUID
            role: "admin",
            isActive: true,
            jti: "test-jti",
        });

        const res = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(401);
    });
});