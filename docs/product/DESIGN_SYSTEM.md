# LifeOS — Design System & Psychology Spec

> Research-backed look-and-feel. Every decision below is grounded in cited UX/behavioral research, not preference.
> Last updated: June 16, 2026

---

## 0. Research foundations (what the decisions are based on)

| Source | Principle we apply |
|--------|--------------------|
| **Calm Technology** (Amber Case, Xerox PARC lineage) | Tech should ask for the *smallest possible amount of attention*; inform without demanding; use the periphery. |
| **Calm UI = Cognitive Load Budget** (Codexical, 2026) | Make the primary action visually dominant (findable in <500ms); recess secondary actions; reduce always-on persistent elements. |
| **Streak/Self-Compassion research** (Yu-kai Chou; Lally 2010; Silverman & Barasch 2023; Neff) | Broken streaks create *quit* moments, not restart moments. Use grace days + kind failure copy. A single missed day does not reset habit automaticity. |
| **Bloom / Everyday / Keelify** (habit app field data) | ~78% quit habit apps in 2 weeks due to streak anxiety. Count *every* show-up; never erase history; no nagging. |
| **Material Dark Theme + color psychology (2026)** | Dark grey not pure black; desaturated accents for WCAG 4.5:1; deep blue = trust/calm, warm tones stop it feeling clinical. |

The single north star: **calm is not "empty" — calm is the moment attention becomes available.** LifeOS should create that moment, then get out of the way.

---

## 1. Emotional design goals

What the user should *feel* at each touchpoint:

| Moment | Target feeling | Anti-goal (avoid) |
|--------|----------------|-------------------|
| Opening app | "It already understands my day." | Overwhelm, a wall of tasks |
| Capturing | "That was effortless." | "Where do I put this?" |
| Morning briefing | "A friend who read my life." | A manager assigning work |
| Missing a habit | "Tomorrow is fine." | Guilt, shame, red alarms |
| 2am brain dump | "Safe to let go." | Bright, judgmental, awake |
| Evening reflection | "The day had meaning." | "You failed your goals." |

---

## 2. Color system

### Philosophy
Deep blue **foundation** (trust, focus, lowers visual noise for info-heavy screens) + **warm accent** (so it never feels clinical/corporate) + **desaturated** semantic colors (WCAG-safe, no optical vibration on dark).

### Light theme
| Token | Hex | Use |
|-------|-----|-----|
| `bg` | `#F7F8FA` | App background (soft, not pure white) |
| `surface` | `#FFFFFF` | Cards |
| `text-primary` | `#111827` | Headlines, body |
| `text-secondary` | `#6B7280` | Meta, hints |
| `primary` | `#2F4A7C` | Deep calm blue — primary actions |
| `accent-warm` | `#E8B86D` | Soft gold — highlights, streaks, warmth |
| `border` | `#E5E7EB` | Hairlines |

### Dark theme (first-class, not an afterthought)
Per Material: **dark grey, not black**; desaturated tones.
| Token | Hex | Use |
|-------|-----|-----|
| `bg` | `#121316` | App background (never `#000`) |
| `surface` | `#1C1E22` | Cards (elevation via lighter grey, not shadow) |
| `surface-raised` | `#24272C` | Modals, brain-dump |
| `text-primary` | `#ECEDEE` | Body (15.8:1 target on bg) |
| `text-secondary` | `#9BA1A8` | Meta |
| `primary` | `#8FB0E8` | Desaturated blue (200-tone, WCAG AA) |
| `accent-warm` | `#E8C589` | Muted gold |

### Domain colors (used sparingly — periphery, not decoration)
Desaturated so they pass contrast and don't shout. Used as small dots/edges, not full-card fills.
| Domain | Light | Dark |
|--------|-------|------|
| health | `#C2554E` | `#E08A84` |
| task | `#3B6FB0` | `#86A9D8` |
| learning | `#7C5CB0` | `#B49CE0` |
| idea | `#C08A3E` | `#E0B879` |
| note | `#6B7280` | `#9BA1A8` |

### Life-area accents (tags: Spiritual, Creative, Technical, Family, Finance)
Subtle, used only in filter chips/views — never compete with domain or primary.

**Rule:** Reduced color vocabulary. If a color isn't carrying meaning, remove it.

---

## 3. Typography

| Role | Spec | Why |
|------|------|-----|
| Display (briefing) | 28/34, weight 700 | Human, warm, the "voice" |
| Title | 18–20, weight 600 | Card headers |
| Body | 16, weight 400, line-height 1.5 | Readability on mid-range Android |
| Meta | 13, weight 500, secondary color | Periphery info |
| System font stack | Native (SF / Roboto) | Performance on low-end devices; no font download cost |

