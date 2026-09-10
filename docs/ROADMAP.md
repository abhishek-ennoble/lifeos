# LifeOS — Roadmap & Backlog

The ordered, actionable build plan. This is the **control panel**: pick the top
unchecked item, build it, check it off, update the relevant doc.

- **Why each item exists** and the full design rationale live in
  [`PRODUCT_EVOLUTION.md`](./PRODUCT_EVOLUTION.md). This file is the *what next*;
  that file is the *why & how*.
- Effort sizing: **S** < 1 wk · **M** 1–2 wk · **L** 3+ wk (solo-dev).
- Each item notes **[Cursor]** or **[Claude Code]** as the suggested driver (see
  [`AGENTS.md`](../AGENTS.md) for the split). This is a hint, not a rule.

---

## Phase 0 — Done (today)

- [x] Single-user MVP: capture → classify → inbox/insights/briefing/chat/reflect
- [x] Supabase backend: `entries`/`reminders`/`briefings`, 5 edge functions, RLS
- [x] Android standalone APK (local release build)
- [x] Keyboard-overlap fix on chat / journal / brain-dump inputs

---

## Phase 1 — Foundation (do these first, in this order)

> The whole rest of the roadmap stands on P1. Do not skip the audit.

- [x] **1.1 Service-role security audit** · M · **[Claude Code]**
  Shared `createUserScopedClient`; all service-role queries user_id-scoped.
  `docs/SECURITY_AUDIT.md` + `npm run audit:service-role`.

- [x] **1.2 Feedback capture loop** · S–M · **[Claude Code]** (backend) → **[Cursor]** (settings list UI)
  - [x] Add `feedback` domain to `classify-entry` (+ `fb:` tag fast-path).
  - [x] New `app_feedback` table (+ RLS).
  - [x] Feedback kept out of `entries` — briefing/anti-entropy queries unchanged.
  - [x] Simple feedback list in Settings (`app/feedback.tsx`).
  - [x] One-time backfill recovered 3 buried items (`scripts/backfill-feedback.mjs`).
  - *Deferred:* feedback digest (2.1), chat persistence as feedback source, recurring nudge.

- [x] **1.2b Reminders v2 (flexible scheduling)** · M · **[Claude Code]**
  One-off and relative-time reminders (e.g. "remind me in 10 mins") via
  `reminder_in_minutes` / `remind_at` / `due_at` + local push. Health daily unchanged.
  *User-tested 2026-06-30: push works; gaps → 1.2d–1.2f.*

- [x] **1.2d Reminder UX polish** · S · **[Cursor]**
  Classifier remind→task + title fix; multi-item `{ items }` API; EntryCard 🔔 badge;
  notification tap → inbox highlight; Android HIGH channel. *Notif actions → 1.2f.*

- [x] **1.2g Feedback ritual (v0)** · S · **[Cursor]**
  Settings badge + "Give feedback" modal (`fb:` pre-fill); weekly Sunday nudge toggle;
  notification tap → feedback capture. *Journal scanner still deferred.*

- [x] **2.1-lite On-demand feedback digest (v0)** · S · **[Claude Code]** + **[Cursor]**
  `feedback-digest` edge fn + `feedback_digests` table; Settings → "Generate feedback backlog"
  (Haiku clusters/prioritizes open items). *Scheduled pg_cron digest still → full 2.1.*

- [x] **Idea threads v0** · S · **[Cursor]**
  `idea: ThreadName` fast-path in classify; `metadata.thread`; inbox thread chips + EntryCard badge.

- [x] **1.2e Inbox sort & filter** · S · **[Cursor]**
  Sort: newest/oldest, due soonest, priority. Filters: pending only, has reminder, has due date.
  Persisted in `useSettings`; `lib/inbox-query.ts`.

- [x] **1.2f Reminder accountability loop (v3)** · M · **[Claude Code]** + **[Cursor]**
  Notif actions Done/Snooze; horizon-aware snooze limits; +4h same-day follow-up;
  EOD review screen + Settings toggle; blocked note + linked follow-up task.

- [x] **1.2c Voice capture** · S–M · **[Cursor]**
  Tap-to-record, 3 min cap, journal + reflect voice; multi-item split on classify.

- [x] **1.2g Feedback: journal scanner** · S · **[Claude Code]**
  `scan-journal-feedback` edge fn; Haiku detects app feedback in journals → `app_feedback`.

- [x] **1.3 Per-user preferences + memory tables** · M · **[Claude Code]**
  `user_preferences` + `user_memory` tables; memory summary injected into classify/chat/briefing/journal-scan.

