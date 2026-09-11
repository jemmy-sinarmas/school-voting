# Feature E2 — Active-only voting + admin-maintained student status

> **Status: IMPLEMENTED.** Vote-time active check in `votes.service.ts`
> (`assertStudentActive`, both vote & unvote). Admin student management:
> `GET /admin/students`, `PATCH /admin/students/:id/status`
> (`students` module) + admin-web StudentsPage (route `/students`, nav entry).
> Verified: a disabled student's vote is rejected with HTTP 403 even with a
> valid token.

## 1. Problem / goal

Only **active** students should be allowed to vote, and an **admin must be able
to maintain each student's active status** (enable/disable). Today:

- `StudentStatus.disabled` exists in the enum/schema but is **never assigned**.
- Voting does **not** re-check student status — it's gated only by a valid
  student JWT + list window + vote cap.
- There is **no admin UI or endpoint** to view or change student accounts.

So a student disabled in the future would still hold a valid JWT and could keep
voting until it expired. This feature closes that gap.

## 2. Scope

**In:**
1. Enforce `status = active` at **vote time** (server-side), not just at login.
2. Admin endpoints + admin-web UI to **list students** and **enable/disable** them.
3. Disabling a student blocks their voting immediately (even with a live token).

**Out (YAGNI):** admin-created student accounts, admin password resets for
students, bulk import, per-election eligibility overrides. Not requested.

## 3. Business rules

- **BR-E2.1** A vote (`POST /votes`) and un-vote (`DELETE /votes/:candidateId`) require the acting student to be `active`. A `disabled` (or `pending_verification`) student is rejected with `403`.
- **BR-E2.2** Admins can set a student's status between `active` and `disabled`. `pending_verification` is only ever set by the system (registration) and cleared by OTP verification — admins don't set it.
- **BR-E2.3** Disabling does **not** delete a student's existing votes (integrity/audit). It only prevents future vote/un-vote actions and login.
- **BR-E2.4** Login already blocks non-active students; keep that.

## 4. Data model

No schema change. `Student.status` and `StudentStatus{active,disabled,pending_verification}` already exist. This feature finally *uses* `disabled`.

## 5. API

### 5.1 Enforce at vote time (the security fix)

In `apps/api/src/votes/votes.service.ts`, inside the advisory-lock transaction of
both `vote` and `unvote`, fetch the student and assert active:

```ts
const student = await tx.student.findUnique({ where: { id: studentId }, select: { status: true } });
if (!student || student.status !== StudentStatus.ACTIVE) {
  throw new ForbiddenException("Your account is not active");
}
```

Place it alongside `assertVotingOpen`. This makes disable take effect immediately,
independent of token expiry. (Optional hardening, not required: also re-check
status in `StudentJwtStrategy.validate` so *all* student endpoints reject disabled
users; keep it simple — vote-time check is the must-have.)

### 5.2 Admin student management

New module `apps/api/src/students/` (mirror `admins/` structure), guarded by
`AdminJwtAuthGuard`:

```
GET   /admin/students?status=&search=      list students (paged), any admin
PATCH /admin/students/:id/status           { "status": "active" | "disabled" }
```

- `PATCH .../status` validates the value is `active` or `disabled` (reject
  `pending_verification` via DTO with `class-validator`), updates, returns the
  updated student summary (id, fullName, email, studentNumber, status).
- 404 if not found.
- Decision to record: whether disabling a student should be **admin** or
  **super_admin** only. Recommendation: **any admin** may disable (operational
  task), consistent with lists/candidates being admin-managed. If stricter
  control is wanted, add `@Roles(SUPER_ADMIN)`.

List query: support optional `status` filter and `search` (by name/email/student
number, citext-friendly). Keep pagination simple (`take`/`skip` or cursor) —
don't over-engineer.

## 6. Admin-web UI

Add a **Students** page (new route `/students`, nav entry in `Layout.tsx`):

- Table: full name, student number, email, status chip.
- Search box + status filter.
- Per-row action: **Disable** (if active) / **Enable** (if disabled), using the
  existing `ConfirmProvider` for a confirmation dialog.
- Wire `studentsApi.list(...)` and `studentsApi.setStatus(id, status)` in
  `api/endpoints.ts` + types.

## 7. Mobile app

- No new screen required. When a disabled student's token still calls vote/browse,
  the API returns `403`; surface the message in the existing Snackbar. On the next
  login attempt they're already blocked ("Account is not verified yet" — consider a
  clearer "Your account has been disabled" message for the disabled case).
- Small improvement: differentiate login rejection reason for `disabled` vs
  `pending_verification` so the copy is accurate (i18n strings).

## 8. Acceptance criteria

- [ ] A `disabled` student calling `POST /votes` or `DELETE /votes/:id` gets `403`, even with a valid unexpired token.
- [ ] Existing votes of a disabled student are preserved.
- [ ] Admins can list students with status filter + search.
- [ ] Admins can toggle a student between active and disabled; `pending_verification` is not settable via the API.
- [ ] Admin-web Students page reflects and updates status with a confirm step.
- [ ] Login still blocks non-active students, with accurate messaging.

## 9. Change-impact checklist

- [ ] API: `votes.service.ts` (status check), new `students` module (controller/service/dto), register module in `app.module.ts`
- [ ] shared: no enum change (reuse `StudentStatus`)
- [ ] admin-web: `api/endpoints.ts`, `api/types.ts`, new `pages/StudentsPage.tsx`, `App.tsx` route, `Layout.tsx` nav
- [ ] mobile: i18n copy for disabled account (optional)
- [ ] seed: optionally seed one `disabled` student for demo
- [ ] Docs: update PRD FRs + BRD BR

## 10. Dependencies / sequencing

Independent. E1's "eligible = active students" denominator becomes more meaningful
once admins actively maintain status, but neither blocks the other.
