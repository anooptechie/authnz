const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const config = require("../config/env");

// 🔥 Mock DB
jest.mock("../db/postgres", () => ({
  query: jest.fn(),
}));

// 🔥 Mock refresh token model
jest.mock("../models/refreshToken.model", () => ({
  revokeAllByUserId: jest.fn(),
}));

// 🔥 Mock audit log
jest.mock("../models/auditLog.model", () => ({
  create: jest.fn(),
}));

const db = require("../db/postgres");
const refreshTokenModel = require("../models/refreshToken.model");
const auditLog = require("../models/auditLog.model");

const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";

const generateToken = (payload) =>
  jwt.sign(payload, config.jwt.secret);

describe("User Routes (Functional + RBAC)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 🔹 GET /users/me
  it("should return current user profile", async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: VALID_USER_ID,
          email: "test@example.com",
          role: "admin",
          is_active: true,
        },
      ],
    });

    const token = generateToken({
      userId: VALID_USER_ID,
      role: "admin",
      isActive: true,
      jti: "test-jti",
    });

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe("test@example.com");
  });

  // 🔹 GET /users (admin only)
  it("should allow admin to fetch all users", async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: "1", email: "user@example.com", role: "viewer", is_active: true },
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

  // 🔹 PATCH /users/:id/role
  it("should update user role and write audit log", async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: "1", email: "user@example.com", role: "manager" },
      ],
    });

    const token = generateToken({
      userId: VALID_USER_ID,
      role: "admin",
      isActive: true,
      jti: "test-jti",
    });

    const res = await request(app)
      .patch("/users/1/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "manager" });

    expect(res.statusCode).toBe(200);

    // 🔥 Verify audit log
    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "1",
        action: "ROLE_CHANGED",
      })
    );
  });

  it("should reject role update without role", async () => {
    const token = generateToken({
      userId: VALID_USER_ID,
      role: "admin",
      isActive: true,
      jti: "test-jti",
    });

    const res = await request(app)
      .patch("/users/1/role")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  // 🔹 DELETE /users/:id
  it("should deactivate user, revoke tokens, and log audit", async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: "1", email: "user@example.com", is_active: false },
      ],
    });

    refreshTokenModel.revokeAllByUserId.mockResolvedValueOnce();
    auditLog.create.mockResolvedValueOnce();

    const token = generateToken({
      userId: VALID_USER_ID,
      role: "admin",
      isActive: true,
      jti: "test-jti",
    });

    const res = await request(app)
      .delete("/users/1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User deactivated");

    // 🔥 Verify token revocation
    expect(refreshTokenModel.revokeAllByUserId).toHaveBeenCalledWith("1");

    // 🔥 Verify audit log
    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "1",
        action: "USER_DEACTIVATED",
      })
    );
  });
});