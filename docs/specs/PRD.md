# Product Requirements Document (PRD) — School Voting

> Status: documents the product **as currently built** (baseline). New features
> are specified separately under `docs/specs/features/`. See also
> [BRD.md](./BRD.md) and [AGENT_SPEC.md](./AGENT_SPEC.md).

## 1. Product overview

Three surfaces over one backend:

| Surface | Tech | Users | Purpose |
|---------|------|-------|---------|
| **API** (`apps/api`) | NestJS 10 + Prisma 5 + PostgreSQL | — | Source of truth, business rules, auth |
| **Admin web** (`apps/admin-web`) | Vite + React + MUI | admins, super admins | Run elections |
| **Mobile app** (`apps/mobile`) | Expo / React Native + react-native-paper | students | Register, browse, vote |
| **Shared** (`packages/shared`) | TypeScript | all apps | Enums, types, email-domain validation |

## 2. Personas

- **Student voter** — a UniKL MIIT student with a university email. Wants to register, verify, and vote quickly on their phone.
- **Admin** — runs elections: sets up lists/candidates, opens/closes voting, tallies, promotes winners.
- **Super admin** — admin + manages admin accounts and password resets.

## 3. Domain model (current)

Entities (Prisma, `apps/api/prisma/schema.prisma`; DB columns are snake_case via `@map`):

- **Student** — `email` (unique, citext), `studentNumber` (unique), `fullName`, `passwordHash`, `status` ∈ {`pending_verification`, `active`, `disabled`}.
- **Admin** — `email`, `fullName`, `passwordHash`, `role` ∈ {`admin`, `super_admin`}, `status` ∈ {`active`, `disabled`}.
- **OtpCode** — polymorphic (`ownerType`/`ownerId`), `purpose` ∈ {`verify_email`, `password_reset`}, hashed code, expiry, attempt counters.
- **ElectionYear** — unique `year`.
- **CandidateList** — belongs to an ElectionYear; `status` ∈ {`draft`, `active`, `closed`}; `votingStartAt`/`votingEndAt`/`activatedAt`/`closedAt`.
- **Candidate** — belongs to a CandidateList; rich profile (photo, poster, YouTube video, programme, semester, socials, vision/mission, etc.); `isDeleted` soft-delete; `onDelete: Restrict`.
- **Vote** — (`studentId`, `candidateId`, `candidateListId`); `@@unique([studentId, candidateId])`.
- **Winner** — (`electionYearId`, `candidateId`, `candidateListId`, `promotedByAdminId`, `isPublished`); `@@unique([electionYearId, candidateId])`.

## 4. Functional requirements (current)

### 4.1 Student authentication & account

- **FR-A1** Register with university email (domain allow-list), student number, full name, password. → `POST /auth/student/register`.
- **FR-A2** Verify email via 6-digit OTP; on success status becomes `active`. → `POST /auth/student/verify-otp`.
- **FR-A3** Resend OTP (60s cooldown, max 5 attempts, 10-min expiry). → `POST /auth/student/resend-otp`.
- **FR-A4** Log in; only `active` students may log in. → `POST /auth/student/login`.
- **FR-A5** Forgot/reset password via OTP → short-lived reset token → new password. → `/forgot-password`, `/verify-reset-otp`, `/reset-password`.
- **FR-A6** View/update own profile (name only). → `GET/PATCH /auth/student/me`.

### 4.2 Student browsing & voting (mobile)

- **FR-V1** See the currently active election (or an empty state). → `GET /lists/active`.
- **FR-V2** Browse candidates in the active list and open a candidate's full profile. → `GET /lists/:id/candidates`, `GET /candidates/:id`.
- **FR-V3** See which candidates the student has already voted for. → `GET /votes/mine?listId=`.
- **FR-V4** Vote for a candidate, subject to: voting window open, no duplicate candidate, and the vote cap. *Baseline:* up to 2 per list. *Under E3:* the active list is organized into roles, each with its own candidates, and the student may pick **one candidate per role**. → `POST /votes`.
- **FR-V5** Remove a vote while voting is open. → `DELETE /votes/:candidateId`.
- **FR-V6** View current published winners. → `GET /public/winners/current`.

