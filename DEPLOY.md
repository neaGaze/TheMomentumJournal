# Self-host on Ubuntu

Run the whole stack on your Ubuntu home server: local Postgres + the Next.js app, both via Docker Compose. App on `:3000`, Postgres on `:5432`. Reverse proxy + Cloudflare is your problem; this doc gets the containers up and the data in.

> Stack: local Postgres 16 (Docker, volume-backed) · Drizzle ORM · Auth.js (Credentials + JWT). No Supabase, no Vercel.

## 0. Push the repo

On this Mac:
```sh
git add Dockerfile .dockerignore docker-compose.yml DEPLOY.md .env.example
git commit -m "local stack setup"
git push
```

## 1. On Ubuntu — prereqs

```sh
# Docker (skip if present)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # log out/in for this to take effect

# psql client (optional, for the data restore / sanity checks)
sudo apt-get install -y postgresql-client
```

Verify: `docker compose version`, `psql --version`.

## 2. Clone and configure env

```sh
git clone <your-repo-url> momentum
cd momentum
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL=postgres://momentum:momentum@localhost:5432/momentum
AUTH_SECRET=        # generate: openssl rand -base64 32
ANTHROPIC_API_KEY=  # your Claude key
NEXT_PUBLIC_APP_URL=http://<ubuntu-lan-ip>:3000   # or https://app.yourdomain.com later
```

Notes:
- `DATABASE_URL` here points at `localhost` (for running tools/migrations from the host). Inside Compose, the `web` service overrides it to the `postgres` service hostname automatically — don't change it for that.
- Generate a real `AUTH_SECRET` with `openssl rand -base64 32`; never commit `.env.local`.

## 3. Bring up the stack

Postgres and the app run as **two separate compose stacks** sharing the `momentum-net` network. Bring the **DB up first** (it owns the network + volume), load data, then start the app:

```sh
# 1. Standalone Postgres (creates momentum-net + momentum-pgdata volume)
docker compose -f docker-compose.db.yml up -d
until [ "$(docker inspect -f '{{.State.Health.Status}}' momentum-postgres)" = healthy ]; do sleep 2; done

# 2. Load schema + data — run §4 (cloud import) or §4b (transfer a dump) HERE.

# 3. App (joins momentum-net, connects to momentum-postgres)
docker compose up -d --build
docker logs -f momentum-web
```

The DB lives in the named volume `momentum-pgdata` and survives `docker compose -f docker-compose.db.yml down`; add `-v` to wipe it. The app stack (`docker compose down`) never touches the DB.

> **⚠ The schema is NOT created automatically.** A fresh volume is empty, and the runtime image doesn't ship `src/` or drizzle-kit, so migrations can't run inside the `web` container. You must load the schema (and data) in step 2 above — via §4 or §4b — *before* starting the app. If you ever bring up a fresh DB *without* a dump, apply the schema by piping the generated migrations: `cat src/db/migrations/0000_*.sql src/db/migrations/0001_triggers.sql | docker exec -i momentum-postgres psql -U momentum -d momentum`.

Test from another LAN device: `http://<ubuntu-lan-ip>:3000`.

## 4. Migrate existing cloud data

> **Done once on 2026-06-02** — imported 2 users, 22 goals, 41 journal entries, 68 goal-mentions from the cloud project (ref `wqulqoolxcrfngnqzuha`, region us-west-2) into the local `momentum-postgres` container. The script below is the exact method used; keep it for rebuilds / a second machine.

This is a **one-shot** import from Supabase Cloud into the local `momentum-postgres` container. It preserves the original UUIDs and bcrypt password hashes so existing logins keep working.

### Why `\copy`, not `pg_dump`

Two things rule out the "obvious" `pg_dump` pipe:

