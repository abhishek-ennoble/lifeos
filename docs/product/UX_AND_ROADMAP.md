# LifeOS — UX Decisions & Phased Roadmap

> Living document. Captures product/UX decisions and deferred (Phase 2+) items so nothing is lost.
> Last updated: June 16, 2026

---

## 1. Locked Decisions (Phase 1)

### Domain model
- **5 AI routing domains stay as the backend classification layer**: `health`, `task`, `learning`, `idea`, `note`.
- These are **NOT** 5 equal navigation tabs. Navigation collapses to **Home + Inbox + filters** (see UX below).
- A wrong bucket is acceptable — re-routing is one tap. Capture must never ask "where?".

### Life-area tags (cross-cutting, NOT new domains)
Applied as metadata on any entry so cross-cutting areas surface via filters/views:
- **Spiritual**
- **Creative**
- **Technical**
- **Family**
- **Finance**

Rationale: items like "music theory course" (learning) and "guitar practice" (health) can both appear under a **Creative** view without creating new domains.

### Special routing rules
- **Guitar practice = both skill and habit.** Model as a `health` habit entry (daily recurrence + streak) AND tagged `Creative`; link to a `learning` goal for skill progression. Practical implementation: one `health` entry with `life_area: "creative"` and an optional linked `learning` entry for the long-term skill arc.

### Rituals (user-configurable times)
- **Morning briefing**: soft notification (dismissable), opens to narrative + top 3 + capture prompt. **Time configurable by user.**
- **Evening reflection**: short (2 min) — highlight / gratitude / tomorrow's anchor. **Time configurable by user.** Off by default first week; always skippable; never guilt-driven.

### UX principles (minimum bar)
1. Capture never asks "where?" — mic-first, typing fallback.
2. Home is narrative (briefing + today), not a raw todo list.
3. Tabs are for browsing/filtering, not daily living.
4. Soft, not loud — no red badges, streak shame, or "you failed" copy.
5. Night mode is first-class (2am brain dump must feel dark, quiet, safe).

### Home screen hierarchy
1. Morning narrative (~150 words, human tone)
2. "Today" strip — max 3 items
3. One-tap capture (floating mic FAB)
4. "See all" → filtered views (not 5 equal tabs)

---

## 2. Item → Section Mapping (reference)

| Item | Routes to | Tag |
|------|-----------|-----|
| Medicine prep + 3x daily | health (+ task for prep) | — |
| Hard disk recovery | task | technical |
| Music courses + produce songs | learning + idea | creative |
| Technical courses (lifetime) | learning | technical |
| Spiritual / subject learning | learning | spiritual |
| Scooty repair | task | — |
| Guitar daily practice | health (habit) + learning (skill) | creative |
| IdeaBox + research agents | idea (MVP) → plugin (P2) | — |
| Scattered ideas + network eval | idea + delegation (P2) | — |
| Teach Python to fellows | task/learning `{type: teaching}` | technical |
| CCAF prep | task (exam date) + learning | technical |
| Finance / investments | task/idea now → Finance plugin (P2) | finance |
| Family per-person notes | note/task `{person}` → People view (P1.5) | family |
| Travel / treks | task now → travel agent (P2) | — |
| Keys in bag | note (24h expiry) | — |
| Spiritual practices (sadhana) | health (habit) + learning | spiritual |

---

## 3. Phase Plan

### Phase 1 (now)
- 5-domain AI routing (built)
- Home = briefing-first + mic FAB
- Navigation: Home + Inbox + filters (reduce from 5 equal tabs)
- `life_area` tags: Spiritual, Creative, Technical, Family, Finance
- Morning soft notification + in-app guidance (user-configurable time)
- Journaling — **lightweight** (see Section 4 decision)

### Phase 1.5
- Evening reflection ritual (configurable time, opt-in)
- People metadata (`person: "Mom"`) + a People filter view (no separate tab)
- Journal AI extraction — opt-in, on demand

