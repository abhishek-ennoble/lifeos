# Next agent handoff — LifeOS (2026-07-27)

**Read this first**, then [`ROADMAP.md`](./ROADMAP.md) for ordered backlog.

## Latest session (2026-07-27) — Friend Beta (Phase 1.5)

Introspected real usage (`scripts/introspect-usage.mjs` → `.discovery/`, gitignored),
analyzed all 19 feedback items (`docs/FEEDBACK_ANALYSIS.md` — living triage doc),
then shipped FB-1…FB-6:

| Slice | What shipped |
|-------|--------------|
| FB-1 | Display name in `user_preferences` → greeting + briefing/chat prompts (fixes friend seeing "Abhishek"); Settings → Profile |
| FB-2 | `OnboardingGate` first-run: name → notification opt-in |
| FB-3 | Morning briefing nudge on by default after opt-in; rituals re-applied each launch |
| FB-4 | Reminder telemetry write-back (`lib/reminder-sync.ts`); Android channel fix (channelId → trigger); silent `rituals` channel |
| FB-5 | Feedback backlog triaged: 17 triaged / 2 done / 0 new |
| FB-6 | Per-day AI cost; reminder quick-edit in entry detail |

Verified: typecheck ✅ · vitest ✅ · service-role audit ✅ · `verify-friend-release` 18/18 ✅ ·
briefing personalization confirmed live. **FB-7 build done**: 1.1.0 (versionCode 4) →
`apk/27072026_170253/LifeOS.apk`. Remaining: owner device-test
(`docs/DEVICE_TEST_CHECKLIST.md`), hand to 2–3 friends, measure week-1
(success criteria in ROADMAP Phase 1.5).
**After beta: the let-go/triage slice** (FEEDBACK_ANALYSIS §5).

## Product north star (do not over-engineer)

Lightweight **personal assistant** = capture (voice/text) → classify → inbox/journal → **supportive reminders** → morning briefing → AI chat with **user context**. Evolves toward **per-user agents** and **customization at scale** — not a heavy task manager.

Design test: *Does this feel like a thoughtful friend, or a nagging app?* Reminders and follow-ups must be **supportive, sparse, skippable**.

---

## What shipped (last sessions)

| Area | Status |
|------|--------|
| Feedback + Ideas v0 | Ritual (badge, modal, weekly nudge), on-demand digest, idea threads |
| Inbox sort & filter (1.2e) | Sort chips + filters sheet; persisted in settings |
| Voice capture (1.2c) | Tap-to-record, 3 min cap; Home FAB, Brain dump, Journal draft, Reflect |
| Reminder UX (1.2d) | Classifier remind→task; 🔔 badge; notif tap→inbox; Android channel |
| Multi-item capture | One transcript → up to 5 entries via `{ items: [...] }` classify API |
| Feedback Phase A | `app_feedback` table, `fb:` + classifier, Settings list, 3 backfilled items |
| Reminder accountability (1.2f) | Done/Snooze notif actions; EOD review; blocked → follow-up task |
| Reminders v2 | Relative/one-off local push via `lib/reminder-plan.ts` + `lib/notifications.ts` |

**Next unchecked on roadmap:** Phase 2 — scheduled feedback digest (2.1) or pattern learning (2.2).

| Foundation 1.1–1.4 | Security audit, journal scanner, memory tables, AI cost tracking |

**Latest APK:** see `BUILD_STATUS.md`.

---

## Reminder accountability (1.2f) — shipped

- Notification category: **Done** / **Snooze** (horizon-aware limits in `lib/reminder-accountability.ts`)
- Same-day +4h follow-up for pending items (`scheduleReminderFollowUp`)
- **Settings → End-of-day reminder review** (off by default; uses `eveningTime`)
- **`/reminder-review`** screen: Done / Tomorrow / Still pending + optional follow-up task
- Fire log in local storage (`lib/reminder-fire-log.ts`); state in `metadata.reminder_state`

