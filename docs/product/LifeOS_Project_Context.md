# LifeOS Project — Strategic Context & Decisions
*Saved from conversation with Abhishek, June 2026*

---

## What We're Building
A **Personal Life Operating System (Life OS)** — a mobile/web app that:
- Accepts voice or text input (any time, any context)
- Uses AI to auto-classify, route, and store information into the right domain
- Sends smart reminders and a personalized morning briefing
- Is agentic where necessary, simple where not
- Built for Abhishek first, potentially productized via ennoble.ai

---

## Abhishek's Use Cases (documented)
1. Daily medicine — prepare + consume thrice a day
2. Hard disk data recovery (one-time task)
3. Music learning — long-term/lifetime, produce songs
4. Technical courses — lifetime learning
5. Spiritual/personal subject learning
6. Scooty repair
7. Daily guitar practice
8. IdeaBox (logged ideas, AI research, shareable)
9. Ideas scattered everywhere — unified under one roof, delegatable
10. Teach Python to fellows
11. CCAF course preparation
12. Finance planning — investments, digital assets
13. Family care — specific things to remember per person
14. Travel planning — annual treks
15. Ephemeral reminders — "keys in bag"

---

## Architecture Decisions Made

### Core System
- **Input**: Voice (Whisper/Deepgram) + Text + Photo/OCR
- **AI Brain**: Claude API for routing + classification
- **Database**: Supabase (Postgres + pgvector)
- **Frontend**: React Native (mobile + PWA)
- **Scheduler**: Supabase Edge Functions + pg_cron
- **Cost estimate**: $3-8/month for personal use

### Domains (routing targets)
Tasks | Reminders | IdeaBox | Learning | People | Finance | Quick Notes

### Agent Usage Decision (key principle)
- **No AI needed**: time-based reminders (post-capture), ephemeral notes
- **Small LLM (Haiku/Phi-3)**: classification, morning briefing, entity extraction
- **Large LLM (Sonnet)**: prioritization, conversational queries
- **Full Agent**: IdeaBox research, travel/trek planning — only on-demand, not proactively
- **Over-engineering to avoid**: agents on scooty repair, hard disk recovery — they're just tasks

### IdeaBox Decision
- IdeaBox is a **separate project** — different lifecycle than tasks
- In Life OS: ideas are just **flagged seeds** (title + few sentences + timestamp)
- Future: IdeaBox app consumes these seeds via API/shared Supabase table
- Both are products under ennoble.ai umbrella

### Platform Architecture Decision
- **Plugin/microapp model preferred** over monolith
- Core: Capture → Classify → Route → Remind
- Each domain (medicine, ideas, finance) can be standalone app OR plugin
- Long-term: platform + plugin ecosystem (like iOS Apps / Shopify app store)
- Revenue model: platform subscription + premium domain plugins

---

## Market Data (researched June 2026)

| Market | Size | Growth |
|--------|------|--------|
| Productivity apps (global) | $13-14B (2025) → $30B (2034) | ~9.9% CAGR |
| Medication reminder apps | $1-2.5B (2025) | 9-15% CAGR |
| mHealth apps (total) | $~40B+ | High |

### Comparable Products
- **Notion**: 100M users, $600M revenue, $10-20/user/month
- **Todoist**: 30-50M users, $100M ARR, $5/month pro
- **ADHD adults globally**: 404 million (strong fit segment)
- **Chronic disease patients needing adherence**: billions (WHO: 50% non-adherent)

### Target Segments (priority order)
1. Multi-domain knowledge workers / entrepreneurs — ~500M globally
2. ADHD adults — 404M globally
3. Lifelong learners with parallel goals
4. Caregivers + chronic disease patients (medicine tracker angle)
5. NOT: single-domain users, social-accountability dependent users

---

## Medicine Tracker — Separate Design Problem
This is NOT just a reminder. It's a **safety-critical system**:
- Family acknowledgment loop (caregiver confirms patient took medicine)
- Escalation chain: patient → family member → doctor
- Urgency design: for life-threatening conditions, missing 1 day can be critical
- Market: $1-2.5B, strong willingness to pay, health domain
- In Life OS: basic reminder only
- Full product: MedTracker (standalone app, integrates back to Life OS)
- HIPAA/privacy considerations if productized

---

## Monetization Model (decided)
### Free Tier
- Capture + classify (text only)
- 3 domains
- Basic daily reminders
- 7-day history

### Pro — $5-8/month
- All domains, voice input, morning briefing
- AI routing, full history, IdeaBox seeds
- Smart prioritization

### Premium — $15-20/month
- Research agents, delegation, integrations
- Full IdeaBox (until standalone)
- Family sharing for medicine tracker

### Domain Add-ons (plugin model)
- MedTracker Premium: $3-5/month (family loop, escalation, reports)
- IdeaBox Full: $5-8/month (research, collaboration)
- Finance Tracker: $3-5/month

---

## Tech Leader Perspectives Applied
- **Paul Graham**: Build for yourself first. Launch ugly. Real usage beats perfect design.
- **Andrej Karpathy**: The AI IS the logic (Software 2.0). Start as simple CLI/app, measure what matters.
- **Andrew Ng**: Data flywheel — more users → better pattern recognition → better AI responses
- **Jeff Bezos**: Work backwards from daily user experience. Platform thinking from day 1.
- **Marc Andreessen**: Software eats productivity. Winner = solves the data network effect.

---

## Key Principles / Non-Negotiables
1. **Voice-first capture** — zero friction is the product
2. **Never let capture require thinking** — AI does the organizing
3. **Morning briefing must span all domains** — this is the daily value loop
4. **Offline-first** — must work on trek with no signal
5. **Privacy as feature** — option for local-first, E2E encryption
6. **Anti-entropy built in** — weekly AI garden maintenance to prune stale tasks
7. **Don't over-agent** — most things are tasks, not research projects

---

## What NOT to Build First (defer these)
- IdeaBox research agent (future separate app)
- Travel/trek planning agent (phase 2)
- Finance analysis agent (phase 2)
- Full delegation/sharing (phase 2)
- Family loop for medicine (MedTracker — separate product)

---

## Surprise Insights (captured)
1. **Location-aware reminders** — phone knows you're leaving home → "took medicine? keys in bag?"
2. **2am brain dump mode** — lights off, voice, no judgment, AI holds it for morning
3. **Energy-aware scheduling** — route tasks by energy level, not just time
4. **Anti-entropy weekly review** — AI flags stale tasks, dead goals, avoidance patterns
5. **Spaced repetition for learning goals** — Ebbinghaus forgetting curve built into reminders
6. **Quarterly life audit** — AI generates meta-insight: what you did, avoided, patterns
7. **Offline-first architecture** — essential for trek use case
8. **Home screen widget** — top 3 priorities + voice capture button = more used than the app
9. **Aging information** — tasks untouched for 60 days get surfaced for decision: relevant? blocked? avoiding?
10. **Privacy as differentiator** — local-first option, E2E encryption

---

## Next Steps (agreed)
- [ ] Define MVP scope (4-week buildable version)
- [ ] Schema design for core domains
- [ ] AI routing prompt design
- [ ] Tech stack finalization
- [ ] IdeaBox as separate project — scope separately
- [ ] MedTracker — scope separately as safety-critical product

---
*This file is a living document — update as decisions evolve.*
