# Authentication deployment notes

The application now uses short-lived access JWTs and rotating, database-backed refresh sessions.

## Backend environment variables

Set these on the backend service:

- `ACCESS_TOKEN_EXPIRE_MINUTES=15`
- `REFRESH_TOKEN_EXPIRE_DAYS=7`
- `AUTH_COOKIE_SECURE=true` in production (HTTPS is required)
- `AUTH_COOKIE_SAMESITE=lax` when the frontend and API are same-site
- `AUTH_COOKIE_SAMESITE=none` only when the frontend and API are genuinely cross-site; this requires `AUTH_COOKIE_SECURE=true`
- `FRONTEND_ORIGINS` to a comma-separated list of exact frontend origins, with no trailing slash
- `SECRET_KEY` to a strong, private random value

Keep `AUTH_COOKIE_SECURE=false` only for local HTTP development. Never use a wildcard frontend origin with credentialed CORS.

## Frontend environment variables

Set `VITE_API_BASE_URL` to the API base URL ending in `/api/v1`, for example:

```text
VITE_API_BASE_URL=https://your-api-host.example/api/v1
```

The browser must send credentialed requests to the API. The backend CORS allowlist must contain the exact frontend origin.

## Database migration

Run this from the backend directory against the target database before deploying the new backend:

```bash
alembic upgrade head
```

This creates the `refresh_tokens` table. Do not run the migration against production until a database backup exists and a restore has been tested.

## Session behavior

- Access tokens expire after 15 minutes.
- Refresh sessions have a seven-day sliding expiry and rotate on every refresh.
- Raw refresh tokens are only sent in an HttpOnly cookie; only SHA-256 hashes are stored in PostgreSQL.
- CSRF proof is derived using an HMAC tied to the current refresh token. The SPA retrieves it from `GET /auth/csrf` and sends it in `X-CSRF-Token`.
- Replaying a rotated refresh token revokes the complete token family.
- Logout revokes the current refresh-token family.
- Existing access tokens without the explicit `type=access` claim are rejected, so users must sign in again after this release.

## Before production student data

Test login, automatic refresh, token reuse detection, logout, inactive-user rejection, and migration rollback on a non-production database. Also complete role-based authorization, backup, and recovery testing before importing real student records.
