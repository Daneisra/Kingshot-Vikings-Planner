# Kingshot Vikings Planner

Kingshot Vikings Planner is a self-hosted web app for organizing player sign-ups for the Vikings event in Kingshot.

It gives guilds a shared board to collect registrations, track troop strength, review availability, and manage weekly resets without relying on external SaaS platforms.

## Current Status

- Core product is implemented and usable
- Local development setup is documented
- Native Debian 12 self-hosting is supported
- Production deployment uses Nginx, PM2, PostgreSQL, and GitHub Actions over SSH
- Ongoing work is focused on polish, validation, and deployment stability

## Why this project exists

Vikings coordination often ends up scattered across chat messages and screenshots. This project keeps the essentials in one place:

- players can register quickly from desktop or mobile
- leaders can review strength and availability at a glance
- admins can reset the board for a new week
- the full stack stays under your control

## Features

- Shared registration list for the current Vikings cycle
- Create, edit, and delete player registrations
- Support multiple regular partners for Viking Vengeance coordination
- Automatic reinforcement group suggestions based on availability, troop strength, and partner preferences
- Track up to 2 strongest troop tiers with a shared tier and separate Infantry, Lancer, and Marksman counts
- Visible app version in the UI for easier support and deployment checks
- In-app Viking Vengeance guide with quick rules and wave timeline
- Animated event reminders for the most important Viking Vengeance rules
- Search by nickname
- Filter by partner and weekly availability
- Quick stats:
  total participants, total troops, average troop level, most selected partners
- CSV export
- Weekly reset action with archive snapshot
- Responsive mobile-first UI
- Admin-protected actions using temporary signed tokens and optional secondary admin password
- REST API backed by PostgreSQL

## Live Demo

- Production instance: https://vikings.dannytech.fr
- Intended for private guild/community use

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, TypeScript, Express
- Database: PostgreSQL
- Production runtime: Debian 12, Nginx, PM2
- Deployment: GitHub Actions over SSH

## Project Structure

```text
.
├── backend/              # Express API and PostgreSQL access
├── frontend/             # React app built with Vite
├── db/                   # Database bootstrap SQL
├── deploy/               # Deployment scripts and Nginx template
├── docs/                 # Self-hosting, deployment, and operations docs
├── .github/workflows/    # GitHub Actions
├── README.md
└── ROADMAP.md
```

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 15 or newer
- npm

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Create a local PostgreSQL database

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

### 3. Configure environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 4. Run the app

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

Local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000/api`

## Production / Self-Hosting

Kingshot Vikings Planner is built for self-hosted deployment on a Debian 12 VPS using native services:

- Nginx for static hosting and reverse proxying
- PM2 for the backend process
- PostgreSQL for persistence

Start here:

- [Self-hosting guide](docs/SELF_HOSTING.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Operations guide](docs/OPERATIONS.md)

## Deployment

The repository includes an SSH-based GitHub Actions production deployment flow that:

- runs CI typechecks and builds before deployment
- updates the server checkout to `origin/main`
- rebuilds backend and frontend
- syncs `frontend/dist` to the Nginx web root
- restarts PM2
- runs an API health check and production smoke tests

Full setup details are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

The current deployed version is visible in the app UI and exposed by `/api/health`.

## Roadmap

Planned fixes, UX improvements, admin work, data/reporting changes, and ops tasks are tracked in [ROADMAP.md](ROADMAP.md).

Event-specific planning notes for future features are documented in [docs/VIKING_VENGEANCE_GUIDE.md](docs/VIKING_VENGEANCE_GUIDE.md).

## Contributing

Issues and feature requests are welcome:

- Bugs and ideas: [GitHub Issues](https://github.com/Daneisra/Kingshot-Vikings-Planner/issues)
- Contributions: open an issue first for larger changes, then submit a PR

If you contribute, keep changes aligned with the current project direction:

- simple UX
- self-hosted architecture
- maintainable deployment model

## Screenshots

Project screenshots and demo material can be added later. For now, the repository focuses on source, deployment, and self-hosting documentation.

## License

No license file is included in the repository yet.

Until a license is added, the project should be considered viewable on GitHub but not openly licensed for reuse or redistribution.
