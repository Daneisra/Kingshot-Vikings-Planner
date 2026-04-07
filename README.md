# Kingshot Vikings Planner

Application web auto-hebergee pour organiser les inscriptions a l'evenement "Vikings" du jeu Kingshot, en deploiement natif sur Debian 12.

## Architecture retenue

Le projet reste volontairement simple :

- `frontend/` : React + TypeScript + Vite + Tailwind CSS
- `backend/` : Node.js + TypeScript + Express
- `db/` : schema SQL PostgreSQL
- `deploy/nginx/` : configuration Nginx prete a copier sur le VPS
- `ecosystem.config.js` : lancement du backend avec PM2

En production sur Debian 12 :

- le code source backend est deploye dans `/opt/kingshot-vikings-planner`
- le frontend est build puis copie en statique dans `/var/www/kingshot-vikings-planner`
- PostgreSQL tourne nativement sur l'hote
- le backend tourne nativement via PM2
- Nginx sert le frontend et reverse-proxy `/api` vers le backend local

## Arborescence du projet

```text
Kingshot Vikings Planner/
├── .gitignore
├── README.md
├── ecosystem.config.js
├── deploy/
│   └── nginx/
│       └── kingshot-vikings-planner.conf
├── db/
│   └── init.sql
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/env.ts
│       ├── db/pool.ts
│       ├── middleware/
│       ├── routes/
│       ├── services/registration-service.ts
│       ├── types/registration.ts
│       ├── utils/
│       ├── index.ts
│       └── server.ts
└── frontend/
    ├── .env.example
    ├── .env.production.example
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.ts
    ├── tsconfig.app.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    └── src/
        ├── components/
        ├── hooks/
        ├── lib/
        ├── types/
        ├── App.tsx
        ├── index.css
        ├── main.tsx
        └── vite-env.d.ts
```

## Fonctionnalites

- page principale avec liste des inscriptions
- ajout et modification d'une inscription
- suppression d'une inscription
- recherche par pseudo
- filtre par partenaire
- filtre par disponibilite
- responsive mobile
- API REST propre sous `/api`
- persistance PostgreSQL
- reinitialisation de la liste pour une nouvelle semaine
- statistiques rapides
- export CSV
- confirmation avant suppression
- panneau admin protege par mot de passe simple

## Fichiers supprimes

Les fichiers Docker ont ete retires :

- `.env.example` a la racine
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`

## Variables d'environnement

## Backend

Le backend lit ses variables depuis `backend/.env`.

Copie du modele :

```bash
cp backend/.env.example backend/.env
```

Contenu du modele :

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings
CORS_ORIGIN=https://vikings.example.com
ADMIN_PASSWORD=change-this-admin-password
```

## Frontend

En local :

```bash
cp frontend/.env.example frontend/.env.local
```

Contenu :

```env
VITE_API_BASE_URL=/api
VITE_DEV_API_TARGET=http://localhost:4000
```

En production, le frontend peut fonctionner avec `VITE_API_BASE_URL=/api`.

Si tu veux expliciter le mode production :

```bash
cp frontend/.env.production.example frontend/.env.production
```

Contenu :

```env
VITE_API_BASE_URL=/api
```

## Prerequis Debian 12

Commandes exactes :

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql postgresql-contrib rsync
```

Installer Node.js 22 :

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifier :

```bash
node -v
npm -v
nginx -v
psql --version
```

Installer PM2 globalement :

```bash
sudo npm install -g pm2
pm2 -v
```

## Installation locale de developpement

## 1. Installer les dependances

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

## 2. Configurer PostgreSQL local

Creer la base et l'utilisateur :

```bash
sudo -u postgres psql
```

Dans `psql` :

```sql
CREATE USER kingshot WITH PASSWORD 'change-this-postgres-password';
CREATE DATABASE kingshot_vikings OWNER kingshot;
\q
```

Initialiser le schema :

```bash
psql "postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings" -f db/init.sql
```

## 3. Configurer les variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## 4. Lancer le backend

```bash
cd backend
npm run dev
```

Le backend ecoute sur :

```text
http://localhost:4000
```

## 5. Lancer le frontend

Dans un autre terminal :

```bash
cd frontend
npm run dev
```

Le frontend ecoute sur :

```text
http://localhost:5173
```

Le proxy Vite redirige automatiquement `/api` vers `http://localhost:4000`.

