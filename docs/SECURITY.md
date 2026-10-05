# Security & Hardening Architecture

## 1. Authentication & Session Security

- **Password Hashing**: `bcryptjs` using 12 salt rounds.
- **Session Tokens**: Stateless signed JWTs using `jose` with HS256 algorithm and 7-day expiration.
- **Cookies**: HTTP-only, SameSite=Lax, Secure in production, Path=/.
- **Password Reset**: Cryptographic random hex tokens (256-bit entropy) hashed with SHA-256 prior to database storage, 1-hour expiration, and enumeration prevention (uniform response regardless of email existence).

## 2. Security Headers

The edge middleware and reverse proxy enforce standard HTTP security headers:
- `X-Frame-Options: DENY` (clickjacking defense)
- `X-Content-Type-Options: nosniff` (MIME confusion defense)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-XSS-Protection: 1; mode=block`

## 3. Compliance & Audit Logging

All administrative, medical staff, and authentication events are logged into the immutable `AuditLog` table.
