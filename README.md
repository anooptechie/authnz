# 🔐 Auth Service

A standalone, production-grade Authentication & Authorization service built using Node.js, Express, PostgreSQL, and Redis.

---

## 📌 Project Overview

This service is designed to:
- Handle user authentication (AuthN)
- Provide role-based authorization (AuthZ)
- Be consumed by other services (Inventory, Notification, etc.)
- Follow production-level design patterns (stateless JWT, token rotation, audit logs)

---

## 🚀 Current Progress

### ✅ Milestone 1 — Infrastructure
- Docker setup for:
  - PostgreSQL (primary DB)
  - Redis (cache, rate limiting, token blocklist)
- Environment configuration with validation (`env.js`)
- PostgreSQL connection using `pg`
- Redis connection using `ioredis`
- Migration system for DB schema
- Tables created:
  - `users`
  - `refresh_tokens`
  - `audit_logs`
- Indexes added for performance

---

### ✅ Milestone 2 — User Registration

#### 🔹 Endpoint

POST /auth/register


#### 🔹 Features Implemented
- Input validation:
  - Email format validation
  - Password strength check (min 8 chars + number)
- Duplicate email detection
- Secure password hashing using `bcrypt` (async)
- Clean architecture:
  - Route → Service → Model → DB
- Proper error handling:
  - `400` → invalid input
  - `409` → email already exists
- No sensitive data returned in response

#### 🔹 Request
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
🔹 Success Response
{
  "message": "User registered successfully",
  "userId": "uuid"
}
🧱 Project Structure
auth-service/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   └── middlewares/
│   ├── services/
│   ├── models/
│   ├── db/
│   │   ├── migrations/
│   ├── config/
│   ├── utils/
│   └── app.js
├── server.js
├── docker-compose.yml
├── .env

⚙️ How to Run
1. Start services
docker compose up -d
2. Run migrations
node src/db/migrate.js
3. Start server
node server.js
🧪 Testing (Manual)
curl -X POST http://localhost:4000/auth/register \
-H "Content-Type: application/json" \
-d '{"email":"test101@example.com","password":"Password123"}'

### ✅ Milestone 3 — Login + JWT

#### 🔹 Endpoint

POST /auth/login

#### 🔹 Features Implemented
- Credential validation using bcrypt.compare (async)
- Secure authentication flow with no information leakage
- JWT access token generation using `jsonwebtoken`
- Token payload includes:
  - `userId`
  - `email`
  - `role`
  - `isActive`
  - `jti` (unique token ID for revocation)
- Centralized token logic via `tokenService`
- Audit logging implemented for:
  - LOGIN (successful authentication)
  - LOGIN_FAILED (invalid credentials, inactive account)
- Metadata captured in audit logs:
  - IP address
  - User-Agent
- Consistent error handling:
  - `401` for all authentication failures

#### 🔹 Request
```json
{
  "email": "user@example.com",
  "password": "Password123"
}

🔹 Success Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
🔹 Failure Response
{
  "error": "Invalid credentials"
}

## 🧩 Core Components

- tokenService.js  
  Handles JWT creation, payload structure, and token configuration

- auditLog.model.js  
  Centralized audit logging for authentication events (LOGIN, LOGIN_FAILED)

- bcrypt  
  Secure password hashing and verification

- jsonwebtoken  
  Access token generation with signed payload

- crypto (Node.js)  
  Generates unique JWT IDs (jti) for future token revocation

### ✅ Milestone 4 — Refresh Token System

#### 🔹 Endpoints

POST /auth/refresh


#### 🔹 Features Implemented
- Refresh token generation using `crypto.randomBytes`
- Secure storage of refresh tokens as SHA-256 hashes (no plaintext storage)
- Refresh token persistence in PostgreSQL with expiry tracking
- Token rotation on every `/auth/refresh` call:
  - Old refresh token is revoked
  - New refresh token is issued
- One-time-use refresh token model (prevents replay attacks)
- Theft detection:
  - Reuse of a revoked token triggers full session invalidation
  - All user refresh tokens are revoked
  - `TOKEN_THEFT_DETECTED` audit event logged
- Expiry validation for refresh tokens
- Consistent error handling:
  - `401` for invalid, revoked, or expired tokens

#### 🔹 Request
```json
{
  "refreshToken": "your-refresh-token"
}
🔹 Success Response
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 900
}
🔹 Failure Response
{
  "error": "Invalid refresh token"
}

### ✅ Milestone 5 — Logout + Token Revocation (Redis)

#### 🔹 Endpoint

POST /auth/logout


