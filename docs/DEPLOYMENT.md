# Deployment Procedure — School Voting

A simple, step-by-step guide to deploy the School Voting system. This covers
setting up PostgreSQL, the API (NestJS + Prisma), and the admin web app
(Vite/React).

## Architecture at a glance

| Component   | Stack                     | Default port |
| ----------- | ------------------------- | ------------ |
| Database    | PostgreSQL 16             | 5433 (host)  |
| API         | NestJS + Prisma           | 3000         |
| Admin web   | Vite + React (static SPA) | 5173 (dev)   |

It is a **pnpm monorepo**. Commands are run from the repository root unless
noted otherwise.

## Prerequisites

- **Node.js >= 20**
- **pnpm** (`npm install -g pnpm`)
- **Docker + Docker Compose** (for PostgreSQL — recommended)
  - Or a standalone PostgreSQL 16 server if you prefer not to use Docker.

---

## 1. Set up PostgreSQL

The repo ships a ready-to-use Postgres service in `infra/docker-compose.yml`.

### Option A — Docker (recommended)

From the repository root:

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts PostgreSQL 16 with:

- user: `school_voting`
- password: `school_voting`
- database: `school_voting`
- host port: **5433** (mapped to container port 5432)
- a persistent named volume `postgres_data`
- any SQL in `infra/postgres/init/` auto-run on first startup

Verify it is healthy:

```bash
docker compose -f infra/docker-compose.yml ps
```

> The Prisma migrations enable the `citext` and `pgcrypto` extensions
> automatically, so no manual extension setup is needed.

### Option B — Existing PostgreSQL server

Create a database and user, then make sure the credentials match your
`DATABASE_URL` (see below). The account needs permission to `CREATE EXTENSION`
(`citext`, `pgcrypto`) or have those extensions pre-installed.

```sql
CREATE USER school_voting WITH PASSWORD 'school_voting';
CREATE DATABASE school_voting OWNER school_voting;
```

---

## 2. Install dependencies

From the repository root:

```bash
pnpm install
```

---

## 3. Configure environment variables

### API — `apps/api/.env`

Copy the example and edit values:

```bash
cp apps/api/.env.example apps/api/.env
```

Key settings for a real deployment:

- `DATABASE_URL` — must point at your Postgres instance. Default matches the
  Docker service:
  `postgresql://school_voting:school_voting@localhost:5433/school_voting?schema=public`
- `JWT_STUDENT_SECRET` / `JWT_ADMIN_SECRET` — **change these** to strong random
  values.
- `ALLOWED_EMAIL_DOMAINS` — comma-separated allowed registration domains
  (e.g. `s.unikl.edu.my`).
- `CORS_ORIGINS` — add the deployed admin-web origin (comma-separated).
- `EMAIL_MODE` — `smtp` for real email (fill in the `SMTP_*` values) or `mock`
  for local testing.
- `SUPER_ADMIN_RESET_KEY` — change it; keep it out of source control.
- `NODE_ENV=production` and `PORT` for production runs.

### Admin web — `apps/admin-web/.env`

```bash
cp apps/admin-web/.env.example apps/admin-web/.env
```

- `VITE_API_BASE_URL` — the public URL of the API (e.g. `https://api.example.com`).
  This is baked in at build time, so set it **before** building.

---

## 4. Apply database schema (Prisma migrations)

Generate the Prisma client and run the migrations against your database:

```bash
pnpm --filter @school-voting/api exec prisma generate
pnpm --filter @school-voting/api exec prisma migrate deploy
```

- `prisma migrate deploy` applies all committed migrations in order — use this
  for production/staging.
- The migrations also install two raw-SQL vote-integrity backstops (a
  single-active-list unique index and a per-student vote-cap trigger).

> For local development you can instead use
> `pnpm --filter @school-voting/api run prisma:migrate` (`prisma migrate dev`).

### Optional — seed initial data

```bash
pnpm run seed
```

Seeding behavior is controlled by the `SEED_*` variables in `apps/api/.env`.

---

## 5. Build

Build all workspace packages (API + admin web + shared):

```bash
pnpm run build
```

This produces:

- API: `apps/api/dist/`
- Admin web static bundle: `apps/admin-web/dist/`

---

## 6. Run

### API

```bash
pnpm --filter @school-voting/api run start:prod
```

This runs `node dist/main` and listens on `PORT` (default 3000). Put it behind
a process manager (systemd, pm2) or a container in production, and typically
behind a reverse proxy (nginx/Caddy) for TLS.

### Admin web

The admin web is a static SPA. Serve the contents of `apps/admin-web/dist/`
with any static host or reverse proxy (nginx, Caddy, S3 + CDN, etc.).

Make sure:

- `VITE_API_BASE_URL` was set to the API's public URL at build time.
- The admin-web origin is included in the API's `CORS_ORIGINS`.

---

## 7. Post-deployment checks

- API responds (e.g. `curl http://localhost:3000/`).
- Admin web loads and can reach the API (no CORS errors in the browser
  console).
- Database migrations are all applied:
  ```bash
  pnpm --filter @school-voting/api exec prisma migrate status
  ```
- If you need to reset the super admin password (break-glass), use the
  provided script:
  ```bash
  pnpm --filter @school-voting/api run reset-super-admin-password
  ```

---

## Quick reference

```bash
# 1. Database
docker compose -f infra/docker-compose.yml up -d

# 2. Dependencies
pnpm install

# 3. Env files (edit after copying)
cp apps/api/.env.example apps/api/.env
cp apps/admin-web/.env.example apps/admin-web/.env

# 4. Schema
pnpm --filter @school-voting/api exec prisma generate
pnpm --filter @school-voting/api exec prisma migrate deploy

# 5. Build
pnpm run build

# 6. Run API
pnpm --filter @school-voting/api run start:prod
#    Serve apps/admin-web/dist/ with a static host
```
