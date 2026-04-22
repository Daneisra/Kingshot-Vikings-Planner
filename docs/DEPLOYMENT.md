# Deployment

This project supports two deployment modes:

- manual deployment on a Debian 12 VPS
- automatic deployment from GitHub Actions over SSH

## Source of Truth

`deploy/scripts/deploy.sh` is the source of truth for the production deployment flow.

If the README, workflow notes, or VPS commands ever differ, the deploy script should be treated as the canonical implementation of what production deploy actually does.

## Manual Deployment Summary

If you want to deploy manually:

1. update the server checkout
2. install dependencies if needed
3. build backend and frontend
4. sync `frontend/dist` to `/var/www/kingshot-vikings-planner`
5. restart PM2
6. verify the API health endpoint

Example:

```bash
cd /opt/kingshot-vikings-planner
git pull

cd backend
npm install
npm run build

cd ../frontend
npm install
set -a
. /etc/kingshot-vikings-planner/frontend.env
set +a
npm run build

rm -rf /var/www/kingshot-vikings-planner/*
cp -r dist/. /var/www/kingshot-vikings-planner/

cd ..
pm2 restart kingshot-vikings-planner-api
curl http://127.0.0.1:4000/api/health
```

## GitHub Actions Auto-Deploy

The repository includes:

- workflow: `.github/workflows/deploy.yml`
- remote deploy script: `deploy/scripts/deploy.sh`
- server bootstrap helper: `deploy/scripts/bootstrap-server-files.sh`

The workflow now has two phases:

1. a GitHub-hosted `verify` job that installs dependencies, typechecks, and builds both apps
2. the SSH `deploy` job, which only runs if verification passed

## Deployment Strategy

The production server checkout is treated as disposable for tracked files.

At deploy time the workflow:

1. connects to the VPS over SSH
2. runs `git fetch origin main`
3. runs `git reset --hard origin/main`
4. runs `git clean -fd`
5. rebuilds backend and frontend
6. syncs frontend assets to Nginx web root
7. restarts PM2
8. checks `http://127.0.0.1:4000/api/health`
9. runs production smoke tests on core API endpoints

This avoids drift in tracked files while keeping server-only files outside the repository.
It also prevents obviously broken TypeScript or build regressions from reaching the VPS.

## Server-Only Files

These should stay outside Git:

- `/etc/kingshot-vikings-planner/backend.env`
- `/etc/kingshot-vikings-planner/frontend.env`
- `/etc/nginx/sites-available/kingshot-vikings-planner`

Recommended setup:

- `backend/.env` on the VPS is a symlink to `/etc/kingshot-vikings-planner/backend.env`
- Nginx active config is managed separately from the repo template

## GitHub Secrets

Create these repository secrets in:

`Settings -> Secrets and variables -> Actions`

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_SSH_KNOWN_HOSTS`
- `VPS_APP_DIR`
- `VPS_FRONTEND_DIR`

Recommended values:

- `VPS_APP_DIR=/opt/kingshot-vikings-planner`
- `VPS_FRONTEND_DIR=/var/www/kingshot-vikings-planner`

## One-Time VPS Setup for Auto-Deploy

### 1. Make sure the server can pull from GitHub

The VPS itself must be able to run:

```bash
cd /opt/kingshot-vikings-planner
git fetch origin main
```

Use an SSH remote if possible:

```bash
git remote set-url origin git@github.com:Daneisra/Kingshot-Vikings-Planner.git
```

### 2. Add a GitHub deploy key for the VPS

Create a key on the VPS:

```bash
ssh-keygen -t ed25519 -C "kingshot-vikings-planner-vps" -f ~/.ssh/kingshot_vikings_github
```

Add this to `~/.ssh/config`:

```sshconfig
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/kingshot_vikings_github
    IdentitiesOnly yes
```

Then add the public key as a read-only deploy key in the GitHub repository.

### 3. Prepare server-side env files

```bash
cd /opt/kingshot-vikings-planner
bash deploy/scripts/bootstrap-server-files.sh
```

### 4. Verify permissions

The deploy user must be able to:

- write to `/opt/kingshot-vikings-planner`
- write to `/var/www/kingshot-vikings-planner`
- run PM2 for `kingshot-vikings-planner-api`

## What the deploy script does

`deploy/scripts/deploy.sh`:

- loads the user runtime environment
- restores `npm` and `pm2` in shell sessions where PATH is incomplete
- validates required binaries
- links the backend env file
- installs dependencies only when package metadata changes
- builds backend and frontend
- syncs frontend build output with `rsync --delete`
- restarts PM2
- retries the API health check until the app is ready
- verifies the frontend artifact exists in the web root
- smoke-tests `/api/health`, `/api/registrations?available=true`, and `/api/registrations/partners`

## Troubleshooting

Common failure points:

- `npm` or `pm2` missing from PATH for the deploy user
- VPS cannot `git fetch origin main`
- missing `/etc/kingshot-vikings-planner/backend.env`
- missing `rsync`
- PM2 running under a different Linux user

See [OPERATIONS.md](OPERATIONS.md) for troubleshooting commands.