1. **Version skew.** Supabase Cloud runs **Postgres 17**, but the `momentum-postgres` image is **Postgres 16**, and `pg_dump` *refuses to dump a newer-major server*. (You'd need a PG17 `pg_dump`.) `psql \copy` has no such restriction — a PG16 client streams CSV from a PG17 server fine.
2. **Schema changed.** Cloud has `auth.users` + `public.profiles`; local has a single `users` table. So the user rows need a column-mapped `SELECT … JOIN`, not a raw table dump.

So every table is moved as **column-mapped CSV via `psql \copy`**, and the whole load runs with triggers/FKs disabled to preserve original timestamps and resolve the self-referential `goals.parent_goal_id`.

### Prerequisites

- Local stack up and migrated (`docker compose up -d postgres` + `DATABASE_URL=… npm run db:setup`), so the schema exists.
- The Supabase cloud connection string as `SUPABASE_DB_URL`. **Use the Session Pooler URI** (Dashboard → Project Settings → Database → Connection string → *Session pooler*), not the direct `db.<ref>.supabase.co` host — the direct host is **IPv6-only** and the Docker bridge network can't route it (`Network is unreachable`). The pooler is IPv4 and region-specific:

  ```bash
  export SUPABASE_DB_URL='postgresql://postgres.<ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres'
  # this project: aws-0-us-west-2.pooler.supabase.com, user postgres.wqulqoolxcrfngnqzuha
  ```

  Don't know the region? Probe it: try `aws-0-<region>` for common regions and watch for `Tenant or user not found` (wrong region) vs a successful `select 1`.
- No host `psql`/`pg_dump` needed — everything runs inside `momentum-postgres` (it ships `psql`).

### Script

Runs entirely via `docker exec` against the `momentum-postgres` container (which reaches both the remote pooler and the local DB). Exports to CSV in the container's `/tmp`, then loads in one transaction with `session_replication_role = replica` (bypasses the `validate_goal_parent` + `updated_at` triggers and all FK checks during load — `momentum` is superuser, so it's allowed).

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the Supabase Session Pooler URI}"

# 1. Export cloud -> CSV inside the container (/tmp). users = auth.users LEFT JOIN profiles.
docker exec momentum-postgres psql "$SUPABASE_DB_URL" -c "\copy (SELECT u.id, u.email, u.encrypted_password, COALESCE(p.full_name, u.raw_user_meta_data->>'full_name'), p.avatar_url, u.created_at, u.updated_at FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id) TO '/tmp/users.csv' WITH CSV"
docker exec momentum-postgres psql "$SUPABASE_DB_URL" -c "\copy (SELECT id, user_id, title, description, type, category, target_date, status, progress_percentage, parent_goal_id, created_at, updated_at FROM public.goals) TO '/tmp/goals.csv' WITH CSV"
docker exec momentum-postgres psql "$SUPABASE_DB_URL" -c "\copy (SELECT id, user_id, title, content, entry_date, mood, tags, created_at, updated_at FROM public.journal_entries) TO '/tmp/journal_entries.csv' WITH CSV"
docker exec momentum-postgres psql "$SUPABASE_DB_URL" -c "\copy (SELECT id, journal_entry_id, goal_id, mentioned_explicitly, created_at FROM public.journal_goal_mentions) TO '/tmp/jgm.csv' WITH CSV"
# ai_analyses / weekly_insights were empty in cloud; add them here the same way if that changes.

# 2. Wipe any fixtures + load, triggers/FKs bypassed. Single transaction.
docker exec -i momentum-postgres env PGPASSWORD=momentum \
  psql -h localhost -U momentum -d momentum -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET session_replication_role = replica;
TRUNCATE users, goals, journal_entries, journal_goal_mentions, ai_analyses, weekly_insights CASCADE;
\copy users(id,email,password_hash,full_name,avatar_url,created_at,updated_at) FROM '/tmp/users.csv' WITH CSV
\copy goals(id,user_id,title,description,type,category,target_date,status,progress_percentage,parent_goal_id,created_at,updated_at) FROM '/tmp/goals.csv' WITH CSV
\copy journal_entries(id,user_id,title,content,entry_date,mood,tags,created_at,updated_at) FROM '/tmp/journal_entries.csv' WITH CSV
\copy journal_goal_mentions(id,journal_entry_id,goal_id,mentioned_explicitly,created_at) FROM '/tmp/jgm.csv' WITH CSV
SET session_replication_role = DEFAULT;
COMMIT;
SQL

echo "==> Done."
```

### Verify

```bash
docker exec momentum-postgres env PGPASSWORD=momentum psql -h localhost -U momentum -d momentum \
  -c "SELECT 'users' t,count(*) FROM users UNION ALL SELECT 'goals',count(*) FROM goals UNION ALL SELECT 'journal_entries',count(*) FROM journal_entries UNION ALL SELECT 'journal_goal_mentions',count(*) FROM journal_goal_mentions;"
