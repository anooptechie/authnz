const request = require("supertest");
const app = require("../app");

// Mock Postgres
jest.mock("../db/postgres", () => ({
    query: jest.fn(),
}));

// Mock bcrypt
jest.mock("bcrypt", () => ({
    compare: jest.fn(),
}));

// Mock user model
jest.mock("../models/user.model", () => ({
    findById: jest.fn().mockResolvedValue({
        id: "123e4567-e89b-12d3-a456-426614174000",
        role: "admin",
        is_active: true,
    }),
}));

const db = require("../db/postgres");
const bcrypt = require("bcrypt");

describe("Refresh Token Flow", () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";
    let refreshToken;

    beforeEach(() => {
        jest.clearAllMocks();
        refreshToken = "valid-refresh-token";
    });

    it("should refresh tokens successfully", async () => {
        bcrypt.compare.mockResolvedValueOnce(true);

        db.query
            // Find refresh token
            .mockResolvedValueOnce({
                rows: [
                    {
                        user_id: userId,
                        token_hash: "hashed-token-value",
                        revoked: false,
                        expires_at: new Date(Date.now() + 100000),
                    },
                ],
            })

            // Revoke old token
            .mockResolvedValueOnce({})

            // Insert new refresh token
            .mockResolvedValueOnce({});

        const res = await request(app)
            .post("/auth/refresh")
            .send({ refreshToken });

        expect(res.statusCode).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
    });

    it("should reject reused refresh token (revoked)", async () => {
        bcrypt.compare.mockResolvedValueOnce(true);

        db.query.mockResolvedValueOnce({
            rows: [
                {
                    user_id: userId,
                    token_hash: "hashed-token-value",
                    revoked: true,
                    expires_at: new Date(Date.now() + 100000),
                },
            ],
        });

        const res = await request(app)
            .post("/auth/refresh")
            .send({ refreshToken });

        expect(res.statusCode).toBe(401);
    });

    it("should reject invalid refresh token", async () => {
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        const res = await request(app)
            .post("/auth/refresh")
            .send({ refreshToken: "invalidtoken" });

        expect(res.statusCode).toBe(401);
    });
});