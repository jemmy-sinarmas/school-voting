# Feature E3 — Role/position-based voting (one vote per role)

> **Status: IMPLEMENTED.** Schema: `Role` model + `Candidate.roleId` +
> `Vote.roleId` with `@@unique([studentId, roleId])`; migration
> `20260901000000_role_based_voting` (backfills a "General" role for pre-existing
> lists, dedupes historical votes, drops the old `enforce_vote_cap` trigger).
> API: roles module (`admin/lists/:id/roles`, `admin/roles/:id`), candidate
> role assignment, per-role enforcement in `votes.service.ts`, role-grouped
> browsing + tally. Admin-web: roles panel + candidate role selector + tally
> grouped by role. Mobile: role-grouped VoteScreen + per-role switch on
> CandidateDetail. Seed reworked to 3 roles (President/VP/Secretary). Verified:
> DB rejects a second vote in a role; API returns 409; one-per-role enforced
> end-to-end.
>
> **Backfill decision (spec §7):** implemented option (b)-style safety — the
> migration keeps a single "General" role per pre-existing list and
> de-duplicates any historical multi-votes (keeps earliest per student+role)
> before applying the unique, so it is safe on real data. Demo data is reseeded
> fresh under the role model.

## 1. Problem / goal

Each student body (candidate list) is organized into distinct **roles**
(positions) — e.g. President, Vice-President, Secretary — and each role has its
own set of candidates. A voter selects **exactly one candidate per role**.

The confirmed model is a strict three-level hierarchy:

```
CandidateList (the active "student body" / election)
  └── Role            (e.g. President, VP, Secretary) — managed by admins
        └── Candidate (the people standing for that role)
              └── Vote (a student picks ONE candidate per role)
```

This **replaces** the current voting rule entirely. Today voting is a flat
"up to 2 candidates per list" (`MAX_VOTES_PER_LIST = 2`) with no notion of roles.
That flat cap is **removed** and superseded by "one vote per role". This touches
the schema, all vote-integrity layers, the admin module (role management), and
the mobile voting UI, so it is the highest-risk feature in this round.

## 2. Target business rules (these replace BRD BR3)

- **BR-E3.1** A candidate list contains one or more **roles**; roles are created and managed by admins (see §6).
- **BR-E3.2** Each candidate belongs to **exactly one role** within a candidate list.
- **BR-E3.3** A student may cast **at most one vote per role** (not per list, not per candidate-count). Across a list with N roles, a student can therefore cast up to N votes — one per role — but is never required to vote every role.
- **BR-E3.4** A student still can't vote the same candidate twice (existing DB unique on `(studentId, candidateId)` holds).
- **BR-E3.5** All existing gates remain: the list must be `active` and within its voting window; only `active` students (feature E2) may vote.

> **The old flat 2-per-list cap is fully removed** — there is no per-list vote
> count limit anymore; the limit is purely per-role (one each). `MAX_VOTES_PER_LIST`
> and the `enforce_vote_cap` trigger are deleted, replaced by the per-role unique
> constraint (§5). See §7 for migrating existing data off the old model.

## 3. Scope

**In:**
- A `Role` entity scoped to a candidate list (list → role → candidate hierarchy).
- **Admin management of roles** within the admin module: create/edit/reorder/delete roles on a draft list, and assign each candidate to a role.
- Candidate→role assignment (every candidate belongs to exactly one role).
- One-vote-per-role enforcement across all integrity layers (DB unique + app check).
- Removal of the old flat 2-per-list cap (code + trigger).
- Role-grouped mobile voting UI (one selection per role).

**Out (YAGNI):** cross-list/global roles, role-specific voting windows,
ranked/preferential voting, per-role candidate limits beyond "one vote". Not
requested.

## 4. Data model changes

Add a `Role` entity scoped to a `CandidateList`, and link `Candidate` and `Vote`
to it.

```prisma
model Role {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidateListId String        @map("candidate_list_id") @db.Uuid
  name            String                                   // e.g. "President"
  displayOrder    Int           @default(0) @map("display_order")
  createdAt       DateTime      @default(now()) @map("created_at")

  candidateList   CandidateList @relation(fields: [candidateListId], references: [id], onDelete: Cascade)
  candidates      Candidate[]
  votes           Vote[]

  @@unique([candidateListId, name])
  @@index([candidateListId])
  @@map("roles")
}
```

Changes to existing models:

- **Candidate**: add `roleId String @map("role_id") @db.Uuid` + relation to `Role`
  (`onDelete: Restrict`, mirroring the candidate→list rule). Every candidate must
  belong to a role in the same list.
- **Vote**: add `roleId String @map("role_id") @db.Uuid` + relation. Add
  `@@unique([studentId, roleId])` — **this is the new integrity guarantee**
  (one vote per student per role). Keep the existing `@@unique([studentId, candidateId])`.
- **CandidateList**: add `roles Role[]`.

> `roleId` on `Vote` is derived server-side from the candidate at vote time
> (never client-supplied), same pattern as `candidateListId` today.

## 5. Vote-integrity layers (update ALL of them)

The current three layers must move from "2 per list" to "1 per role":

1. **DB unique** — add `@@unique([studentId, roleId])` on `Vote`. This is the new
   hard backstop; `P2002` on it → "You have already voted for this role."
