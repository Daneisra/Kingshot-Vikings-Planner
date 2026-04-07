#!/usr/bin/env bash

set -euo pipefail
trap 'printf "[deploy] ERROR: command failed at line %s: %s\n" "$LINENO" "$BASH_COMMAND" >&2' ERR

APP_DIR="${APP_DIR:-/opt/kingshot-vikings-planner}"
FRONTEND_DIR="${FRONTEND_DIR:-/var/www/kingshot-vikings-planner}"
PM2_APP_NAME="${PM2_APP_NAME:-kingshot-vikings-planner-api}"
BRANCH="${BRANCH:-main}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/etc/kingshot-vikings-planner/backend.env}"
FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-/etc/kingshot-vikings-planner/frontend.env}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:4000/api/health}"
STATE_DIR="${STATE_DIR:-$APP_DIR/.deploy-state}"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command not found: $1"
  fi
}

link_backend_env() {
  local target="$APP_DIR/backend/.env"

  if [ ! -f "$BACKEND_ENV_FILE" ]; then
    fail "Missing backend env file: $BACKEND_ENV_FILE"
  fi

  if [ -e "$target" ] && [ ! -L "$target" ]; then
    fail "Refusing to overwrite non-symlink backend env file at $target"
  fi

  ln -sfn "$BACKEND_ENV_FILE" "$target"
}

compute_dep_hash() {
  shift
  cat "$@" | sha256sum | awk '{ print $1 }'
}

install_dependencies_if_needed() {
  local dir="$1"
  local state_key="$2"
  local state_file="$STATE_DIR/$state_key.hash"
  local package_files=("$dir/package.json")
  local next_hash current_hash=""

  if [ -f "$dir/package-lock.json" ]; then
    package_files+=("$dir/package-lock.json")
  fi

  if [ -f "$dir/npm-shrinkwrap.json" ]; then
    package_files+=("$dir/npm-shrinkwrap.json")
  fi

  next_hash="$(compute_dep_hash "$dir" "${package_files[@]}")"

  if [ -f "$state_file" ]; then
    current_hash="$(cat "$state_file")"
  fi

  if [ ! -d "$dir/node_modules" ] || [ "$current_hash" != "$next_hash" ]; then
    log "Installing dependencies in $dir"
    (
      cd "$dir"

      if [ -f package-lock.json ]; then
        npm ci
      else
        npm install
      fi
    )

    printf '%s' "$next_hash" > "$state_file"
  else
    log "Dependencies unchanged in $dir, skipping install"
  fi
}

load_frontend_env() {
  if [ -f "$FRONTEND_ENV_FILE" ]; then
    log "Loading frontend env from $FRONTEND_ENV_FILE"
    set -a
    # shellcheck disable=SC1090
    . "$FRONTEND_ENV_FILE"
    set +a
  fi

  export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"
}

restart_pm2() {
  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_APP_NAME" --update-env
  else
    pm2 start "$APP_DIR/ecosystem.config.js" --only "$PM2_APP_NAME" --env production
  fi

  pm2 save
}

main() {
  require_command git
  require_command npm
  require_command pm2
  require_command curl
  require_command rsync
  require_command sha256sum

  [ -d "$APP_DIR/.git" ] || fail "Git repository not found in $APP_DIR"

  cd "$APP_DIR"

  log "Fetching latest code from origin/$BRANCH"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  git clean -fd

  mkdir -p "$STATE_DIR"

  link_backend_env
  install_dependencies_if_needed "$APP_DIR/backend" "backend-deps"
  install_dependencies_if_needed "$APP_DIR/frontend" "frontend-deps"

  log "Building backend"
  (
    cd "$APP_DIR/backend"
    npm run build
  )

  load_frontend_env

  log "Building frontend"
  (
    cd "$APP_DIR/frontend"
    npm run build
  )

  log "Syncing frontend build to $FRONTEND_DIR"
  mkdir -p "$FRONTEND_DIR"
  rsync -a --delete "$APP_DIR/frontend/dist/" "$FRONTEND_DIR/"

  log "Restarting PM2 app $PM2_APP_NAME"
  restart_pm2

  log "Running API health check"
  for i in {1..15}; do
    if curl --fail --silent --show-error "$HEALTHCHECK_URL" >/dev/null; then
      log "API health check passed"
      break
    fi

    if [ "$i" -eq 15 ]; then
      fail "API health check failed after multiple attempts"
    fi

    log "API not ready yet, retrying in 2 seconds... ($i/15)"
    sleep 2
  done

  log "Deployment completed successfully"
}

main "$@"
