#!/usr/bin/env bash
set -Eeuo pipefail

readonly RELEASE_ID="${1:?Usage: remote-deploy.sh <release-id> [app-root]}"
readonly APP_ROOT="${2:-/var/www/sapling}"
readonly RELEASES_DIR="${APP_ROOT}/releases"
readonly RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
readonly CURRENT_LINK="${APP_ROOT}/current"
readonly SHARED_DIR="${APP_ROOT}/shared"
readonly SHARED_BACKEND_ENV="${SHARED_DIR}/backend/.env"
readonly SHARED_FRONTEND_ENV="${SHARED_DIR}/frontend/.env"
readonly SHARED_LOG_DIR="${SHARED_DIR}/log"
readonly KEEP_RELEASES="${KEEP_RELEASES:-5}"
readonly BACKEND_PORT="${BACKEND_PORT:-3000}"
PREVIOUS_CURRENT_TARGET=""
CURRENT_SWITCHED=0

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

on_error() {
  local line="$1"
  local code="$2"
  if (( CURRENT_SWITCHED == 1 )) && [[ -n "$PREVIOUS_CURRENT_TARGET" ]]; then
    log "Rolling back current symlink to ${PREVIOUS_CURRENT_TARGET}"
    ln -sfn "$PREVIOUS_CURRENT_TARGET" "$CURRENT_LINK"
    pm2 startOrReload "$CURRENT_LINK/deploy/ecosystem.config.cjs" --env production || true
    pm2 save || true
  fi
  log "ERROR: deployment failed at line ${line} with exit code ${code}."
}
trap 'on_error "$LINENO" "$?"' ERR

run_in_release() {
  (
    cd "$RELEASE_DIR"
    "$@"
  )
}

reload_nginx() {
  if command -v sudo >/dev/null 2>&1; then
    sudo nginx -t
    sudo systemctl reload nginx
  else
    nginx -t
    systemctl reload nginx
  fi
}

link_shared_env() {
  log "Linking shared environment files and log directory"
  mkdir -p "$RELEASE_DIR/backend" "$RELEASE_DIR/frontend" "$SHARED_LOG_DIR"

  if [[ ! -f "$SHARED_BACKEND_ENV" ]]; then
    log "Missing backend env file: $SHARED_BACKEND_ENV"
    exit 1
  fi
  if [[ ! -f "$SHARED_FRONTEND_ENV" ]]; then
    log "Missing frontend env file: $SHARED_FRONTEND_ENV"
    exit 1
  fi

  ln -sfn "$SHARED_BACKEND_ENV" "$RELEASE_DIR/backend/.env"
  ln -sfn "$SHARED_FRONTEND_ENV" "$RELEASE_DIR/frontend/.env"
  ln -sfn "$SHARED_LOG_DIR" "$RELEASE_DIR/log"
}

cleanup_old_releases() {
  log "Cleaning up old releases (keeping ${KEEP_RELEASES})"

  mapfile -t releases < <(
    find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort -r
  )

  if (( ${#releases[@]} <= KEEP_RELEASES )); then
    return
  fi

  local idx
  for (( idx=KEEP_RELEASES; idx<${#releases[@]}; idx++ )); do
    local old_release="${RELEASES_DIR}/${releases[$idx]}"
    if [[ "$old_release" == "$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)" ]]; then
      continue
    fi
    rm -rf "$old_release"
  done
}

log "Starting release deployment for ${RELEASE_ID}"

if [[ ! -d "$RELEASE_DIR" ]]; then
  log "Release directory not found: $RELEASE_DIR"
  exit 1
fi

mkdir -p "$RELEASES_DIR" "$SHARED_DIR/backend" "$SHARED_DIR/frontend" "$SHARED_LOG_DIR"

link_shared_env

log "Installing dependencies"
run_in_release npm ci
run_in_release npm ci --prefix backend
run_in_release npm ci --prefix frontend

log "Building application"
run_in_release npm run build

log "Running database deployment (migrations + seed)"
run_in_release npm run orm:deploy --prefix backend

log "Activating release ${RELEASE_ID}"
PREVIOUS_CURRENT_TARGET="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
CURRENT_SWITCHED=1

log "Reloading backend via PM2"
pm2 startOrReload "$CURRENT_LINK/deploy/ecosystem.config.cjs" --env production
pm2 save

log "Reloading Nginx"
reload_nginx

log "Running backend healthcheck"
curl --fail --silent --show-error --location --max-time 10 --retry 5 --retry-delay 2 --retry-connrefused \
  "http://127.0.0.1:${BACKEND_PORT}/api" || {
  log "Backend healthcheck failed on /api"
  exit 1
}

cleanup_old_releases

CURRENT_SWITCHED=0
log "Deployment finished successfully for ${RELEASE_ID}"
