const request = require("supertest");
const app = require("../app");

// 🔥 Mock Postgres (THIS WAS MISSING)
jest.mock("../db/postgres", () => ({
    query: jest.fn(),
}));

const db = require("../db/postgres");

describe("Refresh Token Flow", () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";

    let refreshToken;

    beforeEach(() => {
        jest.clearAllMocks();

        // 🔥 IMPORTANT: Your system does NOT use JWT refresh tokens
        // It uses random tokens → so just simulate a string
        refreshToken = "valid-refresh-token";
    });

    it("should refresh tokens successfully", async () => {
        // 🔹 Step 1: findByHash → token exists
        db.query
            .mockResolvedValueOnce({
                rows: [
                    {
                        user_id: userId,
                        token_hash: "hashed",
                        revoked: false,
                        expires_at: new Date(Date.now() + 100000),
                    },
                ],
            })
            // 🔹 Step 2: revokeByHash
            .mockResolvedValueOnce({})
            // 🔹 Step 3: create new token
            .mockResolvedValueOnce({});

        const res = await request(app)
            .post("/auth/refresh")
            .send({ refreshToken });

        expect(res.statusCode).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
    });

    it("should reject reused refresh token (revoked)", async () => {
        db.query.mockResolvedValueOnce({
            rows: [
                {
                    user_id: userId,
                    token_hash: "hashed",
                    revoked: true, // 🔥 already used
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
        // 🔥 No token found
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        const res = await request(app)
            .post("/auth/refresh")
            .send({ refreshToken: "invalidtoken" });

        expect(res.statusCode).toBe(401);
    });
});