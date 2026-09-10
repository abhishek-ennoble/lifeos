# LifeOS — Build Status (source of truth)

Legend: ✅ works · ⚙️ deployed but unexercised by app · 🟡 partial · ⛔ not built

## Features
| Feature | Status | Grounding |
| --- | --- | --- |
| Email/password auth (sign in / sign up) | ✅ | `components/AuthGate.tsx` (`signInWithPassword`, `signUp`) |
| Text capture + AI classify → entry | ✅ | `captureText` → `classify-entry`; multi-item split returns `{ items: [...] }` |
| App feedback capture (`fb:` + classifier) | ✅ | `classify-entry` feedback domain; routes to `app_feedback` table |
| App feedback ritual + digest v0 | ✅ | Badge, Give feedback modal, weekly nudge, on-demand digest |
| Idea threads v0 | ✅ | `idea: ThreadName` fast-path; inbox thread chips; EntryCard badge |
| Brain dump capture | ✅ | `components/CaptureInput.tsx`, Home `index.tsx` |
| Inbox: sort (newest, oldest, due, priority) | ✅ | Sort chips + `lib/inbox-query.ts`; persisted in settings |
| Inbox: filters (pending, reminder, due date) | ✅ | Filters sheet in `InboxFiltersModal.tsx` |
| Inbox: idea thread filter | ✅ | Thread chips when Ideas domain active; `lib/idea-threads.ts` |
| Inbox: browse by domain & life-area | ✅ | `app/(tabs)/inbox.tsx`, `InboxList` |
| Entry detail (tap card → full text) | ✅ | `EntryDetailModal` from `EntryCard` tap |
| Home "Today" strip + mark done | ✅ | `app/(tabs)/index.tsx` `selectToday`, `updateEntryStatus` |
| Status changes (done / archive=delete) | ✅ | `useEntries.ts` `updateEntryStatus`, `deleteEntry` |
| Offline SQLite read-through cache | ✅ | `lib/sqlite.ts`, read before network in `refresh` |
| Morning briefing (on-demand generate) | ✅ | `useBriefing.ts` → `morning-briefing`; tap to generate |
| Briefing auto-schedule (pg_cron) | ⛔ | `migrations/...pg_cron_jobs.sql` is fully commented out |
| Anti-entropy stale banner | 🟡 | `useChat.ts` `useAntiEntropy` queries DB **directly**, not the function |
| `anti-entropy` edge function | ⚙️ | deployed but app never calls it (DB query used instead) |
| AI chat | 🟡 | works but **read-only** — answers over pending entries, cannot create/edit; input bar uses `KeyboardStickyView` |
| Journal capture (manual) | ✅ | `useEntries.ts` `captureJournal`, `domain='journal'`, `status='done'` |
| Journal/reflection **review UI** | 🟡 | no dedicated screen; appear only as a chip in Inbox list |
| Evening reflection flow | ✅ | `app/reflect.tsx` → `captureJournal` |
| Health daily reminders (local notif) | ✅ | `lib/notifications.ts` DAILY trigger from `metadata.times` |
| Morning/evening ritual notifications | ✅ | `scheduleMorningBriefingNotification`, `scheduleEveningReflection` (DAILY) |
| Journal → app feedback scanner (1.2g) | ✅ | `scan-journal-feedback` after `captureJournal` |
| AI usage tracking (1.4) | ✅ | `ai_usage` table; Settings → today + this month + all-time cost |
| User memory injection (1.3) | ✅ | `user_memory` table; injected in classify/chat/briefing |
| Display name personalization (FB-1) | ✅ | `user_preferences.preferences.display_name`; greeting (`lib/greeting.ts`) + briefing/chat prompts (`_shared/memory.ts`); Settings → Profile |
| Onboarding v0 (FB-2/FB-3) | ✅ | `OnboardingGate`: name → notification opt-in → briefing nudge on by default; rituals re-applied per launch |
| Reminder cloud telemetry (FB-4, D2 fix) | ✅ | `lib/reminder-sync.ts` — `reconcileFiredReminders` on launch/foreground; ack falls back to past-due unsent row |
| Classifier temporal grounding (T-2) | ✅ | `_shared/temporal.ts` + `lib/temporal-context.ts`; `start_at` vs `due_at`; stale guard |
| Keep-alive / scheduler seed (T-4) | ✅ | `.github/workflows/keep-alive.yml` daily 08:00 IST; secrets set |
| Notification channels (FB-4) | ✅ | `channelId` on **trigger** (Expo v56 fix); `reminders` HIGH+sound, `rituals` LOW+silent |
| Reminder quick-edit from entry detail (FB-6) | ✅ | `EntryDetailModal` → In 1 hour / Tomorrow 9am |
| Unit tests (vitest) | ✅ | `npm test`; pure lib logic (`tests/`) |
| Service-role security audit (1.1) | ✅ | `docs/SECURITY_AUDIT.md`; `npm run audit:service-role` |
| One-off / relative-time reminders | 🟡 | v2 + 1.2d polish + 1.2f accountability loop |
| `reminders` table rows → push | ✅ | Rows written at capture; local notif scheduled for all domains with remind intent |
| Voice capture / transcription (in-app) | 🟡 | Tap-to-record → Whisper → `captureText`; Home FAB, Brain dump, Journal draft, Reflect. 3 min cap. |
| `transcribe-audio` (Whisper) backend | ✅ | `transcribe-audio` edge fn; invoked from `lib/whisper.ts` on voice capture |
| Spaced repetition / learning sessions | 🟡 | `logLearningSession` exists; interval logic in `lib/spaced-repetition.ts`, limited UI |

