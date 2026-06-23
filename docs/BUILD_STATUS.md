# LifeOS — Build Status (source of truth)

Legend: ✅ works · ⚙️ deployed but unexercised by app · 🟡 partial · ⛔ not built

## Features
| Feature | Status | Grounding |
| --- | --- | --- |
| Email/password auth (sign in / sign up) | ✅ | `components/AuthGate.tsx` (`signInWithPassword`, `signUp`) |
| Text capture + AI classify → entry | ✅ | `hooks/useEntries.ts` `captureText` → `classify-entry` |
| Brain dump capture | ✅ | `components/CaptureInput.tsx`, Home `index.tsx` |
| Inbox: browse + filter by domain & life-area | ✅ | `app/(tabs)/inbox.tsx`, `InboxList` |
| Home "Today" strip + mark done | ✅ | `app/(tabs)/index.tsx` `selectToday`, `updateEntryStatus` |
| Status changes (done / archive=delete) | ✅ | `useEntries.ts` `updateEntryStatus`, `deleteEntry` |
| Offline SQLite read-through cache | ✅ | `lib/sqlite.ts`, read before network in `refresh` |
| Morning briefing (on-demand generate) | ✅ | `useBriefing.ts` → `morning-briefing`; tap to generate |
| Briefing auto-schedule (pg_cron) | ⛔ | `migrations/...pg_cron_jobs.sql` is fully commented out |
| Anti-entropy stale banner | 🟡 | `useChat.ts` `useAntiEntropy` queries DB **directly**, not the function |
| `anti-entropy` edge function | ⚙️ | deployed but app never calls it (DB query used instead) |
| AI chat | 🟡 | works but **read-only** — answers over pending entries, cannot create/edit |
| Journal capture (manual) | ✅ | `useEntries.ts` `captureJournal`, `domain='journal'`, `status='done'` |
| Journal/reflection **review UI** | 🟡 | no dedicated screen; appear only as a chip in Inbox list |
| Evening reflection flow | ✅ | `app/reflect.tsx` → `captureJournal` |
| Health daily reminders (local notif) | ✅ | `lib/notifications.ts` DAILY trigger from `metadata.times` |
| Morning/evening ritual notifications | ✅ | `scheduleMorningBriefingNotification`, `scheduleEveningReflection` (DAILY) |
| One-off / relative-time reminders | ⛔ | only `SchedulableTriggerInputTypes.DAILY` exists; no date-fire path |
| `reminders` table rows → push | 🟡 | rows written for health times but only read as briefing data, not sent |
| Voice capture / transcription (in-app) | ⛔ | `components/VoiceInput.tsx` is a no-op toast ("coming soon") |
| `transcribe-audio` (Whisper) backend | ⚙️ | function + `lib/whisper.ts` work, but app never calls them |
| Spaced repetition / learning sessions | 🟡 | `logLearningSession` exists; interval logic in `lib/spaced-repetition.ts`, limited UI |

## Known weak spots
- **Date extraction is unreliable** — classifier `due_at`/`expires_at` often wrong or empty.
- **Voice capture stubbed** — `expo-av` removed (SDK 56 incompatible); `expo-audio` migration pending.
- **No two-way sync** — SQLite is read cache only; mutations go straight to Supabase.

## Backend status
New Supabase project. Live: auth, Postgres DB (3 tables: `entries`, `reminders`,
`briefings`, all RLS-protected), and 5 edge functions. AI works against Anthropic
(Claude Haiku/Sonnet) with available credits; transcription uses OpenAI Whisper.
Secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) live in Supabase function secrets,
not the app. pg_cron scheduling is not enabled (jobs commented out).
