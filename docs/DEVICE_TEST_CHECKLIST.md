# LifeOS — Device Test Checklist

**Purpose:** Structured dogfooding before the next build slice.  
**Target APK:** `apk/27072026_170253/LifeOS.apk` — **1.1.0** (versionCode 4, Friend Beta)  
**Date:** 2026-07-27  
**Tester:** _______________

Mark each row: **Pass** · **Fail** · **Skip** · **N/A**

---

## ★ v1.1.0 focus — test these first (FB-1…FB-6)

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| F.1 | Upgrade install | Install 1.1.0 over existing 1.0.2 | Data intact; app opens normally | | |
| F.2 | Onboarding (fresh) | Uninstall → fresh install → sign in as new/friend account | Name screen → notification opt-in → lands on Home | | |
| F.3 | Personalized greeting | Look at Home header | "Good evening, <your name>" — never "Abhishek" for other users | | |
| F.4 | Edit name | Settings → Profile → change name → back to Home | Greeting updates | | |
| F.5 | Briefing personalization | Generate briefing | Addresses you by your name | | |
| F.6 | Reminder channel (sound) | `Remind me in 2 minutes to test` → wait | Push **with sound** (Reminders channel) | | |
| F.7 | Ritual channel (silent) | Settings → morning nudge 2 min ahead → wait | Push arrives **silently** (Rituals channel) | | |
| F.8 | Reminder quick-edit | Inbox → open pending entry with 🔔 | "In 1 hour" / "Tomorrow 9am" buttons work | | |
| F.9 | Telemetry write-back (D2 fix, 2026-09-10) | Set a 2-min reminder → **background the app** → let it fire → reopen app → check Supabase `reminders` | `sent_at` = the scheduled fire time (set on foreground reconcile); then tap Done → `acknowledged_at` set | | Pre-fix this was 0/12 because background fires never reached the app |
| F.12 | Temporal grounding (T-2) | Capture "wake me up tomorrow at 6am" and "meditation starting next Monday" | First: reminder tomorrow 06:00 local, `due_at` null, correct year. Second: `metadata.start_at` set, `due_at` null, never shown as overdue | | |
| F.13 | Home above the fold (F21) | Open Home on a phone | Greeting + capture box visible without scrolling; briefing shows one short paragraph with **More** | | |
| F.10 | Today AI cost | Settings → AI usage | "Today" line shows per-day cost | | |
| F.11 | Feedback statuses | Settings → App feedback | Old items show triaged/done, not all "new" | | |

> Channel caveat: Android caches notification channels per install. If sound/silent
> behavior looks wrong after an *upgrade*, uninstall + reinstall once before calling it a bug.

---

## 0. Prerequisites

| # | Check | How | Result | Notes |
|---|--------|-----|--------|-------|
| 0.1 | Fresh install | Uninstall old LifeOS → install `30062026_150735` APK | | |
| 0.2 | Network | Wi‑Fi or mobile data on (AI + Whisper need internet) | | |
| 0.3 | Account | Sign in with your test account (e.g. abhshk.0308@gmail.com) | | |
| 0.4 | Notifications | Settings → enable notifications when prompted | | |
| 0.5 | Microphone | Grant mic permission on first voice use | | |

---

## 1. Current capabilities map

