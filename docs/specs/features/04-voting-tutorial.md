# Feature E4 — In-app voting tutorial

> **Status: IMPLEMENTED.** `TutorialScreen` (4-step carousel) added to the
> mobile AppStack as a modal; first-run auto-launch from HomeScreen gated by an
> AsyncStorage flag (`tutorial.voting.seen`, via `tutorialStore.ts`); re-openable
> from Settings ("How to vote") and the Vote screen's help action. All copy
> localized in `strings.ts` for both `en` and `bm`. The "one candidate per role"
> step matches the E3 model.

## 1. Problem / goal

First-time voters don't know how the app works (how many votes they get, how to
select/change a vote, that voting is time-boxed). Add a simple **tutorial /
onboarding** in the mobile app that explains how to vote.

## 2. Scope

**In:** a lightweight, multi-step tutorial in `apps/mobile` that:
1. Shows automatically the first time a logged-in student reaches voting.
2. Can be re-opened anytime from Settings ("How to vote").
3. Is skippable and localized (i18n).

**Out (YAGNI):** interactive coach-marks overlaying real UI, video tutorials,
server-driven/remote tutorial content, analytics on completion. A few static
explainer slides are enough.

## 3. UX

A `TutorialScreen` (or a modal carousel) with 3–4 steps, each a title + short
body + icon/illustration, using existing `react-native-paper` components and the
app `theme`:

1. **Welcome** — what the election is and that only verified/active students vote.
2. **How voting works** — how many selections you get. *Keep this copy in sync
   with the vote model:* today "up to 2 candidates"; **after feature E3** it's
   "one candidate per role/position." Write the copy so it's easy to update, and
   revisit when E3 lands.
3. **Selecting & changing** — tap a candidate to view their profile, cast your
   vote, and change it anytime while voting is open.
4. **Timing & results** — voting closes at the deadline; results appear under
   "Results" once published.

Controls: `Next` / `Back`, a `Skip` on every step, and `Done` on the last step.
Pagination dots. Nothing fancy — KISS.

## 4. When it shows (first-run logic)

- Persist a flag in device storage that the tutorial was completed/skipped:
  `AsyncStorage` key e.g. `tutorial.voting.seen = "1"`.
- On entering the voting flow (e.g. when `HomeScreen` mounts for an authenticated
  student, or first time `VoteScreen` opens), if the flag is unset, navigate to /
  present `TutorialScreen`; on `Done`/`Skip`, set the flag.
- Always available on demand from **Settings** → "How to vote" (ignores the flag).

> Storage choice: reuse whatever the app already uses for the auth token (check
> `apps/mobile/src/auth/AuthContext.tsx` / the token store). If it's
> `expo-secure-store` for secrets, use plain `AsyncStorage` for this non-sensitive
> flag. Don't add a new persistence library.

## 5. Navigation & i18n

- Add `Tutorial` to the `AppStack` in `apps/mobile/src/navigation/RootNavigator.tsx`
  and to `AppStackParamList` in `navigation/types.ts`. Present it as a modal
  (`presentation: "modal"`) or a normal screen — modal reads better for onboarding.
- Add a Settings row that navigates to `Tutorial`.
- All copy in `apps/mobile/src/i18n/strings.ts` under a `tutorial.*` namespace,
  for **every** supported locale (mirror existing `en` / other locales). No
  hard-coded strings.

## 6. No backend changes

This is a client-only feature. No API, schema, or shared-package changes.

## 7. Acceptance criteria

- [ ] On first entry to voting after login, the tutorial appears automatically.
- [ ] Tutorial has multiple steps with Next/Back/Skip and a Done on the last step.
- [ ] After Done or Skip, it does not auto-appear again (flag persisted across app restarts).
- [ ] Settings has a "How to vote" entry that reopens the tutorial anytime.
- [ ] All tutorial copy is localized in `strings.ts` for every supported locale.
- [ ] Styling uses the existing paper theme; no new dependency added.

## 8. Change-impact checklist

- [ ] mobile: `screens/TutorialScreen.tsx`, `navigation/RootNavigator.tsx` + `navigation/types.ts`, `screens/SettingsScreen.tsx` (entry), first-run flag storage
- [ ] mobile i18n: `tutorial.*` keys in all locales
- [ ] No API / schema / shared changes
- [ ] Docs: note the new FR in PRD

## 9. Dependencies / sequencing

- Independent; can ship anytime.
- **Copy coupling with E3:** the "how many votes" step must match the live vote
  model. If E4 ships before E3, write the "up to 2 candidates" copy; when E3
  lands, update the `tutorial.*` strings to the per-role model. Flag this in the
  E3 checklist too.