## Build de production

## Backend

```bash
cd backend
npm install
npm run build
```

Le resultat est genere dans :

```text
backend/dist
```

## Frontend

```bash
cd frontend
npm install
cp .env.production.example .env.production
npm run build
```

Le resultat est genere dans :

```text
frontend/dist
```

## Deploiement natif sur VPS OVH Debian 12

## Dossiers cibles

- code source backend : `/opt/kingshot-vikings-planner`
- fichiers statiques frontend : `/var/www/kingshot-vikings-planner`

## 1. Installer les paquets systeme

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql postgresql-contrib rsync
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Creer les dossiers cibles

```bash
sudo mkdir -p /opt/kingshot-vikings-planner
sudo mkdir -p /var/www/kingshot-vikings-planner
sudo chown -R $USER:$USER /opt/kingshot-vikings-planner
sudo chown -R $USER:$USER /var/www/kingshot-vikings-planner
```

## 3. Copier le projet sur le serveur

Depuis ta machine locale :

```bash
scp -r "./Kingshot Vikings Planner/." user@ton-vps:/opt/kingshot-vikings-planner/
```

Puis sur le serveur :

```bash
cd /opt/kingshot-vikings-planner
```

## 4. Configurer PostgreSQL

Ouvrir `psql` :

```bash
sudo -u postgres psql
```

Executer :

```sql
CREATE USER kingshot WITH PASSWORD 'change-this-postgres-password';
CREATE DATABASE kingshot_vikings OWNER kingshot;
\q
```

Initialiser la base :

```bash
psql "postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings" -f /opt/kingshot-vikings-planner/db/init.sql
```

## 5. Configurer le backend

Installer les dependances et builder :

```bash
cd /opt/kingshot-vikings-planner/backend
npm install
npm run build
```

Creer le fichier d'environnement :

```bash
cp /opt/kingshot-vikings-planner/backend/.env.example /opt/kingshot-vikings-planner/backend/.env
nano /opt/kingshot-vikings-planner/backend/.env
```

