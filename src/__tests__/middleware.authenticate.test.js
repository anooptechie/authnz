const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const config = require("../config/env");

// 🔥 Mock blocklist (important)
jest.mock("../services/blocklistService", () => ({
  isBlocked: jest.fn(() => Promise.resolve(false)),
}));

describe("Authenticate Middleware", () => {
  const validPayload = {
    userId: "123e4567-e89b-12d3-a456-426614174000",
    role: "admin",
    isActive: true,
    jti: "test-jti",
  };

  const generateToken = (payload) =>
    jwt.sign(payload, config.jwt.secret, { expiresIn: "1h" });

  it("should allow access with valid token", async () => {
    const token = generateToken(validPayload);

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Access granted");
  });

  it("should reject request with missing token", async () => {
    const res = await request(app).get("/protected");

    expect(res.statusCode).toBe(401);
  });

  it("should reject invalid token", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
  });

  it("should reject token with invalid role", async () => {
    const token = generateToken({
      ...validPayload,
      role: "superadmin",
    });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(401);
  });

  it("should reject inactive user", async () => {
    const token = generateToken({
      ...validPayload,
      isActive: false,
    });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(401);
  });

  it("should reject token without userId", async () => {
    const token = generateToken({
      role: "admin",
      isActive: true,
      jti: "test-jti",
    });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(401);
  });

  it("should reject revoked token", async () => {
    const blocklist = require("../services/blocklistService");
    blocklist.isBlocked.mockResolvedValueOnce(true);

    const token = generateToken(validPayload);

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(401);
  });
});