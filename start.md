1. # stop everything
docker compose down

# optional cleanup
docker rm -f auth_postgres auth_redis
docker volume prune -f

# start fresh
docker compose up -d
node src/db/migrate.js
node server.js

2. Directly enter Postgres using this command
Query 1
docker exec -it auth_postgres psql -U auth_user -d auth_db

Query 2
SELECT action, metadata 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 5;

Query 3
SELECT id, email, role, is_active FROM users;

3. 1️⃣ User Registration
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

4. RBAC
Step 2 — Login
curl -X POST http://localhost:4000/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com","password":"Password123"}'

👉 Copy accessToken

Step 3 — Access admin route
curl http://localhost:4000/admin \
-H "Authorization: Bearer <access-token>"
Expected Response
{
  "error": "Forbidden"
}

👉 Confirms that viewer cannot access admin resources

3️⃣ Test Case: Admin Access (Allowed)
Step 1 — Update role to admin
UPDATE users SET role = 'admin' WHERE email = 'test@example.com';
Step 2 — Login again (IMPORTANT)
curl -X POST http://localhost:4000/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com","password":"Password123"}'

👉 Copy new accessToken

Step 3 — Access admin route
curl http://localhost:4000/admin \
-H "Authorization: Bearer <access-token>"
Expected Response
{
  "message": "Admin access granted"
}

👉 Confirms that admin role is authorized

4️⃣ Test Case: Missing Token
curl http://localhost:4000/admin
Expected Response
{
  "error": "Missing token"
}
5️⃣ Test Case: Invalid Token
curl http://localhost:4000/admin \
-H "Authorization: Bearer invalidtoken"
Expected Response
{
  "error": "Invalid token"
}
✅ RBAC Verification Summary
Viewer → ❌ denied access to admin routes
Admin → ✅ granted access
Missing token → ❌ rejected
Invalid token → ❌ rejected

👉 Confirms correct implementation of:

Authentication (JWT validation)
Authorization (role-based access control)

