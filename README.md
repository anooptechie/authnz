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