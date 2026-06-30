# Next agent handoff — LifeOS (2026-06-30)

**Read this first**, then [`ROADMAP.md`](./ROADMAP.md) for ordered backlog.

## Product north star (do not over-engineer)

Lightweight **personal assistant** = capture (voice/text) → classify → inbox/journal → **supportive reminders** → morning briefing → AI chat with **user context**. Evolves toward **per-user agents** and **customization at scale** — not a heavy task manager.

Design test: *Does this feel like a thoughtful friend, or a nagging app?* Reminders and follow-ups must be **supportive, sparse, skippable**.

---

## What shipped (last sessions)

| Area | Status |
|------|--------|
| Feedback Phase A | `app_feedback` table, `fb:` + classifier, Settings list, 3 backfilled items |
| Reminders v2 | Relative/one-off local push via `lib/reminder-plan.ts` + `lib/notifications.ts` |
| APK | Latest: `apk/29062026_182127/LifeOS.apk` |
| Git | `main` has reminders v2 commit; push when user wants |

**User-tested reminders (2026-06-30):** Push works (banner + sometimes sound). **Gaps found:**
- Tap notif → does **not** open the entry (no listener wired; `entryId` in payload only)
- Remind-only capture → classified as **`note`** titled "Reminder" (3 duplicates in inbox)
- No **🔔 badge** on `EntryCard` for scheduled reminders
- Android notification **channel** not configured (sound inconsistent)
- Inbox: no **sort**; domain/life-area chips only

---

## Agreed build order (updated)

```
Phase A — Reminder + Inbox polish (next)
  1.2d Reminder UX polish
  1.2e Inbox sort/filter
  1.2f Reminder accountability loop (v3, design-first slice)

Phase B — Capture breadth
  1.2c Voice capture
  1.2g Feedback: journal scanner + ritual

Phase C — Foundation
  1.1 Security audit · 1.3 Memory · 1.4 Cost tracking

Phase D — Intelligence
  2.1 Feedback digest · 2.2 Pattern learning · 2.3 Agents
```

---

## 1. Inbox sort & filter (1.2e) · S · Cursor

**Goal:** Make inbox scannable as entry count grows.

**Sort options (client-side on `InboxList` filtered list):**
- **Newest first** (default, current behavior)
- **Oldest first**
- **Due soonest** (entries with `due_at`, nulls last)
- **Priority** (high → medium → low; map user "urgent" → `high`)

**Optional filters (beyond existing domain + life-area chips):**
- **Has reminder** (`metadata.reminder_in_minutes` | `remind_at` | `wants_reminder` | health `times[]`)
- **Status:** pending / done (default: pending only toggle off = show all)
- **Has due date**

**UI:** One "Sort" control + optional "Filters" sheet in [`app/(tabs)/inbox.tsx`](app/(tabs)/inbox.tsx). Persist last choice in `useSettings` (AsyncStorage).

**Do not:** Full-text search or SQL-side sort yet — YAGNI.

---

## 2. Reminder system — design principles (1.2d + 1.2f)

Reminders are a **first-class pillar**, not just a timer. Read [`PRODUCT_EVOLUTION.md`](./PRODUCT_EVOLUTION.md) Theme 1 for feedback; this section is the reminder counterpart.

### Philosophy

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

## 4. Voice (1.2c) — when & how

**When:** After **1.2d** reminder polish (or parallel if blocked on native). Before **1.3 memory**. Voice unlocks capture; doesn't fix reminder/inbox UX.

**How (one slice):**

```
Hold mic (VoiceInput) → expo-audio record → lib/whisper.ts → transcribe-audio edge fn
                    → captureText(transcript) → same classify/reminder path as typing
```

**Surfaces:** Home FAB, Brain dump modal (already has mic placeholder).

**Privacy:** Audio in memory only; delete after transcript (existing guardrail).

**Files:** [`components/VoiceInput.tsx`](components/VoiceInput.tsx), [`lib/whisper.ts`](lib/whisper.ts), add `expo-audio` per Expo 56 docs.

**Do not:** On-device LLM, continuous listening, or separate voice-only storage.

**Product fit:** Tier 2/3 voice-first; brain dump at 2am; same AI router as text.

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

**Recommended first slice:** **1.2d Reminder UX polish** (classifier + badge + tap + channel) — unblocks user testing, small diff, high trust.

Then **1.2e Inbox sort**, then **1.2f accountability** (needs design review of EOD toggle defaults).

**Do not start:** Agent platform, atomic UI customization, server FCM, feedback digest until reminder + inbox feel right.

**Build APK:** `GRADLE_USER_HOME=C:\Users\hp\.gradle` + `cd android && .\gradlew.bat assembleRelease` → copy to `apk/<DDMMYYYY_HHmmss>/LifeOS.apk`.

**Docs rule:** Update `BUILD_STATUS.md` + `ROADMAP.md` in same commit as code.

---

## 8. Long-term arc (context only — not next sprint)

- **1.3 memory** → chat knows the person
- **2.3 agents** → domain-specific helpers user asked for in feedback
- **2.4 / 4.1 customization** → config home → atomic layout for many user types
- **Multi-tenant** → blocked on **1.1 security audit**

Keep each slice shippable on mid-range Android, patchy internet, single user (you) first.
