const request = require("supertest");
const app = require("../app");

// 🔥 Mock DB (user model uses postgres)
jest.mock("../db/postgres", () => ({
    query: jest.fn(),
}));

const db = require("../db/postgres");

describe("Auth Register", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should register a new user successfully", async () => {
        // findByEmail → no user
        db.query
            .mockResolvedValueOnce({ rows: [] })
            // create user
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: "user-123",
                        email: "test@example.com",
                    },
                ],
            });

        const res = await request(app)
            .post("/auth/register")
            .send({
                email: "test@example.com",
                password: "StrongPass123!",
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("userId");
        expect(res.body.userId).toBe("user-123");
    });

    it("should reject duplicate email", async () => {
        // findByEmail → user exists
        db.query.mockResolvedValueOnce({
            rows: [{ id: "user-123", email: "test@example.com" }],
        });

        const res = await request(app)
            .post("/auth/register")
            .send({
                email: "test@example.com",
                password: "StrongPass123!",
            });

        expect(res.statusCode).toBe(409);
    });
});