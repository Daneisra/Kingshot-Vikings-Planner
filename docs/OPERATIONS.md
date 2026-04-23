# Operations

This document covers the day-to-day runtime and maintenance side of Kingshot Vikings Planner.

## Runtime Overview

- Frontend: static files served by Nginx from `/var/www/kingshot-vikings-planner`
- Backend: PM2 process bound to `127.0.0.1:4000`
- Database: native PostgreSQL
- Reverse proxy: Nginx forwards `/api` to the backend

## Important Paths

- App source: `/opt/kingshot-vikings-planner`
- Frontend web root: `/var/www/kingshot-vikings-planner`
- Backend env: `/etc/kingshot-vikings-planner/backend.env`
- Frontend env: `/etc/kingshot-vikings-planner/frontend.env`
- PM2 config: `/opt/kingshot-vikings-planner/ecosystem.config.js`
- Nginx template in repo: `/opt/kingshot-vikings-planner/deploy/nginx/kingshot-vikings-planner.conf`
- Active Nginx site: `/etc/nginx/sites-available/kingshot-vikings-planner`

## PM2

Start:

```bash
cd /opt/kingshot-vikings-planner
pm2 start ecosystem.config.js --env production
pm2 save
```

Status:

```bash
pm2 status
```

Logs:

```bash
pm2 logs kingshot-vikings-planner-api
```

Recent logs without streaming:

```bash
pm2 logs kingshot-vikings-planner-api --lines 100 --nostream
```

Restart:

```bash
pm2 restart kingshot-vikings-planner-api --update-env
```

## Logging

### Backend HTTP Logs

In production, the backend writes one JSON log line per HTTP request through PM2 stdout.

Each request log includes:

- `timestamp`
- `requestId`
- `method`
- `url`
- `status`
- `responseTimeMs`
- `contentLength`
- `remoteAddress`
- `userAgent`

Example:

```json
{"timestamp":"2026-04-23T12:00:00.000Z","requestId":"...","method":"GET","url":"/api/health","status":200,"responseTimeMs":12.3,"contentLength":"33","remoteAddress":"127.0.0.1","userAgent":"curl/8.0.0"}
```

When the frontend displays an API error reference, search PM2 logs with that `requestId`:

```bash
pm2 logs kingshot-vikings-planner-api --lines 500 --nostream | grep "request-id-here"
```

### PM2 Log Rotation

Install PM2 logrotate once on the VPS:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 save
```

This keeps PM2 logs bounded while preserving enough recent history for deployment and API debugging.

### Nginx Logs

Nginx logs are managed by Debian's default `logrotate` integration.

Useful commands:

```bash
sudo tail -n 100 /var/log/nginx/access.log
sudo tail -n 100 /var/log/nginx/error.log
```

If this VPS hosts multiple projects, consider giving this site its own access and error log files in the active Nginx config.

## Nginx

Validate config:

```bash
sudo nginx -t
```

Reload:

```bash
sudo systemctl reload nginx
```

Recommended production flow:

- keep the active Nginx config outside the repo
- use the repo file only as a versioned template

## Health Checks

API:

```bash
curl http://127.0.0.1:4000/api/health
```

Frontend:

```bash
curl -I http://127.0.0.1/
```

## Environment Files

Backend:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings
CORS_ORIGIN=https://vikings.example.com
ADMIN_PASSWORD=change-this-admin-password
ADMIN_SECONDARY_PASSWORD=change-this-secondary-admin-password
ADMIN_TOKEN_SECRET=change-this-token-secret-with-at-least-16-chars
ADMIN_TOKEN_TTL_MINUTES=120
```

Frontend:

```env
VITE_API_BASE_URL=/api
```

## Database Maintenance

Initialize schema:

```bash
psql "postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings" -f /opt/kingshot-vikings-planner/db/init.sql
```

### Manual Backup

The repository includes a production backup helper:

```bash
cd /opt/kingshot-vikings-planner
bash deploy/scripts/backup-postgres.sh
```

By default it:

- reads `DATABASE_URL` from `/etc/kingshot-vikings-planner/backend.env`
- writes compressed backups to `/var/backups/kingshot-vikings-planner`
- keeps `14` days of backups
- produces files named like `kingshot_vikings_20260423T120000Z.sql.gz`

You can override defaults:

```bash
BACKUP_DIR=/home/deploy/kingshot-backups RETENTION_DAYS=30 bash deploy/scripts/backup-postgres.sh
```

### Restore Backup

Restore into an empty database:

```bash
gunzip -c /var/backups/kingshot-vikings-planner/kingshot_vikings_YYYYMMDDTHHMMSSZ.sql.gz \
  | psql "postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings"
```

### Automated Backups

Create the backup directory:

```bash
sudo mkdir -p /var/backups/kingshot-vikings-planner
sudo chown -R $USER:$USER /var/backups/kingshot-vikings-planner
chmod 700 /var/backups/kingshot-vikings-planner
```

Open the deploy user's crontab:

```bash
crontab -e
```

Run a backup every day at `03:20` server time:

```cron
20 3 * * * cd /opt/kingshot-vikings-planner && BACKUP_DIR=/var/backups/kingshot-vikings-planner RETENTION_DAYS=14 bash deploy/scripts/backup-postgres.sh >> /var/backups/kingshot-vikings-planner/backup.log 2>&1
```

### Low-Level Backup Example

If you need to run `pg_dump` manually:

```bash
pg_dump "postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings" > kingshot_vikings_backup.sql
```

## Troubleshooting

### `npm` not found during deploy

Check the deploy user environment:

```bash
for f in ~/.profile ~/.bash_profile ~/.bashrc; do [ -f "$f" ] && . "$f"; done
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
command -v node
command -v npm
command -v pm2
```

If needed, install Node.js globally for the deploy user or make sure the user's shell profile exposes it.

### PM2 restart fails

Make sure the same Linux user both:

- owns the PM2 process
- runs the GitHub Actions SSH deployment

Check:

```bash
pm2 status
whoami
```

### Git fetch fails on the VPS

Check:

```bash
cd /opt/kingshot-vikings-planner
git remote -v
git fetch origin main
```

If the fetch fails, fix the VPS SSH key used for GitHub access.

### Backend health check fails after deploy

Check:

```bash
pm2 logs kingshot-vikings-planner-api
cat /etc/kingshot-vikings-planner/backend.env
curl http://127.0.0.1:4000/api/health
```

Common causes:

- invalid database connection string
- missing backend env file
- build failure
- backend crash at startup

## Recommended Workflow

- Keep repo-tracked code clean on the server
- Keep server-specific files out of Git
- Use GitHub Actions for standard deploys
- Use PM2 logs and the health endpoint as the first debugging entry points
