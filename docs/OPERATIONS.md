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

Restart:

```bash
pm2 restart kingshot-vikings-planner-api --update-env
```

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

Simple backup example:

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