- [x] **1.4 Token-usage / cost tracking** · S–M · **[Claude Code]**
  `ai_usage` table; all Claude/Whisper edge fns log tokens; Settings → AI usage this month.

- [ ] ~~**1.3b Pattern learning job**~~ → superseded by **2.0 person model** + **2.4 Mirror** (2026-09-10).

---

## Phase 1.5 — Friend Beta (current milestone, 2026-07-27)

> Goal: hand the app to a few friends and **measure whether they benefit**.
> Driven by usage introspection + feedback analysis (`FEEDBACK_ANALYSIS.md`).
> Beta success criteria per friend (measured via `scripts/introspect-usage.mjs`):
> returned on 3+ separate days in week 1 · ≥1 real (non-test) capture ·
> ≥1 reminder acknowledged · knows how to send `fb:` feedback.

- [x] **FB-1 Personalized identity** · S · **[Cursor]** *(2026-07-27)*
  Display name in `user_preferences.preferences` → home greeting (`lib/greeting.ts`,
  `hooks/useProfile.ts`) + briefing/chat prompts (`_shared/memory.ts
  fetchProfileContext`, deployed). Settings → Profile edit. Fixes F19/D1.
- [x] **FB-2 Onboarding v0** · S–M · **[Cursor]** *(2026-07-27)*
  `components/OnboardingGate.tsx`: name → notification opt-in → home guided
  capture. Skipped when account already has a name (reinstall-safe).
- [x] **FB-3 Morning brief on by default** · S · **[Cursor]** *(2026-07-27)*
  Onboarding opt-in enables notifications + schedules the daily nudge; rituals
  re-applied every launch (`NotificationRouter`).
- [x] **FB-4 Reminder telemetry + channels** · S · **[Cursor]** *(2026-07-27)*
  `lib/reminder-sync.ts` writes `sent_at`/`acknowledged_at`. Fixed Android
  channel bug (channelId moved to trigger per Expo v56); reminders = HIGH+sound,
  new `rituals` channel = LOW+silent.
- [x] **FB-5 Feedback triage pass** · S · **[Cursor]** *(2026-07-27)*
  `scripts/triage-feedback.mjs` ran: 17 triaged, 2 done (F4, F8). 0 left at `new`.
- [x] **FB-6 Small-UX batch** · S · **[Cursor]** *(2026-07-27)*
  Per-day AI cost in Settings (F6) · reminder quick-edit in entry detail (F5) ·
  timestamps in detail modal verified already shipped (F11).
- [ ] **FB-7 Beta build & rollout** · S · **[Claude Code]** *(build done 2026-07-27)*
  ✅ Version bumped to 1.1.0 (versionCode 4) + local `gradlew assembleRelease` →
  `apk/27072026_170253/LifeOS.apk`. Remaining: share APK with 2–3 friends →
  measure week-1 with `scripts/introspect-usage.mjs` against the success criteria.

---

## Phase 1.6 — Trust the machine (re-ordered 2026-09-10)

> Owner re-ordered the backlog after a close re-read of the raw record
> (`INTELLIGENCE_DESIGN.md` §1–2). Rule: **nothing time-based or intelligent is
> trustworthy until the clock, the scheduler, and the telemetry are.** These are
> small and precede every specialist.

- [x] **T-1 Reminder telemetry (D2) root-caused + fixed** · S · **[Cursor]** *(2026-09-10)*
  Background deliveries never hit the foreground listener → `sent_at` never written →
  ack no-op'd. `reconcileFiredReminders()` on launch/foreground + ack fallback
  (`lib/reminder-sync.ts`). *Device-verify: `DEVICE_TEST_CHECKLIST` F.9.*
- [x] **T-2 Router temporal grounding** · S · **[Cursor]** *(2026-09-10, deployed)*
  Client sends `client_now` + IANA `timezone`; `_shared/temporal.ts` injects the
  current date/weekday/zone into the classifier prompt; `metadata.start_at` (a
  practice begins) vs `due_at` (deadline); stale-timestamp guard. Fixes the
  "wake up tomorrow" → 2025 bug. Live-verified.
- [x] **T-3 Briefing in the user's day** · S · **[Cursor]** *(2026-09-10, deployed)*
  `date` and "today's reminders" computed in the user's zone; `start_at` items are
  "starting", never overdue; short-first shape (≤45-word first paragraph); markdown
  stripped server-side (stored briefings had literal `**`).
