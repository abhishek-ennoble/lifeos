# Supabase Setup Guide

Follow these steps after creating your Supabase project (recommended region: **EU West / Ireland**).

## 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Copy **Project URL** and **anon public key** from Settings → API

## 2. Configure Local Environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run Database Migrations

Install Supabase CLI if needed: https://supabase.com/docs/guides/cli

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste the SQL from `supabase/migrations/20260616000000_initial_schema.sql` into the Supabase SQL Editor.

## 4. Deploy Edge Functions

Set secrets (API keys stay server-side only):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
```

Deploy all functions:

```bash
supabase functions deploy classify-entry
supabase functions deploy morning-briefing
supabase functions deploy anti-entropy
supabase functions deploy transcribe-audio
supabase functions deploy ai-chat
```

## 5. Enable Auth

In Supabase Dashboard → Authentication → Providers:
- Enable **Email** provider
- Disable email confirmation for personal MVP (optional)

## 6. Schedule Cron Jobs (Optional — Week 3+)

Enable `pg_cron` and `pg_net` extensions in Supabase Dashboard → Database → Extensions.

Run the commented SQL in `supabase/migrations/20260616000001_pg_cron_jobs.sql`.

## 7. EAS Build (Week 4)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Replace `YOUR_EAS_PROJECT_ID` in `app.json` after running `eas init`.
