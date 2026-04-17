# Auth Service

A standalone, production-grade Authentication & Authorisation service built with Node.js, Express, PostgreSQL, and Redis.

Designed to be consumed by any downstream service — Inventory, Notifications, or any future service — without duplicating auth logic.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [How to Run](#how-to-run)
- [API Reference](#api-reference)
- [Milestones](#milestones)
- [Security Design](#security-design)
- [Testing](#testing)
- [CI Pipeline](#ci-pipeline)
- [Consumer Integration](#consumer-integration)
- [Trade-offs & Future Work](#trade-offs--future-work)

---

## Project Overview

Most auth systems stop at login and JWT. This service goes further:

| Capability | Why It Matters |
|---|---|
| Refresh token rotation | Detects token theft automatically |
| Redis JTI blocklist | Invalidates access tokens immediately on logout |
| JWT claims validation | Prevents privilege escalation from malformed tokens |
| Role-Based Access Control | Enforced at middleware layer, not inside business logic |
| Full audit logging | Covers success events, failure events, and security events |
| Dependency-aware health check | Load balancers get accurate service state |
| traceId propagation | Every request is traceable across the entire system |

---

## Architecture

```
Client
  │
  │  POST /auth/login  ──►  Auth Service  ──►  Issues JWT (15min) + Refresh Token (7d)
  │
  │  GET /inventory    ──►  Inventory Service
  │                              │
  │                              │  authenticate middleware  →  verify JWT (shared secret)
  │                              │  authorize middleware     →  check role
  │                              │
  │                           Business Logic
```

**Key principle:** Consumer services never call Auth Service at runtime. They verify JWTs locally using a shared `JWT_SECRET`. The entire integration surface is two middleware files (~30 lines total).

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js | Non-blocking I/O, consistent with portfolio |
| Framework | Express.js | Minimal, unopinionated |
| Primary DB | PostgreSQL (pg) | ACID compliance for user and token data |
| Cache / Blocklist | Redis (ioredis) | O(1) blocklist lookups, native TTL |
| Password Hashing | bcrypt | Adaptive hashing, cost factor 12 |
| Token Signing | jsonwebtoken | JWT with HS256 |
| Logging | Pino | Structured JSON logging |
| Containerisation | Docker + Compose | One-command startup |
| Testing | Jest + Supertest | Integration tests with mocked dependencies |
| CI | GitHub Actions | Automated test runs on every push and PR |

---

## Project Structure

```
auth-service/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.routes.js           # /register  /login  /logout  /refresh
│   │   │   └── user.routes.js           # /users/me  /users  /users/:id/role
│   │   └── middlewares/
│   │       ├── authenticate.js          # JWT verify + claims validation + blocklist check
│   │       ├── authorize.js             # Role check against allowedRoles
│   │       └── rateLimiter.js           # Redis-backed rate limiter
│   ├── services/
│   │   ├── authService.js              # register, login, logout, refresh logic
│   │   └── tokenService.js             # issue, verify, rotate, revoke tokens
│   ├── models/
│   │   ├── user.model.js               # users table queries
│   │   ├── refreshToken.model.js       # refresh_tokens table queries
│   │   └── auditLog.model.js           # audit_logs table queries
│   ├── db/
│   │   ├── postgres.js                 # pg pool connection
│   │   ├── redis.js                    # ioredis client
│   │   ├── migrate.js                  # runs migrations in order
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_refresh_tokens.sql
│   │       ├── 003_create_audit_logs.sql
│   │       └── 004_create_indexes.sql
│   ├── config/
│   │   └── env.js                      # validates all env vars on startup
│   ├── utils/
│   │   ├── logger.js                   # Pino logger instance
│   │   └── traceId.js                  # assigns traceId to every request
│   └── app.js                          # Express app setup
├── src/__tests__/
│   ├── setup.js                        # global test setup, mocks
│   ├── auth.register.test.js
│   ├── auth.login.test.js
│   ├── auth.refresh.test.js
│   ├── auth.logout.test.js
│   ├── middleware.authenticate.test.js
│   ├── middleware.authorize.test.js
│   └── users.test.js
├── server.js                           # entry point
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` before running.

```env
PORT=4000
NODE_ENV=development

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=auth_user
POSTGRES_PASSWORD=auth_pass
POSTGRES_DB=auth_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key-minimum-32-characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
```

---

## How to Run

**1. Start infrastructure**
```bash
docker compose up -d
```

**2. Run database migrations**
```bash
node src/db/migrate.js
```

**3. Start the server**
```bash
node server.js
```

Server runs on `http://localhost:4000`

---

## API Reference

### Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register a new user |
| POST | `/auth/login` | None | Login, receive access + refresh token |
| POST | `/auth/refresh` | Refresh token in body | Rotate refresh token, get new access token |
| POST | `/auth/logout` | Bearer token | Revoke tokens, blocklist access token |

### User Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Any authenticated | Current user profile from JWT |
| GET | `/users` | Admin only | Paginated user list |
| PATCH | `/users/:id/role` | Admin only | Update a user's role |
| DELETE | `/users/:id` | Admin only | Soft-delete user, revoke all tokens |

### Observability Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Dependency-aware health check |

---

## Milestones

### Milestone 1 — Infrastructure

- Docker setup: PostgreSQL + Redis
- Environment configuration with startup validation (`env.js`)
- PostgreSQL connection pool (`pg`)
- Redis client (`ioredis`) with error handling
- Migration system — runs `.sql` files in order
- Database tables: `users`, `refresh_tokens`, `audit_logs`
- Performance indexes on all lookup columns

---

### Milestone 2 — User Registration

**Endpoint:** `POST /auth/register`

**Features:**
- Email format validation
- Password strength check (min 8 chars + at least one number)
- Duplicate email detection
- Password hashed with `bcrypt` (async, cost factor 12)
- Clean layered architecture: Route → Service → Model → DB
- No sensitive data returned in response

**Request**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Responses**

| Status | Condition | Body |
|---|---|---|
| 201 | Success | `{ "message": "User registered successfully", "userId": "uuid" }` |
| 400 | Invalid input | `{ "error": "Invalid email format" }` |
| 409 | Duplicate email | `{ "error": "Email already registered" }` |

---

### Milestone 3 — Login + Access Token

**Endpoint:** `POST /auth/login`

**Features:**
- Credential validation using `bcrypt.compare` (async)
- No information leakage — identical 401 for wrong password and unknown email
- JWT access token issued with full payload
- Token payload: `userId`, `email`, `role`, `isActive`, `jti`
- All JWT logic centralised in `tokenService.js`
- Audit events: `LOGIN`, `LOGIN_FAILED`
- Metadata captured: IP address, User-Agent

**Request**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Responses**

| Status | Condition | Body |
|---|---|---|
| 200 | Success | `{ "accessToken": "eyJ...", "refreshToken": "...", "tokenType": "Bearer", "expiresIn": 900 }` |
| 401 | Wrong credentials | `{ "error": "Invalid credentials" }` |
| 401 | Deactivated account | `{ "error": "Invalid credentials" }` |

**JWT Payload Structure**
```json
{
  "userId":   "uuid",
  "email":    "user@example.com",
  "role":     "viewer",
  "isActive": true,
  "jti":      "unique-token-id",
  "iat":      1234567890,
  "exp":      1234568790
}
```

---

### Milestone 4 — Refresh Token System

**Endpoint:** `POST /auth/refresh`

**Features:**
- Refresh token generated with `crypto.randomBytes(64)`
- Stored as SHA-256 hash in PostgreSQL — no plaintext storage
- Token rotation on every `/auth/refresh` call
- One-time-use model — prevents replay attacks
- Theft detection: reuse of a rotated token triggers full session invalidation
- Audit events: `TOKEN_REFRESH`, `TOKEN_THEFT_DETECTED`

**Rotation Flow**
```
Incoming refresh token
  → Hash it (SHA-256)
  → Lookup hash in DB
  → If revoked → THEFT DETECTED → revoke ALL user tokens → 401
  → If expired → 401
  → Revoke old token
  → Issue new access token + new refresh token
  → Store new hash in DB
  → Return new pair
```

**Request**
```json
{
  "refreshToken": "your-refresh-token"
}
```

**Responses**

| Status | Condition | Body |
|---|---|---|
| 200 | Success | `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 900 }` |
| 401 | Invalid / revoked / expired | `{ "error": "Invalid refresh token" }` |

---

### Milestone 5 — Logout + Token Revocation

**Endpoint:** `POST /auth/logout`

**Features:**
- Refresh token revoked in PostgreSQL (set `revoked = true`)
- Access token JTI blocklisted in Redis with dynamic TTL
- TTL = remaining lifetime of the access token — no wasted Redis memory
- Protected routes reject blocklisted tokens immediately
- Audit event: `LOGOUT`

**Request**
```http
POST /auth/logout
Authorization: Bearer <access-token>
Body: { "refreshToken": "..." }
```

**Responses**

| Status | Condition | Body |
|---|---|---|
| 200 | Success | `{ "message": "Logged out successfully" }` |
| 401 | Invalid token | `{ "error": "Invalid token" }` |

---

### Milestone 6 — Role-Based Access Control (RBAC)

**Features:**
- `authorize(...roles)` factory middleware for route-level access control
- Role checked against `req.user.role` from JWT payload
- All access control declared at the routing layer — not inside controllers
- Three roles: `admin`, `manager`, `viewer`

**Middleware Composition**
```javascript
// Admin only
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);

// Admin or manager
router.patch('/stock', authenticate, authorize('admin', 'manager'), updateStock);

// Any authenticated user
router.get('/me', authenticate, getProfile);
```

**Behaviour**

| Role | Admin route | Admin+Manager route | Any auth route |
|---|---|---|---|
| admin | ✅ 200 | ✅ 200 | ✅ 200 |
| manager | ❌ 403 | ✅ 200 | ✅ 200 |
| viewer | ❌ 403 | ❌ 403 | ✅ 200 |
| No token | ❌ 401 | ❌ 401 | ❌ 401 |

---

### Milestone 7 — Structured Logging

**Features:**
- Structured JSON logging using Pino
- Request/response logging via `pino-http` middleware
- Contextual metadata on every log: `userId`, `action`, `ip`, `traceId`
- Resilient audit logging — failures do not affect the main request flow
- Service-level logging for all auth events

**Example Log**
```json
{
  "level": 30,
  "time": "2026-04-05T10:00:00.000Z",
  "traceId": "b3f1c2d4-...",
  "userId": "uuid",
  "action": "LOGIN",
  "msg": "Login successful"
}
```

---

### Milestone 8 — Rate Limiting

**Features:**
- Redis-backed rate limiting — distributed, survives server restarts
- IP-based throttling per endpoint
- Returns `429` with `Retry-After` header
- Rate limiter disabled in test environment

**Configuration**

| Endpoint | Limit | Window | Purpose |
|---|---|---|---|
| `/auth/login` | 5 requests | 15 minutes | Brute force protection |
| `/auth/register` | 3 requests | 15 minutes | Spam account prevention |
| `/auth/refresh` | 10 requests | 15 minutes | Refresh endpoint abuse protection |

**Response**
```json
{
  "error": "Too many requests, please try again later"
}
```

---

Architectural Evolution of the Rate Limit Implementation

🔒 Milestone 8 — Rate Limiting (Distributed)
🎯 Overview

Rate limiting is implemented using an external Rate Limiter Service, replacing the previous in-app Redis-based throttling.

This enables:

Distributed rate limiting across services
Centralized control of traffic policies
Better scalability and observability
Decoupling from authentication logic

⚙️ Key Features
✅ External Rate Limiter Service integration (via HTTP)
✅ Token Bucket algorithm for smoother traffic handling
✅ User-aware rate limiting (email + IP)
✅ Protection against brute-force and abuse
✅ Returns 429 Too Many Requests with retry hints
✅ Fail-open strategy to ensure system availability
✅ Rate limiting applied before authentication logic

🧠 Rate Limiting Strategy
🔑 Key Design
login:${normalizedEmail}:${ip}
Prevents brute-force attacks per user
Avoids blocking users behind shared IPs
Ensures isolation between users

🔄 Email Normalization
email → lowercase + trimmed

Prevents bypass such as:

Test@Email.com ≠ test@email.com
⚡ Algorithm Used
Token Bucket

Why Token Bucket?

Allows short bursts (better UX for login attempts)
Prevents sustained abuse
Models real-world user behavior

📊 Configuration
Endpoint	Limit	Window	Algorithm	Purpose
/auth/login	10 requests	15 minutes	Token Bucket	Brute-force protection

Note: Other endpoints (register, refresh) still use internal rate limiting (can be migrated later)

🔁 Request Flow
Client
   ↓
Auth Service (/login)
   ↓
Input Validation
   ↓
Rate Limiter Service (/check)
   ↓
Decision (allowed / blocked)
   ↓
Authentication Logic (DB, JWT)

🚫 Blocking Behavior

When limit is exceeded:

{
  "error": "Too many login attempts",
  "retryAfter": 120
}
HTTP Status: 429
Includes retry hint from Rate Limiter Service

🛡️ Fail-Open Strategy (Critical)

If the Rate Limiter Service is unavailable:

Request is allowed
Why?
Prevents user-facing outages
Ensures authentication availability
Avoids cascading failures

⚙️ Execution Order
1. Validate request (email, password)
2. Apply rate limiting
3. Execute authentication logic
Why this order?
Avoids consuming tokens for invalid requests
Reduces unnecessary load on Rate Limiter
Protects database from abuse

🧪 Validation & Testing
✅ Multiple users tested → no cross-user blocking
✅ Excess requests → correctly return 429
✅ Token bucket behavior verified (burst + refill)
✅ Fail-open tested by stopping Rate Limiter Service
✅ Integration verified via logs (Auth ↔ Rate Limiter)

🔥 Key Improvements Over Previous Approach
Feature	Old (In-App Redis)	New (Rate Limiter Service)
Scope	Single service	Distributed
Scalability	Limited	High
Reusability	Low	High
Observability	Basic	Centralized
Failure Handling	Fail-closed	Fail-open
Algorithm	Fixed	Token Bucket

🚀 Outcome

This upgrade transforms rate limiting from:

"Middleware inside auth service"

to:

"A distributed, production-ready rate limiting system"

🔍 End-to-End Trace Propagation

🎯 Overview

The Authentication Service implements distributed trace propagation to enable end-to-end request tracking across services.

Each incoming request is assigned a unique traceId, which is propagated to downstream services (Rate Limiter Service) via HTTP headers.

⚙️ How It Works
1. Trace ID Generation (Entry Point)

📁 src/api/middlewares/traceId.js

If client provides x-trace-id → reuse it
Otherwise → generate a new UUID
traceId = incoming header || randomUUID()
2. Attach to Request Context
Stored as:
req.traceId
Added to response headers:
X-Trace-Id: <traceId>

3. Propagation to Rate Limiter Service

📁 rateLimitClient.js

headers: {
  "x-trace-id": traceId
}
Ensures downstream services receive the same traceId
4. Logging

All logs include:

traceId

Example:

traceId: "7fe9215e-daf2-4e36-8e5d-7f5bcf0b7718"

🔁 Request Flow
Client
   ↓ (optional x-trace-id)
Auth Service (traceId middleware)
   ↓ (propagates x-trace-id)
Rate Limiter Service

🧪 Validation
Verified that same traceId appears in:
Auth Service logs
Rate Limiter logs
Response headers

🧠 Key Design Principle

Trace ID is generated once at the system entry point and reused across all services.

🚀 Benefits
Enables debugging across services
Correlates logs for a single request
Improves observability in distributed systems
Forms the foundation for OpenTelemetry-style tracing

---

### Milestone 9 — User Management APIs

**Endpoints:**

| Route | Auth | Description |
|---|---|---|
| `GET /users/me` | Any authenticated | Returns user profile from JWT — no DB call |
| `GET /users` | Admin only | Paginated user list. Never returns `password_hash`. |
| `PATCH /users/:id/role` | Admin only | Updates role. Validates new role is a known value. |
| `DELETE /users/:id` | Admin only | Soft-delete + revoke all refresh tokens + audit log |

**Audit Events:** `ROLE_CHANGED`, `USER_DEACTIVATED`

**Soft Delete Behaviour:**
- Sets `is_active = false` in PostgreSQL
- Revokes all refresh tokens for the user
- `isActive` in JWT payload causes consumer middleware to reject deactivated users
- For immediate enforcement: current access token JTI is blocklisted in Redis

---

### Milestone 10 — Health Check + TraceId

**Health Check**

`GET /health` actively verifies dependencies at runtime:

```javascript
// PostgreSQL: SELECT 1
// Redis: PING
```

| Scenario | HTTP Status | Response |
|---|---|---|
| All healthy | 200 | `{ "status": "ok", "postgres": "connected", "redis": "connected", "uptime": 123 }` |
| Dependency down | 503 | `{ "status": "degraded", "postgres": "connected", "redis": "disconnected" }` |

Returning `503` (not `200`) on degraded state is intentional — load balancers use HTTP status codes, not response bodies, to route traffic.

**TraceId Middleware**
- Unique UUID generated per request
- Accepts `X-Trace-Id` header if provided by upstream (for cross-service tracing)
- Attached to `req.traceId`, response header `X-Trace-Id`, and all Pino log lines

**Example Log**
```json
{
  "level": 30,
  "traceId": "b3f1c2d4-e5f6-...",
  "msg": "request completed"
}
```

---

### Production Readiness Improvements

After initial implementation, four targeted fixes were applied to close production-level gaps:

**1. Health Check — Dependency Awareness**
The original `/health` always returned `ok` regardless of system state. Fix: active `SELECT 1` + `PING` checks. Returns `503` on degraded state.

**2. JWT Claims Validation — Security Hardening**
JWT signature verification alone is insufficient — a structurally valid token with a forged `role: admin` would pass. Fix: explicit post-verification checks on `userId` (UUID format), `role` (known value), and `isActive` (must be `true`).

**3. Audit Event Standardisation**
`ROLE_UPDATED` renamed to `ROLE_CHANGED` for consistency across service logic, audit logging, and documentation.

**4. Adversarial Manual Testing**
Extended manual testing to include negative and attack scenarios: tampered JWT payload, invalid role, deactivated user, revoked token, missing token format.

---

## Security Design

| Decision | Reason |
|---|---|
| bcrypt cost factor 12 | Adaptive — computation scales with hardware. ~300ms per hash. |
| 15-minute access tokens | Short expiry limits blast radius of token theft |
| Refresh tokens stored as SHA-256 hash | DB breach does not expose live tokens |
| JTI in every access token | Enables per-token revocation without invalidating all user tokens |
| `isActive` in JWT payload | Consumer middleware rejects deactivated users without a DB call |
| Refresh token rotation on every use | Reuse detection — triggers full session invalidation |
| Redis blocklist keyed by JTI | O(1) lookup. TTL = remaining token lifetime. Self-cleaning. |
| 401 for both wrong password and unknown email | Never reveal whether an email exists in the system |
| UUID user IDs | Prevents user enumeration — no sequential IDs to guess |
| Rate limiting on /login, /register, /refresh | Protects all auth entry points from brute force |

**HS256 vs RS256 — The Key Trade-off**

This service uses HS256 (symmetric signing) where all services share `JWT_SECRET`. This is correct for an internal ecosystem where all services are owned and operated together.

For a Zero-Trust architecture or multi-team ownership, the upgrade path is RS256 — Auth Service holds the private key, consumer services verify with the public key via a JWKS endpoint. A compromised consumer service cannot forge tokens.

---

## Threat Model

Explicitly documenting what is and isn't mitigated is a sign of
engineering maturity. Security is about trade-offs, not perfection.

| Threat | Status | Mitigation |
|---|---|---|
| Brute force login | ✅ Mitigated | Redis-backed rate limiting on /login (5 attempts / 15 min per IP) |
| Brute force registration | ✅ Mitigated | Rate limiting on /register (3 attempts / 15 min per IP) |
| Refresh token abuse | ✅ Mitigated | Rate limiting on /refresh (10 attempts / 15 min per IP) |
| Token theft (refresh) | ✅ Mitigated | Rotation detects reuse — full session invalidation + TOKEN_THEFT_DETECTED audit event |
| Token theft (access) | ✅ Mitigated | Short 15-minute expiry limits blast radius. JTI blocklist for immediate revocation on logout. |
| Database breach | ✅ Mitigated | Passwords hashed with bcrypt (cost 12). Refresh tokens stored as SHA-256 hashes. Raw credentials never persisted. |
| Privilege escalation via forged JWT | ✅ Mitigated | Claims validation — role must be a known value, userId must be valid UUID, isActive must be true |
| Replay attacks | ✅ Mitigated | One-time-use refresh tokens. Rotated on every use. Reuse triggers theft detection. |
| User enumeration via login | ✅ Mitigated | Identical 401 response for wrong password and unknown email |
| User enumeration via IDs | ✅ Mitigated | UUID primary keys — no sequential IDs to guess |
| Stale access token after deactivation | ⚠️ Partially mitigated | isActive in JWT payload rejected by middleware. Stale for up to 15 min. Full mitigation: blocklist JTI on deactivation. |
| XSS token theft | ⚠️ Noted | Tokens stored in client memory / Authorization header. httpOnly cookies would eliminate this vector. Accepted trade-off for stateless API design. |
| Concurrent refresh token requests | ⚠️ Noted | Race condition possible if two requests arrive simultaneously before revocation. Fix: SELECT FOR UPDATE in DB transaction. Documented as known improvement. |
| Compromised consumer service (HS256) | ⚠️ Noted | Shared JWT_SECRET exposed if a consumer is compromised. Upgrade path: RS256 — only Auth Service holds private key. Consumers verify via public key / JWKS endpoint. |
| Secrets exposed in environment | ⚠️ Noted | JWT_SECRET stored in .env. Production upgrade: HashiCorp Vault or AWS Secrets Manager. |
| Session fixation | ✅ Mitigated | New refresh token issued on every login. Old tokens expire independently. |
| Man-in-the-middle | ✅ Mitigated (infra) | HTTPS enforced at API Gateway / Nginx layer. Tokens encrypted in transit. |
| Mass account creation | ✅ Mitigated | Rate limiting on /register. Email uniqueness enforced at DB level. |
| Admin privilege abuse | ✅ Mitigated | All admin actions audit logged with adminId, targetUserId, IP, and timestamp |

---

## Audit Log — Complete Event Reference

| Event | Trigger | Key Metadata |
|---|---|---|
| `LOGIN` | Successful login | userId, ip, userAgent |
| `LOGIN_FAILED` | Wrong password / unknown email / deactivated | email, ip, reason |
| `LOGOUT` | POST /auth/logout | userId, ip, jti blocklisted |
| `TOKEN_REFRESH` | Successful rotation | userId, ip |
| `TOKEN_THEFT_DETECTED` | Rotated token reused | userId, ip, allSessionsRevoked: true |
| `ROLE_CHANGED` | Admin updates role | targetUserId, oldRole, newRole, adminId |
| `USER_DEACTIVATED` | Admin soft-deletes user | targetUserId, adminId, ip |

---

## Testing

Integration-style tests using **Jest** and **Supertest**. Tests simulate real HTTP requests across the full application stack.

All external dependencies are mocked — no real DB or Redis required to run tests.

```
src/__tests__/
├── setup.js                        # global mocks — Redis (in-memory Map), PostgreSQL (jest.mock)
├── auth.register.test.js           # registration flow
├── auth.login.test.js              # login, token issuance, audit events
├── auth.refresh.test.js            # rotation, theft detection
├── auth.logout.test.js             # revocation, blocklist
├── middleware.authenticate.test.js # JWT verification, claims validation
├── middleware.authorize.test.js    # RBAC role enforcement
└── users.test.js                   # user management routes
```

### Test Environment
- `NODE_ENV=test`
- Rate limiter disabled
- PostgreSQL mocked via `jest.mock()`
- Redis mocked via in-memory `Map`

### Test Suite — Full Coverage

---

#### 1. Registration Tests (`auth.register.test.js`)

| # | Test Case | Expected |
|---|---|---|
| 1 | Valid email and password | 201 + `userId` returned |
| 2 | Duplicate email | 409 Conflict |
| 3 | Missing email field | 400 Bad Request |
| 4 | Invalid email format | 400 Bad Request |
| 5 | Password shorter than 8 characters | 400 Bad Request |
| 6 | Password with no numbers | 400 Bad Request |
| 7 | Password hash not stored in plaintext | `password_hash` !== original password |

---

#### 2. Login Tests (`auth.login.test.js`)

| # | Test Case | Expected |
|---|---|---|
| 1 | Valid credentials | 200 + `accessToken` + `refreshToken` |
| 2 | Wrong password | 401. Same message as unknown email. |
| 3 | Unknown email | 401. Same message as wrong password. |
| 4 | Deactivated account | 401 + `LOGIN_FAILED` audit log written |
| 5 | Missing password field | 400 Bad Request |
| 6 | JWT payload contains `userId` | Confirmed present |
| 7 | JWT payload contains `role` | Confirmed present |
| 8 | JWT payload contains `isActive` | Confirmed `true` |
| 9 | JWT payload contains `jti` | Confirmed present |
| 10 | `LOGIN` audit event written on success | Confirmed in DB |
| 11 | `LOGIN_FAILED` audit event written on failure | Confirmed in DB |

---

#### 3. Refresh Token Tests (`auth.refresh.test.js`)

| # | Test Case | Expected |
|---|---|---|
| 1 | Valid refresh token | 200 + new `accessToken` + new `refreshToken` |
| 2 | Old (rotated) token reused | 401 + all user tokens revoked |
| 3 | `TOKEN_THEFT_DETECTED` audit event on reuse | Confirmed written |
| 4 | Revoked token | 401 |
| 5 | Expired token | 401 |
| 6 | Completely fake / invalid token | 401 |
| 7 | New refresh token works after rotation | 200 — confirms rotation chain |

---

#### 4. Logout Tests (`auth.logout.test.js`)

| # | Test Case | Expected |
|---|---|---|
| 1 | Valid logout | 200 + `"Logged out successfully"` |
| 2 | Access token rejected after logout | 401 — blocklist check working |
| 3 | Refresh token rejected after logout | 401 — revoked in DB |
| 4 | Logout without Authorization header | 401 |
| 5 | Logout with invalid access token | 401 |
| 6 | `LOGOUT` audit event written | Confirmed written |

---

#### 5. Authenticate Middleware Tests (`middleware.authenticate.test.js`)

| # | Test Case | Expected |
|---|---|---|
| 1 | Valid token | `req.user` populated, `next()` called |
| 2 | No Authorization header | 401 |
| 3 | Malformed header (no Bearer prefix) | 401 |
| 4 | Expired token | 401 — `"Token expired"` |
| 5 | Tampered signature | 401 — `"Invalid token"` |
| 6 | Blocklisted JTI | 401 — `"Token has been revoked"` |
| 7 | Token with unknown role value | 401 — claims validation |
| 8 | Token with `isActive = false` | 401 — `"Account deactivated"` |
| 9 | Token with missing `userId` | 401 — claims validation |
| 10 | Token with invalid UUID format for `userId` | 401 — claims validation |

---

#### 6. Authorize Middleware Tests (`middleware.authorize.test.js`)

| # | Test Case | Expected |
|---|---|---|
| 1 | Admin hits admin-only route | Passes — `next()` called |
| 2 | Viewer hits admin-only route | 403 Forbidden |
| 3 | Manager hits admin-only route | 403 Forbidden |
| 4 | Manager hits admin+manager route | Passes |
| 5 | Viewer hits admin+manager route | 403 Forbidden |
| 6 | Admin hits admin+manager route | Passes |
| 7 | Any authenticated user hits open route | Passes |
| 8 | No `req.user` (authenticate skipped) | 401 Unauthorized |

---

#### 7. User Management Tests (`users.test.js`)

| # | Test Case | Expected |
|---|---|---|
| 1 | `GET /users/me` with valid token | 200 + user profile from JWT payload |
| 2 | `GET /users` with admin token | 200 + paginated user list |
| 3 | `GET /users` with viewer token | 403 Forbidden |
| 4 | `GET /users` response never includes `password_hash` | Confirmed absent |
| 5 | `PATCH /users/:id/role` with valid role | 200 + `ROLE_CHANGED` audit log |
| 6 | `PATCH /users/:id/role` with invalid role value | 400 Bad Request |
| 7 | `PATCH /users/:id/role` by non-admin | 403 Forbidden |
| 8 | Admin cannot deactivate themselves | 400 Bad Request |
| 9 | `DELETE /users/:id` — `is_active` set to false | Confirmed in DB |
| 10 | `DELETE /users/:id` — all refresh tokens revoked | Confirmed in DB |
| 11 | `DELETE /users/:id` — `USER_DEACTIVATED` audit log written | Confirmed written |
| 12 | Login as deactivated user | 401 |

---

### Run Tests

```bash
npm test
```

**Outcome:** 7 test suites — 60+ test cases — full authentication lifecycle covered — CI-ready.

---

## CI Pipeline

GitHub Actions pipeline runs on every push to `main` and every pull request.

```
.github/workflows/ci.yml
```

**Workflow Steps:**
1. Checkout repository
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Run test suite (`npm test`)

**Environment in CI:**
- `NODE_ENV=test`
- `JWT_SECRET` set to a test-only value
- PostgreSQL and Redis fully mocked
- Rate limiter disabled

No external services required. Tests are deterministic and isolated.

```
Developer Push → GitHub Actions → npm ci → npm test → Pass / Fail
```

---

## Consumer Integration

To integrate Auth Service into any downstream service (e.g. Inventory):

**Step 1** — Copy two middleware files:
```
src/api/middlewares/authenticate.js   (~20 lines)
src/api/middlewares/authorize.js      (~10 lines)
```

**Step 2** — Add to `.env`:
```env
JWT_SECRET=same-value-as-auth-service
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Step 3** — Use in routes:
```javascript
const authenticate = require('./middlewares/authenticate');
const authorize    = require('./middlewares/authorize');

router.get('/products',      authenticate,                          getProducts);
router.post('/products',     authenticate, authorize('manager'),    createProduct);
router.delete('/products/:id', authenticate, authorize('admin'),    deleteProduct);
```

Auth Service does **not** need to be called at runtime by consumer services. Token verification is entirely local. Total integration time: ~15 minutes.

---

## Trade-offs & Future Work

| What Is Not Built | Reason | Upgrade Path |
|---|---|---|
| RS256 / Asymmetric JWT | HS256 is correct for internal services you own. Simpler. | Move to RS256 + JWKS endpoint. Only Auth holds private key. |
| OAuth2 / Social Login | Core token lifecycle is more important to demonstrate first. | Add `passport-google-oauth20`. Minimal changes to authService.js. |
| Session / Device Management | Single active session is sufficient for scope. | Add `sessions` table. Refresh tokens become session-scoped. |
| Email Verification | Requires SMTP integration and token storage. | Add `email_verified` boolean. Block login until verified. |
| Password Reset Flow | Core flow must be solid first. | Add `password_reset_tokens` table. Two new endpoints. |
| Prometheus Metrics | Deferred to align with full ecosystem metrics rollout. | Add `prom-client`. Expose 5 metrics on port 4001. |
| Secrets Management | `.env` is acceptable for local and portfolio context. | HashiCorp Vault or AWS Secrets Manager in production. |

---

## Tech Stack Summary

```
Node.js + Express  →  PostgreSQL  →  Redis
                              ↓
                    bcrypt  jsonwebtoken  crypto
                              ↓
                    Pino  pino-http  traceId
                              ↓
                    Jest  Supertest  GitHub Actions
```