| Area | What the app does today | Where to find it | Status in code |
|------|-------------------------|------------------|----------------|
| **Auth** | Email sign up / sign in | App launch | ✅ |
| **Text capture** | Type anything → AI classifies → inbox entry | Home → text box → Capture | ✅ |
| **Multi-item capture** | One message → up to 5 separate entries | Home: "Buy milk, idea for X, remind me in 10 min to Y" | ✅ (needs classify deploy) |
| **Voice capture** | Tap mic → speak → tap again → classify | Home FAB (🎤), Brain dump, Journal draft, Reflect | 🟡 |
| **Brain dump** | Late-night capture, saved like normal capture | Home → Brain dump | ✅ |
| **Domains** | health, task, learning, idea, note (+ journal manual) | Inbox domain chips | ✅ |
| **Life-area tags** | spiritual, creative, technical, family, finance | Inbox chips; classifier may add | ✅ |
| **Inbox browse** | All non-archived entries | Inbox tab | ✅ |
| **Inbox filter** | By domain + life-area chips | Inbox tab | ✅ |
| **Inbox sort** | — | — | ⛔ not built (1.2e) |
| **Entry actions** | Done, Archive, Log session (learning) | Inbox → EntryCard | ✅ |
| **Today strip** | Top 3 priority items on Home | Home → Today | ✅ |
| **Reminders v2** | Relative / one-off local push | Capture with remind intent | 🟡 |
| **Reminder badge** | 🔔 + time on card | Inbox entry with reminder | ✅ (1.2d) |
| **Notif tap → entry** | Tap push → Inbox highlights entry | After reminder fires | ✅ (1.2d) |
| **Health daily** | Recurring times → daily local push | "Practice guitar daily at 7pm" | ✅ |
| **Morning briefing** | On-demand AI narrative | Home → briefing card → Generate | ✅ |
| **Briefing auto 7am** | Scheduled push + generated text | — | ⛔ pg_cron off |
| **Evening reflection** | Structured prompts → journal | Home → Journal / Reflect | ✅ |
| **Journal screen** | List + compose journal entries | Home → Journal (or journal route) | ✅ |
| **Journal voice** | Voice adds to draft (edit before save) | Journal → + New → mic | ✅ |
| **AI chat** | Read-only Q&A over your entries | Home → Ask AI | 🟡 |
| **Anti-entropy** | Stale items banner + review screen | Home banner → review | 🟡 |
| **Insights** | Week/month stats, domains, habits | Insights tab | ✅ |
| **App feedback** | `fb:` or classifier → separate table | Capture `fb: …` → Settings → Feedback | ✅ |
| **Settings** | Theme, notifications, ritual times | Home ⚙️ | ✅ |
| **Offline read** | SQLite cache on poor network | Airplane mode → open Inbox (read only) | 🟡 |
| **Voice on chat** | — | — | ⛔ by design |

---

## 2. Auth & shell

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| 2.1 | Sign in | Open app → enter email/password → Sign in | Lands on Home | | |
| 2.2 | Session persist | Kill app → reopen | Still signed in | | |
| 2.3 | Tab navigation | Home → Inbox → Insights | All tabs load | | |
| 2.4 | Settings | Home ⚙️ | Settings opens | | |
| 2.5 | Theme | Settings → Dark / Light | UI updates | | |

---

## 3. Text capture & classification

| # | Scenario | Input (type on Home) | Expected domain | Result | Notes |
|---|----------|----------------------|-----------------|--------|-------|
| 3.1 | Simple task | `Buy milk tomorrow` | task | | |
| 3.2 | Idea | `Idea: weekend side project for habit tracking` | idea | | |
| 3.3 | Health habit | `Practice guitar daily at 7pm` | health + times | | |
| 3.4 | Learning | `Learn Python for data analysis` | learning | | |
| 3.5 | Ephemeral note | `Keys are in my blue bag` | note (may expire) | | |
| 3.6 | App feedback (`fb:`) | `fb: inbox needs sort by due date` | → Settings → Feedback (not Inbox) | | |
| 3.7 | Multi-item split | `Buy milk, idea for travel app, remind me in 15 minutes to stretch` | **3 entries** in Inbox | | |
| 3.8 | Toast | Any successful capture | "Saved" / "Captured and routed" toast | | |
| 3.9 | Example chips | Tap onboarding example on empty Home | Entry created | | |

---

## 4. Voice capture

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| 4.1 | Tap-to-record UX | Tap FAB → speak → tap again | Recording stops; entry appears | | |
| 4.2 | Timer while recording | Record 10+ sec | Timer visible on inline mic | | |
| 4.3 | Too short | Tap → immediate tap | "Too short" message | | |
| 4.4 | Hindi/English mix | Speak mixed sentence | Reasonable transcript + entry | | |
| 4.5 | Brain dump voice | Brain dump → mic → speak | Saved / multi-item toast | | |
| 4.6 | Journal voice draft | Journal → New → mic | Text appended to draft (not auto-save) | | |
| 4.7 | Reflect voice | Reflect → mic → speak | Journal saved; returns back | | |
| 4.8 | Airplane mode | Record → then airplane mode before send | Error toast (no silent fail) | | |
| 4.9 | 3 min cap | Record >3 min (optional) | Auto-stop + save message | | |

---