# Orphan-FK check (all should be 0):
docker exec momentum-postgres env PGPASSWORD=momentum psql -h localhost -U momentum -d momentum \
  -c "SELECT (SELECT count(*) FROM goals WHERE user_id NOT IN (SELECT id FROM users)) orphan_goals, (SELECT count(*) FROM journal_entries WHERE user_id NOT IN (SELECT id FROM users)) orphan_journals;"
```

> **Not idempotent**, but safe to re-run: step 2 begins with `TRUNCATE … CASCADE`, so a re-run replaces the data rather than colliding on duplicate primary keys.
>
> **Rotate the cloud DB password** after the import — it ends up in shell history / connection strings.

## 4b. Alternative: transfer an existing local DB

If you've already populated one machine (e.g. a dev Mac) and just want that data on the server, skip the cloud entirely: dump the whole DB and restore it. This also carries the schema + triggers + drizzle migration tracking, so no separate schema step is needed.

**On the source machine** (where `momentum-postgres` already has the data):
```sh
docker exec momentum-postgres pg_dump -U momentum -d momentum \
  --no-owner --no-privileges > momentum.dump
scp momentum.dump you@server:~/momentum.dump
```

**On the server** (Postgres up + healthy per §3, app NOT started yet):
```sh
cat ~/momentum.dump | docker exec -i momentum-postgres psql -U momentum -d momentum
```
Then start the app: `docker compose up -d --build`.

> `momentum.dump` contains real user data + bcrypt password hashes. **Never commit it** (it's gitignored); delete both copies after the restore. Works even after the cloud password is rotated or the cloud project is deleted.

## 5. Public access (reverse proxy + TLS)

The compose file binds both services to `127.0.0.1` (`127.0.0.1:3000` / `127.0.0.1:5432`) — nothing is reachable from the internet directly. A reverse proxy / tunnel terminates TLS and forwards to `127.0.0.1:3000`. Postgres stays local-only.

Two required env settings for a proxied deploy (already wired):
- `AUTH_TRUST_HOST=true` — compose sets this on the `web` service; without it Auth.js v5 rejects the forwarded host with `UntrustedHost` and login breaks.
- `NEXT_PUBLIC_APP_URL=https://app.yourdomain.com` in `.env.local`, then `docker compose up -d --build`.

### Option A — Cloudflare Tunnel (recommended for a home server)

No port-forwarding, hides your home IP, free TLS. On the server:
```sh
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared
cloudflared tunnel login
cloudflared tunnel create momentum
cloudflared tunnel route dns momentum app.yourdomain.com
```
`~/.cloudflared/config.yml`:
```yaml
tunnel: momentum
credentials-file: /home/you/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: app.yourdomain.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```
Install as a service so it survives reboots: `sudo cloudflared service install`.

### Option B — Caddy (auto Let's Encrypt, requires ports 80/443 forwarded)

`/etc/caddy/Caddyfile`:
```
app.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
```
Forward router ports 80/443 → server, then `sudo systemctl reload caddy`.

### Firewall

With Cloudflare Tunnel, no inbound app ports are needed:
```sh
sudo ufw allow OpenSSH && sudo ufw enable
```
(For the Caddy route, also `sudo ufw allow 80,443/tcp`.)

## Daily ops

```sh
# start (DB first, then app)
docker compose -f docker-compose.db.yml up -d
docker compose up -d

# stop app only (DB keeps running)
docker compose down

# stop the DB too (volume preserved; add -v to wipe)
docker compose -f docker-compose.db.yml down

# rebuild app after code pull
git pull && docker compose up -d --build

# logs
docker logs -f momentum-web

# psql into the DB
psql "postgres://momentum:momentum@localhost:5432/momentum"
```

Auto-start on boot is covered by `restart: unless-stopped` on both containers.

## Backups

The DB is in the `momentum-pgdata` Docker volume. Back it up with:
```sh
docker exec momentum-postgres pg_dump -U momentum momentum > backup.sql
```

## Decommission cloud (after a week of verified local use)

- Vercel: vercel.com → project → Settings → Delete
- Supabase Cloud: pause for 1 week as rollback, then delete
- Remove `.vercel/` from repo
