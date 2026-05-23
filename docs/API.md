# API Reference — Auth Service

Base URL (live): `http://52.7.155.214`
Base URL (local): `http://localhost:4000`

---

## Health Check

```bash
curl -i http://52.7.155.214/health
```

**Expected — 200:**
```json
{"status":"ok","postgres":"connected","redis":"connected","uptime":163,"timestamp":"..."}
```

---

## 1. Authentication Flow

### Register

```bash
curl -X POST http://52.7.155.214/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

**Expected — 201:**
```json
{"message":"User registered successfully","userId":"uuid"}
```

---

### Login

```bash
curl -X POST http://52.7.155.214/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

**Expected — 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

Copy both tokens — you'll need them for steps below.

---

### Access Protected Route

```bash
curl http://52.7.155.214/protected \
  -H "Authorization: Bearer <access-token>"
```

**Expected — 200:**
```json
{"message":"Access granted","user":{...}}
```

---

### Refresh Token Rotation

```bash
curl -X POST http://52.7.155.214/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```

**Expected — 200:**
```json
{"accessToken":"...","refreshToken":"...","expiresIn":900}
```

---

### Logout

```bash
curl -X POST http://52.7.155.214/auth/logout \
  -H "Authorization: Bearer <access-token>"
```

**Expected — 200:**
```json
{"message":"Logged out successfully"}
```

---

## 2. Security Scenarios

### Refresh Token Theft Detection

Use the old refresh token after rotation:

```bash
curl -X POST http://52.7.155.214/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<old-refresh-token>"}'
```

**Expected — 401:**
```json
{"error":"Invalid refresh token"}
```

All sessions for that user are immediately revoked.

---

### Access After Logout — Redis Blocklist Check

Use the access token after logging out:

```bash
curl http://52.7.155.214/protected \
  -H "Authorization: Bearer <revoked-access-token>"
```

**Expected — 401:**
```json
{"error":"Token revoked"}
```

---

### Refresh After Logout

Use the refresh token after logging out:

**Expected — 401** — token is revoked in DB.

---

## 3. RBAC Scenarios

### Viewer trying admin route

```bash
curl http://52.7.155.214/admin \
  -H "Authorization: Bearer <viewer-access-token>"
```

**Expected — 403:**
```json
{"error":"Forbidden"}
```

---

### Missing token

```bash
curl http://52.7.155.214/admin
```

**Expected — 401:**
```json
{"error":"Missing token"}
```

---

### Invalid token

```bash
curl http://52.7.155.214/admin \
  -H "Authorization: Bearer invalidtoken"
```

**Expected — 401:**
```json
{"error":"Invalid token"}
```

---

### Promote user to admin (DB step)

SSH into server and run:

```bash
sudo -u postgres psql -d auth_db
UPDATE users SET role = 'admin' WHERE email = 'test@example.com';
\q
```

Then login again to get a token with the updated role.

---

### Admin accessing admin route

```bash
curl http://52.7.155.214/admin \
  -H "Authorization: Bearer <admin-access-token>"
```

**Expected — 200:**
```json
{"message":"Admin access granted"}
```

---

## 4. Full User Management Walkthrough

This covers the complete admin flow: register → promote → manage → deactivate.

### Step 1 — Register two users

```bash
# User 1 (will become admin)
curl -X POST http://52.7.155.214/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Password123"}'

# User 2 (normal user)
curl -X POST http://52.7.155.214/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Password123"}'
```

---

### Step 2 — Login as admin user

```bash
curl -X POST http://52.7.155.214/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Password123"}'
```

Copy `accessToken` → save as `ADMIN_TOKEN`

---

### Step 3 — Promote to admin (DB step)

```bash
sudo -u postgres psql -d auth_db
UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';
\q
```

---

### Step 4 — Login again (get token with updated role)

```bash
curl -X POST http://52.7.155.214/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Password123"}'
```

Copy new `ADMIN_TOKEN`

---

### Step 5 — Login as normal user

```bash
curl -X POST http://52.7.155.214/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Password123"}'
```

Copy `accessToken` → save as `USER_TOKEN`

---

### Step 6 — Test /users/me

```bash
curl http://52.7.155.214/users/me \
  -H "Authorization: Bearer <USER_TOKEN>"
```

**Expected:** user email, `role = viewer`

---

### Step 7 — Test /users (admin vs viewer)

```bash
# With admin token — should return all users
curl http://52.7.155.214/users \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# With user token — should be forbidden
curl http://52.7.155.214/users \
  -H "Authorization: Bearer <USER_TOKEN>"
```

**Expected:** 200 for admin, 403 for viewer

---

### Step 8 — Update role

First get the user ID from Step 7, then:

```bash
curl -X PATCH http://52.7.155.214/users/<USER_ID>/role \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"role":"manager"}'
```

---

### Step 9 — Verify role update

Login again as user@test.com — new token should contain `role: manager`

---

### Step 10 — Deactivate user

```bash
curl -X DELETE http://52.7.155.214/users/<USER_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

### Step 11 — Try login after deactivation

```bash
curl -X POST http://52.7.155.214/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Password123"}'
```

**Expected — 401:**
```json
{"error":"Invalid credentials"}
```

---

### Step 12 — Try refresh after deactivation

Use any previously saved refresh token for the deactivated user.

**Expected — 401** — all tokens revoked on deactivation.

---

## 5. JWT Claims Validation

### Valid token (control test)

```bash
curl http://52.7.155.214/protected \
  -H "Authorization: Bearer <valid-access-token>"
```

**Expected — 200:**
```json
{"message":"Access granted","user":{...}}
```

---

### Tampered role

Modify token payload at [jwt.io](https://jwt.io) → set `"role": "superadmin"`:

```bash
curl http://52.7.155.214/protected \
  -H "Authorization: Bearer <tampered-token>"
```

**Expected — 401:**
```json
{"error":"Invalid token claims (role)"}
```

---

### Missing userId

Modify payload → remove `userId` or set to `"123"` (invalid UUID):

```bash
curl http://52.7.155.214/protected \
  -H "Authorization: Bearer <tampered-token>"
```

**Expected — 401:**
```json
{"error":"Invalid token claims (userId)"}
```

---

### Deactivated user in payload

Modify payload → set `"isActive": false`:

```bash
curl http://52.7.155.214/protected \
  -H "Authorization: Bearer <tampered-token>"
```

**Expected — 401:**
```json
{"error":"Account deactivated"}
```

---

### Invalid token format

```bash
curl http://52.7.155.214/protected \
  -H "Authorization: Bearer invalidtoken"
```

**Expected — 401:**
```json
{"error":"Invalid token"}
```

---

### Missing Authorization header

```bash
curl http://52.7.155.214/protected
```

**Expected — 401:**
```json
{"error":"Missing or invalid token format"}
```