## Known weak spots
- **Date extraction** — grounded since 2026-09-10 (T-2); residual model variance until the eval harness (T-6) gates prompt changes.
- **Voice capture** — requires network for Whisper; audio deleted after transcript.
- **Capture save feedback** — domain-aware toast ("Saved to Notes") with tap → Inbox highlight; Home "Just captured" strip; "Classifying…" loading state.
- **Inbox + journals** — default "Pending only" filter now still shows `domain=journal` (saved as done).
- **Ask AI keyboard** — `KeyboardAvoidingView` on chat screen; empty state notes read-only mode.
- **No two-way sync** — SQLite is read cache only; mutations go straight to Supabase.

## Backend status
Live: auth, Postgres DB (8 tables: `entries`, `reminders`, `briefings`, `app_feedback`,
`feedback_digests`, `user_preferences`, `user_memory`, `ai_usage`, all RLS-protected), and 7 edge functions. AI works against Anthropic
(Claude Haiku/Sonnet) with available credits; transcription uses OpenAI Whisper.
Secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) live in Supabase function secrets,
not the app. pg_cron scheduling is not enabled (jobs commented out).

**Feedback backfill (2026-06-29):** 3 buried app-improvement items recovered from
existing entries into `app_feedback` via `scripts/backfill-feedback.mjs`.

**Latest APK:** `apk/10092026_165801/LifeOS.apk` — **1.2.0** (versionCode 5) Trust-the-machine build
(T-1…T-5): D2 reminder-telemetry fix (foreground reconcile), classifier temporal grounding
(client sends clock + timezone), briefing in user's day / short-first / no markdown, Home
de-clutter (F21). Built locally via `gradlew assembleRelease` on 2026-09-10 (105 MB).
Pre-build verification green (`typecheck`, `vitest` 24/24, `audit:service-role`;
`classify-entry` + `morning-briefing` redeployed and live-verified). Keep-alive workflow
live on GitHub Actions (secrets set, first run green). **Device-test:** `DEVICE_TEST_CHECKLIST` F.9, F.12, F.13.

**Previous APK:** `apk/27072026_170253/LifeOS.apk` — **1.1.0** (versionCode 4) Friend Beta build:
FB-1…FB-6 (display-name personalization, onboarding v0, briefing nudge default-on,
reminder telemetry + notification channel fix, feedback triage, per-day AI cost +
reminder quick-edit). Built locally via `gradlew assembleRelease` on 2026-07-27.
Pre-build verification all green (`npm run typecheck`, `npm test`,
`npm run audit:service-role`, `node scripts/verify-friend-release.mjs`;
`morning-briefing` + `ai-chat` redeployed).

> Build note (Windows): if Gradle runs with a redirected `GRADLE_USER_HOME`
> (e.g. a sandboxed temp dir), native C++ compiles fail with
> "Filename longer than 260 characters". Fix: delete `node_modules/**/android/.cxx`
> and rebuild with `$env:GRADLE_USER_HOME='C:\Users\hp\.gradle'`.

**Previous APK:** `apk/17072026_152817/LifeOS.apk` — 1.0.2 (versionCode 3).
