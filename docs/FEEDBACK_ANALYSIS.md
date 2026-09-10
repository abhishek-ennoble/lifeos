# Feedback analysis & triage — living doc

Iterative feedback → analysis → action. Re-run `node scripts/introspect-usage.mjs`
to refresh the data snapshot (`.discovery/introspection.json`, gitignored), then
update this doc: mark items shipped, re-prioritize, append new rows.

**Last analyzed:** 2026-09-10 · 19 feedback items (18 Abhishek + 1 Manish) · usage data Jun 23 – Jul 27 ·
Supabase restored after ~45-day pause (Jul 28 – Sep 10)

---

## 1. Feedback inventory (all `app_feedback` rows)

Type: **bug** / **feature** / **ux** / **research** (design input, not directly actionable) / **strategy**.
Product status: **open** / **partial** (some of it shipped) / **shipped** / **deferred** (guardrails or phase-gated).

| # | Date | User | Summary | Type | Product status | Maps to |
|---|------|------|---------|------|----------------|---------|
| F1 | 06-29 | A | Feedback invisible, text box not visible, agents for research | bug+feature | **partial** — feedback list shipped (1.2); agents open | 2.3 |
| F2 | 06-29 | A | Customization + agent-based subscription (tokens = monetization) | strategy | open | 2.3 / 3.x |
| F3 | 06-29 | A | AI agents per domain to drive task execution | feature | open | 2.3 |
| F4 | 06-30 | A | Can tasks be saved/archived? | feature | **shipped** — archive status exists | — |
| F5 | 06-30 | A | Long text can't be expanded; update reminders from inbox | ux | **partial** — entry detail modal shipped (1.0.2); reminder edit from inbox open | 1.2d follow-up |
| F6 | 07-01 | A | Cost per day / per month / all-time | feature | **partial** — month + all-time shipped (1.4); per-day open | 1.4 follow-up |
| F7 | 07-01 | A | Inbox cluttered, needs minimalist organization | ux | **partial** — sort/filter shipped (1.2e); clutter persists (61 pending, 51 >14d old) | capture→closure gap |
| F8 | 07-01 | A | Cheaper model for chat? Evaluate Whisper too | cost | open — chat = 62% of AI spend ($0.17/$0.28) | model eval slice |
| F9 | 07-01 | A | Heavy usage: 100 entries/day, 1yr/3yr lifecycle, analytics | strategy | open (parked — handoff §8 cleanup/grouping) | Phase 2+ |
| F10 | 07-01 | A | Vision: clear mind fog vs track everything; configurable weekly/monthly reminders | strategy | open | PRODUCT_EVOLUTION |
| F11 | 07-01 | A | Time/date on tap per note (WhatsApp-style chronology) | ux | open (small) | UI slice |
| F12 | 07-01 | A | Eisenhower matrix; competitor study; onboarding customization; let-go; integrations later/paid | research | open | triage/let-go design |
| F13 | 07-01 | A | GTD 2-min rule, PARA, CODE, collector's fallacy, Zettelkasten | research | open | triage/let-go design |
| F14 | 07-01 | A | Forgetting curve, spaced rep, active recall; habit loop reward UI; "not every capture becomes a task — let go"; GTD triage | research | open | triage/let-go design |
| F15 | 07-01 | A | Fogg B=MAT; every pre-capture decision is a brain-cycle cost | research | open — capture is already zero-decision; keep it that way | design principle |
| F16 | 07-05 | A | Voice dump indicator in inbox — is it useful? | ux | open (small; only 4 voice captures so far — low priority) | UI slice |
| F17 | 07-14 | A | Task stale 30 days → spawn decomposition/research agent | feature | open — agent flavor of anti-entropy | 2.3 |
| F18 | 07-20 | A | Share cards with friend/family (in-app like GDrive, or WhatsApp) | feature | **deferred** — sharing/delegation is Phase 2 platform per guardrails | Platform layer |
| F19 | 07-21 | M | "App not working" — reported by Sanu, from another phone (bhaiya's) | bug | open — vague; needs repro. Related confirmed bug: hardcoded "Abhishek" greeting | P0 fix below |
| F20 | 07-27 | A | Important item stale 15 days → research agent suggests concrete options (e.g. nearby ultrasound places) + related follow-ups; premium (token-heavy) | feature | recorded — roadmap 3.2b | 2.3 / 3.2b |
| F21 | 09-10 | A | Home landing: briefing/greeting block is too long — user must scroll before capture; should be **short + collapsible** so dump is instant | ux | **shipped** (T-5, 2026-09-10) — capture first, briefing collapsed to first paragraph, server prompt short-first | ROADMAP T-5 |
| F23 | 09-10 | A | Batch dumps from other sources (WhatsApp self-texts while app was down) will recur; ideally read other apps with permission | product | v0 shipped: provenance fields + curated import (11 entries); share-intent + export importer next; auto-read evaluated & declined (design §9.4) | ROADMAP 2.8 |
| F24 | 09-10 | A | Timeline: "what happened when"; dump *patterns* matter psychologically | product | recorded; `original_at` + `thoughtTime()`; Mirror signals designed (§9.2) | ROADMAP 2.9 |
| F25 | 09-10 | A | Follow-ups: system devises them, I answer when I want; cognitive load off | ux | **shipped v0** — Follow-ups screen, Home banner, 20 questions parked | ROADMAP 2.8a |
| F26 | 09-10 | A | IdeaBox end-to-end: potential, market fit, competition, revenue, uniqueness, UX, **dharma** ("should we even do it"); interaction-heavy; path options w/ costs (film: Bollywood/animation/AI); Builder agents for apps → Play Store | strategy | designed (§9.5): dharma gate first, Interviewer central, path-specific worker sets, results as entries+tags | ROADMAP 3.2 |
| F22 | 09-10 | A | IdeaBox: brain dumps that are productifiable (e.g. Swara Vigyan app) → multi-agent market scan, differentiation, evaluation, prototype; separate app? | strategy | recorded — **separate surface, shared substrate; build later** (design §8); Swara Vigyan captured as first candidate | ROADMAP 3.2 |

---

## 1b. Item-by-item report (verbatim → understanding → solution → decision)

**F1 · 06-29 · Abhishek (backfill)**
> "I wrote a lot of feedback through tasks and it did not work and I can't see them. … 1. Customisation and giving [agents] for users … Premium subscription gets more agents. 2. Text box is not visible. 3. Agents should be there to further do more research on the users problems based on priority… I want the app to be able to read from these messages and build itself well."

- **Understanding:** Three asks — (a) feedback was getting lost in tasks, (b) a text-box visibility bug, (c) per-user research agents with a premium tier. Plus the meta-wish: the app should learn from these messages.
- **Solution:** (a) `app_feedback` pipeline + Settings list (1.2, shipped); (b) keyboard-overlap fixes (Phase 0, shipped); (c) agent platform (2.3).
- **Decision:** (a)+(b) **shipped** — mark accordingly; (c) **deferred to 2.3** after Friend Beta validates demand. The meta-wish is exactly this doc's ritual — **live now**.

**F2 · 06-29 · Abhishek (backfill)**
> "Users communicate preferences/improvement requests via chat, notes, or journal entries. System analyzes feedback and suggests specialized agents… Monetization model: agents consume tokens, features cost tokens."

- **Understanding:** Suggestion engine + token-based premium tiering.
- **Solution:** 3.1 suggestion engine + tiering design in PRODUCT_EVOLUTION Theme 3.
- **Decision:** **Deferred, Phase 3.** Beta comes first — pricing a product no one retains on is premature.

**F3 · 06-29 · Abhishek (backfill)**
> "Introduce specialized agents for each LifeOS domain (health, task, learning, idea, note) that proactively help users move forward on their items…"

- **Understanding:** Per-domain proactive agents — the core long-arc vision.
- **Solution:** 2.3 agent platform (agents-as-data, `run-agent` tool loop).
- **Decision:** **Deferred to 2.3.** Friend Beta data will confirm whether "stuck items need help" generalizes beyond you (your own data says yes: 80% pending).

**F4 · 06-30 · Abhishek**
> "User asking if tasks can be saved or archived in LifeOS"

- **Understanding:** Wants archive so done/irrelevant items leave the inbox without deletion.
- **Solution:** `status='archived'` + archive action.
- **Decision:** **Shipped** — close as shipped in the app once triage statuses exist.

**F5 · 06-30 · Abhishek**
> "while reading the tasks or brain dumps if there is a longer text we can't expand it or view the whole text in any way… Also we should have simple easy way to update our reminders from the inbox section…"

- **Understanding:** (a) Long entries unreadable; (b) reminder editing requires too many steps.
- **Solution:** (a) `EntryDetailModal` tap-to-expand (shipped in 1.0.2); (b) reminder edit affordance on the entry detail / inbox card.
- **Decision:** (a) **shipped**; (b) **going with it — small-UX batch (beta slice 6)**.

**F6 · 07-01 · Abhishek**
> "pricing is refreshing everyday. It should have some way to see per day and per month cost, as well as all time cost."

- **Understanding:** Cost visibility across time windows.
- **Solution:** `ai_usage` aggregations in Settings.
- **Decision:** Month + all-time **shipped** (1.4); per-day view **going with it — small-UX batch**.

**F7 · 07-01 · Abhishek**
> "the inbox is becoming cluttered as it is growing , need to organize it in a minimalist fashion."

- **Understanding:** Not a filter problem — a *closure* problem. Items accumulate with no path out (data: 61 pending, 51 older than 14 days).
- **Solution:** Sort/filter (1.2e) treated the symptom; the cure is the **let-go/triage slice** (weekly stale review: Keep / Done / Let go, reward on cleared inbox).
- **Decision:** 1.2e **shipped**; **let-go slice is the first post-beta item**.

**F8 · 07-01 · Abhishek**
> "we are using sonnet for ai chat, can we use a cheaper model, need to test. For others haiku seems fine. For audio, whisper seems fine , but let's evaluate that also"

- **Understanding:** Cost-optimize the chat model.
- **Solution:** A/B Haiku vs Sonnet on chat quality.
- **Decision:** **Declined for now** — chat cost is $0.17 total; evaluation effort exceeds a year of savings. Revisit when friends multiply usage.

**F9 · 07-01 · Abhishek**
> "what happens when app usage is huge for a user. Say 100 entries per day… usage management after 1 year, 3 years, lifetime…"

- **Understanding:** Data lifecycle at scale — archival, analytics, revisiting done items.
- **Solution:** Feeds let-go design + future analytics; parked in handoff §8 (cleanup/grouping).
- **Decision:** **Parked as design input.** Real usage data (beta) will shape it better than speculation.

**F10 · 07-01 · Abhishek**
> "…Is the aim to bring people closer with their vision? But vision changes… clearing the mind fog, and may be just sticking to things which are most important for (spiritual/physical/mental and social/ personal well being)… Should there be configurable morning / evening reminder that can be weekly or monthly…"

- **Understanding:** Vision reflection (clear fog > track everything) + concrete ask: configurable ritual cadence.
- **Solution:** The vision half anchors the let-go slice's framing. The ritual half: morning/evening notifications exist; weekly/monthly cadence is new.
- **Decision:** Briefing-on-by-default is **beta slice 3**; weekly/monthly cadence **deferred** until the daily ritual proves itself.

**F11 · 07-01 · Abhishek**
> "should every note / journal should have a time/date show feature on tap, as it's done in WhatsApp? Where does chronology lie in this psychology"

- **Understanding:** Chronological context on demand, without cluttering cards.
- **Solution:** Timestamp reveal on tap / in entry detail.
- **Decision:** **Going with it — small-UX batch.**

**F12 · 07-01 · Abhishek**
> "1. can we should we use eisenhower matrix… 2. Understand competitor apps. Like saner, clickup, taskdumpr… 3. Onboarding can fetch a lot of important customization details… personal assistant like feel. 4. Let go feature. Zeigarnik effect. 5. Do we need to integrate other apps like calendar, email… I don't want to… very later. It complicates the app"

- **Understanding:** Five distinct: prioritization framework, competitor research, onboarding-as-personalization, let-go, integrations.
- **Solution & decision:** (1) Eisenhower → **let-go slice design input**; (2) competitor study → **research task, not code**; (3) onboarding → **going with it now — beta slice 2 is exactly this**; (4) let-go → **post-beta slice**; (5) integrations → **declined** (your own words: complicates the app).

**F13 · 07-01 · Abhishek**
> "1. GTD 2-minute rule… 2. PARA method… 3. CODE… 4. Collector's fallacy - you haven't touched these notes in last 1 month 5. Zettelkasten - knowledge base vs to do list"

- **Understanding:** Framework research for organizing captured items; collector's fallacy names the observed pathology.
- **Solution:** Design inputs for the let-go/triage slice (surface untouched items, force a decision).
- **Decision:** **Absorbed into let-go slice design** — first post-beta item.

**F14 · 07-01 · Abhishek**
> "Ebbinghaus Forgetting Curve… Spaced repetition… active recall… Habit loop - after dumping, u need a clear reward like visually emptying inbox… Implementation intention - 'When I feel overwhelmed, open the app'… Not everything captured has to become a task… sometimes we have to let go. GTD-style triage and Let Go feature"

- **Understanding:** The retention psychology brief: resurfacing, reward-on-empty, "when overwhelmed → open app" as onboarding framing, and let-go.
- **Solution:** Reward moment + resurfacing cadence → let-go slice; implementation-intention line → onboarding copy (beta slice 2).
- **Decision:** **Onboarding copy: going with it now.** Rest: **let-go slice, post-beta.** Spaced rep exists in `lib/spaced-repetition.ts` but has limited UI — unchanged for now.

**F15 · 07-01 · Abhishek**
> "B= MAT. Behavior = Motivation + Ability + Trigger. Brain cycles is the one that matters most. Every decision you ask someone to make before you capture… is a brain cycle cost… the whole point is to offload cognitive load."

- **Understanding:** Design law: capture must stay zero-decision.
- **Solution:** Constraint, not feature. Applies immediately to onboarding (guided captures must not add pickers/choices) and to any future capture UI.
- **Decision:** **Adopted as a design principle** — enforced on beta slice 2.

**F16 · 07-05 · Abhishek**
> "if there is a voice dump, then should it indicate that in the inbox , that its a voice dump. Is it of any use"

- **Understanding:** Provenance badge for voice captures — user themselves unsure of value.
- **Solution:** Small badge on EntryCard when transcript-sourced.
- **Decision:** **Hold** — only 4 voice captures to date; build if beta users go voice-heavy.

**F17 · 07-14 · Abhishek**
> "we can have a feature, where user can set for example that if a task is sitting for 30 days, and is not addressed, it spawns a research agent or helper agent, to decompose the task and outline further path to complete it."

- **Understanding:** Stale item → AI decomposition. Agent-flavored anti-entropy.
- **Solution:** Two stages — (1) let-go slice surfaces 30-day-stale items (no AI); (2) "help me break this down" action → agent platform (2.3).
- **Decision:** **Stage 1 in let-go slice (post-beta); stage 2 deferred to 2.3.**

**F18 · 07-20 · Abhishek**
> "should we have the feature where we can share the cards with a friend or colleague or family over email or this app or simply whatsapp. I think it will add more value if it's shared on the app itself, like how g drive does it. But let's see about it."

- **Understanding:** Entry sharing; in-app preferred.
- **Solution:** In-app sharing = multi-user platform layer (guardrails: Phase 2, explicitly deferred). Cheap alternative: native Android share-sheet (text out to WhatsApp).
- **Decision:** In-app **deferred (platform layer)**. Native share-as-text is a candidate for a future UX batch — not in beta scope.

**F19 · 07-21 · Manish**
> "User (Sanu) reports that the app was not working. Accessed from another phone (bhaiya's)."

- **Understanding:** Vague failure report; confirmed adjacent bug: every user sees "Welcome Abhishek" (hardcoded in `app/(tabs)/index.tsx` + `lib/ai.ts`).
- **Solution:** Display name in `user_preferences` → greeting + briefing (beta slice 1); ask Manish for repro details on the "not working" part.
- **Decision:** **Going with it now — beta slice 1** + follow-up question to Manish.

---

## 2. What the usage data adds (not in feedback, found by introspection)

| # | Finding | Evidence | Severity |
|---|---------|----------|----------|
| D1 | **Hardcoded "Abhishek"** shown to every user | `app/(tabs)/index.tsx` greeting + `lib/ai.ts` briefing prompt; Manish saw it | **P0** — breaks trust for any second user |
| D2 | **Reminder loop produces no telemetry** | 12 cloud reminder rows (incl. Jul 27 device tests), `sent_at`/`acknowledged_at` null on all | **Root-caused 2026-09-10:** `addNotificationReceivedListener` only fires in foreground → background deliveries never wrote `sent_at` → ack no-op'd. **Fixed** (T-1): reconcile on launch/foreground + ack fallback. Device-verify F.9 |
| D8 | **Classifier had no clock** | "wake up tomorrow at 6" (Jun 30 2026) → `due_at: 2025-01-10`; cake "around 6pm" → `remind_at: null`; briefing "today" in UTC | **Fixed** (T-2/T-3, deployed, live-verified): `_shared/temporal.ts`, client sends `client_now` + `timezone`; `start_at` ≠ `due_at`; stale-timestamp guard |
| D9 | **Fragments & duplicates** | 24/79 rows are fragments/duplicates of 6 thoughts (Mooladhar ×4, mantra ×3, Financial ×5, Discipline ×5, Ennoble ×5) | **P1 product** — Librarian (2.2) + projects/links (2.1) |
| D10 | **User code ignored** | Jun 26 "code BD1 … recognize that to later make pattern" → follow-ups routed to expiring `note` | **P1** — person model `code` memory (2.0) |
| D11 | **Briefing rendered markdown literally** | Stored Jul 27 briefing contains `**…**`; phone shows raw asterisks | **Fixed** (T-3): `stripMarkdown` server-side |
| D3 | **Feedback pipeline has no closing loop** | all 19 items status `new`; nothing ever triaged | P1 — this doc + status updates are the fix |
| D4 | **Memory/personalization at zero** | `user_memory` 0 rows, `user_preferences` 0 rows for both users | P1 — 1.3 tables shipped, nothing populates them (1.3b/2.2 pending) |
| D5 | **Capture→closure gap** | 80% of entries pending; ideas: 21 captured, 0 done; capture rate decaying (18/day peak → 1–2/day) | **P0 product problem** — matches F7/F12–F14 |
| D6 | Voice thesis unvalidated | 4 transcriptions vs 37 text classifies | watch — don't invest more in voice yet |
| D7 | Friend retention = 1 session | Manish: 2 active days (Jun 30 test, Jul 21), no return between | watch — onboarding/value gap |

---

## 3. Theme clusters

1. **Agents & customization** (F1–F3, F17, F2) — the loudest recurring ask. Roadmap home: 2.3 agent platform. Big (L), phase-gated behind foundation.
2. **Capture→closure / "let go"** (F7, F9, F12–F14 + D5) — the richest cluster: Eisenhower, GTD triage, collector's fallacy, spaced resurfacing, reward-on-empty-inbox. The data proves the pain (61 pending, 51 stale). **No roadmap item covers this today** — anti-entropy (weekly stale review) is the closest primitive but isn't built.
3. **Small UX debts** (F5-remainder, F6-per-day, F11, F16) — each < a day of work; batchable into one polish slice.
4. **Cost/model tuning** (F8) — data says chat/Sonnet dominates spend, but total is $0.28/month; not urgent at this scale.
5. **Trust & multi-user readiness** (F19 + D1, D4) — personalization is at zero; second user sees the owner's name. Blocks any sharing (F18) or friend adoption.

---

## 4. Pending items from roadmap & handoff

- **1.3b Pattern learning job** (Phase 1, unchecked) — would fix D4.
- **2.1 Scheduled feedback digest** — on-demand v0 shipped; cron version pending.
- **2.2 Pattern learning / 2.3 Agent platform / 2.4 Config home** — Phase 2, in order.
- Handoff §8 parked questions: cleanup/dedup (D5-adjacent), grouping, multi-domain dumps, new disciplines.
- Device test checklist (`DEVICE_TEST_CHECKLIST.md`) — voice on-device tests pending.

---

## 5. Prioritized next actions (re-ordered 2026-09-10, owner-approved "work on them")

Order rationale: **trust the machine → know the person → organize → release → reflect → research.**
Full mapping in `INTELLIGENCE_DESIGN.md` §2; roadmap Phases 1.6 → 2 → 3.

| Priority | Slice | Size | Status / why |
|----------|-------|------|--------------|
| **P0** | T-1 Reminder telemetry (D2) | S | ✅ fixed in code; **device-verify F.9** |
| **P0** | T-2 Router temporal grounding (D8) | S | ✅ deployed, live-verified |
| **P0** | T-3 Briefing in user's day + short-first + no markdown (D8, D11, F21) | S | ✅ deployed |
| **P0** | T-4 Keep-alive workflow | S | ✅ written; **owner adds 2 repo secrets + pushes** |
| **P0** | T-5 Home de-clutter (F21) | S | ✅ shipped |
| **P0** | Re-open beta: new APK build with T-1…T-5, re-share to Manish + 1–2 friends | S | needs build (Claude Code) |
| **P1** | T-6 Eval harness from own record | S | model variance observed during T-2 verification |
| **P1** | 2.0 Person model + user codes (D4, D10, BD1) | M | `user_memory` still 0 rows; explicit ask |
| **P1** | 2.1 Projects + links → 2.2 Librarian (D9, F7, F9) | M+M | 30 % redundancy |
| **P1** | 2.3 Steward (D5, F7, F12–F14, F17-1) | M | 63 % pending — the missing soul |
| **P2** | 2.4 Mirror (F10) · 2.5 Coordinator policies (F14d) · T-7 server reminders | M each | reflect + enforce standards |
| **P3** | Follow up Manish on F19 repro | — | still vague |
| **Later** | 3.0 Researcher (F1c, F3, F17-2, F20) · 3.2 IdeaBox (F22) · sharing (F18) · voice badge (F16) | L | on the substrate, premium |
| **Deferred** | AWS/DynamoDB migration | L | only if Supabase can't sustain |

**Shipped since last plan (Jul 27):** FB-1…FB-6; **today (Sep 10):** T-1…T-5.

---

## 6. Triage log

| Date | Action |
|------|--------|
| 2026-07-27 | Initial analysis; 19 items inventoried; D1–D7 findings from usage introspection |
| 2026-07-27 | F20 recorded (stale-item research agent, premium) → roadmap 3.2b. Friend Beta milestone added to ROADMAP (Phase 1.5) |
| 2026-07-27 | Friend Beta FB-1…FB-6 shipped: name fix (D1), onboarding, briefing default, reminder telemetry (D2) + Android channel fix, per-day cost, reminder quick-edit. Backlog triaged via `scripts/triage-feedback.mjs`: 17 → triaged, F4/F8 → done (D3 closed). Briefing/chat deployed; verified briefing says "Morning, Abhishek" |
| 2026-09-10 | Post-pause introspection (`--all`): 2 real users, 0 activity Jul 28–Sep 10. Beta verdict **inconclusive** (see §7). D2 **still open** — 12 reminder rows, 0 sent/ack even after Jul 27 device tests. D5 worsened: 50/79 pending (63%). Committed uncommitted FB work (`418fbad`). |
| 2026-09-10 | Owner verbal: app unusable last few days (Supabase pause confirmed). Abhishek + Manish on 1.1.0. **F21** recorded: Home briefing too long — collapsible summary, capture above fold. **Do not fix this session** — next agent handoff. |
| 2026-09-10 | Owner dumped a WhatsApp batch (4 tasks, 7 ideas) + F23–F26. Curated import with provenance + follow-ups (batch `wa-2026-09-10-01`); Follow-ups screen shipped; design §9 (batches, timeline, dump psychology, auto-read feasibility, dharma-first IdeaBox). |
| 2026-09-10 | Owner: "evaluate all my feedbacks, re-order, work on them." Re-ordered (§5) and shipped T-1…T-5: D2 root cause + fix, temporal grounding (deployed), briefing tz/short-first/no-markdown (deployed), keep-alive workflow, F21 Home. F22 (IdeaBox) recorded; Swara Vigyan idea captured into owner's account. ROADMAP restructured (Phase 1.6 + specialists). |
| 2026-09-10 | Owner reframed goal: intelligence + operational design + feedback loop toward a coordinator + specialist-agent system; original pain = things lost/unactioned for months + redundant data (household, wealth, creative, product ideas). Close re-read of raw record → `INTELLIGENCE_DESIGN.md`: every F/D item mapped to an agent owner (§2); new findings — 30 % of rows are fragments/duplicates of 6 thoughts; areas enum misses household/pet/work/community/society; explicit "learn my code BD1" ask (Jun 26) went to expiring notes; **classifier has no current date** (→ `due_at: 2025-01-10` on "wake up tomorrow"); briefing "today" in UTC. |

---

## 8. Feedback → agent ownership

Every item above is classified into the coordinator + specialist design in
[`INTELLIGENCE_DESIGN.md` §2](./INTELLIGENCE_DESIGN.md#2-feedback--agent-ownership-map)
(principle / coordinator policy / specialist capability / UI / infra, with phase).
Net read: three principles to adopt now (F10a, F13c, F15), two bugs now (temporal
grounding, D2), and the bulk of asks land on **Librarian** (organize) and **Steward**
(release) before any **Researcher**.

---

## 7. Beta verdict (2026-09-10) — Phase 1.5 FB-7 measurement

**Context:** Supabase project paused ~Jul 28; restored Sep 10. No cloud data Jul 28 – Sep 10.
Manish last sign-in **Jul 18** (before 1.1.0 build Jul 27). Abhishek last activity **Jul 27** (build + device test day).

### Success criteria scorecard

| Criterion | Abhishek | Manish | Notes |
|-----------|----------|--------|-------|
| 3+ active days in week 1 | ✅ 18 total | ❌ 2 days (Jun 30, Jul 21) | Manish never returned after Jul 21 |
| ≥1 real capture | ✅ 79 entries | ✅ 8 entries | Manish's mostly test notes; 1 real learning goal (Vedanta) |
| ≥1 reminder acknowledged | ❌ 0/11 telemetry | ❌ 0/1 telemetry | **D2 still broken or untested on 1.1.0** — Jul 27 reminders marked done but `sent_at`/`acknowledged_at` null |
| Knows `fb:` feedback | ✅ 18 items | ✅ 1 item (F19) | Feedback pipeline works |

**Verdict: INCONCLUSIVE** — not a product failure, not a product success. Interrupted by infra pause + single sparse friend tester + Manish never got 1.1.0 fix.

### What the data says (dharmic read — signal over noise)

| Class | Signal | Action |
|-------|--------|--------|
| **Artha (sustainability)** | Backend paused 45 days; $0.30/mo AI cost | Keep-alive cron on Supabase **now**; AWS/DynamoDB migration **only if** Supabase can't sustain friend beta |
| **Dharma (purpose)** | Capture works; closure doesn't — 63% pending, ideas 21→0 done | **Let-go/triage slice** is the next product move, not more capture features |
| **Kama (delight)** | Briefing quality good ("Morning, Abhishek" personalized Jul 27); journal used deeply (birthday entry) | Keep briefing + journal; don't add UI chrome before closure loop |
| **Moksha (release)** | F7/F12–F14 cluster + your own research on collector's fallacy | Weekly review: Keep / Done / Let go — this IS the app's missing soul |

### Infra note (AWS/DynamoDB)

Current stack is **Supabase Postgres**, not DynamoDB. Migration to ennoble AWS is a **Phase 2+ platform decision** —
only worth it when: (a) Supabase cost/pause becomes recurring pain, or (b) ennoble platform needs unified auth/data.
**Do not migrate before product validates.** Fix pause with keep-alive first.

### Owner answers (2026-09-10, verbal)

1. **What broke:** App unusable for the last few days — **confirmed Supabase pause** (capture/AI dead until restore).
2. **Who got 1.1.0:** Abhishek + Manish installed. F19 "app not working" repro still unknown.
3. **New feedback (F21):** Home landing has a very long read (briefing/greeting); should be **small + collapsible** so user can dump immediately without scrolling. **Deferred to next build slice** — not in current session scope.
4. **Still open:** Jul 27 reminder sound + telemetry write-back (D2) — verify on device when testing resumes.