---

## 1. Reminder system — reference (design principles)

| Do | Don't |
|----|--------|
| Help complete what user already said matters | Nag about everything pending |
| One clear action per notification | Stack 5 identical "Reminder" titles |
| Tap → land on entry → Done / Snooze / Still blocked | Tap → generic app open |
| Scale follow-up to horizon (10 min ≠ 7 days) | Same EOD chase for all |
| End-of-day **one** gentle digest | Hourly re-pings |
| User can disable per-entry or globally | Irreversible notification spam |

### Current architecture (v2)

```
capture → classify-entry (reminder_in_minutes / remind_at / wants_reminder)
       → entries row + reminders row (Supabase)
       → scheduleEntryReminders() (local expo-notifications only)
```

**Limits today:** Local-only (lost on reinstall); no accountability loop; classifier routes bare "remind me" to `note`.

### Slice 1.2d — Reminder UX polish · S · Cursor

Ship before v3 loop:

1. **Classifier:** Remind intent + substantive content → **`task`** with real title; bare "remind in X" → task title from context or "Reminder: {snippet}", not generic `note`.
2. **EntryCard:** Show 🔔 + human time ("in 10 min" / "today 3pm") from metadata/`due_at`.
3. **Notification tap:** `addNotificationResponseReceivedListener` in [`app/_layout.tsx`](app/_layout.tsx) → navigate to inbox with entry highlighted OR simple entry detail modal with Done / Snooze 1h.
4. **Android channel:** `setNotificationChannelAsync` — importance HIGH, sound default.

### Slice 1.2f — Reminder accountability loop (v3) · M · Claude Code + Cursor

**Goal:** After a reminder fires, gently close the loop — did you do it, blocked, or defer?

**Data model (minimal):**

Extend `reminders` table (migration):

```sql
-- add to reminders:
acknowledgment text CHECK (acknowledgment IN ('done','snoozed','blocked','dismissed')),
snooze_until timestamptz,
follow_up_at timestamptz,
follow_up_count int DEFAULT 0
```

Or store on `entries.metadata.reminder_state` for MVP — prefer **`reminders` row** since one entry can have multiple fires.

**Behavior by horizon:**

| Reminder type | On fire | If still pending after fire |
|---------------|---------|------------------------------|
| Relative (≤1h) | Push with actions: Done / Snooze 15m / Open | One snooze max, then stop |
| Same-day due | Push + optional second nudge +4h | EOD soft check (see below) |
| Multi-day (e.g. 7d) | Push at due | One follow-up at due; EOD check only if user enabled |

**End-of-day recheck (supportive, not clutter):**

- **Optional** ritual (Settings toggle, default **off** initially): one notification ~user's evening reflection time.
- Body: *"You had 2 reminders today — tap to quick-review."* → opens **Reminder review** sheet (not full inbox): each item → Done / Still pending / Snooze tomorrow.
- If **Still pending:** optional one-line "What's blocking?" → saves to entry metadata or spawns linked `note` — **no agent call**.

**Blocked / dependency:**

- "Still pending" → optional prompt: *"Add a follow-up task?"* → pre-filled capture with `linked_entry_id` in metadata.
- Defer heavy "dependency graph" to agent platform phase.

**Implementation order for v3:**

1. Notif actions (Done/Snooze) via `expo-notifications` categories (Android) / iOS equivalent
2. EOD review screen + Settings toggle
3. Follow-up scheduler (local first; server cron later when pg_cron enabled)
4. Horizon rules in `lib/reminder-plan.ts` (single policy module)

**Explicitly defer:** Server-side FCM, ML-based "best time to remind", auto-reschedule chains >2 deep.

---

## 3. Feedback pipeline (still pending)

Phase A done. Next slices (after reminder polish or parallel):

