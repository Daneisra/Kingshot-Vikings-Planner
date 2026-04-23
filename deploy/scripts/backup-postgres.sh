#!/usr/bin/env bash

set -euo pipefail
trap 'printf "[backup] ERROR: command failed at line %s: %s\n" "$LINENO" "$BASH_COMMAND" >&2' ERR

BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/etc/kingshot-vikings-planner/backend.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/kingshot-vikings-planner}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATE_STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"

log() {
  printf '[backup] %s\n' "$*"
}

fail() {
  printf '[backup] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command not found: $1"
  fi
}

load_database_url() {
  if [ ! -f "$BACKEND_ENV_FILE" ]; then
    fail "Missing backend env file: $BACKEND_ENV_FILE"
  fi

  set -a
  # shellcheck disable=SC1090
  . "$BACKEND_ENV_FILE"
  set +a

  if [ -z "${DATABASE_URL:-}" ]; then
    fail "DATABASE_URL is not defined in $BACKEND_ENV_FILE"
  fi
}

main() {
  require_command pg_dump
  require_command gzip
  require_command find

  load_database_url
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"

  local backup_file="$BACKUP_DIR/kingshot_vikings_${DATE_STAMP}.sql.gz"

  log "Writing PostgreSQL backup to $backup_file"
  pg_dump --no-owner --no-acl "$DATABASE_URL" | gzip -9 > "$backup_file"
  chmod 600 "$backup_file"

  log "Removing backups older than $RETENTION_DAYS days from $BACKUP_DIR"
  find "$BACKUP_DIR" -type f -name "kingshot_vikings_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

  log "Backup completed successfully"
}

main "$@"
