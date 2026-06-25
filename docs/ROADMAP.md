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

- [ ] **1.1 Service-role security audit** · M · **[Claude Code]**
  Verify every service-role query in `ai-chat` and `morning-briefing` is
  `user_id`-scoped (service role *bypasses RLS*). Add a test. **This must pass
  before a second real user ever signs up** — cross-user leak risk otherwise.
  *(Riskiest assumption in the whole product. See PRODUCT_EVOLUTION §Theme 2.)*

- [ ] **1.2 Feedback capture loop** · S–M · **[Claude Code]** (backend) → **[Cursor]** (settings list UI)
  - Add `feedback` domain to `classify-entry` (+ `fb:` tag fast-path).
  - New `app_feedback` table (+ RLS, see PRODUCT_EVOLUTION §Theme 1 for schema).
  - Exclude `domain='feedback'` from briefing/anti-entropy queries.
  - Simple feedback list in Settings so you can see what was captured.
  - *This is the "improve the app from inside the app" engine you asked for.*

- [ ] **1.3 Per-user preferences + memory tables** · M · **[Claude Code]**
  `user_preferences` (explicit settings) + `user_memory` (AI-inferred patterns).
  Inject a compact memory summary into `classify-entry` / `ai-chat` /
  `morning-briefing` prompts. *Depends on 1.1.*

- [ ] **1.4 Token-usage / cost tracking (the spend indicator)** · S–M · **[Claude Code]**
  *(Your request — start simple, grow into per-user billing later.)*
  - Capture `usage.input_tokens` / `output_tokens` from every Claude/OpenAI
    response in the edge functions.
  - New `ai_usage` table: `id, user_id, function, model, input_tokens,
    output_tokens, est_cost_usd, created_at`. Cost estimated from a small
    model→price map kept in one place.
  - A lightweight usage view (Settings → "AI usage this month") so you can see
    spend at a glance and never get surprised.
  - Foundation for: per-user quotas, the premium tier, and abuse caps once
    others use it. Ties into `agent_runs.cost_tokens` from the agent platform (2.3).

---

## Phase 2 — Learning & agents

- [ ] **2.1 Feedback digest** · M · **[Claude Code]**
  Scheduled `feedback-digest` fn: cluster duplicates, prioritize
  (severity×frequency×recency), emit a Markdown backlog a dev/agent acts on.

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
1.1 service-role audit ─► multi-tenant ─► 1.3 memory ─► personalization
                                             │
                                             ▼
                       2.2 pattern learning ─► 3.1 suggestions ─► 3.2 IdeaBox
2.3 agent platform ────────────────────────────┴─► 3.3 user agents
1.2 feedback capture ─► 2.1 feedback digest
1.4 token tracking ───► (feeds premium tiers & quotas everywhere)
2.4 config home ──────► 4.1 atomic layout (optional)
```

**Do first:** 1.1 + 1.2 + 1.3 together — lowest risk, highest leverage, foundation
for everything else.
