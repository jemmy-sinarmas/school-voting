# School Voting

Student Council election system: a student mobile app, an admin web app, and a shared backend API. See `docs/` and the original implementation plan for the full design (vote-integrity mechanism, schema, API surface).

## Prerequisites

- Node.js 20+, pnpm (`corepack enable` or `npm i -g pnpm`)
- Docker (for local Postgres)

## Local setup

```bash
pnpm install

# 1. Start Postgres
cd infra && docker compose up -d postgres && cd ..

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env if needed — defaults work with the docker-compose Postgres on port 5433

# 3. Build the shared package (mobile/admin-web import its compiled output)
pnpm --filter @school-voting/shared run build

# 4. Apply migrations + generate the Prisma client
cd apps/api
npx prisma migrate deploy
npx prisma generate

# 5. Seed offline/demo data (SEED_MODE=offline is set in .env.example)
pnpm run seed

# 6. Run the API
pnpm run start:dev
```

The API listens on `http://localhost:3000` by default. `CORS_ORIGINS` in
`apps/api/.env` controls which browser origins may call it — defaults to the
admin-web dev server (`http://localhost:5173`); add any deployed admin-web
origin there too.

## Admin web app

```bash
cd apps/admin-web
cp .env.example .env   # VITE_API_BASE_URL defaults to http://localhost:3000
pnpm run dev
```

Runs at `http://localhost:5173`. Log in with the seeded super admin
(`super@s.unikl.edu.my` / `SuperPass1`, see below) once the API is running and
seeded.

## Admin password recovery

Admins have no self-service "forgot password" — a regular admin who is
locked out can only be reset by a super admin, from the **Admins** page in
admin-web (`Reset password` action, calls
`PATCH /admin/admins/:id/reset-password`, super-admin only).

The super admin has no one above them to do that reset, so a separate
break-glass path exists for that one account: `scripts/reset-super-admin-password.ts`
in `apps/api`, run directly against the database (no HTTP endpoint, nothing
exposed over the network):

```bash
cd apps/api
pnpm run reset-super-admin-password --key=<SUPER_ADMIN_RESET_KEY> --password=<newPassword>
```

`SUPER_ADMIN_RESET_KEY` lives in `apps/api/.env` (see `.env.example`) and is
checked before anything is written. Anyone running this already has shell +
`.env` access to the API server — the same trust level needed to re-run
`pnpm run seed` — so the key isn't a security boundary on its own, it's a
guard against accidentally resetting the super admin's password by running
the wrong script. Keep the key out of source control in real deployments,
stored separately from the app's own secrets.

## Mobile app (React Native / Expo)

```bash
cd apps/mobile
cp .env.example .env   # EXPO_PUBLIC_API_BASE_URL defaults to http://localhost:3000
pnpm run start          # then press "w" for web, "a" for Android, or scan the QR code with Expo Go
```

For the web preview, add `http://localhost:8081` to `CORS_ORIGINS` in
`apps/api/.env`. For a physical device or Android emulator, `localhost` in
`EXPO_PUBLIC_API_BASE_URL` won't reach your dev machine — use the emulator's
host alias `10.0.2.2` or your machine's LAN IP instead, and add that origin
to `CORS_ORIGINS` too if testing via Expo web.

Log in with a seeded student (`student1@s.unikl.edu.my` / `StudentPass1`) or
register a new account — OTPs land in the API's console log / `/dev/last-otp`
in offline mode (see below).

## Offline/demo mode

With `EMAIL_MODE=mock` (the `.env.example` default), OTPs are logged to the
console instead of emailed, and available at
`GET /dev/last-otp?email=...&purpose=verify_email|password_reset` (dev-only,
disabled outside `NODE_ENV=development` and whenever `EMAIL_MODE!=mock`).

Seeded accounts (`pnpm run seed`, from `apps/api/scripts/seed.ts`):

| Role | Email | Password |
|---|---|---|
| Super admin | `super@s.unikl.edu.my` | `SuperPass1` |
| Admin | `admin1@s.unikl.edu.my` / `admin2@s.unikl.edu.my` | `AdminPass1` |
| Student (pre-verified) | `student1@s.unikl.edu.my` .. `student25@s.unikl.edu.my` | `StudentPass1` |

Seeded election data: a closed 2025 "List Z" with 2 published winners, and
two draft 2026 lists ("List A", "List B"); if `SEED_ACTIVATE_DEMO_LIST=true`,
"List A" is activated with a 24h voting window so the vote/unvote flow is
immediately testable.

Re-running the seed against a non-empty database requires `SEED_FORCE=true`
(it will wipe and reseed) — this guard exists so the script can never
accidentally wipe a real deployment.

## Media compression

Every candidate photo/poster upload is re-encoded server-side to WebP
(quality 80, capped at 1600px on the long edge) via `sharp`, regardless of
the format the admin uploaded. See
`apps/api/src/candidates/candidates.service.ts` (`compressImage`). The size
limit in `.env` (`MEDIA_MAX_IMAGE_BYTES`) is enforced against the *original*
upload, before compression. Candidate intro videos are a plain YouTube link
(`videoUrl`), not an upload.

## Vote integrity

The 2-vote cap and single-active-list rules are enforced at three layers —
see `apps/api/src/votes/votes.service.ts` and
`apps/api/prisma/migrations/20260817000002_vote_integrity_extras/migration.sql`
for the advisory-lock transaction, the DB trigger backstop, and the partial
unique index. This was verified under real concurrency during development
(N parallel vote requests against >2 candidates → exactly 2 succeed).

## Repo layout

```
apps/api/          NestJS + Prisma backend
apps/admin-web/     React admin panel
apps/mobile/        React Native (Expo) student app
packages/shared/    Shared TS types/enums/domain-regex used across all three apps
infra/              docker-compose for local Postgres
```