#### 🔹 Features Implemented
- JWT revocation using Redis blocklist (denylist pattern)
- Access token invalidation via `jti` (unique token identifier)
- Dynamic TTL calculation based on token expiry
- Immediate logout support (no need to wait for token expiry)
- Middleware-based validation:
  - Every request checks Redis for revoked tokens
- Secure logout flow:
  - Extract token from Authorization header
  - Decode JWT and extract `jti`
  - Store `jti` in Redis with expiry
- Protected routes reject revoked tokens with `401`

#### 🔹 Request
```http
POST /auth/logout
Authorization: Bearer <access-token>
🔹 Success Response
{
  "message": "Logged out successfully"
}
🔹 Failure Response
{
  "error": "Invalid token"
}

## 🧪 Testing Guide

### 🔹 Prerequisites
- Server running on `http://localhost:4000`
- PostgreSQL and Redis running via Docker
- Migrations applied

---

## 1️⃣ User Registration

### Request
```bash
curl -X POST http://localhost:4000/auth/register \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com","password":"Password123"}'
Expected Response
{
  "message": "User registered successfully",
  "userId": "uuid"
}
2️⃣ Login (Get Tokens)
Request
curl -X POST http://localhost:4000/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com","password":"Password123"}'
Expected Response
{
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
3️⃣ Access Protected Route
Request
curl http://localhost:4000/protected \
-H "Authorization: Bearer <access-token>"
Expected Response
{
  "message": "Access granted",
  "user": { ... }
}
4️⃣ Refresh Token (Rotation)
Request
curl -X POST http://localhost:4000/auth/refresh \
-H "Content-Type: application/json" \
-d '{"refreshToken":"<refresh-token>"}'
Expected Response
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900
}
5️⃣ Refresh Token Reuse (Security Check)
Reuse OLD refresh token
Expected Response
{
  "error": "Invalid refresh token"
}

👉 Ensures token rotation + replay protection

6️⃣ Logout (Token Revocation)
Request
curl -X POST http://localhost:4000/auth/logout \
-H "Authorization: Bearer <access-token>"
Expected Response
{
  "message": "Logged out successfully"
}
7️⃣ Access After Logout (Revoked Token)
Request
curl http://localhost:4000/protected \
-H "Authorization: Bearer <access-token>"
Expected Response
{
  "error": "Token revoked"
}

👉 Ensures Redis blocklist is working

✅ Test Coverage Summary
User registration flow
Secure login with JWT issuance
Protected route access via middleware
Refresh token rotation and invalidation
Replay attack prevention (old token reuse)
Logout with instant token revocation
Redis-backed access control enforcement

### ✅ Milestone 6 — RBAC (Role-Based Access Control)

#### 🔹 Features Implemented
- Role-based access control using middleware
- `authorize(...roles)` middleware for restricting route access
- Integration with JWT payload (`user.role`)
- Protected routes enforce role-based permissions:
  - Admin-only routes
  - Authenticated user routes
- Dynamic role updates via database (effective on next login)

#### 🔹 Example Protected Routes
```http
GET /admin        → Admin only
GET /profile      → Any authenticated user
🔹 Access Control Behavior
Viewer → ❌ Forbidden (403) for admin routes
Admin → ✅ Access granted
Missing/invalid token → ❌ Unauthorized (401)
🔹 Failure Response
{
  "error": "Forbidden"
}

### ✅ Milestone 7 — Observability (Logging)

#### 🔹 Features Implemented
- Structured logging using Pino
- Automatic request/response logging via middleware
- Service-level logging for authentication flows:
  - Login attempts
  - Failures
  - Token refresh events
- Centralized error logging in route handlers
- Audit logging integrated with structured logs
- Resilient audit logging (failures do not affect main flow)
- Contextual logging with:
  - userId
  - action
  - IP address

#### 🔹 Example Log
```json
{
  "level": 30,
  "msg": "Login successful",
  "userId": "uuid"
}

### ✅ Milestone 8 — Rate Limiting (Abuse Protection)

#### 🔹 Features Implemented
- Redis-backed rate limiting for authentication endpoints
- IP-based request throttling to prevent abuse and brute-force attacks
- Distributed rate limiting using Redis store (scalable across instances)
- Route-specific limits for better control:
  - `/auth/login` → strict limit (prevents brute-force)
  - `/auth/register` → moderate limit (prevents spam accounts)
  - `/auth/refresh` → relaxed limit (normal usage)

#### 🔹 Rate Limit Configuration
- Window: 15 minutes  
- Limits:
  - Login → 5 requests  
  - Register → 3 requests  
  - Refresh → 10 requests  

#### 🔹 Failure Response
```json
{
  "error": "Too many requests, please try again later"
}

### ✅ Milestone 9 — User Management APIs

