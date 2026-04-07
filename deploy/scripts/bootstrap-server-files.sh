#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/kingshot-vikings-planner}"
SERVER_CONFIG_DIR="${SERVER_CONFIG_DIR:-/etc/kingshot-vikings-planner}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-$SERVER_CONFIG_DIR/backend.env}"
FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-$SERVER_CONFIG_DIR/frontend.env}"

log() {
  printf '[bootstrap] %s\n' "$*"
}

fail() {
  printf '[bootstrap] ERROR: %s\n' "$*" >&2
  exit 1
}

[ -d "$APP_DIR" ] || fail "Application directory not found: $APP_DIR"

sudo mkdir -p "$SERVER_CONFIG_DIR"

if [ ! -f "$BACKEND_ENV_FILE" ]; then
  sudo cp "$APP_DIR/backend/.env.example" "$BACKEND_ENV_FILE"
  log "Created $BACKEND_ENV_FILE from backend/.env.example"
fi

if [ ! -f "$FRONTEND_ENV_FILE" ]; then
  sudo cp "$APP_DIR/frontend/.env.production.example" "$FRONTEND_ENV_FILE"
  log "Created $FRONTEND_ENV_FILE from frontend/.env.production.example"
fi

sudo chown "$USER:$USER" "$BACKEND_ENV_FILE" "$FRONTEND_ENV_FILE"
ln -sfn "$BACKEND_ENV_FILE" "$APP_DIR/backend/.env"

log "Backend env symlinked to $APP_DIR/backend/.env"
log "Edit server files now:"
log "  $BACKEND_ENV_FILE"
log "  $FRONTEND_ENV_FILE"
