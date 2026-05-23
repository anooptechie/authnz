# Auth Service

![CI/CD](https://github.com/anooptechie/authnz/actions/workflows/ci.yml/badge.svg)

A standalone, production-grade Authentication & Authorisation service built with Node.js, Express, PostgreSQL, and Redis. Designed to be consumed by any downstream service without duplicating auth logic.

**Live:** `http://52.7.155.214/health`

---

## What makes this non-trivial

This isn't a login endpoint bolted onto a tutorial. It's a complete identity layer:

- Refresh token rotation with **theft detection** — reuse of a rotated token triggers full session invalidation
- Redis JTI blocklist with **dynamic TTL** — access tokens revoked immediately on logout, zero wasted memory
- JWT **claims validation** after signature verification — prevents privilege escalation from structurally valid but malicious tokens
- SHA-256 hashing of refresh tokens before DB storage — a database breach exposes nothing usable
- Distributed rate limiting via an **external Rate Limiter Service** — decoupled, reusable across the entire ecosystem
- Full **audit log** covering every auth event including theft detection and admin actions
- **traceId propagation** across the async chain — every request is traceable end to end

---

## Table of Contents

- [Live Deployment](#live-deployment)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How to Run](#how-to-run)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Kubernetes](#kubernetes)
- [Infrastructure as Code](#infrastructure-as-code)
- [Security Design](#security-design)
- [Threat Model](#threat-model)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Consumer Integration](#consumer-integration)
- [Trade-offs & Future Work](#trade-offs--future-work)

---

## Live Deployment

The service is deployed and live on AWS EC2.

| | |
|---|---|
| **Health check** | `http://52.7.155.214/health` |
| **Base URL** | `http://52.7.155.214` |
| **Region** | ap-south-1 (Mumbai) |
| **Instance** | t3.small — 2 vCPU, 2GB RAM, 20GB gp3 |
| **OS** | Ubuntu 22.04 LTS |
| **Process manager** | PM2 |
| **Reverse proxy** | Nginx |

See [docs/API.md](docs/API.md) for full curl reference and test scenarios against the live server.

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
| Runtime | Node.js | Non-blocking I/O |
| Framework | Express.js | Minimal, unopinionated |
| Primary DB | PostgreSQL (pg) | ACID compliance for user and token data |
| Cache / Blocklist | Redis (ioredis) | O(1) blocklist lookups, native TTL |
| Password Hashing | bcrypt | Adaptive hashing, cost factor 12 |
| Token Signing | jsonwebtoken | JWT with HS256 |
| Logging | Pino | Structured JSON logging |
| Containerisation | Docker + Compose | One-command local startup |
| Testing | Jest + Supertest | Integration tests with mocked dependencies |
| CI/CD | GitHub Actions | Automated test + deploy pipeline |

---

## Project Structure

```
authnz/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.routes.js           # /register  /login  /logout  /refresh
│   │   │   └── user.routes.js           # /users/me  /users  /users/:id/role
│   │   └── middlewares/
│   │       ├── authenticate.js          # JWT verify + claims validation + blocklist check
│   │       ├── authorize.js             # Role check against allowedRoles
│   │       └── rateLimiter.js           # External rate limiter integration
│   ├── services/
│   │   ├── authService.js              # register, login, logout, refresh logic
│   │   └── tokenService.js             # issue, verify, rotate, revoke tokens
│   ├── models/
│   │   ├── user.model.js
│   │   ├── refreshToken.model.js
│   │   └── auditLog.model.js
│   ├── db/
│   │   ├── postgres.js
│   │   ├── redis.js
│   │   ├── migrate.js
│   │   └── migrations/
│   ├── config/
│   │   └── env.js                      # validates all env vars on startup
│   └── app.js
├── src/__tests__/                       # 7 test suites, 26 test cases
├── k8s/                                 # Kubernetes manifests
│   ├── deployment.yml
│   ├── service.yml
│   ├── secret.yml
│   ├── postgres.yml
│   └── redis.yml
├── docs/
│   └── API.md                          # Full curl reference + test scenarios
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml            # CI/CD pipeline
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

See [docs/API.md](docs/API.md) for curl commands and test scenarios.

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

### Observability

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Dependency-aware health check — returns 503 on degraded state |

---

## Deployment

The service is deployed to AWS EC2 with a fully automated CI/CD pipeline.

**Stack:**
- EC2 t3.small (Mumbai) — Ubuntu 22.04
- Nginx reverse proxy on port 80 → Node.js on port 4000
- PM2 for process management and auto-restart on reboot
- GitHub Actions — runs tests on every push, deploys to EC2 on merge to main

**Deploy flow:**
```
git push origin main
        ↓
GitHub Actions runs tests
        ↓
Tests pass → SSH into EC2 → git pull → npm ci → pm2 restart
        ↓
Live at http://52.7.155.214
```

---

## Kubernetes

The service is containerized with Docker and includes Kubernetes manifests for deployment to a cluster.

```bash
# Build image inside minikube
eval $(minikube docker-env)
docker build -t auth-service:latest .

# Apply all manifests
kubectl apply -f k8s/

# Run migrations inside the pod
kubectl exec -it deployment/auth-service -- node src/db/migrate.js

# Check health
kubectl get pods
```

Manifests in `k8s/` cover: Deployment, Service (NodePort), Secret, Postgres, Redis.

---

## Infrastructure as Code

Server provisioning is automated with Ansible. A single playbook takes a blank Ubuntu server to a fully configured production environment.

```bash
ansible-playbook playbook.yml -i inventory.ini
```

See [authnz-infrastructure](https://github.com/anooptechie/authnz-infrastructure) for the full playbook.

---

## Security Design

| Decision | Reason |
|---|---|
| bcrypt cost factor 12 | ~300ms per hash. Adaptive to hardware. |
| 15-minute access tokens | Short expiry limits blast radius of token theft |
| Refresh tokens stored as SHA-256 hash | DB breach exposes nothing usable |
| JTI in every access token | Per-token revocation without invalidating all sessions |
| `isActive` in JWT payload | Consumer middleware rejects deactivated users without a DB call |
| Refresh token rotation on every use | Reuse detection triggers full session invalidation |
| Redis blocklist keyed by JTI | O(1) lookup. TTL = remaining token lifetime. Self-cleaning. |
| 401 for both wrong password and unknown email | Never reveal whether an email exists |
| UUID user IDs | Prevents user enumeration |

---

## Threat Model

| Threat | Status | Mitigation |
|---|---|---|
| Brute force login | ✅ Mitigated | Rate limiting — 10 attempts / 15 min per IP |
| Refresh token theft | ✅ Mitigated | Rotation + reuse detection + full session invalidation |
| Database breach | ✅ Mitigated | bcrypt passwords + SHA-256 refresh token hashes |
| Privilege escalation via forged JWT | ✅ Mitigated | Claims validation — role, userId, isActive all verified |
| Replay attacks | ✅ Mitigated | One-time-use refresh tokens |
| User enumeration | ✅ Mitigated | Identical 401 for wrong password and unknown email |
| Stale access token after deactivation | ⚠️ Partial | isActive in JWT. Stale up to 15 min. Full fix: blocklist JTI on deactivation. |
| Compromised consumer service | ⚠️ Noted | Shared JWT_SECRET. Upgrade path: RS256 + JWKS endpoint. |

---

## Testing

Integration-style tests using Jest and Supertest. All external dependencies mocked — no real DB or Redis required.

```bash
npm test
```

**7 test suites — 26 test cases — full authentication lifecycle covered**

| Suite | Coverage |
|---|---|
| `auth.register.test.js` | Registration, validation, duplicate detection |
| `auth.login.test.js` | Login, token issuance, audit events |
| `auth.refresh.test.js` | Rotation, theft detection |
| `auth.logout.test.js` | Revocation, blocklist |
| `middleware.authenticate.test.js` | JWT verification, claims validation |
| `middleware.authorize.test.js` | RBAC role enforcement |
| `users.test.js` | User management routes |

---

## CI/CD Pipeline

GitHub Actions runs on every push to `main` and every pull request.

```
Push to main
      ↓
Run test suite (Jest + Supertest)
      ↓
Tests pass → SSH into EC2 → git pull → npm ci → pm2 restart
      ↓
Live at http://52.7.155.214
```

No external services required in CI — PostgreSQL and Redis fully mocked.

---

## Consumer Integration

To integrate into any downstream service:

**1. Copy two middleware files:**
```
src/api/middlewares/authenticate.js   (~20 lines)
src/api/middlewares/authorize.js      (~10 lines)
```

**2. Add to `.env`:**
```env
JWT_SECRET=same-value-as-auth-service
REDIS_HOST=localhost
REDIS_PORT=6379
```

**3. Use in routes:**
```javascript
router.get('/products',        authenticate,                        getProducts);
router.post('/products',       authenticate, authorize('manager'),  createProduct);
router.delete('/products/:id', authenticate, authorize('admin'),    deleteProduct);
```

Auth Service does not need to be called at runtime. Verification is entirely local. Integration time: ~15 minutes.

---

## Trade-offs & Future Work

| What Is Not Built | Upgrade Path |
|---|---|
| RS256 / Asymmetric JWT | RS256 + JWKS endpoint. Only Auth holds private key. |
| OAuth2 / Social Login | `passport-google-oauth20`. Minimal changes to authService.js. |
| Email Verification | `email_verified` boolean. Block login until verified. |
| Prometheus Metrics | `prom-client`. Expose 5 metrics on port 4001. |
| Secrets Management | HashiCorp Vault or AWS Secrets Manager. |
| HTTPS | Certbot + domain. Nginx config already in place. |