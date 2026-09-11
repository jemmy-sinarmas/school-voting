# SchoolVoting — Specs

Start here. These documents let any agent (AI or human) understand the project
and continue work with minimal ramp-up.

## Read in this order

1. **[BRD.md](./BRD.md)** — business goals, stakeholders, scope, rules (the *why*).
2. **[PRD.md](./PRD.md)** — product features, requirements, flows, gaps (the *what*).
3. **[AGENT_SPEC.md](./AGENT_SPEC.md)** — repo map, conventions, workflows, gotchas (the *how/where*). Written KISS / YAGNI / MECE.

## Planned features (this round)

| # | Feature | Spec |
|---|---------|------|
| E1 | Turnout: voted vs. not-voted school-wide | [features/01-turnout.md](./features/01-turnout.md) |
| E2 | Active-only voting + admin-maintained student status | [features/02-student-status.md](./features/02-student-status.md) |
| E3 | Role/position-based voting (one vote per role) | [features/03-voting-roles.md](./features/03-voting-roles.md) |
| E4 | In-app voting tutorial | [features/04-voting-tutorial.md](./features/04-voting-tutorial.md) |

## Suggested build order

1. **E2** first — it adds the active-student check inside `votes.service.ts`.
2. **E3** next — it also edits `votes.service.ts` and the vote-integrity layers; doing it after E2 avoids touching that file twice. Highest risk (schema + migration/backfill) — review its §7 before coding.
3. **E1** and **E4** are independent and can ship anytime (E1 alongside/after E2 for a meaningful "eligible" denominator; E4's copy should track E3's vote model).

## Baseline facts (quick reference)

- pnpm monorepo: `apps/api` (NestJS+Prisma+Postgres), `apps/admin-web` (React/MUI), `apps/mobile` (Expo/RN), `packages/shared`.
- One election active system-wide; vote integrity enforced in the DB, not just code.
- Current vote cap: flat **2 candidates per list** (E3 **removes** this and moves to active list → admin-managed roles → candidates, with one vote per role).
- `StudentStatus.disabled` exists but is currently unused / not checked at vote time (E2 fixes this).
- Deployment: see [../DEPLOYMENT.md](../DEPLOYMENT.md).