### 4.3 Admin — elections (admin web)

- **FR-M1** Log in (admin realm). → `POST /auth/admin/login`.
- **FR-M2** Manage candidate lists: list by year, view, create draft, edit, delete empty draft, **activate** with a voting window, **close**. → `/admin/lists*`.
- **FR-M3** Manage candidates while a list is draft: CRUD, upload photo/poster (re-encoded to WebP), set YouTube intro link. → `/admin/candidates*`.
- **FR-M4** Tally a list's votes. → `GET /admin/lists/:id/tally`.
- **FR-M5** Promote winners after a list closes; unpublish a winner. → `/admin/winners*`.

### 4.4 Admin — administration (super admin)

- **FR-S1** List admins (any admin). → `GET /admin/admins`.
- **FR-S2** Create / update / delete admins and reset admin passwords (super_admin only). → `/admin/admins*`.

## 5. Non-functional requirements

- **NFR-1 Vote integrity (3 layers):** DB unique `(studentId, candidateId)`; a per-`(student, list)` advisory-lock transaction enforcing the 2-vote cap in `VotesService`; a raw-SQL DB trigger backstop plus a partial unique index guaranteeing one active list. Verified under real concurrency.
- **NFR-2 Security & separation:** distinct JWT realms/secrets for students vs admins with a `scope` claim check; bcrypt password hashing (cost 12); role-based admin authorization (`RolesGuard`); rate limiting (`ThrottlerGuard`) on auth controllers.
- **NFR-3 Privacy:** forgot-password never reveals whether an account exists; OTP codes are stored hashed.
- **NFR-4 Media:** candidate images validated and re-encoded server-side to WebP (quality 80, ≤1600px) via `sharp`; original size limited by `MEDIA_MAX_IMAGE_BYTES`.
- **NFR-5 i18n:** mobile app strings are localized via `apps/mobile/src/i18n`.
- **NFR-6 Config-driven:** required env vars validated at boot (`DATABASE_URL`, JWT secrets, allowed domains); email delivery pluggable (`mock`/`smtp`).
- **NFR-7 Portability:** local Postgres via Docker Compose (PG16, host port 5433).

## 6. Key user flows (current)

**Student first vote:** register → receive OTP → verify (→ `active`) → log in → Home shows active election → open Vote → open a candidate → cast vote (up to 2) → see confirmation / selected state.

**Admin runs an election:** log in → create draft list under a year → add candidates + media → activate with a voting window → (students vote) → close (auto or manual) → tally → promote winners → winners visible to students.

## 7. Assumptions & constraints

- Exactly one election runs at a time (enforced).
- Students self-serve registration; there is currently no admin oversight of student accounts (addressed by planned enhancement E2).
- "2 votes per list" is a flat cap today; role-based voting (E3) replaces it with a list → role → candidate hierarchy where the student votes one candidate per role.

## 8. Gaps / known limitations (baseline)

- `StudentStatus.disabled` exists in the schema/enum but is **never assigned** and **not checked at vote time** — voting is gated only by a valid student JWT + list window + cap. (Addressed by E2.)
- No turnout metrics. (Addressed by E1.)
- No voting tutorial/onboarding. (Addressed by E4.)
- No automated tests yet (Jest configured, no spec files).

## 9. Planned features (specs)

- E1 — Turnout counts: [features/01-turnout.md](./features/01-turnout.md)
- E2 — Active-only voting + admin-maintained status: [features/02-student-status.md](./features/02-student-status.md)
- E3 — Role-based voting (active list → admin-managed roles → candidates; one vote per role): [features/03-voting-roles.md](./features/03-voting-roles.md)
- E4 — In-app voting tutorial: [features/04-voting-tutorial.md](./features/04-voting-tutorial.md)
