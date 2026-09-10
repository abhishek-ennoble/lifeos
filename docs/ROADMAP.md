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

- [ ] **1.3b Pattern learning job** · M · **[Claude Code]**
  Scheduled `learn-patterns` → populate `user_memory`. *Tables ready; job → 2.2.*

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

**Next after beta ships:** the **let-go/triage slice** (F7, F12–F14, F17 stage 1)
— weekly stale review: Keep / Done / Let go, reward on cleared inbox.

---

## Phase 2 — Learning & agents

- [ ] **2.1 Feedback digest (scheduled)** · M · **[Claude Code]**
  pg_cron weekly `feedback-digest`; auto-push or in-app card. *On-demand v0 shipped.*

- [ ] **2.2 Pattern learning** · M · **[Claude Code]**
  Scheduled `learn-patterns` fn summarizes recent entries/journals into
  `user_memory`. Feeds personalization + suggestions.

- [ ] **2.3 Agent platform core** · L · **[Claude Code]**
  `agents` + `agent_runs` tables, one `run-agent` edge fn (Claude tool-use loop),
  port `ai-chat` to a built-in agent. Start with read-only `query_entries` tool.
  *Verify model IDs & tool-use shapes against the `claude-api` skill first.*

- [ ] **2.4 Config-driven home screen** · M · **[Cursor]** (with **[Claude Code]** for the refactor)
  `layout_config` jsonb; home renders cards from config. Scope to the home card
  list only — do not boil the ocean.

---

## Phase 3 — Products & tiering

- [ ] **3.1 Suggestion engine** · M · **[Claude Code]**
  `product_suggestions` table + scheduled `suggestion-engine` fn. Rule-assisted +
  LLM rationale. Surfaces e.g. "you're a thinker → try IdeaBox" as a dismissible card.

- [ ] **3.2 IdeaBox v1** · L · **[Claude Code]** (agents) + **[Cursor]** (tab UI)
  Research agents over existing `domain='idea'` entries (web_search → summarize →
  estimate value). Behind a **premium** flag. Built on the agent platform (2.3).

- [ ] **3.2b Stale-item research agent (F20)** · M–L · **[Claude Code]**
  User-configurable: important item pending N days (e.g. 15) → research agent
  decomposes it and suggests concrete next steps (e.g. "ultrasound pending →
  here are nearby well-rated options"), then offers related follow-ups.
  Token-heavy → **premium tier**. Depends on 2.3; stage 1 (non-AI stale surfacing)
  ships in the let-go slice.

- [ ] **3.3 User-authored agents** · L
  UI to create/tune `agents` rows; write tools with confirmation. *Depends on 2.3.*

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
1.2b reminders v2 ─► 1.2d polish ─► 1.2e inbox sort ─► 1.2f accountability loop
1.2c voice ──────────── shipped (2026-06-30); device test pending
1.2g feedback ritual ── (parallel after polish)
1.1 service-role audit ─► multi-tenant ─► 1.3 memory ─► personalization
1.2 feedback capture ─► 2.1 feedback digest
1.4 token tracking ───► (feeds premium tiers & quotas everywhere)
2.3 agent platform ───► per-user agents (user feedback theme)
2.4 config home ──────► 4.1 atomic layout (optional)
```

**Next agent:** read [`NEXT_AGENT_HANDOFF.md`](./NEXT_AGENT_HANDOFF.md) then start **1.2e** inbox sort.
