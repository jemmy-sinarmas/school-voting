# Agent Spec — SchoolVoting

Onboarding + working agreement for any AI/human agent continuing this project.
Written to be **KISS** (minimal, direct), **YAGNI** (only what's needed now), and
**MECE** (non-overlapping sections). Read [BRD.md](./BRD.md) and [PRD.md](./PRD.md)
for the *why/what*; this doc is the *how/where*.

## 1. TL;DR

pnpm monorepo. NestJS+Prisma API is the source of truth; a React admin web and
an Expo mobile student app consume it; a shared package holds cross-app
enums/types. One election is active at a time. Vote integrity is enforced in the
DB, not just in code — respect it.

## 2. Repository map (where things live)

```
apps/api/          NestJS 10 + Prisma 5 + PostgreSQL — ALL business rules
  src/
    auth/student/  student register/verify/login/reset (JWT_STUDENT_SECRET)
    auth/admin/    admin login + RolesGuard (JWT_ADMIN_SECRET)
    admins/        super-admin CRUD of admin accounts
    candidate-lists/ list lifecycle (draft→active→closed), tally, cron sweeper
    candidates/    candidate CRUD + media (sharp → WebP)
    browsing/      student read endpoints (active list, candidates, winners)
    votes/         VotesService — the vote-integrity core
    winners/       promote/unpublish winners
    otp/ email/ config/ prisma/   infra modules
  prisma/schema.prisma            domain model (edit here for schema changes)
  prisma/migrations/*             timestamped; one hand-written raw-SQL migration
  scripts/seed.ts                 offline/demo seed
apps/admin-web/    Vite + React + MUI. Pages: Login, Lists, ListDetail, Admins
  src/api/         client.ts (fetch wrapper), endpoints.ts, types.ts
apps/mobile/       Expo/React Native + react-native-paper. Student app
  src/screens/     Login, Register, VerifyOtp, ForgotPassword, Home, Vote,
                   CandidateDetail, Winners, Settings, ChangePassword
  src/navigation/  RootNavigator (AuthStack vs AppStack), types.ts
  src/api/         client.ts, endpoints.ts
  src/i18n/        LanguageContext.tsx, strings.ts  (all UI copy goes here)
  src/theme.ts     colors + paper theme
packages/shared/   @school-voting/shared — enums.ts, types.ts, email-domain.ts
infra/             docker-compose.yml (Postgres 16, host port 5433)
docs/specs/        BRD, PRD, this spec, and features/*
```

## 3. Golden rules (do not break)

1. **Business rules live in the API**, never only in a client. Clients are dumb; the server re-validates everything.
2. **Vote integrity is layered on purpose** — DB unique `(studentId, candidateId)`, the advisory-lock transaction in `votes.service.ts`, and the raw-SQL trigger/partial-index in `prisma/migrations/20260817000002_vote_integrity_extras/migration.sql`. If you change voting, update all relevant layers and keep them consistent.
3. **One active list system-wide** is DB-guaranteed. Don't add a second "active" path that bypasses it.
4. **Never trust client-supplied list/owner references.** e.g. voting derives `listId` from the candidate server-side; OTP owner is server-enforced.
5. **Shared enums come from `@school-voting/shared`**, not Prisma-generated enums, so API and clients don't drift. Add a new enum value in `packages/shared/src/enums.ts` *and* the Prisma schema.
6. **Schema changes = a Prisma migration.** Never edit an applied migration; add a new one. Use `@map`/`@@map` snake_case to match existing convention.
7. **Soft-delete, don't hard-delete** records with history (candidates use `isDeleted`; `onDelete: Restrict`).
8. **All mobile UI copy goes through i18n** (`strings.ts` + `t(...)`), never hard-coded strings.

## 4. Conventions

- **Language/style:** TypeScript throughout; follow existing file structure (Nest module/controller/service/dto; React function components).
- **DB naming:** camelCase in Prisma models, snake_case in the DB via `@map`/`@@map`.
- **Auth:** two JWT realms; tokens carry a `scope` (`student`/`admin`) claim that guards verify. Passwords bcrypt cost 12 (OTP hashes cost 10).
- **Validation:** DTOs use `class-validator`; a global `ValidationPipe({ whitelist: true, transform: true })` is on.
- **Errors:** throw Nest HTTP exceptions (`ConflictException`, `ForbiddenException`, etc.) with user-safe messages.
- **Admin authorization:** put `@Roles(AdminRole.SUPER_ADMIN)` + `RolesGuard` on super-admin-only routes.
- **Config:** add new env vars to `config/configuration.ts` (+ `.env.example`); required vars must fail fast at boot.

## 5. Common workflows

```bash
# install
pnpm install
# start Postgres
cd infra && docker compose up -d postgres && cd ..
# build shared (clients import its compiled output)
pnpm --filter @school-voting/shared run build
# API: migrate + generate + seed + run
cd apps/api
npx prisma migrate deploy && npx prisma generate
pnpm run seed
pnpm run start:dev          # http://localhost:3000
# admin web
pnpm --filter @school-voting/admin-web run dev   # http://localhost:5173
# mobile
cd apps/mobile && pnpm run start                 # press w / a / scan QR
```

- **New migration (dev):** edit `schema.prisma`, then `cd apps/api && npx prisma migrate dev --name <change>`. For raw SQL (indexes/triggers/partial constraints Prisma can't express), create an empty migration and hand-write the SQL, mirroring `20260817000002_vote_integrity_extras`.
- **Seed reset:** `SEED_FORCE=true pnpm run seed` (wipes then reseeds — dev only).
- **OTP in dev:** `EMAIL_MODE=mock` logs codes; fetch via `GET /dev/last-otp?email=...&purpose=verify_email`.
- **Lint:** `pnpm --filter @school-voting/api run lint`.

## 6. Change-impact checklist

When you touch the domain, walk this list (skip what genuinely doesn't apply):

- [ ] Prisma schema + new migration (and raw SQL if constraints/triggers/indexes are involved)
- [ ] `packages/shared` enums/types (rebuild shared)
- [ ] API service/controller/DTO + authorization guard
- [ ] Admin-web `api/endpoints.ts` + `types.ts` + affected page
- [ ] Mobile `api/endpoints.ts` + screen + i18n `strings.ts`
- [ ] Seed script (if new data shape needs demo data)
- [ ] Docs: update PRD/BRD or the relevant `features/*` spec

## 7. Gotchas (known truths, don't relearn the hard way)

- `StudentStatus.disabled` is defined but currently **unused** and **not checked at vote time**; login is the only status gate today. (Feature E2 fixes this.)
- The cron **voting-window sweeper** is convenience only; the authoritative "voting open?" check is in `VotesService.assertVotingOpen`.
- The current vote cap is a **flat 2-per-list** (`MAX_VOTES_PER_LIST = 2`) — not per-role. Feature E3 **removes** this cap and moves to a list → role → candidate hierarchy (one vote per role); when you implement E3, delete `MAX_VOTES_PER_LIST` and the `enforce_vote_cap` trigger and enforce the per-role unique instead.
- Election years are **auto-created** when a list is created; there's no year-management UI.
- **No automated tests exist yet** (Jest is configured). Add tests with new behavior where practical, but don't retrofit broadly unless asked (YAGNI).
- Admin `GET /admin/admins` is readable by **any** admin; only mutations are super-admin gated.

## 8. Scope discipline (YAGNI/KISS)

- Build only what the active BRD/PRD/feature spec asks for. No speculative abstractions, config knobs, or "future-proofing" without a stated requirement.
- Prefer extending existing patterns over introducing new libraries or architectures. If a new dependency seems necessary, justify it in the feature spec first.
- Keep each change reviewable: one concern at a time, matching the change-impact checklist.

## 9. Planned work

Feature specs live in `docs/specs/features/` (E1 turnout, E2 student status,
E3 voting roles, E4 tutorial). Treat each as the authoritative scope for that
feature.
