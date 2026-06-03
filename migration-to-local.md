# Migration: Supabase + Vercel → fully local

> ## Progress (updated 2026-06-02)
> - ✅ **Phase 1 — Infra:** `docker-compose.yml` (postgres:16 + web), `.env.local`/`.env.example` rewritten, `DEPLOY.md` updated, `docker-compose.app.yml` deleted.
> - ✅ **Phase 2 — Schema (Drizzle):** `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, migration `0000_*` + hand-written `0001_triggers.sql`, npm `db:*` scripts. `users` table replaces `auth.users`+`profiles`. RLS/handle_new_user dropped; updated_at + validate_goal_parent triggers kept.
> - ✅ **Phase 3 — Auth.js v5:** `src/auth.ts` + edge-safe `src/auth.config.ts`, `[...nextauth]` handler, `POST /api/auth/register`, middleware/`use-auth`/`auth-form`/`SessionProvider` rewired, dashboard layout gated via `auth()`. Email flow pages/routes deleted. bcrypt hashes carry over.
> - ✅ **Phase 4 — Data-access + routes:** `src/lib/db/{goals,journals,dashboard,ai}.ts` → Drizzle, `src/db/mappers.ts` added, all 16 data routes use `auth()` + new db fns. `src/lib/supabase/*` deleted, `@supabase/*` uninstalled, `database.types.ts` slimmed. **`tsc --noEmit` clean, zero supabase refs.**
> - ✅ **Phase 5 — DB bring-up + data migration:** Local Postgres up (`momentum-postgres`, healthy), Drizzle schema + triggers applied via `npm run db:setup`. **Cloud data imported** (2026-06-02) from project `wqulqoolxcrfngnqzuha` / us-west-2 via Session Pooler: 2 users, 22 goals (13 parent-linked), 41 journals, 68 mentions; bcrypt hashes preserved, 0 orphan FKs. Method (DEPLOY.md §4): column-mapped `psql \copy` (NOT `pg_dump` — cloud is PG17, container pg_dump is PG16 and refuses newer-major; also `auth.users`+`profiles`→`users` needs a JOIN), loaded with `session_replication_role=replica`. Direct `db.<ref>.supabase.co` is IPv6-only/unreachable from Docker — must use the IPv4 pooler. **Quirk:** `drizzle.config.ts` doesn't load `.env.local` — db scripts need `DATABASE_URL` exported (`export $(grep -v '^#' .env.local | xargs) && npm run db:setup`). `next dev` loads `.env.local` fine.
> - ✅ **Phase 6 — Verify:** PASS end-to-end via real browser. Register → JWT login/logout, Goals CRUD + parent-linking, Journals CRUD + goal-mentions, dashboard aggregations, insights all work against local Postgres/Drizzle. AI routes fail gracefully with 401 (placeholder `ANTHROPIC_API_KEY` — set a real key to exercise AI). **Confirmed TZ off-by-one bugs (pre-existing, NOT fixed):** `new Date('YYYY-MM-DD')` parses to UTC-midnight, wrong day on non-UTC server (EDT confirmed). User-visible: `src/db/mappers.ts:46` `targetDate` (and `:100-101` week dates) render one day early. Also `dashboard.ts:211` `getGoalsStats` + `:399` `getGoalsProgressOverTime` (over-inclusive lower bound; use existing `parseLocalDate()`), `ai.ts:312/315` `getAnalyses`, `ai.ts:364/387` cached weekly/monthly insight lookups. `entryDate`-based comparisons (date-typed column vs string) are correct.
>
> **Migration complete.** Optional follow-ups: (1) fix the TZ off-by-ones above, (2) provide `SUPABASE_DB_URL` + run the DEPLOY.md §4 script to import real data, (3) set a real `ANTHROPIC_API_KEY`.

**Target stack:** local Postgres (Docker) · Drizzle ORM · Auth.js v5 (Credentials + JWT sessions, bcrypt) · email flows removed.

**Decisions (locked):**
- Auth: Auth.js v5 (Credentials provider, JWT session strategy, bcrypt).
- DB layer: Drizzle ORM.
- Existing cloud data: migrate via `pg_dump`.
- Email flows (password reset, signup confirmation): dropped.

**Key detail:** Supabase stores bcrypt hashes in `auth.users.encrypted_password`, so existing passwords carry over to Auth.js bcrypt verification — existing logins won't break.

---

## 1. Infra / local Postgres
- New `docker-compose.yml` with a `postgres:16` service (volume-backed) + the existing `web` service; drop the `supabase start` / host-networking assumptions.
- `.env.local` rewritten:
  - `DATABASE_URL=postgres://…@localhost:5432/momentum`
  - `AUTH_SECRET`
  - `ANTHROPIC_API_KEY`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - Remove all `SUPABASE_*` / Vercel vars.
- Update `.env.example`, `DEPLOY.md`, `Dockerfile`.

## 2. Schema (Drizzle)
- `src/db/schema.ts` — Drizzle definitions for all tables.
- **New `users` table** (id, email, password_hash, full_name, timestamps) replacing `auth.users` + `profiles`; repoint every `user_id` FK to it.
- Drop all **RLS policies** and the `handle_new_user` trigger (app layer already filters by `user_id`). Keep `update_updated_at` + `validate_goal_parent` triggers as plain SQL.
- `drizzle.config.ts` + generated migration; `src/db/index.ts` exports a shared `pg` pool + drizzle client.

## 3. Auth.js v5
- `src/auth.ts` — Credentials provider: look up user by email, `bcrypt.compare` against `password_hash`, JWT session (90-day maxAge to match current).
- `src/app/api/auth/[...nextauth]/route.ts` handler + new `POST /api/auth/register` (signup: hash password, insert user).
- Rewrite `middleware.ts` to gate `/dashboard /journal /goals /insights` via Auth.js `auth()`.
- Rewrite `use-auth.ts` → `useSession`/`signOut`; rewrite `auth-form.tsx` → `signIn('credentials')` + register call.
- **Delete** email-dependent pieces: `forgot-password` + `reset-password` pages/forms, `api/auth/callback`, `api/auth/refresh`, `api/auth/signout` (replaced by Auth.js). Remove forgot-password link.

## 4. Data-access layer
- Rewrite `src/lib/db/{journals,goals,dashboard,ai}.ts` from Supabase query-builder → Drizzle. Drop the `supabase` param; use the shared db client. (`getJournalEntriesWithGoals` nested select → Drizzle relational query / join.)
- Update all ~20 API routes: replace `createClient()` + `supabase.auth.getUser()` with `auth()` for the user id, and call the new db functions.
- Delete `src/lib/supabase/*`; remove `@supabase/ssr` + `@supabase/supabase-js`; repurpose `database.types.ts` (or generate from Drizzle).

## 5. Data migration (existing cloud data)
- `pg_dump` public tables (goals, journal_entries, journal_goal_mentions, ai_analyses, weekly_insights) from cloud → restore into local.
- Copy `auth.users` (id, email, `encrypted_password`, `raw_user_meta_data.full_name`) → local `users` table so **existing logins keep working** (bcrypt hashes are compatible).
- One-shot script documented in `DEPLOY.md`.

## 6. Verify
- `npm run dev`, confirm login (migrated user), journals/goals/dashboard/insights CRUD, AI analyze.

---

## Scope summary
Rewrites ~35 files, adds Drizzle + Auth.js + bcrypt, removes Supabase deps, touches infra.

## Open confirmations
- **Auth.js v5** (beta but stable, the standard for App Router) — chosen over v4.
- Data-migration step needs the cloud DB reachable; build everything and run the dump last (may need to run `pg_dump`/`psql` manually if network/psql differs).
- Proceed all-at-once vs. staged (infra+schema+auth first, verify login, then DB-layer rewrite).