- [x] **T-4 Keep-alive + external scheduler seed** · S · **[Cursor]** *(2026-09-10)*
  `.github/workflows/keep-alive.yml` — daily PostgREST + functions-gateway ping.
  **Owner action:** add repo secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, push.
  Grows into the Coordinator's ritual scheduler (design §3.3, §7.1).
- [x] **T-5 Home de-clutter (F21)** · S · **[Cursor]** *(2026-09-10)*
  Greeting in header row; capture first; briefing collapsed to first paragraph with
  More/Less; "Just captured" = today only, deduped against Today; Notifications action
  hidden once granted.
- [ ] **T-6 Eval harness v0** · S · **[Claude Code]**
  Golden set from the owner's record (redacted fixture) → `scripts/eval-router.mjs`;
  gates prompt changes. Would have caught T-2 on day one; also catches model variance
  seen during T-2 verification.
- [ ] **T-7 Server-side reminder firing** · M · **[Claude Code]**
  `reminders` rows become the source of truth; scheduler fires Expo push so
  reminders survive reinstall. Local scheduling stays as offline fallback.

---

## Phase 1.7 — Next build polish (queued 2026-09-10)

Small fixes to bundle with the next APK (follow-ups UI + share-intent when ready):

- [ ] **1.7a Forgot password (F27)** · S · **[Cursor]**
  `AuthGate`: "Forgot password?" on sign-in → `supabase.auth.resetPasswordForEmail(email)`
  → inline "Check your email" confirmation; no dead-end when logged out. Verify Supabase
  Auth redirect URL / deep link for the reset link on Android.

- [ ] **1.7b APK: follow-ups + auth fix** · S · **[Claude Code]**
  Bump version; `gradlew assembleRelease`; device-test F.9/F.12/F.13 + sign-in recovery.

---

## Phase 2 — Specialists (organize → release → reflect), then the true agent

> Per-job specialists, not per-domain personas (`INTELLIGENCE_DESIGN.md` §3.5).
> Coordinator is deterministic. Every specialist write beyond exact-duplicate
> linking goes through `proposals` (one tap to accept).

- [ ] **2.0 Person model + user codes** · M · **[Claude Code]**
  Widen `user_memory` (area/project/person/rhythm/code/value + stable `key`, `source`);
  **seed from the record** (Muladhara = explicit project; areas incl. household, pet,
  work, community, society); Router recognizes user codes (BD1) — no more expiring
  notes for tagged captures. *Replaces 1.3b.*

- [ ] **2.1 Projects + links** · M · **[Claude Code]**
  `projects`, `entry_links` (`duplicate_of` / `part_of` / `related` / `follow_up_of` /
  `decomposed_from`), `entries.merged_into`; Router returns one thought with `parts[]`
  instead of N fragments; idea threads v0 migrates into projects.

- [ ] **2.2 Librarian v0 (organize)** · M · **[Claude Code]** + **[Cursor]**
  pgvector on `entries`; exact + near-duplicate detection on capture and nightly;
  auto-link exact dupes (<24 h), `proposals` for the rest; inbox "×N" card.
  Addresses the 30 % fragment/duplicate rate (F7, F9).

- [ ] **2.3 Steward v0 (release + drive)** · M · **[Cursor]** + **[Claude Code]**
  Weekly review pack: Keep / Done / Schedule / Let go / Ask for help; Eisenhower +
  staleness + collector's-fallacy selection (deterministic); one Haiku line per item in
  witness voice; calm cleared-state screen. Reshapes `anti-entropy`.
  **F28 (drive):** briefing + Steward each propose exactly **one** next right action with
  the reason it matters — help the owner *do* the good thing, not just see it.
  (F7, F12a/d, F13a/d, F14b/f, F17 stage 1, D5, F28.)

- [ ] **2.4 Mirror (reflect)** · M · **[Claude Code]**
  Nightly pattern extraction → person model; weekly/monthly reflection digest (F10b);
  monthly asks one question back. *Replaces 2.2 pattern learning.*

- [ ] **2.5 Coordinator policies + transparency** · M · **[Claude Code]**
  Budget (tokens/day), quiet (≤3 proactive/day, night silence), per-specialist toggles
  (F14d), `agent_runs`, Settings → "What the assistant did".

- [ ] **2.6 Feedback digest (scheduled) — Builder** · S · **[Claude Code]**
  Weekly `feedback-digest` via the external scheduler. *On-demand v0 shipped.*

- [x] **2.8a Provenance + Follow-ups v0** · S · **[Cursor]** *(2026-09-10)*
  `metadata.source / original_at / import_batch_id / follow_ups[]`; Follow-ups screen, Home
  banner, badges; `updateEntryMetadata`. First WhatsApp batch (11 entries, 20 questions)
  curated in. Design §9.

