# LifeOS — Architecture (one-pager)

## Data flow
```
Expo / React Native app  ──►  Supabase  ──►  Claude (Anthropic) / Whisper (OpenAI)
   (Expo Router UI)            • Postgres + RLS
   • SQLite read cache         • Auth (email/password)
   • supabase-js client        • 5 Edge Functions (Deno) ──► LLM HTTP calls
```
- App talks to Postgres directly via `supabase-js` (RLS scopes rows to the user).
- AI work is never done client-side; the app `invokeFunction(...)` an edge function
  (`lib/supabase.ts`), which holds the LLM keys and calls the provider.
- `lib/sqlite.ts` is a read-through cache: `useEntries.refresh` reads cache first,
  then fetches from Postgres and re-caches. Mutations go straight to Postgres.

## Data model — one `entries` table
Everything (tasks, health, learning, ideas, notes, journals) is a row in `entries`,
discriminated by `domain`. See `migrations/20260616000000_initial_schema.sql`.

| Column | Notes |
| --- | --- |
| `domain` | enum: `health \| task \| learning \| idea \| note \| journal` |
| `priority` | `high \| medium \| low` |
| `status` | `pending \| done \| archived \| snoozed` (delete = set `archived`) |
| `metadata` | jsonb: `life_area`, `times[]`, `interval_days`, journal fields; **provenance** `source`, `original_at`, `import_batch_id`; `start_at`; `follow_ups[]` (`lib/follow-ups.ts`) |
| `due_at` / `expires_at` | timestamps (classifier-set; often unreliable) |
| `is_recurring`, `recurrence_rule` | recurrence as cron string |

Supporting tables: `reminders` (per-entry fire times), `briefings` (one row per
user per day, unique on `user_id,date`). All three have per-user RLS policies.

## Edge functions (`supabase/functions/*`)
| Function | In | Out | Model |
| --- | --- | --- | --- |
| `classify-entry` | `{ raw_input, client_now?, timezone? }` | `{ items: [...] }` structured entries (domain, title, priority, recurrence, due/expiry, life_area, `metadata.start_at`) | Claude Haiku 4.5 |
| `ai-chat` | `{ message, history }` | `{ reply }` — answers over user's pending entries (read-only) | Claude Sonnet 4.6 |
| `morning-briefing` | `{ client_now?, timezone? }` | `{ content, date }` (date = user's local day; plain text, short first paragraph), upserts `briefings` | Claude Haiku 4.5 |
| `anti-entropy` | `{}` | `{ stale_count, message, entries }` (pending task/learning/idea >30d stale) | none (DB query) |
| `transcribe-audio` | `{ audio_base64, filename }` | `{ text }` | OpenAI Whisper-1 |

Shared auth/CORS in `supabase/functions/_shared/cors.ts` (`getUserId` from JWT).

**Temporal grounding** (`_shared/temporal.ts`, 2026-09-10): the client sends its clock
and IANA zone (`lib/temporal-context.ts`); prompts that touch dates include
`describeNow()`; "today" is `localDateString()` in the user's zone, never UTC.
`metadata.start_at` = a practice begins (never overdue); `due_at` = deadline only.
Timestamps resolved >24 h into the past are dropped as hallucinations.

**Reminder telemetry** (`lib/reminder-sync.ts`): `reminders.sent_at/acknowledged_at`
are written by the client. Background deliveries never reach the in-app "received"
listener, so `reconcileFiredReminders()` runs on launch and every foreground and marks
past-due unsent rows as sent; acknowledging falls back to a past-due unsent row.

**Keep-alive / scheduler** (`.github/workflows/keep-alive.yml`): daily PostgREST +
functions-gateway ping so the free-tier project never pauses (it did, Jul 28 – Sep 10).
This is the seed of the external scheduler described in `INTELLIGENCE_DESIGN.md` §3.3.

## Secrets & config
- **App `.env`** — only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  (client-safe, `EXPO_PUBLIC_` prefix). See `.env.example`.
- **Server only** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` live in Supabase Edge
  Function secrets, never bundled into the app.

## App structure (Expo Router)
- `app/(tabs)/` — `index` (Home/capture), `inbox`, `insights`.
- `app/follow-ups.tsx` — questions the system parked on entries; answers saved to
  `metadata.follow_ups` via `useEntries.updateEntryMetadata`.
- `app/` — `chat`, `reflect`, `settings`, `anti-entropy` (modal/stack routes).
- `hooks/` — data layer (`useEntries`, `useBriefing`, `useChat`/`useAntiEntropy`,
  `useReminders`, `useSettings`, `useTheme`).
- `lib/` — `supabase`, `ai` (model map + prompts), `notifications`, `whisper`,
  `sqlite` (+ `.web` variant), `spaced-repetition`, `entry-utils`.
