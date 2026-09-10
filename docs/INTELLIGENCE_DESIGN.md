# LifeOS — Intelligence & Agent Design

**Status:** design (2026-09-10), not built. Companion to
[`PRODUCT_EVOLUTION.md`](./PRODUCT_EVOLUTION.md) Theme 3 (agents-as-data,
`run-agent`), grounded in a close reading of the owner's real record
(79 entries, 18 feedback items, 11 reminders, 82 AI calls — `.discovery/introspection.json`).

This document answers: *what should the intelligence layer of LifeOS be, how should
a coordinator and specialist agents divide the work, and what operational standards
must hold so it grows a person rather than a backlog.*

---

## 0. Purpose, restated as engineering constraints

The owner's words (2026-09-10): *"I had my own problems of storing multiple things
everywhere and then it gets lost and goes unactioned unseen for months, and I had
redundant data also, which if properly organized can make great sense … Dharma
because just an app which does not help in expansion of my consciousness in a
dharmic way is not what I want."*

Translated into what the system must do — five jobs, in order of dependency:

| Job | Meaning | Failure it prevents | Today |
|---|---|---|---|
| **Offload** | Capture with zero decisions (F15) | Things stored everywhere / never captured | ✅ works |
| **Organize** | Dedupe, merge, thread into areas & projects | Redundant data, lost context | ❌ not built |
| **Reflect** | Show the person their own patterns, across areas | Mind fog; "what am I even doing" (F10) | ◐ briefing only |
| **Time** | Right thing resurfaces at the right moment, reliably | Unactioned for months | ◐ local-only, unverified |
| **Release** | Decide: act / schedule / let go — and reward the letting go | Collector's fallacy, 63 % pending | ❌ not built |

Two design principles from the record that every agent must obey:

1. **Witness, not judge.** The owner's own journal (Jul 21): *"I am a witness only… I
   observe. I need to accept."* Agents reflect patterns back; they never scold,
   score, or shame. Language is descriptive ("this has come up four times"), never
   evaluative ("you keep failing to…").
2. **Ahimsa toward attention.** Sparse, skippable, batched into rituals. One idea
   per notification. Silence is a valid output. (Handoff "supportive not nagging"; F15.)

---

## 1. What the record actually shows

Close reading of raw inputs, not summaries. Each finding names the capability gap.

### 1.1 Redundancy — the classifier multiplies, nothing merges

| Evidence | Count | Gap |
|---|---|---|
| "Mooladhar app" captured in Urdu, Hindi, "remind me to build", "Creating new app" (Jun 30, within 2 h) | 4 rows | No near-duplicate detection across languages/phrasing |
| "Voice-recorded mantra references" — identical text 3×, third says *"(may be duplicated)"* — user knew, system didn't | 3 rows | No exact-duplicate guard at capture |
| "Research vibrational frequencies" + "Cross-cultural Muladhara healing" — one sentence split into two ideas | 2 rows | Over-splitting of a single thought |
| "Financial planning — accounts for pension, home, experiences, travel, safety…" → 1 idea + 4 tasks, each carrying the full raw text | 5 rows | No **project** container; children lose the parent |
| "Daily Discipline proposal" → 5 health rows, each with the whole 4 am routine as raw_input | 5 rows | Same — a *routine* is one object with parts |
| "Ennoble: for the community…" → 5 tasks | 5 rows | Same — this is a project |

**24 of 79 rows (30 %) are fragments or duplicates of 6 underlying thoughts.** This is
exactly the "redundant data that, properly organized, makes great sense."

### 1.2 The map of life is wrong-shaped

Current model: 5 *domains* (item type) + 5 *life_areas* (spiritual/creative/technical/family/finance).
What the record contains:

| Area in the data | Examples | Where it landed |
|---|---|---|
| **Household / home** | termite (dimak) Mumbai home, scooty repair, hard disk, tempered glass, neem oil, AC | `task`, life_area null or "technical" |
| **Pet** | Shifu: nail cutting, tooth brushing, vaccination | `health` (as if the owner's health) |
| **Work / career** | CCAF doc, scrum call, gant + ennoble 9–6 | "technical" (conflated with tech hobbies) |
| **Community** | Ennoble sessions, four questions | "creative" |
| **Society / ethics** | AI job-displacement scheme, attention-span decline, counter-recommendation | "finance" / "technical" / null |
| **Spiritual** | Babaji, Kriya, mantras, Muladhara, meditation with didi & mummy | ✅ "spiritual" |
| **Family** | Prisha's admission, Char Dham with mummy, Avantika's cake, Bhaiya's birthday | ✅ "family" |
| **Wealth** | nominee, pension, savings buckets | ✅ "finance" |
| **Creative** | BD1 recording project, riyaaz, guitar, KK songs | ✅ "creative" (but see 1.3) |
| **Body / discipline** | 4 am routine, running, eat healthy | `health` |

The owner named the missing ones himself: *"household related, or wealth related, or
some creativity or general product ideas related."* **Areas must be user-extensible
and learned, not a hard-coded enum of five.**

### 1.3 "Learn my codes" was asked for explicitly — and failed

Jun 26, Lonavla: *"I am recording some text for idea, with code BD1. U have to
recognize that to later on make pattern out of it for our system to learn better …
I will record more with BD1, keep a track."* Three follow-ups tagged BD1 ("KK song
playing… BD1", "Rain during that KK song. BD1") were routed to **`note` with 24 h
expiry**, one landed in `metadata.location: "BD1"`. The system had no way to hold a
user-defined code as a durable pattern. `user_memory` is still **0 rows**.

This is the clearest single instruction in the record and the clearest miss.

### 1.4 Temporal grounding is missing (bug)

- "Make sure I wake up tomorrow at 6 a.m." (Jun 30 2026) → `due_at: 2025-01-10`.
  The classifier prompt contains **no current date/time or timezone**; Haiku guessed.
- "Order cake… remind me around 6pm" → `remind_at: null`.
- "Start meditation with didi and mummy starting 7th July" → briefing later called it
  *overdue*. A **start date of a practice is not a deadline**.
- Briefing computes "today" in UTC, not the user's timezone.

"Timed action is required for many things" — today the *time model* itself is unreliable.

### 1.5 Closure gap and the unverified loop

- 50 / 79 pending (63 %); ideas 21 captured, 0 done; capture rate decayed 18/day → 1–2/day.
- 12 reminder rows, **0** `sent_at`, **0** `acknowledged_at`, including Jul 27 device
  tests that were marked done in the UI. Either telemetry write-back is broken or the
  path never ran on device (D2). Reminders are **local-only** (lost on reinstall,
  nothing server-side fires).
- pg_cron jobs are still **commented out** — no time-triggered intelligence runs at all.

### 1.6 What works — protect it

Classification quality per call is good (Hindi/Urdu understood, life_area mostly right,
multi-item split works when it should). Briefing prose is warm and specific. Journal is
used for genuinely deep reflection. Cost is trivial ($0.30 total). Capture is zero-decision.
**Do not add capture-side complexity to fix organize-side problems.**

---

## 2. Feedback → agent ownership map

Every recorded improvement classified into the multi-agent system. *Class* says what
kind of thing it is: **P** principle (constraint on all agents) · **C** coordinator
policy · **S** specialist capability · **U** UI/surface · **I** infra.

| # | Owner's ask (short) | Class | Owner in the system | Phase |
|---|---|---|---|---|
| F1a | Feedback got lost in tasks | S | Builder (feedback pipeline) — shipped | done |
| F1b | Text box not visible | U | — shipped | done |
| F1c | Agents research user's problems by priority, give direction | S | **Researcher** | 3 |
| F1d | "App should read these messages and build itself" | S | **Builder** (digest → roadmap loop) | 2 |
| F2 | Feedback via chat/notes/journal → suggest agents → token tiers | C+S | Coordinator entitlements + Mirror need-signals | 3 |
| F3 | Per-domain proactive agents | S | Specialists per *job*, not per domain (see §3) | 2–3 |
| F4 | Archive tasks | U | shipped | done |
| F5 | Expand long text; edit reminders from inbox | U | shipped | done |
| F6 | Cost per day/month/all-time | U+I | shipped; feeds Coordinator budget | done |
| F7 | Inbox cluttered → minimalist | S | **Librarian** (merge) + **Steward** (release) | 2 |
| F8 | Cheaper chat model | C | Coordinator model policy (Haiku default already) | — |
| F9 | 100 entries/day, 1 yr / 3 yr lifecycle, analytics | S | Librarian (archive tiers) + Mirror (analytics) | 2+ |
| F10a | Clear mind fog vs track everything; spiritual/physical/mental/social lens | P | Reflect-over-track principle; areas model | now |
| F10b | Configurable weekly/monthly reminders | C | Coordinator ritual cadence | 2 |
| F11 | Timestamp on tap | U | shipped | done |
| F12a | Eisenhower urgent/important | S | Steward triage lens | 2 |
| F12b | Competitor study | — | research task, not code | — |
| F12c | Onboarding extracts personalization | S | Mirror seeds person model | 2 |
| F12d | Let-go (Zeigarnik) | S | **Steward** | 2 |
| F12e | Calendar/email integrations — "complicates the app" | P | Declined; Timekeeper stays internal | — |
| F13a | GTD 2-minute rule | S | Router flags `two_minute: true` → Steward prompts "do it now?" | 2 |
| F13b | PARA | S | Librarian data model (Areas / Projects / Resources / Archive) | 2 |
| F13c | CODE (Capture–Organize–Distill–Express) | P | The pipeline's shape (§3) | now |
| F13d | Collector's fallacy — untouched 1 month | S | Steward stale rule | 2 |
| F13e | Zettelkasten — knowledge base vs to-do | S | Librarian: `learning`/`idea` are resources, linked, never "overdue" | 2 |
| F14a | Forgetting curve / spaced repetition / active recall | S | Timekeeper resurfacing (SM-2 exists in `lib/spaced-repetition.ts`) | 2 |
| F14b | Habit loop — reward on empty inbox, relaxing UI | U | Steward's "cleared" moment | 2 |
| F14c | "When overwhelmed, open the app" | U | onboarding copy — shipped | done |
| F14d | Toggleable features | C | Coordinator: every specialist is a per-user toggle | 2 |
| F14e | Mind-wandering — ideas surface in low focus | P | Capture stays instant, anytime (2 am) | now |
| F14f | Not every capture becomes a task; let go | P+S | Steward | 2 |
| F15 | B=MAT; every pre-capture decision is a brain-cycle cost | P | Zero-decision capture — all organizing is *post*-capture | now |
| F16 | Voice-dump badge | U | hold | — |
| F17 | Stale 30 d → decompose / helper agent | S | Steward (surface) → Researcher (decompose) | 2 → 3 |
| F18 | Share cards | — | platform layer, deferred | 4 |
| F19 | "App not working" (Manish) | I | infra (pause) + unverified repro | now |
| F20 | Important item stale 15 d → research concrete options; premium | S | Researcher (premium) | 3 |
| F21 | Home briefing too long; collapsible; capture above fold | U | Mirror output must be *short by default* | now |
| BD1 | "Recognize my code, learn from it" (Jun 26 entry) | S | Router + person model (`code` memory) | **2 — first** |
| D2 | Reminder telemetry 0/12 | I | Timekeeper verification | now |
| D4 | Memory at zero | S | Mirror populates person model | 2 |
| D5 | 63 % pending | S | Steward | 2 |
| New | Temporal grounding bug (2025 date) | S | Router: inject now + tz | **now** |
| New | Over-split / duplicate rows | S | Librarian | 2 |
| New | Areas enum too narrow (household, pet, work, community, society) | S | Person model areas, learned | 2 |

Reading the table: **three items are principles to adopt today (F10a, F13c, F15), two
are bugs to fix now (temporal grounding, D2), and the bulk of the capability asks land
on two specialists — Librarian and Steward — before any Researcher.** That is the build order.

---

## 3. Architecture — coordinator + specialists

### 3.1 The honest framing

Per Anthropic's own guidance on agentic systems: prefer **workflows** (code-orchestrated
steps, LLM used for judgment inside a step) over **autonomous agents** (LLM decides the
next tool) whenever the path is knowable. Almost everything LifeOS needs is knowable:
dedupe runs after capture; review runs weekly; briefing runs in the morning. So:

- The **Coordinator is deterministic code**, not an LLM. It is a policy engine + scheduler
  that decides *which specialist runs when, under what budget, with what quiet rules*.
  An LLM coordinator would add cost and unpredictability for zero gain until routing is
  genuinely ambiguous (it isn't yet).
- **Specialists are workflows** with one or two Haiku/Sonnet judgment steps each.
- **One true agent** exists: the **Researcher** (tool-use loop, web search, Sonnet). It runs
  only on explicit request or an owner-configured threshold, and is premium-gated (F20).

This keeps the guardrail *"if the task has a known answer requiring no external data or
multi-step reasoning, it is a database operation, not an agent call"* intact.

### 3.2 Shape — the CODE pipeline as specialists

```
                 ┌────────────────────────────────────────────────────────────┐
                 │  COORDINATOR (deterministic)                               │
                 │  triggers: on_capture · nightly · morning · evening ·      │
                 │            weekly · monthly · on_request                   │
                 │  policies: budget (tokens/day) · quiet (notifs/day) ·      │
                 │            model (Haiku default) · toggles per specialist  │
                 └───────┬───────────┬───────────┬───────────┬────────────┬───┘
                         │           │           │           │            │
   Capture ──► ROUTER ──► LIBRARIAN ──► TIMEKEEPER   MIRROR    STEWARD   RESEARCHER
   (C)         classify   organize     time          reflect   release   research
               + codes    dedupe/merge schedule      briefing  weekly    decompose
               + now/tz   thread/area  resurface     patterns  review    web_search
               Haiku      Haiku+embed  none/Haiku    Haiku     Haiku     Sonnet+tools
                         │           │           │           │            │
                         └───────────┴─────┬─────┴───────────┴────────────┘
                                           ▼
                        SHARED SUBSTRATE: entries · entry_links · projects
                        person_model (user_memory) · proposals · agent_runs · ai_usage
                                           ▼
                        SURFACES: Home (short) · Inbox · Review · Briefing · Chat
                                  "What the assistant did" log (transparency)
```

Everything a specialist wants to *change* in the user's data goes through **`proposals`**
(§4.4) unless it is trivially reversible. The user accepts with one tap. This is the
human-in-the-loop line; it is what keeps "organize my redundant data" from becoming
"the app rearranged my life without asking."

### 3.3 Coordinator specification

| Concern | Rule |
|---|---|
| **Triggers** | `on_capture` (after entry insert) · `nightly 02:00 local` · `morning ritual` (user pref, default 07:00 local) · `evening ritual` (optional) · `weekly` (default Sun, user pref) · `monthly` (1st) · `on_request` (chat/button) |
| **Budget** | Per-user daily token ceiling (default from `ai_usage` baseline ×3); Sonnet only `on_request`; specialists degrade to deterministic mode when budget exhausted — never silently skip and never spend past cap |
| **Quiet** | Max 3 proactive notifications/day incl. reminders the user set; rituals batch everything else; nothing between 22:00–06:00 local unless user-set reminder |
| **Toggles** | Each specialist has `user_preferences.agents.<name>.enabled` (F14d); Researcher default off |
| **Ordering** | on_capture: Router → Librarian(dedupe check) → Timekeeper(schedule). Nightly: Librarian(merge proposals) → Timekeeper(resurface plan) → Mirror(pattern extraction). Morning: Mirror(briefing). Weekly: Steward(review pack) |
| **Idempotency** | Every run keyed `(user_id, specialist, trigger, window)`; re-runs are no-ops |
| **Failure** | A specialist error never blocks capture; logged to `agent_runs.status='error'`; Coordinator retries nightly jobs once |
| **Timezone** | All rituals in user's tz (`user_preferences.timezone`, default `Asia/Kolkata`); fixes briefing-in-UTC |

### 3.4 Specialists

Each entry: purpose · trigger · model · reads · writes · guardrail · evidence.

**ROUTER** (exists as `classify-entry`; upgrade)
- Purpose: zero-decision capture → structured items, temporally grounded, aware of the person.
- Trigger: on_capture. Model: Haiku.
- Changes: inject `now` (ISO, user tz) and weekday into the system prompt; distinguish
  `start_at` (practice begins) from `due_at` (deadline); emit `two_minute: true` for
  trivial tasks (F13a); recognize **user codes** from person model (`BD1` → thread, not
  expiring note); prefer *one item with parts* over N fragments when a message is one
  thought with a list (fixes Financial/Discipline/Ennoble splits — return `{ item, parts[] }`);
  load areas from person model instead of a fixed five.
- Guardrail: no new UI choices at capture. Ever.
- Evidence: §1.2, §1.3, §1.4.

**LIBRARIAN** (new) — organize
- Purpose: turn fragments into knowledge. Dedupe, merge, thread, file into areas/projects.
- Trigger: on_capture (fast exact/near-duplicate check, deterministic + embedding) and
  nightly (merge/thread proposals). Model: embeddings for candidates (pgvector on
  `entries`), Haiku to confirm and write the merged summary.
- Writes: `entry_links(kind='duplicate_of'|'part_of'|'related')`, `projects` rows,
  `proposals(kind='merge'|'file_under')`. Never deletes; `merged_into` is a pointer.
- Rules: exact duplicate within 24 h → auto-link, inbox shows one card with "×3";
  near-duplicate → proposal; N fragments from one `raw_input` → auto `part_of` a project
  named from the parent; `learning`/`idea` are **resources** (Zettelkasten, F13e) — linked,
  never marked overdue, never nagged.
- Evidence: §1.1 (30 % redundancy).

**TIMEKEEPER** (exists partially: `reminder-plan`, `reminder-accountability`) — time
- Purpose: the right thing resurfaces at the right moment, reliably, and the loop closes.
- Trigger: on_capture (schedule), nightly (resurface plan), fire time (server).
- Model: none for scheduling; Haiku only to phrase a resurfacing line.
- Changes: **server-side firing** (pg_cron → Expo push) so reminders survive reinstall
  and telemetry is authoritative; SM-2 resurfacing for `learning` resources (F14a) at
  increasing intervals, framed as "revisit?", never "overdue"; horizon rules stay in
  `lib/reminder-plan.ts` but the *source of truth* moves to `reminders` rows.
- Guardrail: obeys Coordinator quiet policy; one follow-up max per horizon (already designed).
- Evidence: §1.5, D2.

**MIRROR** (exists partially: `morning-briefing`; extends 1.3b/2.2 `learn-patterns`) — reflect
- Purpose: the person sees themselves. Populates the **person model** and speaks from it.
- Trigger: morning (briefing), nightly (pattern extraction), weekly/monthly (reflection
  digest, F10b), onboarding (seed). Model: Haiku.
- Writes: `user_memory` rows — areas, projects, people, rhythms, codes, values (§4.2);
  `briefings`. Reads everything.
- Output rules: briefing ≤ 60 words above the fold with expand (F21); weekly reflection is
  descriptive — counts, recurrences, what moved, what was released — **witness voice**;
  monthly asks one question back ("Muladhara has appeared in 9 captures across ideas,
  learning and health — is it a project?").
- Evidence: D4 (memory 0), F10, F21, BD1.

**STEWARD** (new; reshapes `anti-entropy`) — release
- Purpose: close the capture→closure gap with dignity. Keep / Done / Schedule / Let go / Ask for help.
- Trigger: weekly ritual (default Sun evening), plus inline when opening a stale item.
- Model: deterministic selection (Eisenhower: due-soon × priority; staleness 14/30 d;
  collector's fallacy: untouched resources), Haiku only to write one line per item
  ("captured 31 days ago; nothing since — still yours?").
- Writes: entry `status` on user tap; `proposals(kind='let_go')`; on "Ask for help" →
  hands to Researcher if enabled, else creates a decomposition prompt in chat.
- Reward: the cleared-state screen is designed as a *release* moment (F14b) — calm,
  minimal, shows what was let go this week without judgment.
- Evidence: D5, F7, F12a/d, F13d, F14f, F17 stage 1.

**RESEARCHER** (new, phase 3) — the only true agent
- Purpose: when the user asks, decompose a stuck item into concrete next steps, with
  external information (F1c, F17 stage 2, F20).
- Trigger: on_request, or owner-configured threshold (item priority high, stale ≥ N days,
  Researcher enabled). Model: Sonnet + tools (`query_entries`, `web_search`, `propose_entries`).
- Writes: `agent_runs.output`; `proposals(kind='decompose')` — child tasks appear only on accept.
- Guardrail: premium flag; hard token cap per run; runs are async and resumable; output
  always shows sources. Built on `run-agent` (PRODUCT_EVOLUTION Theme 3).

**BUILDER** (exists as `feedback-digest`, `scan-journal-feedback`) — the meta-loop
- Purpose: "the app reads these messages and builds itself" (F1d).
- Trigger: weekly (2.1). Model: Haiku.
- Writes: `feedback_digests`; proposed roadmap deltas as Markdown the developer (human +
  Claude Code) acts on. Claims stay honest: it ranks and clusters; it does not merge code.

### 3.5 What a "domain agent" (F3) becomes

The owner asked for agents *per domain* (health, task, learning…). The record shows the
useful axis is **per job** (organize, time, reflect, release), with **domain knowledge as
configuration** the specialists read: e.g. `health` entries get Timekeeper daily rules and
Steward never suggests "let go" of medicine; `learning` gets SM-2 resurfacing and no
overdue state; `idea` gets Librarian threading and Researcher eligibility. Domain agents
as separate LLM personas would multiply cost and fragment the person model. Per-job
specialists with per-domain policy tables achieve the ask at Haiku cost.

---

## 4. Shared substrate (schema deltas)

Minimal, additive, all with the standard per-user RLS. Service-role paths filter `user_id`.

### 4.1 Projects and links

```sql
CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,                 -- "Financial planning", "Muladhara", "BD1"
  area        text,                          -- learned area key (person model)
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','done','released')),
  source      text NOT NULL DEFAULT 'inferred' CHECK (source IN ('explicit','inferred')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE entry_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_id     uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  to_id       uuid REFERENCES entries(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('duplicate_of','part_of','related','follow_up_of','decomposed_from')),
  confidence  real NOT NULL DEFAULT 1,
  created_by  text NOT NULL CHECK (created_by IN ('user','librarian','steward','researcher')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id, kind)
);

ALTER TABLE entries ADD COLUMN merged_into uuid REFERENCES entries(id);
ALTER TABLE entries ADD COLUMN start_at   timestamptz;     -- practice begins ≠ deadline
ALTER TABLE entries ADD COLUMN embedding  vector(1024);    -- pgvector, for Librarian
```

`metadata.thread` (idea threads v0) migrates into `projects` + `part_of` links.

### 4.2 Person model (`user_memory`, extended)

Keep the table; widen `category` and add a stable `key` so memories upsert instead of pile up:

```sql
ALTER TABLE user_memory DROP CONSTRAINT user_memory_category_check;
ALTER TABLE user_memory ADD CONSTRAINT user_memory_category_check CHECK (category IN
  ('area','project','person','rhythm','code','value','preference','pattern','context'));
ALTER TABLE user_memory ADD COLUMN key text;              -- 'area:household', 'code:BD1', 'person:mummy'
ALTER TABLE user_memory ADD COLUMN source text NOT NULL DEFAULT 'inferred'
  CHECK (source IN ('explicit','inferred','feedback'));
CREATE UNIQUE INDEX user_memory_user_key_idx ON user_memory (user_id, key) WHERE key IS NOT NULL;
```

Seeded from the existing record, the owner's person model would already contain: areas
{spiritual, family, household, wealth, creative, work, community, society, body, pet};
projects {**Muladhara (explicit — owner confirmed 2026-09-10)**, Financial planning, BD1,
Ennoble community, Daily discipline, Char Dham}; people {mummy, didi, bhaiya, Prisha,
Avantika, Shifu (pet)}; rhythm {4 am sadhana, office 9–6}; code {BD1}; values
{witness/acceptance, Kriya practice}. This is what "the AI knows you" concretely means.
Explicit corrections win over inferred (`source`).

### 4.3 Runs (observability)

`agent_runs` as in PRODUCT_EVOLUTION, plus `specialist text`, `trigger text`, `window text`,
`tokens_in/out`, `est_cost_usd`, `proposals_created int`, `notifications_sent int`.
Surfaced in Settings → **"What the assistant did"** — transparency is part of trust and
part of the person seeing the system that sees them.

### 4.4 Proposals (human-in-the-loop)

```sql
CREATE TABLE proposals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialist  text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('merge','file_under','let_go','decompose','schedule','learn')),
  payload     jsonb NOT NULL,              -- ids + proposed change + one-line rationale
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','declined','expired')),
  run_id      uuid REFERENCES agent_runs(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  decided_at  timestamptz
);
```

Declines are signal: Mirror reads them (`source='feedback'` memory) so the system learns
what *not* to propose.

---

## 5. Operational standards

| Area | Standard |
|---|---|
| **Evals before prompts** | A golden set built from the owner's own 79 entries (kept in gitignored `.discovery/`, redacted fixture committed) with expected `domain`, `area`, `parts`, `start_at/due_at`, `duplicate_of`. `scripts/eval-router.mjs` + vitest gate: no prompt change ships below baseline accuracy. The temporal bug would have been caught by this. |
| **Cost** | Haiku default; Sonnet only on_request; per-user daily cap enforced by Coordinator; every call logs `ai_usage` (exists); Settings shows per-specialist cost. |
| **Reversibility** | No hard deletes by any specialist. `merged_into`, `status='released'`, links — all undoable from the transparency log. |
| **Consent** | Anything beyond linking exact duplicates is a `proposal`. Defaults conservative; the user can widen per specialist. |
| **Quiet** | Coordinator quiet policy (§3.3); every proactive message carries one action; rituals batch. |
| **Privacy** | Health, spiritual, family content never in logs (`__DEV__` guard); embeddings stay in Postgres; no third-party analytics. Service-role queries `user_id`-scoped (`npm run audit:service-role`). |
| **Reliability of time** | Scheduling via pg_cron + pg_net (enable) **or** an external cron (GitHub Actions) hitting edge functions with a service token — decision below. Keep-alive ping is the same mechanism. |
| **Idempotency** | Run keys (§3.3); safe to re-run any ritual. |
| **Transparency** | "What the assistant did" log; briefings cite counts not verdicts. |
| **Docs** | This doc + `ARCHITECTURE.md` + `ROADMAP.md` updated in the same commit as any slice. |

---

## 6. Proposed phasing (for owner approval — ROADMAP not yet changed)

Foundation first, two specialists second, the true agent last. Every slice shippable alone.

| Order | Slice | Size | Driver | Why here |
|---|---|---|---|---|
| 0 ✅ | Keep-alive + scheduler seed (GitHub Actions, `keep-alive.yml`) | S | Cursor | Done 2026-09-10; owner adds repo secrets |
| 0 ✅ | Router: temporal grounding (`now`, tz, weekday), `start_at` vs `due_at`, stale guard | S | Cursor | Done + deployed + live-verified 2026-09-10 |
| 0 ✅ | Briefing in user tz, short-first, markdown stripped; Home de-clutter (F21) | S | Cursor | Done 2026-09-10 |
| 0 ✅ | D2 root cause + fix (foreground reconcile, ack fallback) | S | Cursor | Done in code; device-verify F.9 |
| 0 | Eval harness v0 from the record | S | Claude Code | Model variance seen during verification |
| 1 | Person model schema (§4.2) + **seed from record** + user codes in Router (BD1) | M | Claude Code | The explicit "learn my codes" ask; unlocks every specialist |
| 1 | `projects` + `entry_links` + Router "one thought with parts" | M | Claude Code | Stops the 30 % fragmentation at source |
| 2 | **Librarian v0**: exact + near-dup detection (pgvector), auto-link, merge proposals, inbox "×N" card | M | Claude Code + Cursor | Organize — the owner's original pain |
| 2 | **Steward v0**: weekly review pack (Keep/Done/Schedule/Let go), cleared-state screen | M | Cursor + Claude Code | Release — 63 % pending; richest feedback cluster |
| 2 | Home de-clutter (F21): short briefing, capture above fold | S | Cursor | Owner-verified; cheap |
| 3 | Mirror: nightly pattern extraction → person model; weekly/monthly reflection (witness voice) | M | Claude Code | Reflect — consciousness layer proper; replaces 1.3b/2.2 |
| 3 | Coordinator budget/quiet/toggles + `agent_runs` + transparency log | M | Claude Code | Operational standards become enforced, not documented |
| 4 | `run-agent` + **Researcher** (premium) | L | Claude Code | Only true agent; after the substrate exists |
| 4 | Builder: scheduled digest → roadmap deltas (2.1) | S | Claude Code | Meta-loop |

Eval harness (§5) is built alongside slice 0 and grows with each slice.

---

## 7. Decisions (defaults taken 2026-09-10 on owner's "work on them"; revisit anytime)

1. **Scheduler → GitHub Actions** (`.github/workflows/keep-alive.yml`). One mechanism for
   keep-alive, rituals, nightly jobs; survives Supabase pauses. Migrate to pg_cron only if
   latency matters.
2. **Areas → seeded starter set** (§4.2) from the record, Mirror-extensible.
3. **Auto-actions → Librarian auto-links exact duplicates within 24 h**; everything else is
   a `proposal`.
4. **Researcher → off by default, on request**; owner-set threshold (F17/F20) configurable
   later.
5. **Purushartha lens** (Dharma/Artha/Kama/Moksha) as an explicit Steward triage view?
   It fit the Sep 10 analysis well; it may be too abstract for weekly review. Recommendation:
   keep as an optional lens in monthly reflection, not the weekly review.

---

## 8. IdeaBox — relationship to LifeOS (owner discussion 2026-09-10)

**Owner's intent:** some brain dumps are prospective products (e.g. an app on *Swara
Vigyan*, with a School of Yoga publication as reference — **not yet in the record; first
mentioned in conversation**). IdeaBox = a multi-agent system that boots the right agents
per idea: market scan of similar products, honest differentiation, evaluation, and — if
worth it — a prototype for first-hand use. Owner leaned toward a separate app, later.

**Decision guidance: separate *surface*, shared *substrate*. Build later (phasing slot 4).**

- Ideas originate in brain dumps, never as "ideas" at capture time. A separate store
  would force a capture-time decision (violates F15) and recreate the original pain
  (Mooladhar ×4 shows how one idea arrives in fragments). Only the Librarian, seeing all
  domains, can notice that Swara Vigyan · Muladhara frequencies · Gyurmey healing sounds ·
  voice-mantras are one family.
- Handoff point already exists: `metadata.research_ready` (stamped `false` on every idea).
  Librarian or owner flips it → the idea is **promoted** to IdeaBox. Same `entries`,
  same auth, same `run-agent` / `agent_runs` / `proposals` / `ai_usage` / person model.
  IdeaBox is a tab first; a standalone app icon / ennoble.ai branding later is a packaging
  choice, not an architecture one. (Consistent with `PRODUCT_EVOLUTION.md` Theme 3; the
  guardrail table's "separate app" reads as "separate product surface".)
- IdeaBox is the one place a **true** multi-agent system is justified (external data,
  open-ended, multi-step) — which is exactly why it must sit on the substrate (§4), not
  precede it.

**Do now (cheap):** define the **Idea Brief** the Librarian accumulates per promoted idea,
so months of dumps are already organized when agents boot:
idea in the owner's own words · references (books, links, linked prior captures) · what the
owner can give / should give (unfair advantage, time, constraints) · who it is for ·
one dharmic line: *why should this exist*.

**IdeaBox agent system (when built) — orchestrator-workers with stage gates.** The one place
an LLM coordinator is warranted (path is open). Artifacts per stage in an `idea_research`
table linked to the entry; every stage resumable; cost shown per idea.

| Stage | Worker | Output | Model |
|---|---|---|---|
| Brief | Interviewer | Fills the Idea Brief with the *minimum* questions (on-request deep work — questions acceptable here, unlike capture) | Haiku |
| Read | Reference reader | Grounded knowledge note from the owner's references, in their own terms | Haiku (chunked) |
| Scout | Market scout | Similar products with sources, maturity, positioning | Sonnet + web_search |
| Differentiate | Differentiator | Genuinely different vs. only feels different vs. missing — honest, not flattering | Sonnet |
| Evaluate | Evaluator | Value · feasibility · effort · owner-fit · "should this exist" | Sonnet |
| **Gate** | **owner** | Proceed to prototype? — non-negotiable human gate before the expensive stage | — |
| Prototype | Prototyper | Spec + clickable prototype (Claude Code–class job) | Sonnet, premium, hard cap |

---

## 9. Batches, provenance, timeline, follow-ups (owner scenario 2026-09-10)

**Scenario.** While the backend was paused the owner kept capturing anyway � texting himself
on WhatsApp � and then dumped the batch here. This *will* recur: thoughts arrive in bursts,
from whatever surface was closest. The system must treat that as normal, not as an
exception. Three consequences: provenance is part of the record, time has two axes, and the
follow-up burden moves from the human to the system.

### 9.1 Provenance and the two clocks (shipped v0)

Every entry's metadata may carry:

| Field | Meaning |
|---|---|
| `source` | `app_text` � `app_voice` � `brain_dump` � `whatsapp_import` � `share_intent` � `agent` |
| `original_at` | when the thought was *written* (imports); `created_at` stays *when it entered LifeOS* |
| `import_batch_id` | groups one dump; a batch is itself an event on the timeline |
| `follow_ups[]` | questions parked on the entry � see 9.3 |

**Timeline** = entries ordered by `thoughtTime()` (`original_at ?? created_at`), with source
and batch shown. Two views matter: *what was on my mind when* (by `original_at`) and *when
did it reach the system* (by `created_at`). The gap between them is itself a signal (9.2).
Inbox sort `oldest/newest` should switch to `thoughtTime()` once imports carry `original_at`
(WhatsApp export `.txt` parsing gives it for free; the pasted dump did not).

### 9.2 Dump psychology � what the Mirror should read from capture *patterns*

The owner asked to think about this psychologically. Capture metadata (not content) already
says a lot; the Mirror (�3.4) should compute it nightly and report it in witness voice:

| Signal | Reading | Response (never a nag) |
|---|---|---|
| **Bursts** (N captures within minutes) | offloading � the mind was full; often tasks + one big idea together | acknowledge the burst as one event; propose one project for it (Librarian) |
| **Hour of day** � late night (23�02) | rumination or generative time; the original 2 a.m. use case | 2 a.m. dumps are never triaged at 2 a.m.; the morning briefing carries them |
| **Source drift** � captures moving to WhatsApp/other | LifeOS was not reachable or not trusted at that moment | friction signal for the *product*, not the person; feeds `app_feedback` |
| **Gap between `original_at` and `created_at`** | how long a thought lived outside before it was safe here | shorter over time = trust rising |
| **Ratio ideas : tasks per batch** | which mode the person is in (building vs. maintaining) | Steward paces asks accordingly |
| **Recurring subjects across batches** (Mummy's accounts, yoga texts, sharing/dharma apps) | the real areas of life � the person model's areas should be *learned from this* | seed/extend `user_memory` areas |

Principle: this is **witness, not judge**. The Mirror describes ("you tend to capture ideas
late at night and errands in the morning"); it never prescribes.

### 9.3 Follow-ups � the system carries the "come back to this" (shipped v0)

Fragments cannot be researched. Instead of forcing structure at capture (breaks flow), the
system parks 1�3 *specific* questions per entry and the owner answers when he wants:
Home banner ? `Follow-ups` screen ? one question at a time ? answer stored on the entry.
Answers accumulate into the Idea Brief (�8), so by the time an idea is promoted to IdeaBox
the agents start from a real brief. Rules: system questions are concrete and answerable in
one line; max 3 per entry; unanswered questions never escalate to notifications; the owner
can add his own questions to an entry (`asked_by: 'user'`). Later: the Interviewer agent
(�8) generates these on import instead of a human curating them.

### 9.4 Reading other apps automatically � feasibility note (owner asked; keep, don't build)

| Path | Feasibility | Cost / risk | Verdict |
|---|---|---|---|
| **Share-to-LifeOS** (Android share sheet; `expo-share-intent`, config plugin) | high; works from WhatsApp, browser, notes, anything | one native module; no special permissions | **build next** � the honest "capture from anywhere" |
| **WhatsApp chat export ? import** (`.txt` with timestamps) | high; user-initiated, carries `original_at` | parser + batch importer; zero platform risk | **build with share-intent** � one flow: export ? share ? parsed batch |
| Notification Listener (read incoming notifications) | medium; misses self-chats, sees *everyone's* messages | heavy privacy surface; Play Store sensitive-permission review | no |
| Accessibility service scraping | low-medium | Play policy violation risk; brittle; reads everything on screen | no |
| WhatsApp Business/Cloud API | n/a for a personal self-chat | � | no |
| SMS read (bank alerts ? spends, for "Surplus sharing") | medium | `READ_SMS` is restricted on Play; alternatives: Account Aggregator (India) with consent | future, consent-first |

Conclusion: *permissioned pull* is mostly not available for personal chats; *frictionless
push* (share sheet + export import) gets 90 % of the value with none of the trust cost.

### 9.5 IdeaBox � interaction-first, dharma-first (extends �8)

The owner's ask sharpens �8 in four ways:

1. **Dharma gate first, not last.** Before any market work: *should this exist at all, and
   should we be the ones?* One Sonnet pass + owner answer. Many ideas should stop here,
   cheaply. Evaluation dimensions (owner's list): potential � market fit � competition �
   revenue potential � uniqueness � suggestions � user experience � **overall dharma**.
2. **The Interviewer is the main agent, not a pre-step.** Research on open-ended ideas (a
   film on a saint; heritage recording) is "tricky" precisely because the *direction* is
   undecided. The system's job is to ask the useful questions and lay out the paths with
   honest ranges � e.g. for a film: Bollywood production vs. animation studio vs. an
   AI-generated pipeline the owner runs himself, each with rough cost/time/skills � then
   let the owner choose. Maximum user input, minimum assumption. Follow-ups (9.3) are the
   asynchronous form of this; the Interviewer is the synchronous one.
3. **Path-specific worker sets, booted on choice.** Same idea, different pipelines:
   *app* ? Scout/Differentiate/Evaluate ? **Builder set** (spec ? build ? test ? Play Store
   release, each behind a gate); *film/content* ? references ? treatment ? format/cost
   paths ? production plan; *social/dharmic platform* (Surplus sharing, Living heritage) ?
   stakeholder + verification design + pilot plan before any code. New worker sets are
   configuration (`agents` rows), so the owner can ask for a specialist for "so-and-so use
   case" and get one without a release.
4. **Everything lands back as entries + tags + actions**: pipeline stage, tags
   (`ideabox: gated / scouting / go / no-go`), and action items assigned to AI or to the
   owner, visible in Inbox like anything else. No separate inbox to check.

### 9.6 What shipped today vs. what waits

- Shipped: provenance fields, `follow_ups`, Follow-ups screen + Home banner, source/question
  badges, `Written / Imported` on detail, 11 curated WhatsApp entries (batch
  `wa-2026-09-10-01`) with 20 questions.
- Next (ROADMAP 2.8�2.10): share-intent + WhatsApp export importer with `original_at`;
  Interviewer generates follow-ups on import; timeline sort by `thoughtTime()`; Mirror reads
  9.2 signals; IdeaBox gates per 9.5.
