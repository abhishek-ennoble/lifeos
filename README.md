# LifeOS

Personal Life Operating System — a React Native + Expo mobile app that accepts voice or text input, uses AI to classify and route information into structured domains, sends smart reminders, and generates a personalized morning briefing.

Built by [Abhishek](mailto:abhishek@ennoble.ai) under [ennoble.ai](https://ennoble.ai) | Started June 2026

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env

# Start Expo dev server
npx expo start
```

Scan the QR code with **Expo Go** on your Android device.

## Tech Stack

- **Frontend:** React Native + Expo SDK 52, Expo Router, TypeScript (strict), NativeWind
- **Backend:** Supabase (Postgres, Edge Functions, RLS, pg_cron)
- **AI:** Claude Haiku (classification, briefing), Claude Sonnet (chat), Whisper (voice)

## Project Structure

```
app/           Expo Router screens (tabs + chat)
components/    Shared UI components
lib/           Supabase client, AI router, utilities
hooks/         Data hooks (entries, briefing, reminders)
constants/     Domain constants
supabase/      Migrations + Edge Functions
docs/          Product context and ADRs
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Agent/developer context
- [docs/SETUP.md](./docs/SETUP.md) — Supabase, Edge Functions, and EAS setup
- [docs/product/LifeOS_Project_Context.md](./docs/product/LifeOS_Project_Context.md) — Strategic context
- [.cursor/rules/](./.cursor/rules/) — Cursor AI rules

## Environment Variables

See [.env.example](./.env.example). API keys for Claude and Whisper must **only** exist in Supabase Edge Function secrets — never in the Expo app bundle.

## License

Private — personal project, not yet open source.
