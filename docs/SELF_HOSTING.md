# Self-Hosting Guide

This guide covers local development and manual self-hosting for Kingshot Vikings Planner on Debian 12.

## Stack Overview

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL
- Runtime: Nginx + PM2 + PostgreSQL

## Recommended Production Paths

- Application source: `/opt/kingshot-vikings-planner`
- Frontend build output served by Nginx: `/var/www/kingshot-vikings-planner`
- Backend environment file: `/etc/kingshot-vikings-planner/backend.env`
- Frontend production environment file: `/etc/kingshot-vikings-planner/frontend.env`

## Local Development

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL 15 or newer

### Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Create the local database

```bash
sudo -u postgres psql
```

```sql
CREATE USER kingshot WITH PASSWORD 'change-this-postgres-password';
CREATE DATABASE kingshot_vikings OWNER kingshot;
\q
```

```bash
psql "postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings" -f db/init.sql
```

### Configure environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Run the app

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## Manual Production Setup on Debian 12

### Install system packages

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql postgresql-contrib rsync
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Create application directories

```bash
sudo mkdir -p /opt/kingshot-vikings-planner
sudo mkdir -p /var/www/kingshot-vikings-planner
sudo mkdir -p /etc/kingshot-vikings-planner
sudo chown -R $USER:$USER /opt/kingshot-vikings-planner
sudo chown -R $USER:$USER /var/www/kingshot-vikings-planner
sudo chown -R $USER:$USER /etc/kingshot-vikings-planner
```

### Clone the repository

```bash
git clone https://github.com/Daneisra/Kingshot-Vikings-Planner.git /opt/kingshot-vikings-planner
cd /opt/kingshot-vikings-planner
```

### Create PostgreSQL database

```bash
sudo -u postgres psql
```

```sql
CREATE USER kingshot WITH PASSWORD 'change-this-postgres-password';
CREATE DATABASE kingshot_vikings OWNER kingshot;
\q
```

```bash
psql "postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings" -f /opt/kingshot-vikings-planner/db/init.sql
```

### Create server-side environment files

```bash
cp /opt/kingshot-vikings-planner/backend/.env.example /etc/kingshot-vikings-planner/backend.env
cp /opt/kingshot-vikings-planner/frontend/.env.production.example /etc/kingshot-vikings-planner/frontend.env
ln -sfn /etc/kingshot-vikings-planner/backend.env /opt/kingshot-vikings-planner/backend/.env
```

Edit them:

```bash
nano /etc/kingshot-vikings-planner/backend.env
nano /etc/kingshot-vikings-planner/frontend.env
```

Example backend values:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings
CORS_ORIGIN=https://vikings.example.com
ADMIN_PASSWORD=change-this-admin-password
```

Example frontend values:

```env
VITE_API_BASE_URL=/api
```

### Build backend and frontend

```bash
cd /opt/kingshot-vikings-planner/backend
npm install
npm run build
```

```bash
cd /opt/kingshot-vikings-planner/frontend
npm install
set -a
. /etc/kingshot-vikings-planner/frontend.env
set +a
npm run build
```

### Publish the frontend

```bash
rm -rf /var/www/kingshot-vikings-planner/*
cp -r /opt/kingshot-vikings-planner/frontend/dist/. /var/www/kingshot-vikings-planner/
```

### Start the backend with PM2

```bash
cd /opt/kingshot-vikings-planner
pm2 start ecosystem.config.js --env production
pm2 save
```

## Next Steps

- Follow [DEPLOYMENT.md](DEPLOYMENT.md) to enable GitHub Actions auto-deploy
- Follow [OPERATIONS.md](OPERATIONS.md) for PM2, Nginx, health checks, and troubleshooting
