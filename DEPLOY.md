# Self-host on Ubuntu

Run the entire stack on your Ubuntu home server. App on `:3000`, Supabase on `:54321/:54322`. Reverse proxy + Cloudflare is your problem; this doc gets the containers up and the data in.

## 0. Push the repo

On this Mac:
```sh
git add Dockerfile .dockerignore docker-compose.app.yml DEPLOY.md .env.example \
        middleware.ts src/lib/supabase/server.ts src/app/api/dashboard/
git commit -m "self-host setup"
git push
```

## 1. On Ubuntu — prereqs

```sh
# Docker (skip if present)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # log out/in for this to take effect

# Supabase CLI (no apt package; use the binary release)
curl -fsSL \
  https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \
  | sudo tar -xz -C /usr/local/bin supabase

# psql client (for the data restore)
sudo apt-get install -y postgresql-client
```

Verify: `docker compose version`, `supabase --version`, `psql --version`.

## 2. Clone and init

```sh
git clone <your-repo-url> momentum
cd momentum
supabase init           # say NO if it asks to overwrite supabase/migrations/*
supabase start          # first run pulls ~2GB of images
```

Save the output — you'll need the `anon key`, `service_role key`, and JWT secret.

## 3. Migrate data from cloud

Get the cloud Postgres URL from supabase.com → Project → Settings → Database → **Session pooler** URI (NOT transaction pooler). Looks like:
```
postgresql://postgres.wqulqoolxcrfngnqzuha:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Dump (auth + data, data-only — schema already created by migrations):
```sh
supabase db dump --db-url "<cloud-url>" --data-only --schema auth -f /tmp/cloud-auth.sql
supabase db dump --db-url "<cloud-url>" --data-only -f /tmp/cloud-data.sql
```

Restore (auth first — FKs depend on `auth.users`):
```sh
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f /tmp/cloud-auth.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f /tmp/cloud-data.sql
```

Sanity check:
```sh
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT 'users' t, count(*) FROM auth.users
 UNION ALL SELECT 'profiles', count(*) FROM profiles
 UNION ALL SELECT 'goals', count(*) FROM goals
 UNION ALL SELECT 'journals', count(*) FROM journal_entries;"
```

Then wipe the dumps (they contain password hashes):
```sh
shred -u /tmp/cloud-*.sql
```

## 4. Configure env

Create `.env.local` in the repo root:
```env
# What the BROWSER uses to reach Supabase. Set this to whatever URL is
# reachable from clients. For LAN-only access:
NEXT_PUBLIC_SUPABASE_URL=http://<ubuntu-lan-ip>:54321
# Later, when Cloudflare proxies are wired up, change to:
# NEXT_PUBLIC_SUPABASE_URL=https://supabase.yourdomain.com

NEXT_PUBLIC_SUPABASE_ANON_KEY=<from `supabase start` output>
SUPABASE_SERVICE_ROLE_KEY=<from `supabase start` output>

# Server-side loopback (already set in docker-compose.app.yml — leave commented unless overriding)
# SUPABASE_INTERNAL_URL=http://127.0.0.1:54321

NEXT_PUBLIC_APP_URL=http://<ubuntu-lan-ip>:3000   # or https://app.yourdomain.com later

ANTHROPIC_API_KEY=<your existing key>
```

## 5. Bring up the app

```sh
docker compose -f docker-compose.app.yml up -d --build
docker logs -f momentum-web   # watch startup
```

Test from another LAN device: `http://<ubuntu-lan-ip>:3000`. Log in with an existing cloud account — original password should work (hashes carried over).

## 6. Reverse proxy / Cloudflare (your part)

You'll need to expose **two** services because the browser talks to Supabase directly:

| External hostname            | → backend                     |
|------------------------------|-------------------------------|
| `app.yourdomain.com`         | `127.0.0.1:3000`              |
| `supabase.yourdomain.com`    | `127.0.0.1:54321`             |

After DNS/TLS is up, update `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL=https://supabase.yourdomain.com`
- `NEXT_PUBLIC_APP_URL=https://app.yourdomain.com`

Then edit `supabase/config.toml` so GoTrue emits correct email links:
```toml
[auth]
site_url = "https://app.yourdomain.com"
additional_redirect_urls = ["https://app.yourdomain.com/api/auth/callback"]
```

Restart everything:
```sh
supabase stop && supabase start
docker compose -f docker-compose.app.yml up -d --build
```

## Daily ops

```sh
# start
supabase start && docker compose -f docker-compose.app.yml up -d

# stop
docker compose -f docker-compose.app.yml down && supabase stop

# rebuild after code pull
git pull && docker compose -f docker-compose.app.yml up -d --build

# logs
docker logs -f momentum-web
```

Auto-start on boot: Docker's `restart: unless-stopped` covers the web container. For Supabase, add a systemd unit or just run `supabase start` from a `@reboot` cron entry — the CLI is idempotent.

## Decommission cloud (after a week of verified local use)

- Vercel: vercel.com → project → Settings → Delete
- Supabase Cloud: pause for 1 week as rollback, then delete
- Remove `.vercel/` from repo

## Rollback

Set `.env.local` back to the cloud URL/keys and redeploy on Vercel. No code rollback needed — `SUPABASE_INTERNAL_URL` is optional.