| Slice | What |
|-------|------|
| Journal scanner | After `captureJournal`, Haiku detects app-improvement → `app_feedback` |
| Feedback ritual | Settings toggle, weekly nudge, `fb:` pre-fill, new-count badge |
| Digest (2.1) | Cluster + prioritize → dev backlog artifact |

Chat persistence as feedback source: **defer** until digest proves value.

---

## 4. Voice (1.2c) — shipped

**Status:** Implemented 2026-06-30. `VoiceInput` uses `expo-audio` → `lib/whisper.ts` → `captureText`.

**Surfaces:** Home FAB, Brain dump modal (inline mic).

**Device test checklist:** mic permission, hold-to-record, Hindi/English mix, empty/silent audio, airplane mode after record, feedback via voice (`fb:` intent).

---

## 5. Real user data (abhshk.0308@gmail.com)

**Reminder test entries (2026-06-30):** 5 rows with `reminder_in_minutes` — 3 generic `note`/"Reminder", 1 task "Check laptop processes" (marked done), 1 older yoga task.

**Recovered feedback themes:** agents per domain, customization/premium, capture reliability.

**Discovery script:** `node scripts/discover-feedback.mjs` → `.discovery/entries.json` (gitignored).

---

## 6. Files map (reminder + inbox)

| File | Role |
|------|------|
| [`lib/reminder-plan.ts`](lib/reminder-plan.ts) | Compute daily + once fire times |
| [`lib/notifications.ts`](lib/notifications.ts) | Schedule/cancel local push |
| [`hooks/useEntries.ts`](hooks/useEntries.ts) | Capture → DB reminders + schedule |
| [`hooks/useReminders.ts`](hooks/useReminders.ts) | Read today's reminder rows (underused in UI) |
| [`components/InboxList.tsx`](components/InboxList.tsx) | Filter domain/life-area — add sort here |
| [`components/EntryCard.tsx`](components/EntryCard.tsx) | Add reminder badge |
| [`supabase/functions/classify-entry/index.ts`](supabase/functions/classify-entry/index.ts) | Reminder field extraction |

---

## 7. Next agent — start here

**Recommended first slice:** **1.2e Inbox sort & filter** — scannable inbox as entry count grows.

**Latest APK:** `apk/17072026_152817/LifeOS.apk` — **1.0.2** (versionCode 3) friend share:
Phase 1 features + all-time AI usage + tap-card entry detail.

**Friend share notes:** Friend creates their own email account. Needs internet for AI/voice.
Grant mic + notifications. Known limits: chat is read-only; date extraction can be wrong;
offline writes fail clearly; local reminders lost on reinstall.

---

## 8. Phase 2 alignment questions (parked — discuss before building)

User feedback to revisit when planning Phase 2 / product evolution — **not bugs, not in scope for Phase 1 close-out**:

1. **Cleanup** — How do old entries, duplicates, and stale captures get cleaned up? (Anti-entropy is a start; dedup is not built.) Chat-saved feedback may have landed in `app_feedback` via classifier — verify in Settings → App feedback.
2. **Grouping** — How should similar entries cluster (e.g. 10 notes on one topic)? Idea threads v0 is a first slice; broader semantic grouping is Phase 2+.
3. **Multi-domain brain dump** — One journal/voice dump with tasks + ideas + health: classify already returns `{ items: [...] }` (up to 5). Longer dumps may need explicit split UX or a dedicated "parse this dump" flow.
4. **New disciplines** — Adding a new life area (e.g. learning a skill): today = capture → classify → domain screen + reminders. Deeper "discipline" (streaks, spaced rep, coaching) lives in domain-specific roadmap items.

---

## 9. Long-term arc (context only — not next sprint)

- **1.3 memory** → chat knows the person
- **2.3 agents** → domain-specific helpers user asked for in feedback
- **2.4 / 4.1 customization** → config home → atomic layout for many user types
- **Multi-tenant** → blocked on **1.1 security audit**

Keep each slice shippable on mid-range Android, patchy internet, single user (you) first.
