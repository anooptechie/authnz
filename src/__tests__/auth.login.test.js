const request = require("supertest");
const app = require("../app");
const db = require("../db/postgres");

describe("Auth Login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should login successfully and return token", async () => {
    // Mock DB user
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: "uuid-123",
          email: "test@example.com",
          password_hash: "$2b$12$hashedpassword", // fake hash
          role: "viewer",
          is_active: true,
        },
      ],
    });

    // Mock bcrypt
    jest.spyOn(require("bcrypt"), "compare").mockResolvedValue(true);

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "Password123",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("should fail for wrong password", async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: "uuid-123",
          email: "test@example.com",
          password_hash: "hash",
          role: "viewer",
          is_active: true,
        },
      ],
    });

    jest.spyOn(require("bcrypt"), "compare").mockResolvedValue(false);

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "WrongPassword",
      });

    expect(res.statusCode).toBe(401);
  });
});