## 5. Inbox & entry management

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| 5.1 | Domain filter | Inbox → tap Task chip | Only tasks shown | | |
| 5.2 | Life-area filter | Inbox → tap Creative (etc.) | Filtered list | | |
| 5.3 | Mark done | EntryCard → Done | Status done; leaves pending list | | |
| 5.4 | Archive | EntryCard → Archive | Entry removed from list | | |
| 5.5 | Reminder badge | Entry with remind intent | 🔔 + human time on card | | |
| 5.6 | Learning log | Learning entry → Log session | Session logged (no crash) | | |
| 5.7 | Empty state | Filter to domain with no items | Empty message shown | | |

---

## 6. Reminders & notifications

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| 6.1 | Relative reminder | `Remind me in 2 minutes to check test` | task + 🔔; push in ~2 min | | |
| 6.2 | Reminder title | Bare remind capture | Title NOT generic "Reminder" alone | | |
| 6.3 | Push delivery | Wait for fire time | Banner + sound (Android channel) | | |
| 6.4 | Tap notification | Tap the push | App opens → Inbox → entry **highlighted** | | |
| 6.5 | Done cancels | Mark reminded entry Done before fire | No push (or cancelled) | | |
| 6.6 | Health daily | Health entry with times | Daily push at configured time (optional: set 2 min ahead for test) | | |
| 6.7 | Morning ritual nudge | Settings → enable → set time 2 min ahead | Daily "Good morning" nudge | | |
| 6.8 | Evening ritual | Settings → evening toggle + time | Gentle reflection nudge | | |
| 6.9 | Notif actions Done/Snooze | From notification shade | — | **N/A** | Not built (1.2f) |

---

## 7. Briefing, journal, reflect

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| 7.1 | Generate briefing | Home → Generate briefing | Narrative text appears | | |
| 7.2 | Briefing content | Read briefing | Mentions your pending items (roughly) | | |
| 7.3 | Evening reflect | Home → Journal or Reflect → fill prompts → Save | Success toast; entry in Journal screen | | |
| 7.4 | Journal list | Journal screen | Past entries visible | | |
| 7.5 | Discuss with AI | Journal card → Discuss with AI | Chat opens with seed text | | |

---

## 8. AI chat & anti-entropy

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| 8.1 | Focus question | Chat → "What should I focus on today?" | Coherent reply using your entries | | |
| 8.2 | Read-only | Ask "Create a task for X" | Answers only; **does not** create entry | | |
| 8.3 | Keyboard | Type long message | Input not hidden by keyboard | | |
| 8.4 | Stale banner | (If 30+ day old pending items exist) | Home shows review banner | | |
| 8.5 | Anti-entropy review | Tap banner → Keep/Done/Delete each | Items updated | | |

---

## 9. Insights & feedback

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| 9.1 | Insights week | Insights tab → Week | Stats reflect recent captures | | |
| 9.2 | Insights month | Switch to Month | Counts update | | |
| 9.3 | Feedback list | Settings → App feedback | Prior `fb:` items listed | | |
| 9.4 | Feedback status | Tap Triage / Done on item | Status updates | | |

---

## 10. Edge cases & known limitations

| # | Scenario | Steps | Expected | Result | Notes |
|---|----------|-------|----------|--------|-------|
| 10.1 | Offline write | Airplane mode → text capture | Clear error (not silent hang) | | |
| 10.2 | Offline read | Airplane mode → open Inbox | Cached entries still visible | | |
| 10.3 | Date extraction | "Due next Friday" | due_at may be wrong or empty | **Known weak spot** | |
| 10.4 | Reinstall reminders | Reinstall APK | Old one-off reminders may not restore | **Known** | Local-only |
| 10.5 | Inbox sort | Look for sort control | Not present yet | **N/A** | 1.2e |
| 10.6 | Chat voice | Chat screen | No mic button | **N/A** | By design |

---

## 11. Sign-off

| Metric | Count |
|--------|-------|
| Pass | |
| Fail | |
| Skip / N/A | |

**Blockers for next build (1.2e):**  
_List any Fail rows that must be fixed before inbox sort._

**Safe to proceed:** ☐ Yes  ☐ No — fix blockers first

**Tester sign-off:** _______________  **Date:** _______________

---

## Automated checks (dev machine — not a substitute for device)

Run before or after device session:

```powershell
cd D:\Personal\LifeOS
npm run typecheck
npx supabase functions deploy classify-entry   # only if classify changed
```

Backend edge functions expected live: `classify-entry`, `ai-chat`, `morning-briefing`, `anti-entropy`, `transcribe-audio`.
