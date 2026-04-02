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
-d '{"email":"test@example.com","password":"Password123"}'

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



  