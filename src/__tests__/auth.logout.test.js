const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const config = require("../config/env");

// Mock Postgres
jest.mock("../db/postgres", () => ({
    query: jest.fn(),
}));

const db = require("../db/postgres");

describe("Logout Flow", () => {
    let accessToken;

    beforeEach(() => {
        jest.clearAllMocks();

        // 🔥 Generate REAL JWT (this is the fix)
        accessToken = jwt.sign(
            {
                userId: "123e4567-e89b-12d3-a456-426614174000",
                role: "admin",
                isActive: true,
                jti: "test-jti",
            },
            config.jwt.secret
        );
    });

    it("should logout successfully", async () => {
        db.query.mockResolvedValueOnce({});

        const res = await request(app)
            .post("/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(res.statusCode).toBe(200);
    });

    it("should reject invalid token", async () => {
        const res = await request(app)
            .post("/auth/logout")
            .set("Authorization", "Bearer invalidtoken");

        expect(res.statusCode).toBe(401);
    });
});