- [ ] **2.8b Capture from anywhere** · M · **[Claude Code]** (native) + **[Cursor]** (flow)
  Android share-intent (`expo-share-intent`) + WhatsApp chat-export (`.txt`) parser →
  batch import with `original_at`; Interviewer (Haiku) generates follow-ups per item;
  batch shown as one event. Design §9.4. *Auto-reading other apps: evaluated, declined.*

- [ ] **2.9 Timeline** · S · **[Cursor]**
  Inbox sort by `thoughtTime()`; batch grouping; "written vs. imported" everywhere.
  Mirror consumes capture-pattern signals (design §9.2).

- [ ] **2.7 Config-driven home screen** · M · **[Cursor]** (with **[Claude Code]** for the refactor)
  `layout_config` jsonb; home renders cards from config. Scope to the home card
  list only — do not boil the ocean.

---

## Phase 3 — Products & tiering

- [ ] **3.1 Suggestion engine** · M · **[Claude Code]**
  `product_suggestions` table + scheduled `suggestion-engine` fn. Rule-assisted +
  LLM rationale. Surfaces e.g. "you're a thinker → try IdeaBox" as a dismissible card.

- [ ] **3.0 Agent platform core + Researcher** · L · **[Claude Code]**
  `agents` + `agent_runs` + `run-agent` (Claude tool-use loop; read-only
  `query_entries`, `web_search`, `propose_entries`). The **only true agent**; premium,
  off by default, on request or owner-set threshold. Port `ai-chat` to a built-in agent.
  *Verify model IDs & tool-use shapes against the `claude-api` skill first.*

- [ ] **3.2 IdeaBox v1** · L · **[Claude Code]** (agents) + **[Cursor]** (tab UI)
  Separate *surface*, shared *substrate* (`INTELLIGENCE_DESIGN.md` §8, §9.5). Ideas are
  **promoted** from the inbox via `research_ready`; Idea Brief accumulates from follow-up
  answers first. **Dharma gate first** ("should this exist, should we?"), Interviewer lays
  out paths with honest cost ranges (film: Bollywood / animation / AI pipeline), then
  path-specific worker sets: app → Scout/Differentiate/Evaluate → Builder set (spec → build
  → test → Play Store, gated); content → treatment/production plan; social platform →
  stakeholder/verification/pilot. Results land as entries + tags + AI/owner action items.
  Behind a **premium** flag. Candidates (2026-09-10): Swara Vigyan, Vigyan Bhairav,
  Mahat film, Community finder, Surplus sharing, Living heritage, Common good delivery.

- [ ] **3.2b Stale-item research agent (F20)** · M–L · **[Claude Code]**
  User-configurable: important item pending N days (e.g. 15) → Researcher
  decomposes it and suggests concrete next steps (e.g. "ultrasound pending →
  here are nearby well-rated options"), then offers related follow-ups.
  Token-heavy → **premium tier**. Depends on 3.0; stage 1 (non-AI stale surfacing)
  ships in Steward (2.3).

- [ ] **3.3 User-authored agents** · L
  UI to create/tune `agents` rows; write tools with confirmation. *Depends on 3.0.*

---

## Phase 4 — Long horizon (demand-gated)

- [ ] **4.1 Atomic UI customization** · XL · *optional*
  Drag-and-drop layout, widget registry. High permanent maintenance cost — only
  pursue if 2.4 proves demand. The config-driven home likely captures 80% of value.

- [ ] **4.2 iOS release** · M
  Code is already cross-platform. Needs Apple Developer account ($99/yr) + cloud/Mac
  build + TestFlight. Defer until an iPhone target or testers exist.

---

## Critical path (what unblocks what)

```
T-1..T-5 trust (done) ─► T-6 eval harness ─► every prompt change thereafter
T-4 keep-alive ────────► external scheduler ─► T-7 server reminders · 2.4 Mirror · 2.6 digest
2.0 person model ──────► 2.1 projects/links ─► 2.2 Librarian ─► 2.3 Steward
2.0 person model ──────► 2.4 Mirror ─────────► 3.0 Researcher ─► 3.2 IdeaBox / 3.2b
2.5 coordinator ───────► (budget/quiet/toggles gate every specialist)
1.4 token tracking ────► (feeds premium tiers & quotas everywhere)
2.7 config home ───────► 4.1 atomic layout (optional)
```

**Next agent:** read [`NEXT_AGENT_HANDOFF.md`](./NEXT_AGENT_HANDOFF.md) then start **T-6** (eval harness) and **2.0** (person model).
