# Local deployment runbook

Replaces Supabase Cloud + Vercel with a fully local stack on this Mac.
App at `http://localhost:3000`, Supabase Studio at `http://localhost:54323`.

## One-time setup

1. **Start Docker Desktop** (it's installed but not running).
2. **Install Supabase CLI:**
   ```sh
   brew install supabase/tap/supabase
   ```
3. **Initialize Supabase config** (creates `supabase/config.toml`, keeps existing migrations):
   ```sh
   cd /Users/nigeshshakya/Documents/dev/TheMomentumJournal
   supabase init
   ```
   When asked whether to overwrite `supabase/migrations/*` — **say no**.
4. **Start the local Supabase stack:**
   ```sh
   supabase start
   ```
   First run pulls images (~2GB). When done, it prints the local `anon key`, `service_role key`, and URLs — copy them.

## Migrate data from cloud → local

5. **Get the cloud Postgres connection string** from supabase.com → your project → Settings → Database → Connection string → "URI" (use the session pooler, NOT the transaction pooler). Looks like:
   ```
   postgresql://postgres.wqulqoolxcrfngnqzuha:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

6. **Dump the cloud data** (run from repo root):
   ```sh
   supabase db dump --db-url "<cloud-url>" --data-only -f /tmp/cloud-data.sql
   supabase db dump --db-url "<cloud-url>" --data-only --schema auth -f /tmp/cloud-auth.sql
   ```

7. **Restore into local Postgres** (auth first, then data — order matters because of FKs):
   ```sh
   psql "postgresql://postgres:postgres@localhost:54322/postgres" -f /tmp/cloud-auth.sql
   psql "postgresql://postgres:postgres@localhost:54322/postgres" -f /tmp/cloud-data.sql
   ```

8. **Sanity check row counts:**
   ```sh
   psql "postgresql://postgres:postgres@localhost:54322/postgres" -c \
     "SELECT 'users' t, count(*) FROM auth.users
      UNION ALL SELECT 'profiles', count(*) FROM profiles
      UNION ALL SELECT 'goals', count(*) FROM goals
      UNION ALL SELECT 'journals', count(*) FROM journal_entries;"
   ```
   Compare against the same query in Supabase Studio on cloud (or via psql with the cloud URL).

9. **Wipe the dump files** (they contain password hashes):
   ```sh
   shred -u /tmp/cloud-data.sql /tmp/cloud-auth.sql 2>/dev/null || rm /tmp/cloud-*.sql
   ```

## Configure the app

10. **Update `.env.local`** with the local keys from step 4:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
    SUPABASE_SERVICE_ROLE_KEY=<local service_role key>
    SUPABASE_INTERNAL_URL=http://supabase_kong_TheMomentumJournal:8000
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ANTHROPIC_API_KEY=<existing key>
    ```

## Run the app

11. **Build and start the web container:**
    ```sh
    docker compose -f docker-compose.app.yml up -d --build
    ```

12. **Open `http://localhost:3000`**, log in with an existing cloud account using the **same password** (proves auth hashes carried over).

## Daily use

- Start everything: `supabase start && docker compose -f docker-compose.app.yml up -d`
- Stop everything: `docker compose -f docker-compose.app.yml down && supabase stop`
- Update app after code change: `docker compose -f docker-compose.app.yml up -d --build`
- Both will auto-restart after reboot once Docker Desktop is set to "Open at login".

## Decommission (after 1 week of verified local use)

- Vercel: open vercel.com → project → Settings → Delete (or just disconnect Git).
- Supabase Cloud: dashboard → project → Settings → General → Pause project. Keep paused for a week as rollback, then delete.
- Remove `.vercel/` from the repo: `rm -rf .vercel`

## Rollback

If something breaks, set `.env.local` back to the cloud URL/keys and redeploy on Vercel. No code rollback needed — the `SUPABASE_INTERNAL_URL` fallback means the app works fine without it.
