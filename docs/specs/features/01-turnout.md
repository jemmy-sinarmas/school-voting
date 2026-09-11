# Feature E1 — Turnout: voted vs. not-voted (school-wide)

> **Status: IMPLEMENTED.** API `GET /admin/lists/:id/turnout`
> (`candidate-lists.service.ts` → `turnout`), admin-web turnout card on
> ListDetailPage (`TurnoutPanel`). Verified end-to-end (List Z 100%, List A
> 0→1 voter).

## 1. Problem / goal

Administrators need to see, for an election, **how many students have voted and
how many have not**, across the whole school, so they can monitor participation
and drive turnout.

## 2. Definitions (agree these first)

- **Eligible population (denominator):** the number of students who are allowed
  to vote. Baseline definition: students with `status = active`. (After feature
  E2, "active" is admin-maintained, which keeps this denominator meaningful.)
- **Voted (numerator):** a student who has cast **at least one** vote in the list
  in question. Turnout is measured per election list (the active/closed list),
  since votes belong to a `candidateList`.
- **Not voted:** eligible students minus voted students.

> Rationale for "at least one vote" = voted: the cap is 2 per list, but a student
> who cast even one vote has participated. This is the standard turnout meaning.

## 3. Scope

**In:** a turnout summary for a given list (voted count, not-voted count,
eligible total, percentage), surfaced to admins.

**Out (YAGNI):** turnout by programme/semester/cohort, time-series/hourly charts,
CSV export, per-candidate breakdown (that's the existing tally). Add later only
if requested.

## 4. Data model

No schema change required. Turnout is derived:

- Eligible total = `count(students where status = active)`.
- Voted = `count(distinct student_id from votes where candidate_list_id = :listId)`.
- Not voted = eligible total − voted.

> Edge case: a student who voted then was later disabled could make
> `voted > eligible`. Clamp `notVoted = max(eligible − voted, 0)` and compute the
> percentage against `max(eligible, voted)` so numbers never go negative. Document
> this in the service.

## 5. API

Add to the **candidate-lists** admin surface (turnout is an election-scoped,
admin-only metric).

```
GET /admin/lists/:id/turnout          (AdminJwtAuthGuard)
```

Response:

```json
{
  "listId": "…",
  "eligibleStudents": 320,
  "votedStudents": 180,
  "notVotedStudents": 140,
  "turnoutPercent": 56.3
}
```

Implementation notes:
- Add `getTurnout(listId)` to `candidate-lists.service.ts` (or a small
  `turnout.service.ts` if the file grows). Two `count`s + arithmetic; use
  `prisma.vote.findMany({ distinct: ['studentId'], where: { candidateListId } })`
  length, or a raw `COUNT(DISTINCT student_id)` for efficiency.
- Guard: any authenticated admin (matches existing tally route).
- 404 if the list doesn't exist.

## 6. Admin-web UI

On **ListDetailPage** (`apps/admin-web/src/pages/ListDetailPage.tsx`), add a small
turnout card near the tally, showing:

- `Voted: 180 / 320 (56.3%)`
- `Not voted: 140`
- optional MUI `LinearProgress` for the percentage.

Wire a `listsApi.turnout(id)` call in `apps/admin-web/src/api/endpoints.ts` and a
type in `types.ts`. Refetch on demand (a refresh button) — no live polling needed
(KISS).

## 7. Acceptance criteria

- [ ] `GET /admin/lists/:id/turnout` returns eligible/voted/not-voted/percent for a valid list; 404 otherwise; requires an admin token.
- [ ] Counts are correct: voted = distinct students with ≥1 vote in that list; eligible = active students; not-voted = eligible − voted (clamped ≥ 0).
- [ ] ListDetailPage shows the turnout figures and updates on refresh.
- [ ] No negative numbers or NaN when eligible = 0 or voted > eligible.

## 8. Change-impact checklist

- [ ] API: `candidate-lists.service.ts` (+ controller route), no schema change
- [ ] admin-web: `api/endpoints.ts`, `api/types.ts`, `pages/ListDetailPage.tsx`
- [ ] Docs: mark FR added in PRD

## 9. Dependencies / sequencing

Uses the E2 definition of "active" for the denominator but does **not** require
E2 to ship first (baseline `active` works today). Ships independently.
