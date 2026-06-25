# Working agreement — LifeOS

This file is read by **both Cursor and Claude Code**. Follow it before writing code.

## 0. Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before
writing any Expo/React Native code. Do not rely on memory of older Expo APIs.

## 1. Read the docs first (source of truth)

Before any non-trivial change, read the relevant doc. After any non-trivial
change, **update the matching doc in the same commit.** Docs and code must not drift.

| Doc | What it is |
|---|---|
| `docs/PRD.md` | What the product is and why |
| `docs/ARCHITECTURE.md` | How it's built (data model, functions, screens) |
| `docs/PRODUCT_EVOLUTION.md` | Where it's going — full design rationale |
| `docs/ROADMAP.md` | **The control panel** — ordered backlog, what to build next |
| `docs/BUILD_STATUS.md` | Current build/release state |

Workflow: pick the top unchecked item in `ROADMAP.md` → build one slice → update
the doc → commit. One slice at a time. Don't get ahead of the roadmap.

## 2. Which tool does what

- **Cursor** — fast inline feature coding, UI tweaks, screen polish, small fixes,
  anything where the developer is in the loop with tight feedback.
- **Claude Code** — multi-file refactors, Supabase edge functions + migrations,
  builds/releases (EAS, Gradle, APK), git, security review, running the app, and
  autonomous multi-step / agentic work.

Roadmap items are tagged with a suggested driver. Either tool may do any task; the
tags are guidance, not gates.

## 3. Project specifics

- **Backend = Claude via Anthropic edge functions.** When doing AI/agent/tool-use
  work, verify current model IDs and tool-use shapes against the `claude-api` skill
  (or https://docs.anthropic.com) — do **not** hardcode model strings from memory.
  Models in use: `claude-haiku-4-5-20251001` (classify/briefing), `claude-sonnet-4-6` (chat).
- **RLS is the security boundary.** Every table is per-user (`auth.uid() = user_id`).
  **Service-role queries bypass RLS** — they MUST manually filter by `user_id`.
  Treat any new service-role query as security-sensitive.
- **Track AI cost.** New Claude/OpenAI calls should record token usage (see
  roadmap 1.4). Cost visibility is a product requirement, not an afterthought.
- **Secrets:** AI keys live in Supabase secrets (`supabase secrets set`), NOT the
  app `.env` (which only carries `EXPO_PUBLIC_*`). Never commit secrets.
- **Standalone APK builds locally** (`cd android && ./gradlew assembleRelease`),
  not via EAS cloud (cloud builds fail on this project). See `docs/BUILD_STATUS.md`.

## 4. Code style

Match the surrounding code: TypeScript, plain `StyleSheet` (no Tailwind/NativeWind —
they're unused), typed hooks in `hooks/`, graceful offline fallbacks. Keep comment
density and naming consistent with neighbors.
