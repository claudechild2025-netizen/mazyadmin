# Mazy Admin Dashboard — Implementation Summary

A read-only researcher dashboard built alongside the Mazy student app for the
3-day usability study. Both projects connect to the same Supabase project via
shared `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the
admin reads what the student app writes.

## 1. Stack & project structure

**Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind
v4, `@supabase/ssr`, Recharts, Lucide.

```
mazy-admin/
├── app/
│   ├── page.tsx                  ← Dashboard home
│   ├── participant/[id]/page.tsx ← Per-participant detail
│   ├── survey/page.tsx           ← Full questionnaire results + CSV
│   ├── leads/page.tsx            ← Q7 contact list
│   └── login/page.tsx            ← Magic-link / dev password
├── components/
│   ├── StatCard.tsx
│   ├── CompletionFunnel.tsx      ← Recharts vertical bar
│   ├── ParticipantTable.tsx
│   ├── ScreenAnalyticsTable.tsx
│   ├── AuthGate.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── queries.ts                ← All Supabase reads
│   ├── csv.ts                    ← UTF-8 BOM CSV export
│   ├── supabase.ts               ← Browser client
│   └── auth.ts                   ← Magic-link + dev-password helpers
```

## 2. Schema alignment (the critical fix)

**Problem identified.** Mazy app's `lib/analytics.ts` writes simple flat rows
(`screen_views.client_uid + screen_slug`, `quiz_answers.client_uid +
question_key`), but the original `schema.sql` defined UUID-FK based tables
with `screen_views.user_id → users.id` and `quiz_answers.attempt_id →
quiz_attempts.id`. Every analytics insert silently failed; even `users`
stayed empty because `ensureUserRow` could not satisfy `grade NOT NULL`.

**Solution — `schema_v4_align.sql`:**
- Dropped & recreated `screen_views` and `quiz_answers` matching mazy app's
  actual insert shape
- Relaxed `users.grade` to nullable
- Added `anon SELECT` policies on `users`, `events`, `survey_responses`,
  `screen_views`, `quiz_answers` so the read-only admin (no auth) could
  query them

**Follow-up — `schema_v5b_anon_read.sql`:**
- Granted `anon SELECT` on `practice_attempts` and the new analytics views
- Set views to `security_invoker = on` (per Supabase advisor)
- Granted `SELECT` on `v_lesson_funnel`, `v_practice_drill_summary`,
  `v_sus_scores`, `v_xp_leaderboard` to `anon`

## 3. Dashboard features

**Home (`/`):**
- 5 stat cards: total participants, completed lessons, mean SUS, mean quiz
  answer time, mean lab time
- Completion funnel chart (vertical bars, 11 stages mapped to mazy app's
  actual `screen_slug`s: `home → lessons → lesson_intro → motion_player →
  lab → lesson_practice → lesson_distill → quiz → lesson_complete → done →
  survey`)
- Screen analytics table (per-surface views, taps, avg time)
- Participant table with sort + CSV export
- Per-lesson 4-phase funnel (Lab/Distill/Practice/Quiz reach counts) —
  drives "teaching before testing" drop-off analysis
- Per-drill practice summary (attempts, mean correct/wrong, mean duration)
- Survey Likert means (Q1–Q5) + Q6 open feedback quotes + Q7 consent leads

**Participant detail (`/participant/[id]`):**
1. Stat row: screens viewed, quiz correct/total, lab time, SUS responses
2. **Table 1** — `screen_views` chronological
3. **Table 2** — `quiz_answers` (lesson, question key, selected, correct/wrong,
   answer time)
4. **Table 3** — SUS responses (question number → 1–5)
5. **Table 4** — `practice_attempts` (lesson, drill, kind, correct, wrong,
   duration)
6. **Table 5** — Survey answers (Q1–Q7 with inline Likert bars and Q7
   consent + contact)

## 4. SUS score implementation

Mazy app emits `track('sus_response', { question_number, score })` to the
generic `events` table. Admin's `getSusByClient()` groups events by
`user_id`, ensures all 10 questions are present, then computes per Brooke
(1996):

    SUS = (Σ odd_i (score − 1) + Σ even_i (5 − score)) × 2.5

Threshold ≥ 68 = "acceptable" (Bangor et al. 2009) — the SUS stat-card chip
turns green at ≥ 68, amber otherwise.

## 5. Authentication

Two-mode `AuthGate` in `lib/auth.ts`:
- **Magic-link** via Supabase Auth (production) — gated by `hasSupabaseEnv()`
- **Dev password** fallback (`mazy-2026`) for local screenshots when env
  vars are stub

Sign-in state is checked client-side via a `localStorage` flag or
`supabase.auth.getSession()`.

## 6. CSV export

`lib/csv.ts` writes a UTF-8 BOM-prefixed file (so Excel reads Mongolian
Cyrillic correctly), with RFC 4180 escaping. Participant export columns:
ID, Анги, Түвшин, Эхэлсэн цаг, Дууссан, Quiz score, SUS score, Lab time.
The `/survey` page emits its own CSV with all 7 question fields including
Q7 consent + contact.

## 7. Display name (instead of UID slice)

Earlier the dashboard showed `client_uid.slice(0, 8)` everywhere. Now a
`getDisplayNameMap(client_uids)` helper performs one round-trip lookup
into `users` to attach `display_name` to every survey response and consent
lead. The Participant table, Q6 quotes, Q7 leads, `/survey` table, and
`/participant/[id]` header all show the user's name when available, with
the UID slice as a fallback.

## 8. New interactive lab — PrismLab

`mazy app/components/labs/PrismLab.tsx` — drag-the-incoming-beam interaction
demonstrating wavelength-dependent dispersion. Triangular prism, draggable
white-light entry, 7-colour spectrum fan on exit. Per-colour dispersion
offsets visualise Δn ≈ 0.04 across the visible range (crown glass). Mastery
fires after 3 distinct incidence-angle buckets (5° granularity). Tracks
`lab_drag_start`, `lab_drag_end`, `lab_mastery` events.

## 9. Tooling / integration

- `npm run build` exits 0 (verified after every refactor)
- Both projects connected to the same Supabase project via shared env vars
- Schema patches committed in `mazy app/supabase/` as numbered SQL files
  (idempotent on re-run):

  | File | Purpose |
  |---|---|
  | `schema.sql` | Initial schema |
  | `schema_v2_patch.sql` | Gamification (badges, XP) |
  | `schema_v3_survey.sql` | Post-session survey table + view |
  | `schema_v4_align.sql` | Aligns analytics tables to mazy app insert shape |
  | `schema_v5_pedagogy_phases.sql` | `practice_attempts` + 4-phase funnel views |
  | `schema_v5b_anon_read.sql` | Grants anon read on v5 entities |

- Vercel deployment notes in [README.md](README.md)