2. **Application transaction** (`votes.service.ts`) — replace the
   `count(...) >= MAX_VOTES_PER_LIST` check with: derive `roleId` from the
   candidate, keep the advisory lock keyed on `${studentId}:${listId}` (still
   serializes the student's actions for the list), and check whether a vote
   already exists for `(studentId, roleId)`; if so → `ConflictException`.
3. **Raw-SQL trigger** — replace `enforce_vote_cap` (the ">= 2 per list" trigger)
   with a trigger that rejects a second vote for the same `(student_id, role_id)`.
   The new `@@unique([studentId, roleId])` largely covers this, so the trigger can
   be **dropped** in favor of the unique index (simpler — KISS), OR rewritten to
   raise the same friendly check-violation. Recommendation: **drop the old
   per-list trigger and rely on the new unique index** + app check. Do this in a
   new migration; don't edit the old one.

Keep the **single-active-list** partial unique index unchanged.

## 6. API changes

### Admin (role management, under candidate-lists/candidates)

```
GET    /admin/lists/:id/roles                 list roles for a list
POST   /admin/lists/:id/roles                 { name, displayOrder? }  (draft only)
PATCH  /admin/roles/:roleId                   { name?, displayOrder? } (draft only)
DELETE /admin/roles/:roleId                   (draft only, no candidates attached)
```

- Roles are editable only while the list is `draft` (consistent with candidate
  editing rules).
- Creating/editing a **candidate** now requires a `roleId` belonging to the same
  list (validate server-side). Update `candidates` DTOs + service.

### Student (browsing + voting)

- `GET /lists/:id/candidates` — include each candidate's `roleId`/`role name`, or
  add `GET /lists/:id/roles` returning roles with their candidates, so the mobile
  app can group by role. Prefer returning roles-with-candidates in one call (fewer
  round-trips, KISS).
- `GET /votes/mine?listId=` — unchanged shape (candidateIds); the client maps them
  to roles.
- `POST /votes { candidateId }` — unchanged request; server derives `roleId` and
  enforces one-per-role.

## 7. Migration & backward compatibility

Existing data has candidates/votes with **no role**. Plan:

1. New Prisma migration adds `roles` table + nullable `role_id` columns first.
2. **Backfill**: for each existing candidate list, create a default role
   (e.g. "Council Member") and assign all its candidates + votes to it. This
   preserves closed 2025/demo data and keeps winners valid.
3. Second migration makes `role_id` **NOT NULL**, adds
   `@@unique([studentId, roleId])`, and drops the old `enforce_vote_cap` trigger.
4. Update the **seed script** to create roles (e.g. President/VP) so demo data
   exercises the new flow.

> Because a backfilled list has a single role, the old "2 per list" data now reads
> as "students had up to 2 votes for that one role" — which violates the new
> one-per-role unique. **Handle this:** for backfilled historical (closed) lists,
> either (a) keep them on a legacy single-role with the unique **not** applied to
> pre-existing rows (partial index by created date is messy), or (b) simpler:
> assign each of a student's (max 2) historical votes in a list to **distinct
> synthetic roles** during backfill so the new unique holds. Pick (b) for cleanliness
> unless product wants historical fidelity. **Decide this explicitly before writing
> the migration** — it's the trickiest part of this feature.

## 8. Mobile UI changes

`VoteScreen` currently shows a flat candidate list with a "{n}/2 selected"
subtitle. Change to **group candidates by role**:

- Section header per role (use `displayOrder`).
- Under each role, its candidates; the student may select **one** per role.
- Subtitle becomes e.g. "3/5 roles voted" instead of "n/2 selected".
- `CandidateDetailScreen` vote action: after voting, reflect that this role is now
  decided; allow changing (un-vote then vote another) while the window is open.
- All new copy via i18n `strings.ts`.

## 9. Acceptance criteria

- [ ] A candidate belongs to exactly one role in its list; candidates can't be created without a valid same-list role.
- [ ] A student can vote at most once per role; a second vote for the same role → `409` with a clear message.
- [ ] One-vote-per-role is enforced at the DB level (`@@unique([studentId, roleId])`), not only in code.
- [ ] All prior gates still apply (window, active list, active student).
- [ ] Existing closed/demo elections still load and their winners remain valid after migration.
- [ ] Mobile Vote screen groups candidates by role and enforces one selection per role in the UI.
- [ ] Admin can manage roles on a draft list and assign candidates to roles.

## 10. Change-impact checklist

- [ ] Prisma schema: `Role` model, `Candidate.roleId`, `Vote.roleId`, new uniques — plus **multiple** migrations (add nullable → backfill → enforce/drop trigger, raw SQL where needed)
- [ ] shared: add `Role` types; update candidate/vote types
- [ ] API: `votes.service.ts` (per-role check), candidates service/DTO (`roleId`), new role endpoints in candidate-lists module, browsing to expose roles
- [ ] admin-web: role management UI on ListDetailPage, candidate form gets a role selector, endpoints/types
- [ ] mobile: `VoteScreen` grouping, `CandidateDetail` vote logic, i18n
- [ ] seed: create roles + role-assigned candidates/votes
- [ ] Docs: update BRD BR3, PRD FR-V4/domain model

## 11. Dependencies / sequencing

- Best sequenced **after E2** so the active-student check is already in the vote
  transaction you're editing (avoids two passes over `votes.service.ts`).
- Independent of E1/E4, but E1 turnout copy ("voted") should be interpreted as
  "voted in ≥1 role" once roles exist — note it when E3 lands.
- **Highest risk** — do the migration/backfill design review (§7) before coding.
