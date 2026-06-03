# DB (Drizzle)

Local Postgres 16. Schema in `schema.ts`, client in `index.ts`.

## Env
All `db:*` scripts need `DATABASE_URL`. Either export it or run with `.env.local` loaded, e.g.:

```
set -a; source .env.local; set +a
```

## Scripts
- `npm run db:generate` — diff schema → SQL migration in `migrations/` (offline).
- `npm run db:migrate` — apply generated migrations (drizzle journal-tracked).
- `npm run db:push` — push schema directly (dev only).
- `npm run db:studio` — Drizzle Studio.
- `npm run db:setup` — **migrate + apply triggers** (use this for a full setup).

## Migration order / triggers
1. `db:migrate` applies the generated `0000_*.sql` (tables, FKs, checks, indexes).
2. `apply-triggers.ts` then runs `migrations/0001_triggers.sql`.

`0001_triggers.sql` is hand-written and **not** in the drizzle journal (drizzle-kit
doesn't model triggers), so it's applied by the node script, not by `db:migrate`.
It's idempotent (`CREATE OR REPLACE` / `DROP TRIGGER IF EXISTS`). It contains:
- `update_updated_at_column()` + triggers on `users`, `goals`, `journal_entries`.
- `validate_goal_parent()` + trigger on `goals`.

Dropped from the original Supabase schema: all RLS policies, the `profiles` table
(folded into `users`), and `handle_new_user` (users are created by the app).