Valeurs minimales a adapter :

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings
CORS_ORIGIN=https://vikings.example.com
ADMIN_PASSWORD=change-this-admin-password
```

## 6. Configurer le frontend

Installer les dependances, preparer l'env et builder :

```bash
cd /opt/kingshot-vikings-planner/frontend
npm install
cp .env.production.example .env.production
npm run build
```

Copier les fichiers statiques :

```bash
rm -rf /var/www/kingshot-vikings-planner/*
cp -r /opt/kingshot-vikings-planner/frontend/dist/. /var/www/kingshot-vikings-planner/
```

## 7. Lancer le backend avec PM2

Depuis la racine du projet :

```bash
cd /opt/kingshot-vikings-planner
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

Verifier :

```bash
pm2 status
pm2 logs kingshot-vikings-planner-api
curl http://127.0.0.1:4000/api/health
```

## 8. Configurer Nginx

Le fichier pret a copier est deja fourni dans :

- `deploy/nginx/kingshot-vikings-planner.conf`

Copie vers Nginx :

```bash
sudo cp /opt/kingshot-vikings-planner/deploy/nginx/kingshot-vikings-planner.conf /etc/nginx/sites-available/kingshot-vikings-planner
```

Edite le `server_name` si besoin :

```bash
sudo nano /etc/nginx/sites-available/kingshot-vikings-planner
```

Activer le site :

```bash
sudo ln -sfn /etc/nginx/sites-available/kingshot-vikings-planner /etc/nginx/sites-enabled/kingshot-vikings-planner
sudo nginx -t
sudo systemctl reload nginx
```

## 9. HTTPS avec Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vikings.example.com
```

## Configuration Nginx complete

Fichier : `deploy/nginx/kingshot-vikings-planner.conf`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name vikings.example.com;

    root /var/www/kingshot-vikings-planner;
    index index.html;

    access_log /var/log/nginx/kingshot-vikings-planner.access.log;
    error_log /var/log/nginx/kingshot-vikings-planner.error.log;

    client_max_body_size 10m;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Fichier PM2 complet

Fichier : `ecosystem.config.js`

```js
module.exports = {
  apps: [
    {
      name: "kingshot-vikings-planner-api",
      cwd: "./backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
```

## Commandes exactes a executer sur Debian 12

Ordre recommande :

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql postgresql-contrib rsync
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo mkdir -p /opt/kingshot-vikings-planner
sudo mkdir -p /var/www/kingshot-vikings-planner
sudo chown -R $USER:$USER /opt/kingshot-vikings-planner
sudo chown -R $USER:$USER /var/www/kingshot-vikings-planner
scp -r "./Kingshot Vikings Planner/." user@ton-vps:/opt/kingshot-vikings-planner/
ssh user@ton-vps
cd /opt/kingshot-vikings-planner
sudo -u postgres psql
```

Puis dans `psql` :

```sql
CREATE USER kingshot WITH PASSWORD 'change-this-postgres-password';
CREATE DATABASE kingshot_vikings OWNER kingshot;
\q
```

Puis reprendre :

```bash
psql "postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings" -f /opt/kingshot-vikings-planner/db/init.sql
cd /opt/kingshot-vikings-planner/backend
npm install
npm run build
test -f .env || cp .env.example .env
nano .env
cd /opt/kingshot-vikings-planner/frontend
npm install
test -f .env.production || cp .env.production.example .env.production
npm run build
rm -rf /var/www/kingshot-vikings-planner/*
cp -r dist/. /var/www/kingshot-vikings-planner/
cd /opt/kingshot-vikings-planner
pm2 start ecosystem.config.js --env production
pm2 save
sudo cp deploy/nginx/kingshot-vikings-planner.conf /etc/nginx/sites-available/kingshot-vikings-planner
sudo ln -sfn /etc/nginx/sites-available/kingshot-vikings-planner /etc/nginx/sites-enabled/kingshot-vikings-planner
sudo nginx -t
sudo systemctl reload nginx
curl http://127.0.0.1:4000/api/health
```

## Procedure de mise a jour

## Backend

```bash
cd /opt/kingshot-vikings-planner/backend
npm install
npm run build
cd /opt/kingshot-vikings-planner
pm2 restart kingshot-vikings-planner-api
```

## Frontend

```bash
cd /opt/kingshot-vikings-planner/frontend
npm install
npm run build
rm -rf /var/www/kingshot-vikings-planner/*
cp -r dist/. /var/www/kingshot-vikings-planner/
sudo systemctl reload nginx
```

## Mise a jour complete

```bash
cd /opt/kingshot-vikings-planner
git pull
cd backend
npm install
npm run build
test -f .env || cp .env.example .env
cd ../frontend
npm install
test -f .env.production || cp .env.production.example .env.production
npm run build
rm -rf /var/www/kingshot-vikings-planner/*
cp -r dist/. /var/www/kingshot-vikings-planner/
cd ..
pm2 restart kingshot-vikings-planner-api
sudo nginx -t
sudo systemctl reload nginx
```

## Fichiers importants

- configuration backend : `backend/.env.example`
- point d'entree API : `backend/src/index.ts`
- serveur Express : `backend/src/server.ts`
- logique PostgreSQL : `backend/src/services/registration-service.ts`
- schema SQL : `db/init.sql`
- configuration PM2 : `ecosystem.config.js`
- configuration Nginx : `deploy/nginx/kingshot-vikings-planner.conf`
- application frontend : `frontend/src/App.tsx`

## Remarques de maintenance

- Le frontend est un build statique. Nginx sert directement les fichiers de `/var/www/kingshot-vikings-planner`.
- Le backend tourne sur `127.0.0.1:4000` via PM2.
- L'API est exposee au navigateur uniquement via Nginx sous `/api`.
- Le mot de passe admin est volontairement simple pour le MVP. Si tu veux aller plus loin, la prochaine etape logique est une vraie authentification admin.

## Deploiement automatique via GitHub Actions

Le projet inclut maintenant un deploiement automatique par SSH :

- workflow GitHub Actions : `.github/workflows/deploy.yml`
- script de deploiement distant : `deploy/scripts/deploy.sh`
- script de preparation des fichiers serveur : `deploy/scripts/bootstrap-server-files.sh`

Le principe est volontairement strict :

- GitHub Actions se connecte en SSH au VPS
- le VPS va dans `/opt/kingshot-vikings-planner`
- le VPS fait `git fetch origin main`
- le VPS fait `git reset --hard origin/main`
- le VPS fait `git clean -fd`
- le script reinstalle les dependances seulement si `package.json` ou `package-lock.json` a change
- le backend est rebuild
- le frontend est rebuild
- `frontend/dist` est synchronise vers `/var/www/kingshot-vikings-planner`
- PM2 redemarre `kingshot-vikings-planner-api`
- l'API est verifiee avec `curl http://127.0.0.1:4000/api/health`

## Strategie pour eviter les conflits Git / serveur

La strategie retenue est la plus fiable pour ton besoin :

- le repo GitHub contient uniquement les fichiers versionnes
- les fichiers sensibles ou specifiques au serveur restent hors repo
- le deploiement ecrase completement les fichiers versionnes du repo sur le VPS
- les fichiers serveur hors repo ne sont jamais touches par `git reset --hard` ni par `git clean -fd`

Concretement :

- le vrai fichier backend de production doit vivre dans `/etc/kingshot-vikings-planner/backend.env`
- le vrai fichier frontend de production peut vivre dans `/etc/kingshot-vikings-planner/frontend.env`
- `backend/.env` sur le VPS doit etre un symlink vers `/etc/kingshot-vikings-planner/backend.env`
- la configuration Nginx active doit vivre dans `/etc/nginx/sites-available/kingshot-vikings-planner`
- le fichier repo `deploy/nginx/kingshot-vikings-planner.conf` sert uniquement de modele versionne

Ainsi :

- tu peux modifier Nginx directement sur le serveur sans risque d'ecrasement par Git
- tu peux modifier les variables backend directement sur le serveur sans risque d'ecrasement par Git
- les changements manuels dans le code versionne sur le VPS seront volontairement supprimes au prochain deploiement

## Secrets GitHub a creer

Dans `Settings > Secrets and variables > Actions`, cree exactement ces secrets :

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_SSH_KNOWN_HOSTS`
- `VPS_APP_DIR`
- `VPS_FRONTEND_DIR`

Valeurs attendues :

- `VPS_HOST` : IP ou nom DNS du VPS
- `VPS_USER` : utilisateur Linux qui deploie et gere PM2
- `VPS_PORT` : port SSH, par exemple `22`
- `VPS_SSH_PRIVATE_KEY` : cle privee OpenSSH utilisee par GitHub Actions pour se connecter au VPS
- `VPS_SSH_KNOWN_HOSTS` : sortie de `ssh-keyscan -H ton-vps`
- `VPS_APP_DIR` : `/opt/kingshot-vikings-planner`
- `VPS_FRONTEND_DIR` : `/var/www/kingshot-vikings-planner`

## Preparation unique a faire sur le VPS

### 1. Verifier que le repo est clone en SSH

Le serveur lui-meme doit pouvoir faire `git fetch origin main`.

Sur le VPS :

```bash
cd /opt/kingshot-vikings-planner
git remote -v
```

L'URL `origin` doit idealement etre en SSH, par exemple :

```text
git@github.com:ton-compte/kingshot-vikings-planner.git
```

Si besoin :

```bash
git remote set-url origin git@github.com:ton-compte/kingshot-vikings-planner.git
```

### 2. Creer une cle SSH dediee au VPS pour acceder au repo GitHub

Sur le VPS :

```bash
ssh-keygen -t ed25519 -C "kingshot-vikings-planner-vps" -f ~/.ssh/kingshot_vikings_github
```

Ajouter dans `~/.ssh/config` :

```sshconfig
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/kingshot_vikings_github
    IdentitiesOnly yes
```

Charger l'hote GitHub :

```bash
ssh-keyscan -H github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/config ~/.ssh/kingshot_vikings_github
chmod 644 ~/.ssh/kingshot_vikings_github.pub ~/.ssh/known_hosts
```

Puis ajouter le contenu de `~/.ssh/kingshot_vikings_github.pub` dans GitHub :

- `Repository > Settings > Deploy keys > Add deploy key`

Donne-lui un nom, coche lecture seule, puis colle la cle publique.

### 3. Preparer les fichiers serveur hors repo

Depuis le VPS :

```bash
cd /opt/kingshot-vikings-planner
bash deploy/scripts/bootstrap-server-files.sh
```

Ce script :

- cree `/etc/kingshot-vikings-planner/backend.env` si absent
- cree `/etc/kingshot-vikings-planner/frontend.env` si absent
- cree le symlink `backend/.env -> /etc/kingshot-vikings-planner/backend.env`

Edite ensuite les fichiers :

```bash
nano /etc/kingshot-vikings-planner/backend.env
nano /etc/kingshot-vikings-planner/frontend.env
```

Exemple minimal pour le backend :

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://kingshot:change-this-postgres-password@127.0.0.1:5432/kingshot_vikings
CORS_ORIGIN=https://vikings.example.com
ADMIN_PASSWORD=change-this-admin-password
```

Exemple minimal pour le frontend :

```env
VITE_API_BASE_URL=/api
```

### 4. Verifier les permissions de deploiement

L'utilisateur SSH de deploiement doit pouvoir :

- ecrire dans `/opt/kingshot-vikings-planner`
- ecrire dans `/var/www/kingshot-vikings-planner`
- lancer `pm2 restart kingshot-vikings-planner-api`

Verification :

```bash
touch /opt/kingshot-vikings-planner/.write-test && rm /opt/kingshot-vikings-planner/.write-test
touch /var/www/kingshot-vikings-planner/.write-test && rm /var/www/kingshot-vikings-planner/.write-test
pm2 status
```

### 5. Recuperer la cle SSH du VPS pour GitHub Actions

Si tu n'as pas encore de cle dediee pour GitHub Actions vers le VPS, cree-en une depuis ta machine locale, puis ajoute la cle publique dans `~/.ssh/authorized_keys` du VPS.

Ensuite, cree les secrets GitHub :

```bash
ssh-keyscan -H ton-vps
```

La sortie complete va dans `VPS_SSH_KNOWN_HOSTS`.

## Fonctionnement du workflow

Le workflow `main` fonctionne ainsi :

1. GitHub Actions demarre sur push vers `main`
2. Il charge la cle SSH du secret `VPS_SSH_PRIVATE_KEY`
3. Il ouvre une session SSH vers le VPS
4. Il execute `deploy/scripts/deploy.sh`
5. Le script remet le repo exactement sur `origin/main`
6. Il preserve les fichiers serveur hors repo
7. Il rebuild et redeploie l'application
8. Il redemarre PM2
9. Il valide l'API localement

## Commandes exactes lancees par le workflow

Le coeur du deploiement fait :

```bash
cd /opt/kingshot-vikings-planner
git fetch origin main
git reset --hard origin/main
git clean -fd
```

Puis :

- relie `backend/.env` vers `/etc/kingshot-vikings-planner/backend.env`
- verifie si les dependances backend/frontend ont change
- lance `npm install` seulement si necessaire
- build le backend
- build le frontend
- synchronise `frontend/dist/` vers `/var/www/kingshot-vikings-planner/` avec `rsync --delete`
- redemarre PM2
- appelle `curl http://127.0.0.1:4000/api/health`

## Mise en place GitHub

Dans ton repo GitHub :

1. Va dans `Settings`
2. Ouvre `Secrets and variables`
3. Ouvre `Actions`
4. Ajoute les secrets listes plus haut
5. Commit et push les fichiers :
   - `.github/workflows/deploy.yml`
   - `deploy/scripts/deploy.sh`
   - `deploy/scripts/bootstrap-server-files.sh`
6. Fais un push sur `main`
7. Surveille l'execution dans l'onglet `Actions`

## Procedure apres mise en place

Une fois le systeme configure :

- tu pushes sur `main`
- GitHub Actions se connecte au VPS
- le VPS se met exactement a jour sur `origin/main`
- le frontend et le backend sont rebuild
- PM2 redemarre automatiquement

Pour verifier :

```bash
pm2 logs kingshot-vikings-planner-api
curl http://127.0.0.1:4000/api/health
```

Si un deploiement echoue :

- regarde le job GitHub Actions
- regarde `pm2 logs kingshot-vikings-planner-api`
- relance manuellement sur le VPS :

```bash
cd /opt/kingshot-vikings-planner
bash deploy/scripts/deploy.sh
```