### Phase 2 (deferred — keep architecture friendly)
- **Delegation** (see Section 5)
- **Finance plugin / structured views** (item 12)
- **IdeaBox full** — research agents (market relevance, competition, feasibility), shareable
- **Travel planning agent** (item 14)
- **Deep customization** (see Section 6)
- Multi-user accounts, sharing, RLS across users
- iOS build, home-screen widget

---

## 4. Journaling — Decision

**Verdict: Yes, but lightweight in Phase 1; richer extraction in Phase 1.5/2.**

- **Phase 1**: allow a free-form **journal entry type** that is NOT aggressively classified into action domains. It is reflective, not actionable. Stored, searchable, never nags. The evening ritual feeds into this naturally.
- **Phase 1.5/2**: opt-in AI extraction — "Want me to pull anything actionable from this entry?" (e.g. a task or idea surfaced from a journal). Never automatic; user stays in control.
- Privacy: journals are among the most sensitive data — same RLS + no-third-party rules as health. Audio (if voice-journaled) transcribed then discarded.

Open implementation question (decide at planning): journal as a 6th lightweight type vs. a `note` variant with `reflective: true`. Leaning toward a distinct `journal` type because lifecycle (no expiry, no action) differs from ephemeral notes.

---

## 5. Delegation (Phase 2)

Resonates strongly; fits items 8, 9, 10, 13. Deferred because it changes LifeOS from personal OS → collaborative OS (multi-user auth, cross-user RLS, accept/reject state machine, conflict handling).

Flow: delegate → delegatee gets soft notification ("task request from X, accept/reject") → on accept, task enters their inbox with context → updates flow back to delegator.

**Phase 1 prep (zero cost now)**: store `delegatable: true` in metadata on relevant ideas/tasks so we don't refactor later.

---

## 6. Customization (Phase 2 direction)

User wants the app to become highly customizable later. Keep this in mind architecturally:
- Domains/tags should be data-driven, not hardcoded everywhere (already using `DOMAINS` constant + `life_area` tags as the seam).
- Ritual times, enabled rituals, notification tone already user-configurable by design.
- Future: custom views/filters, custom life areas, custom plugin enablement (plugin platform vision).
- Design principle: the **core capture→classify→route→remind loop stays fixed**; customization happens at the **presentation + plugin layer**, not the core engine.

---

## 6b. Analytics over historic data (decision)

**Verdict: Yes — and it's a natural strength of LifeOS, phased.**

LifeOS already stores time-stamped, structured, domain-tagged data (entries, status changes, reminders, briefings, journals). That is exactly the substrate analytics needs — we get it almost for free.

- **Phase 1 (local, zero AI cost)**: simple period stats from existing data — completion counts, habit consistency (strength curve), entries per domain/life-area, this-week vs last-week. Rendered as calm visuals (see DESIGN_SYSTEM whitespace/periphery rules), never as a pressure dashboard.
- **Phase 1.5**: weekly/monthly **gentle** summaries (e.g. "You showed up for guitar 5 of 7 days"). Tied to the existing anti-entropy + evening ritual loops. Self-compassion framing — momentum, not judgment.
- **Phase 2 (Sonnet reasoning)**: qualitative insight over a period — patterns ("you tend to avoid finance tasks"), correlations (journal sentiment vs. habit consistency), the "quarterly life audit" from the original surprise-insights list. On-demand only, never proactive.

Privacy: analytics computed on the user's own data only; no third-party telemetry (per guardrails). Sensitive domains (health, family, finance, journal) included only for the user's own eyes.

Implementation seam: keep entry status changes append-friendly so trends are computable later (consider an `entry_events` log in Phase 1.5 rather than only mutating `status`).

## 7. Notes to Self (don't lose these)
- Forcing undismissable notifications = rejected (feels hostile; users associate with alarms/spam). Tease one line in notification; richness in-app.
- Evening ritual must never read as "you failed today's goals."
- Reduce navigation before Supabase UI feels "real" — generic Expo styling is a daily-use blocker.
- Guitar = both skill+habit is the canonical test case for the dual health+learning + tag model.
