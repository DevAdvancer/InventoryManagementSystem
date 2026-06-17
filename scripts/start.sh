#!/usr/bin/env bash
# =====================================================================
# Inventory & Order Management System — local start script
# ---------------------------------------------------------------------
# A friendly wrapper around docker compose / uvicorn / npm.
#
# Usage:
#   ./scripts/start.sh            # docker compose up --build (default)
#   ./scripts/start.sh up         # same
#   ./scripts/start.sh dev        # uvicorn + npm start (hot reload, no Docker)
#   ./scripts/start.sh down       # stop the docker compose stack
#   ./scripts/start.sh logs       # tail logs
#   ./scripts/start.sh status     # show running services
#   ./scripts/start.sh clean      # stop + remove containers and volumes
#   ./scripts/start.sh help       # show this help
#
# The script:
#   * verifies Docker / docker compose are installed
#   * creates a .env from .env.example if missing
#   * reminds you to point DATABASE_URL at your Railway Postgres
#   * prints a nice status block with the URLs you can open
# =====================================================================

set -euo pipefail

# ---- Resolve project root (one level up from this script) -----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# ---- Pretty colors ---------------------------------------------------
if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_CYAN=$'\033[36m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_CYAN=""; C_GREEN=""; C_YELLOW=""; C_RED=""
fi

# ---- Helpers ---------------------------------------------------------
log()   { printf "%b\n" "$*" >&2; }
info()  { log "${C_CYAN}▸${C_RESET} $*"; }
ok()    { log "${C_GREEN}✓${C_RESET} $*"; }
warn()  { log "${C_YELLOW}!${C_RESET} $*"; }
err()   { log "${C_RED}✗${C_RESET} $*" >&2; }
hr()    { log "${C_DIM}────────────────────────────────────────────────────${C_RESET}"; }
bold()  { log "${C_BOLD}$*${C_RESET}"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Required command not found: $1"
    if [[ "$1" == "docker" || "$1" == "docker-compose" ]]; then
      log "  Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    fi
    exit 1
  fi
}

ensure_env() {
  if [[ ! -f ".env" ]]; then
    warn ".env not found — creating one from .env.example"
    cp .env.example .env
    ok "Created .env (please edit it with your Railway DATABASE_URL)"
  fi
}

wait_for_health() {
  local url="$1"
  local name="$2"
  local tries=30
  info "Waiting for ${name} (${url}) to become healthy…"
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS -o /dev/null -w "" "${url}" 2>/dev/null; then
      ok "${name} is up"
      return 0
    fi
    sleep 1
  done
  warn "${name} did not respond after ${tries}s — check 'docker compose logs ${name,,}'"
  return 1
}

# ---- Detect compose command -----------------------------------------
detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    err "Neither 'docker compose' nor 'docker-compose' is available"
    exit 1
  fi
}

# ---- Subcommands -----------------------------------------------------
cmd_up() {
  hr
  bold "Starting Inventory Management System (docker compose)"
  hr
  require_cmd docker
  detect_compose
  ensure_env

  # Friendly database reminder.
  if grep -q "USER:PASSWORD@HOST" .env 2>/dev/null; then
    warn "DATABASE_URL still has the placeholder value."
    log "  Edit .env and paste your real Railway Postgres URL before continuing."
    log "  See DEPLOYMENT.md for instructions."
  else
    ok "DATABASE_URL looks configured."
  fi

  # Detect leftover placeholder values that would break the frontend build.
  if grep -E '^REACT_APP_API_URL=\S*<.*>\S*$' .env >/dev/null 2>&1; then
    warn "REACT_APP_API_URL still has a placeholder value."
    log "  Either leave it empty (recommended for local dev) or paste the real backend URL."
    log "  Empty = same-origin via the frontend nginx proxy (no CORS, no Network Error)."
    if [[ -t 0 ]]; then
      read -r -p "  Strip the placeholder and continue? [Y/n] " ans
      case "${ans:-Y}" in
        [Yy]*) sed -i.bak -E 's|^REACT_APP_API_URL=.*|REACT_APP_API_URL=|' .env && rm -f .env.bak && ok "REACT_APP_API_URL cleared in .env" ;;
        *)     err "Aborted. Edit .env and re-run."; exit 1 ;;
      esac
    fi
  fi

  "${COMPOSE[@]}" up -d --build

  wait_for_health "http://localhost:${BACKEND_PORT:-8000}/" "Backend"
  wait_for_health "http://localhost:${FRONTEND_PORT:-8080}/" "Frontend" || true

  hr
  bold "URLs"
  hr
  log "  Frontend      ${C_CYAN}http://localhost:${FRONTEND_PORT:-8080}${C_RESET}"
  log "  Backend API   ${C_CYAN}http://localhost:${BACKEND_PORT:-8000}${C_RESET}"
  log "  API docs      ${C_CYAN}http://localhost:${BACKEND_PORT:-8000}/docs${C_RESET}"
  hr
  bold "Tip"
  log "  Run ${C_CYAN}./scripts/start.sh logs${C_RESET} to follow the logs."
  log "  Run ${C_CYAN}./scripts/start.sh down${C_RESET} to stop the stack."
  hr
}