**Tier 2/3 Android constraint:** generous sizing, high line-height, no thin weights (they break on low-DPI screens). Support Hindi script rendering — test Devanagari line-height (it needs more vertical space than Latin).

---

## 4. Layout & hierarchy (calm UI = cognitive load budget)

### The 500ms rule
On every screen, the **one primary action** must be findable in under half a second. Everything else recedes.

### Home (the screen you live on)
```
┌─────────────────────────────┐
│  Good morning, Abhishek      │  ← warm, time-aware greeting
│                              │
│  [ Morning narrative ~150w ] │  ← the briefing, prose, primary focus
│                              │
│  Today                       │
│   • Medicine (8am)           │  ← MAX 3 items. Ruthless.
│   • Guitar practice          │
│   • CCAF: chapter 4          │
│                              │
│            ... space ...     │  ← purposeful whitespace
│                              │
│         (  🎤  )             │  ← single dominant capture FAB
└─────────────────────────────┘
```
- No 5-tab bar competing for attention. Capture is the one dominant action.
- "See all / Inbox" is a quiet secondary entry, not equal weight.
- Whitespace is a feature, not wasted space (reduces extraneous cognitive load).

### Progressive disclosure
- Don't show domain filters until the user reaches for them.
- Entry details expand on tap; cards stay minimal at rest.
- AI/advanced features (extraction, analytics) appear contextually, not as a wall of buttons.

---

## 5. Motion & feedback

| Principle | Application |
|-----------|-------------|
| Specific state feedback | After capture: a calm "Saved · routed to Learning" toast (1.5s), not an ambiguous spinner. |
| Communicate without speaking | Subtle color/glow in periphery for status, not modal popups. |
| Gentle, never jarring | Ease-in-out 200–300ms. No bounce, no aggressive haptics. |
| Works when it fails | Offline capture still confirms instantly (optimistic UI); sync happens quietly later. |

---

## 6. Habits & streaks (the highest-risk area — get this right)

Field data: ~78% of users quit habit apps in 2 weeks because of streak anxiety. We design against that.

**Rules (non-negotiable):**
1. **Grace days built in** — one miss per ~30 days absorbs quietly; the streak/strength does not reset. (Lally 2010: a single miss does not reset automaticity.)
2. **Count every show-up** — day 1-back-after-a-gap is celebrated like day 100. History is never erased.
3. **Kind failure copy** — never "Streak broken." Instead: "Yesterday slipped by — today's a fresh start." (Neff self-compassion → prevents the lapse→abandonment cascade.)
4. **Strength over chains** — show a gentle "strength" / momentum indicator (moving average), not a fragile number that triggers loss-aversion panic.
5. **Identity framing** — "You're becoming someone who practices guitar," not "47 🔥".
6. **No social streak pressure** — never show others' streaks (replaces intrinsic 'why' with external pressure).

---

## 7. Notifications (calm communication)

| Rule | Detail |
|------|--------|
| Dismissable always | No undismissable/lock-screen-hostage notifications (rejected — feels like an alarm). |
| Tease, don't dump | Notification = one line ("3 things worth your attention"). Richness lives in-app. |
| Batched, opt-in | User-configurable times for morning + evening. No random pings. |
| Soft tone | Optional sound; gentle copy; never urgent-red unless genuinely time-critical (medicine). |
| Periphery-first | Prefer a quiet daily presence over frequent interruption. |

---

## 8. Night mode for 2am brain dump

- Auto-darkest surface (`#121316` / `#1C1E22`), warm-dimmed accent.
- Minimal chrome: just a prompt + mic + "Save for morning."
- Copy is reassuring and non-judgmental: "No need to organize. I'll handle it in the morning."
- No bright whites that wake the user further.

---

## 9. Accessibility & context (Tier 2/3 India)

- WCAG AA min (4.5:1 body text) in both themes.
- Touch targets ≥ 44px.
- Voice-first so literacy/typing-in-English is never a barrier.
- Works on patchy network (offline-first, optimistic UI).
- Test Devanagari (Hindi) rendering and line-height.
- No heavy animations that stutter on low-end GPUs.

---

## 10. Implementation notes for the build

- Centralize all tokens in a theme module (e.g. `constants/theme.ts`) — light + dark maps. No hardcoded hex in components.
- Components consume tokens, never raw colors → makes Phase 2 customization trivial.
- Build dark mode from day 1 (not retrofitted).
- Keep the `DomainIcon` color map sourced from the theme tokens above.

> Note: the current scaffold uses placeholder blues/greys. This spec supersedes those; the shell refactor will migrate components to these tokens.
