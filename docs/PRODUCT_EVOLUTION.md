# LifeOS — Product Evolution Design

Status: design proposal (not yet built). Author-facing roadmap for evolving LifeOS
from a single-user MVP into a learning, multi-tenant, agent-driven product.

This document is grounded in the code that exists today. Where it proposes new
work it ties each idea back to the current data model (`supabase/migrations`),
edge functions (`supabase/functions/*`), hooks (`hooks/*`), and screens
(`app/*`). Read it alongside `docs/ARCHITECTURE.md` and `docs/PRD.md`.

## Ground truth: what exists today

- **One table, `entries`**, discriminated by `domain` (`health | task | learning |
  idea | note | journal`). `metadata` is a `jsonb` grab-bag (`life_area`,
  `times[]`, `interval_days`, journal fields). Supporting tables: `reminders`,
  `briefings`. All three have per-user RLS (`auth.uid() = user_id`).
- **5 edge functions** (Deno), all calling Claude/OpenAI server-side with keys in
  Supabase secrets:
  - `classify-entry` — Claude Haiku (`claude-haiku-4-5-20251001`), returns
    structured entry JSON. Already normalizes `life_area` and stamps
    `research_ready: false` on ideas.
  - `ai-chat` — Claude Sonnet (`claude-sonnet-4-6`), answers over the user's 50
    most recent pending entries (read-only).
  - `morning-briefing` — Claude Haiku, upserts one `briefings` row/day.
  - `anti-entropy` — pure DB query, surfaces stale items.
  - `transcribe-audio` — OpenAI Whisper.
- **Capture path**: `hooks/useEntries.captureText` → `invokeFunction('classify-entry')`
  → insert into `entries` → schedule reminders. Journals bypass the classifier
  (`captureJournal`, inserted as `domain='journal'`, `status='done'`).
- **Auth**: Supabase email/password, single user in practice. RLS is already
  multi-tenant-capable — every row is scoped by `user_id`.
- **Client**: Expo Router, SQLite read-through cache (`lib/sqlite.ts`),
  `supabase-js` for direct table access.

Two facts shape every proposal below:

1. **RLS already isolates users.** Multi-tenancy is mostly a product/UX problem,
   not a security rebuild. The data layer is ready.
2. **The classifier is the only "AI front door" for capture.** It is the natural
   hook for feedback detection (Theme 1) and per-user personalization (Theme 2).

Model note: this project standardizes on Claude via Anthropic edge functions.
Current IDs in use are `claude-haiku-4-5-20251001` (classify/briefing) and
`claude-sonnet-4-6` (chat). When adding agentic/tool-use work, verify model IDs
and tool-use shapes against the `claude-api` skill before coding — do not copy
model strings from memory.

---

## Theme 1 — Feedback-driven autonomous evolution loop

**Goal.** Let the owner improve the app by talking to it. A brain-dump like
"the inbox filter is annoying, it forgets my selection" should be captured,
recognized as *product feedback* (not a task), stored in a structured backlog,
and periodically digested into something a developer (human + Claude Code) acts
on.

### The loop, end to end

```
Capture (existing CaptureInput / brain dump)
   │
   ▼
classify-entry  ──►  detects domain='feedback'  (NEW domain branch)
   │                         │
   │                         ▼
entries row (domain='feedback')  +  app_feedback row (NEW structured table)
                                          │
                          scheduled feedback-digest edge fn (NEW)
                                          │
                                          ▼
                        prioritized backlog (Markdown + DB)
                                          │
                                          ▼
                  developer / Claude Code reads digest, ships change
```

### How feedback gets captured

No new capture UI is required for v1. The owner already types free text. Two
detection routes:

1. **Explicit tag.** A leading marker the user controls, e.g. text starting with
   `fb:` or containing `#feedback`. Cheap, deterministic, zero AI cost. Parse
   it client-side in `captureText` before calling the classifier, OR let the
   classifier see it (preferred — keeps logic server-side).
