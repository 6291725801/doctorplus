# Local Setup & Developer Guide

## Prerequisites

- **Node.js**: `v20.x` or higher (verified on Node `v24.19.0`)
- **npm**: `v10.x` or higher
- **PostgreSQL**: `v14+` (Local server, Docker, or managed cloud instance like Neon / Supabase / AWS RDS)

---

## 1. Environment Configuration

Clone the repository and copy the environment template:

```bash
cp .env.example .env
```

Configure your PostgreSQL database connection string in `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/clinic_platform?schema=public"
JWT_SECRET="your-32-plus-character-secret-key-goes-here"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SESSION_COOKIE_NAME="clinic_auth_session"
```

---

## 2. Install Dependencies

Install project packages:

```bash
npm install
```

---

## 3. Database Migration & Prisma Setup

Generate Prisma Client:

```bash
npm run prisma:generate
```

Push schema to your PostgreSQL database:

```bash
npx prisma db push
```

Run database seed to initialize default clinic, settings, and CMS pages:

```bash
npm run seed
```

---

## 4. Provision Initial Administrator Account

Create an initial `SUPER_ADMIN` or `CLINIC_ADMIN` account securely without exposing hardcoded passwords:

```bash
# Interactive / automated one-time password generation:
npm run admin:create -- --email admin@clinic.com --name "Dr. Sharma" --role SUPER_ADMIN

# Or provide a custom password:
npm run admin:create -- --email admin@clinic.com --name "Dr. Sharma" --role SUPER_ADMIN --password "SecureAdmin#2026"
```

The script will securely hash the password with bcrypt (salt rounds = 12), save the record in PostgreSQL, and log an audit trail entry.

---

## 5. Development Server

Start the Next.js local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Verification & Quality Gates

Run the test suite:

```bash
npm test
```

Run TypeScript strict type checking:

```bash
npm run typecheck
```

Run ESLint verification:

```bash
npm run lint
```

Run production build validation:

```bash
npm run build
```
