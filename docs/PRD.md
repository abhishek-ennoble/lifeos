# LifeOS — PRD (lite)

## What it is
A personal life-management app. You capture anything in one text box; an AI router
files it into a domain; the app surfaces what matters today and writes a morning
briefing. One screen to dump, one inbox to browse, one briefing to orient the day.

## Who it's for
- **Primary:** the owner (Abhishek), personal single-user use.
- **Secondary:** a few friends/teammates for feedback. Not a public product.

## Core loop
1. **Capture** — free text (Home capture box, Brain dump modal, or Journal/Reflect flow).
2. **Classify** — `classify-entry` edge function calls Claude Haiku and returns a
   structured entry: `domain`, title, description, priority, recurrence, due/expiry,
   optional `life_area`. (Journals skip this — inserted manually as `domain='journal'`.)
3. **Review** — Home "Today" strip (top 3 actionable), Inbox (filter by domain or
   life-area), on-demand morning briefing, and a stale-items ("anti-entropy") banner.

## Domains & life-areas
- **Domains** (AI-routable): `health`, `task`, `learning`, `idea`, `note`.
  `journal` is a sixth domain but manual-only — never an AI target.
- **Life areas** (cross-cutting metadata tag, not domains): `spiritual`, `creative`,
  `technical`, `family`, `finance`.

## Non-goals / deferred (currently out of scope)
| Deferred | Status |
| --- | --- |
| Plugins / extensibility | Not built |
| Autonomous agents / research-on-ideas | Stubbed flag only (`research_ready: false`) |
| MedTracker (dedicated medication tracking) | Not built |
| Finance tracking | Life-area tag only, no feature |
| Idea research, prioritize AI task | Defined in `lib/ai.ts` model map, no UI |
| Voice capture | Stubbed (see BUILD_STATUS) |
| Multi-user / sharing | Single-user auth only |