#### 🔹 Features Implemented
- User profile retrieval (`/users/me`)
- Admin-only user listing (`/users`)
- Role management (`PATCH /users/:id/role`)
- User deactivation (soft delete)
- Refresh token revocation on deactivation

#### 🔹 Access Control
- Protected using JWT authentication
- Role-based authorization via middleware
- Admin-only endpoints enforced using `authorize("admin")`

#### 🔹 Audit Logging
- ROLE_CHANGED event logged
- USER_DEACTIVATED event logged
- Includes IP address and user agent

#### 🔹 Key Benefits
- Enables full user lifecycle management  
- Demonstrates real-world RBAC usage  
- Improves system security and control  
- Supports admin-level operations 

### ✅ Milestone 10 — Health Check & Trace ID (Observability)

#### 🔹 Features Implemented

- Health check endpoint (`/health`) for service monitoring
- Trace ID middleware for request tracking
- Unique `traceId` generated for every incoming request
- `traceId` attached to:
  - Request object (`req.traceId`)
  - Response headers (`X-Trace-Id`)
  - Structured logs (via pino-http)
- Integrated traceId into error logs for better debugging

---

#### 🔹 Health Endpoint

**Request**
```bash
curl http://localhost:4000/health

Response

{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2026-04-01T12:00:00.000Z"
}
🔹 Trace ID Flow
Middleware generates a unique UUID per request
Attached to request (req.traceId)
Added to response header:
X-Trace-Id: <uuid>
Included in logs for request correlation
🔹 Example Log (with traceId)
{
  "level": 30,
  "traceId": "b3f1c2...",
  "msg": "request completed"
}

#### 🔹 Audit Logging (Updated)

Now tracks complete authentication lifecycle:

- LOGIN  
- LOGIN_FAILED  
- TOKEN_REFRESH  
- TOKEN_THEFT_DETECTED  
- LOGOUT  
- ROLE_CHANGED 
- USER_DEACTIVATED  

Ensures full visibility into user activity and security events.

### Production Readiness Improvements

As part of strengthening the system beyond basic functionality, several critical production-level gaps were identified and resolved. These fixes focus on correctness, security, and observability.

🔹 1. Health Check — Dependency Awareness

Problem:
The /health endpoint always returned "ok" regardless of system state. This meant the service appeared healthy even if PostgreSQL or Redis was down.

Fix Implemented:

Added runtime checks for:
PostgreSQL → SELECT 1
Redis → PING
Endpoint now reports individual dependency status
Returns appropriate HTTP status:
200 OK → all dependencies healthy
503 Service Unavailable → degraded state

Example Response:

{
  "status": "degraded",
  "postgres": "connected",
  "redis": "disconnected"
}

Why It Matters:

Enables accurate health detection by load balancers
Prevents traffic routing to unhealthy instances
Aligns with real production monitoring practices
🔹 2. JWT Claims Validation — Security Hardening

Problem:
JWT signature verification alone was not sufficient. The system trusted token payloads without validating their structure or integrity.

Fix Implemented:
Added explicit claims validation after token verification:

userId → must exist and be a valid UUID
role → must be one of: admin, manager, viewer
isActive → must be true
(Optional hardening) jti presence validation

Why It Matters:

Prevents privilege escalation (e.g., forged role: admin)
Ensures only valid and expected claims are trusted
Enforces account state at the middleware level
🔹 3. Audit Event Standardization

Problem:
Inconsistent audit event naming (ROLE_UPDATED vs ROLE_CHANGED) created potential issues for logging, querying, and analytics.

Fix Implemented:

Standardized event name to: ROLE_CHANGED
Updated all references across:
Service logic
Audit logging
Documentation

Why It Matters:

Ensures consistency across logs and systems
Prevents broken queries and monitoring pipelines
Improves maintainability and observability
🔹 4. Manual Security Validation (Negative Testing)

Enhancement:
Extended manual testing to include negative and adversarial scenarios:

Tampered JWT payload (invalid role)
Missing/invalid userId
isActive = false (deactivated user)
Missing/invalid token format
Revoked token usage

Why It Matters:

Validates system behavior under attack scenarios
Confirms security assumptions are enforced
Moves testing beyond happy-path validation
✅ Outcome

These fixes elevate the system from a functional implementation to a production-aware authentication service with:

Accurate health monitoring
Stronger security boundaries
Consistent audit logging
Verified behavior under failure and attack conditions

## 🧪 Testing (CI-Ready)

auth.login.test.js
- Implemented integration-style tests using Jest + Supertest
- Mocked PostgreSQL and Redis for isolated testing
- Bypassed infrastructure concerns (rate limiter) during tests
- Covered critical auth flows:
  - Successful login
  - Invalid credentials handling
- Verified audit logging and response correctness

Tests run without requiring external services.


