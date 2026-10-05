# Production Deployment Guide

## 1. Environment Checklist

Ensure the following variables are configured in your production environment (Vercel, AWS ECS, Docker, or Linux VPS):

```env
DATABASE_URL="postgresql://user:secure_password@postgres-host:5432/clinic_production?sslmode=require"
JWT_SECRET="generate-64-character-cryptographically-random-string"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://yourclinicdomain.com"
SESSION_COOKIE_NAME="clinic_auth_session"
```

## 2. Production Build Commands

```bash
# 1. Install production dependencies
npm ci --legacy-peer-deps

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply schema migrations
npx prisma migrate deploy

# 4. Build Next.js application
npm run build

# 5. Start production server
npm start
```

## 3. Database Hosting Options

Recommended PostgreSQL providers:
- AWS Aurora PostgreSQL / RDS
- Neon Database
- Supabase
- Google Cloud SQL for PostgreSQL
