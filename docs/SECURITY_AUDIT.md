# Service-role security audit (1.1)

**Status:** Passed (2026-06-30)  
**Scope:** Supabase edge functions using `SUPABASE_SERVICE_ROLE_KEY`

Service role **bypasses RLS**. Every query MUST filter by `user_id` from the authenticated JWT — never trust client-supplied user ids without auth verification.

## Findings

| Function | Service role? | user_id scoped? | Notes |
|----------|---------------|-------------------|-------|
| `classify-entry` | No (anon auth only) | N/A | Uses `getUserId` for auth gate only |
| `transcribe-audio` | No | N/A | Auth gate only; no DB reads |
| `ai-chat` | Yes | Yes | `.eq('user_id', userId)` on entries |
| `morning-briefing` | Yes | Yes | entries + reminders + briefings upsert |
| `anti-entropy` | Yes | Yes | `.eq('user_id', userId)` on entries |
| `feedback-digest` | Yes | Yes | app_feedback + feedback_digests insert |
| `scan-journal-feedback` | Yes | Yes | app_feedback insert with auth userId |

## Shared pattern

Use `createUserScopedClient(req)` from `supabase/functions/_shared/service-client.ts`:

```typescript
const { supabase, userId } = await createUserScopedClient(req);
await supabase.from('entries').select('*').eq('user_id', userId);
```

## Automated check

```bash
node scripts/audit-service-role-queries.mjs
```

Run in CI before deploy. Exit code 1 if any service-role function lacks `user_id` filtering.

## Before second user

- [x] Audit all service-role queries
- [x] Shared helper + static script
- [ ] Manual RLS test with two test accounts (recommended before prod multi-user)