2. **AI detection.** Extend the `classify-entry` system prompt to recognize a new
   `feedback` domain: input that is *about the app itself* ("the briefing is too
   long", "wish I could snooze from the home screen").

Recommended: do both. Tag is the high-precision fast path; AI detection is the
recall net for feedback the owner didn't tag.

### Classifier prompt changes (`classify-entry/index.ts`)

Add a sixth AI-routable domain. Today the prompt lists 5 domains and says "Never
output domain 'journal'". Add:

```
- feedback: the user is commenting on LifeOS itself — a bug, an annoyance, a
  feature request, or praise about the app's behavior. Signals: references to
  screens, the briefing, the inbox, capture, reminders, "this app", "the AI".
  When domain=feedback, also return a `feedback` object:
    {
      "kind": "bug" | "feature" | "annoyance" | "praise" | "idea",
      "area": "capture" | "inbox" | "briefing" | "reminders" | "chat" |
              "journal" | "settings" | "other",
      "severity": "low" | "medium" | "high",
      "summary": "<one-line developer-facing restatement>"
    }
```

Keep the existing JSON contract; `feedback` is an extra optional key, mirroring
how `life_area` is handled today. The function then writes two rows (see below).

### New table: `app_feedback`

A dedicated table (not just `metadata`) because feedback needs its own lifecycle,
triage state, and cross-user aggregation later (Theme 2 makes this multi-tenant).

```sql
CREATE TABLE app_feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id     uuid REFERENCES entries(id) ON DELETE SET NULL, -- source brain-dump
  kind         text NOT NULL CHECK (kind IN ('bug','feature','annoyance','praise','idea')),
  area         text,                 -- capture | inbox | briefing | ...
  severity     text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  summary      text NOT NULL,        -- developer-facing one-liner
  raw_input    text,                 -- verbatim user words
  status       text NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','triaged','planned','shipped','dismissed')),
  priority_score numeric,            -- set by digest fn
  cluster_id   uuid,                 -- groups duplicate/related feedback
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
-- same per-user RLS policies as entries (select/insert/update/delete own)
CREATE INDEX app_feedback_user_status_idx ON app_feedback (user_id, status);
```

Why a separate table and not just `entries` with `domain='feedback'`? Because:
- Feedback has a triage lifecycle (`new → triaged → planned → shipped`) distinct
  from entry `status` (`pending/done/archived/snoozed`).
- The digest needs to cluster and re-prioritize across many rows without
  polluting the user's inbox/briefing queries.
- It keeps `entries` clean. The `entry_id` FK preserves provenance.

The feedback entry still lands in `entries` too (so it shows in history and the
owner sees it was captured), but `morning-briefing`/`anti-entropy` queries should
exclude `domain='feedback'` so feedback never nags the user as a task.

### Scheduled "feedback digest" edge function (NEW)

`supabase/functions/feedback-digest/index.ts`, invoked weekly via the existing
pg_cron pattern (`supabase/migrations/20260616000001_pg_cron_jobs.sql` already
shows the `net.http_post` shape — uncomment and add a third job).

What it does:
1. Pull `app_feedback` where `status='new'` (and optionally re-examine `triaged`).
2. Call Claude (Haiku is enough; Sonnet if clustering quality matters) to:
   - **Cluster** near-duplicate feedback (set `cluster_id`), so "briefing too
     long" said 4 times becomes one backlog item with weight 4.
   - **Prioritize** — produce `priority_score` from severity × frequency ×
     recency, and a short rationale.
   - **Restate** each cluster as a crisp, developer-actionable backlog item.
3. Write results back (`status='triaged'`, `priority_score`, `cluster_id`).
4. Emit a **digest artifact** the developer consumes:
   - Persist a row in a small `feedback_digests` table (date + Markdown body), or
   - Write a Markdown file to a Supabase Storage bucket (`backlog/DIGEST-<date>.md`).

The digest Markdown is the bridge to "Claude Code / Cursor act on it": it is a
prioritized, deduped, plain-English backlog. A human (or an agent given repo
access) reads it and ships changes. The "autonomous learning" claim is honest at
this scale: the system learns *what the owner repeatedly complains about* and
ranks it — it does not auto-merge code.

### "Learns autonomously over time"

Two concrete, buildable mechanisms (no hand-waving):
- **Frequency memory.** Because clusters persist, repeated feedback compounds
  `priority_score`. The app demonstrably surfaces chronic pain points higher.
- **Resolution feedback.** When a digest item is marked `shipped`, the digest fn
  can note "previously requested, now shipped" and detect regressions if the same
  cluster reappears. Over time the digest reflects the owner's evolving priorities.

### Phasing

- **Phase A (near):** tag-based + AI `feedback` domain, `app_feedback` table, write
  on capture. No digest yet — owner reviews raw feedback in a simple settings list.
- **Phase B (mid):** scheduled `feedback-digest` with clustering + prioritization,
  Markdown artifact for the developer.
- **Phase C (later):** digest feeds a private GitHub issue/Linear sync, or is read
  directly by a Claude Code agent run on the repo.

---

## Theme 2 — Multi-tenant productization + per-user personalization

**Goal.** Others use LifeOS; each user's capture/journal/chat trains a per-user
model of their patterns so the AI "knows them and continuously learns." Eventually
the UI and the agents become user-configurable down to an "atomic" level.

### What's already done vs. needed

**Done:** RLS scopes every row by `user_id`. The edge functions already resolve
`getUserId(req)` from the JWT and (for service-role paths) scope queries by user.
A second user signing up today gets correctly isolated data with zero schema
changes. This is the single biggest head start.

**Needed for true multi-tenancy:**
- **Audit the service-role paths.** `ai-chat` and `morning-briefing` use the
  service-role key and filter by `effectiveUserId`. Service role *bypasses RLS*,
  so correctness depends entirely on every query carrying `.eq('user_id', …)`.
  Before onboarding real users, add a test that every service-role query is
  user-scoped. This is the main multi-tenant risk.
- **Per-user config + memory stores** (below).
- **Onboarding, billing, account management** — product surface, out of scope for
  the data design but flagged in the roadmap.

### Per-user memory / context store

Today `ai-chat` rebuilds context from scratch each call (50 recent pending
entries). There is no durable model of the user. Add a per-user memory store the
classifier and chat read from and write to.

New table `user_memory`:

```sql
CREATE TABLE user_memory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text NOT NULL,        -- 'preference' | 'pattern' | 'fact' | 'style'
  key         text NOT NULL,        -- e.g. 'briefing.tone', 'sleep.schedule'
  value       jsonb NOT NULL,
  confidence  numeric DEFAULT 0.5,
  source      text,                 -- 'explicit' | 'inferred' | 'feedback'
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, key)
);
-- per-user RLS as usual
```

Plus `user_preferences` for explicit settings (briefing length, reminder
defaults, timezone, enabled domains). Keep these separate from inferred
`user_memory`: preferences are user-owned and authoritative; memory is
AI-inferred and probabilistic.

**How memory gets populated (continuous learning):**
- The `feedback-digest` and a new lightweight `learn-patterns` job periodically
  summarize a user's recent entries + journals into `user_memory` rows
  ("user practices guitar most evenings", "prefers terse briefings", "consistently
  snoozes finance tasks"). This is batch, cheap, and runs server-side.
- Explicit corrections become `source='explicit'` memory immediately (high
  confidence).

**How memory gets used (personalization):**
- `classify-entry`: inject a compact memory summary into the system prompt so
  routing reflects the user's habits (e.g. their shorthand, their domains of
  interest). Keep the *stable* memory summary first in the prompt for prompt-cache
  reuse; keep the volatile `raw_input` last.
- `ai-chat` and `morning-briefing`: prepend the user memory summary so responses
  are personalized and consistent across sessions.

This is the honest version of "an AI that knows you": a curated, bounded,
per-user context that is summarized into prompts — not a fine-tuned model.

### Customization system — phased toward "atomic"

Be honest about complexity. Full user-configurable UI is a large, ongoing cost.
Phase it so each step ships value:

1. **Server-side preferences (near).** `user_preferences` drives behavior:
   briefing tone/length, which domains are active, reminder defaults, timezone.
   No UI rebuild — existing screens read settings via a `useSettings`-style hook.
   Low risk, high value.
2. **Config-driven UI (mid).** Introduce a `layout_config` jsonb on the user:
   which home cards show, their order, which inbox filters exist. The app renders
   from config instead of hardcoded JSX. This is a real refactor — components
   become data-driven. Start with the home screen card list only; do not boil the
   ocean.
3. **User-configurable agents (mid/later).** See Theme 3 — agents defined as data
   the user can toggle/tune.
4. **Full atomic layout customization (long, optional).** Drag-and-drop layout, a
   widget registry, per-widget settings. This is a product unto itself. Realistic
   assessment: only pursue if user demand proves it out; the maintenance cost of a
   fully dynamic layout (every feature must be a registered, configurable widget)
   is high for a solo dev. Treat as a north star, not a near-term commitment.

### Phasing summary

- **Near:** service-role audit, `user_preferences`, `user_memory` table, inject
  memory into existing functions, signup/onboarding.
- **Mid:** `learn-patterns` job, config-driven home screen.
- **Long:** atomic layout customization (gated on real demand).

---

## Theme 3 — Agent platform + cross-product suggestion engine

**Goal.** Configurable agents per user need; a system that learns a user and
suggests adjacent products/capabilities (e.g. recognizing a "thinker" who'd
benefit from **IdeaBox** — input ideas → agents research, find similar ideas,
estimate ROI, eventually scaffold).

### The agent abstraction

The backend already calls Claude server-side. The natural agent mechanism is
**Claude tool-use** (custom tools defined as JSON schemas, executed in an edge
function loop). Verify exact tool-use request shape and current model IDs against
the `claude-api` skill before implementing; do not hardcode from memory.

Define an agent as **data**, not code, so it can be per-user and configurable:

```sql
CREATE TABLE agents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,  -- null = built-in template
  name         text NOT NULL,
  description  text,
  model        text NOT NULL DEFAULT 'claude-sonnet-4-6',
  system_prompt text NOT NULL,
  tools        jsonb NOT NULL DEFAULT '[]',   -- list of tool names this agent may use
  enabled      boolean NOT NULL DEFAULT true,
  config       jsonb,                          -- per-agent knobs
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input       jsonb,
  status      text NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','running','done','error')),
  output      jsonb,
  cost_tokens jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
```

**How agents are invoked.** A single new edge function `run-agent`:
1. Loads the agent row + the user's `user_memory` summary.
2. Builds the Claude request: `system_prompt` + memory, the agent's `tools`,
   and the run input.
3. Runs the tool-use loop server-side. **Tools are LifeOS capabilities exposed as
   functions**, each gated and audited (the agent-design guidance: promote an
   action to a dedicated tool when you need to gate/render/audit it):
   - `query_entries(domain?, status?)` — read the user's data (read-only, safe).
   - `create_entry(...)` — write a task/idea (side-effecting → confirm or log).
   - `web_search` — server tool, for research (IdeaBox).
   - `summarize`, `estimate_value` — pure LLM tools.
4. Writes the result to `agent_runs.output`.

Start with the **manual tool-use loop in one edge function** (full control,
matches current architecture). The hosted **Managed Agents** surface is a later
option if runs become long-horizon and stateful — note it, don't build it yet.

The existing `ai-chat` becomes the first agent (a built-in "Assistant" template).
`classify-entry` stays a fast non-agent function — classification doesn't need a
tool loop.

### Detecting user needs → surfacing suggestions

Reuse the Theme 2 learning pipeline. The `learn-patterns` job already summarizes a
user. Extend it to emit **need signals** into `user_memory` (kind=`pattern`),
e.g. "high idea volume, low completion" → candidate "thinker".

New table `product_suggestions`:

```sql
CREATE TABLE product_suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product     text NOT NULL,        -- 'ideabox' | 'medtracker' | ...
  rationale   text NOT NULL,        -- why we think this fits, from their data
  signal      jsonb,                -- the pattern evidence
  status      text NOT NULL DEFAULT 'suggested'
              CHECK (status IN ('suggested','dismissed','accepted')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

A scheduled `suggestion-engine` edge function reads `user_memory` patterns and
writes suggestions when thresholds are met (e.g. ≥N ideas in 30 days with low
follow-through → suggest IdeaBox). The app shows these as a dismissible card.
Keep it rule-assisted, not pure-LLM, so suggestions are explainable and not spammy.

### How IdeaBox and future products plug in

IdeaBox is just **a set of agents + tools + screens** on the same platform — not a
separate app. It plugs in as:
- Agents: `idea-researcher` (web_search + summarize), `idea-similarity`
  (search existing ideas / web), `idea-valuation` (estimate_value).
- Data: ideas already exist as `entries` with `domain='idea'` and the
  `research_ready: false` flag the classifier already stamps. Flipping that flag
  (and adding `metadata.ideabox`) is the entry point — no new core table needed
  for v1; add an `idea_research` table once outputs get rich.
- Screens: an IdeaBox tab that lists `domain='idea'` entries and shows agent_run
  outputs.

**Tiering (basic vs premium).** Encode entitlements in `user_preferences` /
`agents.enabled`:
- **Basic:** capture, classify, briefing, chat, feedback loop.
- **Premium:** agentic research (IdeaBox), pattern learning, cross-product
  suggestions, custom user agents. These are the token-expensive features —
  natural paywall, and aligns with the cost reality (server-side Claude calls).

### Phasing

- **Near:** `agents` + `agent_runs` tables; port `ai-chat` to a built-in agent via
  `run-agent`; one safe read-only tool (`query_entries`).
- **Mid:** write tools with confirmation; `suggestion-engine`; IdeaBox v1 (research
  agent over existing `idea` entries) behind a premium flag.
- **Long:** user-authored agents (UI to create `agents` rows), richer IdeaBox
  (valuation, scaffolding), consider Managed Agents for long runs.

---

## Theme 4 — Consolidated roadmap

Phase 0 = today. Effort is rough solo-dev sizing (S < 1 wk, M 1–2 wk, L 3+ wk).

| Capability | Schema changes | Edge functions | New screens | Effort | Notes |
|---|---|---|---|---|---|
| **P0 — now** | `entries`, `reminders`, `briefings` | classify-entry, ai-chat, morning-briefing, anti-entropy, transcribe-audio | tabs (home/inbox/insights), chat, reflect, settings, anti-entropy | — | Single-user MVP, RLS in place |
| **P1 Feedback capture** | `app_feedback` (+RLS) | `classify-entry` adds `feedback` domain; exclude feedback from briefing/anti-entropy queries | feedback list in settings | S–M | Tag + AI detection; provenance via `entry_id` |
| **P1 Per-user prefs + memory** | `user_preferences`, `user_memory` (+RLS) | inject memory summary into classify/chat/briefing | preferences UI in settings | M | **Depends on**: service-role query audit |
| **P1 Multi-tenant hardening** | none (RLS exists) | audit every service-role query is `user_id`-scoped; add tests | onboarding/signup | M | **Riskiest assumption: service-role paths are correctly scoped.** Verify before any real users |
| **P2 Feedback digest** | `feedback_digests` (or Storage bucket) | `feedback-digest` (scheduled) | digest view (optional) | M | Cluster + prioritize; Markdown artifact for dev/Claude Code |
| **P2 Pattern learning** | `user_memory` (reuse) | `learn-patterns` (scheduled) | — | M | Feeds personalization + suggestions |
| **P2 Agent platform core** | `agents`, `agent_runs` (+RLS) | `run-agent` (tool-use loop); port `ai-chat` to built-in agent | agent run history (optional) | L | Read-only `query_entries` tool first |
| **P2 Config-driven home** | `layout_config` jsonb | none | home renders from config | M | Refactor home cards to data-driven; scope tightly |
| **P3 Suggestion engine** | `product_suggestions` (+RLS) | `suggestion-engine` (scheduled) | suggestion card | M | Rule-assisted + LLM rationale; premium gate |
| **P3 IdeaBox v1** | reuse `idea` entries; later `idea_research` | idea-research agents via `run-agent` (web_search) | IdeaBox tab | L | Built on agent platform; premium tier |
| **P3 User-authored agents** | reuse `agents` (user_id set) | `run-agent` (write tools w/ confirm) | agent builder UI | L | **Depends on**: agent platform core |
| **P4 Atomic layout customization** | widget registry config | none | layout editor | XL | **Optional, demand-gated.** High maintenance cost for solo dev |

### Dependencies (critical path)

```
service-role audit ──► multi-tenant ──► per-user memory ──► personalization
                                              │
                                              ▼
                          pattern learning ──► suggestion engine ──► IdeaBox
                                              │
agent platform core ──────────────────────────┴──► user-authored agents
feedback capture ──► feedback digest
config-driven home ──► atomic layout (optional)
```

### Riskiest assumptions (call them out)

1. **Service-role queries are all user-scoped.** Service role bypasses RLS;
   `ai-chat`/`morning-briefing` correctness depends on manual `user_id` filters.
   This is the one thing that *must* be verified before onboarding a second real
   user. Cheap to test, catastrophic if wrong (cross-user data leak).
2. **Cost on the free tier.** Every agent run, digest, and personalization call is
   a server-side Claude request. Pattern learning and IdeaBox are token-heavy —
   they belong behind a premium tier, and even then need run caps / batching.
   Supabase free tier also limits edge function invocations and pg_cron.
3. **"Autonomous learning" stays bounded.** The honest scope is: cluster feedback,
   summarize patterns into memory, rank suggestions. It is not self-modifying
   code. Keep claims matched to what ships.
4. **Atomic UI customization may never pay off.** A fully dynamic, per-user layout
   is a large permanent maintenance tax. Gate it on proven demand; the
   config-driven home (P2) likely captures 80% of the value at 20% of the cost.

### "Do this first" recommendation

**Build the feedback loop (P1 Feedback capture) and the per-user memory table
together, on top of a service-role query audit.** Rationale: the feedback loop is
the highest-leverage, lowest-risk piece — it directly serves the owner's stated
desire to evolve the app from inside the app, it reuses the existing classifier as
its only integration point, and it produces the developer backlog that drives
everything else. Doing the service-role audit at the same time unblocks every
later multi-tenant and personalization phase. Everything in Themes 2–3 either
depends on per-user memory or benefits from the feedback signal, so this is the
foundation the rest of the roadmap stands on.