cmd_dev() {
  hr
  bold "Starting dev mode (uvicorn + npm start, hot reload)"
  hr
  require_cmd python3
  require_cmd node
  require_cmd npm

  # Backend
  if [[ ! -d "backend/.venv" ]]; then
    info "Creating backend virtualenv"
    (cd backend && python3 -m venv .venv)
  fi
  info "Installing backend dependencies"
  (cd backend && ./.venv/bin/pip install -q --upgrade pip && ./.venv/bin/pip install -q -r requirements.txt)

  # Frontend
  if [[ ! -d "frontend/node_modules" ]]; then
    info "Installing frontend dependencies"
    (cd frontend && npm install --no-audit --no-fund)
  fi

  # Use direct Postgres connection for local dev when pgbouncer is enabled
  # (pgbouncer on 6543 may not be reachable from localhost).
  if [[ -f "backend/.env" ]]; then
    info "Loading backend/.env"
    set -a; source backend/.env; set +a
  fi

  # Trap Ctrl-C and kill both children cleanly.
  cleanup() {
    log "Stopping dev processes…"
    kill $(jobs -p) 2>/dev/null || true
  }
  trap cleanup INT TERM EXIT

  info "Starting backend  → http://localhost:${BACKEND_PORT:-8000}"
  (cd backend && ./.venv/bin/uvicorn app.main:app --reload --port "${BACKEND_PORT:-8000}") &
  BACKEND_PID=$!

  info "Installing/building frontend"
  export REACT_APP_API_URL="${REACT_APP_API_URL:-http://localhost:${BACKEND_PORT:-8000}}"
  (cd frontend && BROWSER=none PORT="${FRONTEND_PORT:-3000}" npm start) &
  FRONTEND_PID=$!

  wait $BACKEND_PID $FRONTEND_PID
}

cmd_down() {
  hr
  bold "Stopping docker compose stack"
  hr
  require_cmd docker
  detect_compose
  "${COMPOSE[@]}" down
  ok "Stack stopped"
}

cmd_logs() {
  require_cmd docker
  detect_compose
  "${COMPOSE[@]}" logs -f --tail=200
}

cmd_status() {
  require_cmd docker
  detect_compose
  "${COMPOSE[@]}" ps
}

cmd_clean() {
  hr
  bold "Cleaning up (containers + volumes + build cache)"
  hr
  require_cmd docker
  detect_compose
  "${COMPOSE[@]}" down -v --remove-orphans
  ok "Containers and the postgres_data volume removed"
  log "  Note: Railway data lives in the cloud — this only removes local state."
}

cmd_help() {
  # Print the contiguous header comment block (lines starting with #) at
  # the top of this file, stripping the leading # and any leading space.
  awk '/^#!/{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
}

# ---- Entry point -----------------------------------------------------
case "${1:-up}" in
  up)        cmd_up ;;
  dev)       cmd_dev ;;
  down|stop) cmd_down ;;
  logs)      cmd_logs ;;
  status|ps) cmd_status ;;
  clean)     cmd_clean ;;
  help|-h|--help) cmd_help ;;
  *)
    err "Unknown command: $1"
    cmd_help
    exit 1
    ;;
esac