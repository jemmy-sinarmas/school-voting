# Business Requirements Document (BRD) — School Voting

> Status: reflects the system **as currently built** (baseline), plus a "Planned
> enhancements" section for the four requested features. Companion docs:
> [PRD.md](./PRD.md), [AGENT_SPEC.md](./AGENT_SPEC.md), and the feature specs
> under `docs/specs/features/`.

## 1. Purpose

School Voting is a Student Council election system for UniKL MIIT. It lets
verified students vote for candidates from their phones, and lets election
administrators run elections (create candidate lists, manage candidates, open
and close voting, tally results, and publish winners) from a web admin panel.

The system exists to replace manual/paper voting with a controlled, auditable
digital process that guarantees vote integrity (one person, bounded votes, one
active election at a time).

## 2. Business objectives

| # | Objective | How the system serves it |
|---|-----------|--------------------------|
| B1 | Run trustworthy elections | Multi-layer vote-integrity controls (DB constraints, transactional cap, DB trigger backstop) |
| B2 | Restrict voting to real, eligible students | University-email-domain-restricted registration + email OTP verification |
| B3 | Give admins full election lifecycle control | Draft → active (with a time window) → closed → winners published |
| B4 | Make voting accessible to students | Mobile app (Expo/React Native), bilingual (i18n) |
| B5 | Keep results credible and transparent | Admin tally, explicit winner promotion, published results visible to students |
| B6 | Protect the system from tampering & abuse | Separate student/admin auth realms, role-based admin permissions, rate limiting on auth |

## 3. Stakeholders

- **Students (voters)** — register with a university email, verify, then vote in the mobile app.
- **Election administrators (`admin`)** — manage candidate lists, candidates, voting windows, and winners.
- **Super administrator (`super_admin`)** — everything an admin can do, plus manage admin accounts and reset admin passwords.
- **System operators / IT** — deploy and run the API, database, and email delivery (see `docs/DEPLOYMENT.md`).

## 4. Scope

### 4.1 In scope (built today)

- Student self-registration limited to allowed university email domains, with email OTP verification and password reset.
- Student authentication and profile (view name/email/student number; edit name; change password).
- Browsing the currently active election: candidate lists, candidate profiles, and current published winners.
- Voting and un-voting within the single active list, capped at **2 candidates per list**.
- Admin authentication (no self-service reset; super-admin-assisted).
- Admin management of candidate lists (create draft, edit, delete empty drafts, activate with a voting window, close), candidates (CRUD while draft, photo/poster upload, YouTube intro link), tally, and winner promotion/unpublish.
- Super-admin management of admin accounts.
- One election active system-wide at any time; automatic closing of expired voting windows.

### 4.2 Out of scope (today)

- Admin-managed **student accounts** (no UI/endpoint to view, enable, or disable students).
- **Turnout reporting** (how many students voted vs. not).
- **Role/position-based voting** (e.g., President, Vice-President) — voting is currently a flat "up to 2 candidates per list".
- **In-app voting tutorial/onboarding.**
- Multiple concurrent elections, delegated/proxy voting, audit-log export, push notifications.

## 5. Key business rules (current)

- **BR1 — Eligibility:** only accounts with an allowed university email domain may register; only email-verified (`active`) students may log in and vote.
- **BR2 — One active election:** at most one candidate list can be `active` system-wide (DB-enforced).
- **BR3 — Vote cap:** *(baseline, being replaced by E3)* a student may vote for at most **2 distinct candidates** in the active list, and never the same candidate twice. **Under E3 this becomes one vote per role** — see the note below and [features/03-voting-roles.md](./features/03-voting-roles.md).
- **BR4 — Time-boxed voting:** votes are only accepted while the list is `active` and the current time is within `[votingStartAt, votingEndAt]`.
- **BR5 — Result integrity:** candidates with vote history are never hard-deleted (soft-delete only); winners are explicitly promoted by an admin after a list closes.
- **BR6 — Separation of duties:** student and admin identities are fully separate (distinct JWT realms/secrets); only super admins manage admins.

## 6. Success metrics

- Eligible students can register, verify, and cast a valid vote without support intervention.
- Zero vote-integrity violations (no student exceeds the cap; no duplicate candidate vote; never more than one active list) — enforced and verifiable at the database level.
- Admins can take an election from draft to published winners without engineering help.

## 7. Planned enhancements (this round)

These are approved additions; each has a dedicated feature spec under
`docs/specs/features/`.

| # | Enhancement | Business rationale | Spec |
|---|-------------|--------------------|------|
| E1 | **Turnout visibility** — show, per election, how many students have voted vs. not, school-wide | Administrators need to monitor participation and drive turnout | [features/01-turnout.md](./features/01-turnout.md) |
| E2 | **Admin-maintained student eligibility** — only `active` students may vote; admins can enable/disable students | Handle graduated/withdrawn/ineligible students and revoke abusers | [features/02-student-status.md](./features/02-student-status.md) |
| E3 | **Role/position-based voting** — the active list is organized into admin-managed roles (President, VP, …), each role has its own candidates, and a student votes for exactly one candidate per role | Elections fill distinct positions, not a flat slate | [features/03-voting-roles.md](./features/03-voting-roles.md) |
| E4 | **In-app voting tutorial** — a first-run onboarding/tutorial for voters | Reduce confusion and mis-votes; improve accessibility | [features/04-voting-tutorial.md](./features/04-voting-tutorial.md) |

> **Note on E3 vs. current BR3:** the existing rule is a flat "up to 2 candidates
> per list". E3 **removes that flat cap entirely** and replaces it with a strict
> hierarchy — active list → roles (admin-managed) → candidates — where a student
> votes for **exactly one candidate per role**. This is a deliberate business-rule
> change; see [features/03-voting-roles.md](./features/03-voting-roles.md) for the
> data model, enforcement, and migration of existing (flat-cap) data.
