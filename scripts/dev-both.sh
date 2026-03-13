#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./_common.sh
source "$SCRIPT_DIR/_common.sh"

ensure_repo_root
require_pnpm
require_workspace_install
check_node_version
check_webapp_env_files
require_desktop_prereqs

log "Starting webapp and desktopapp together."
log "concurrently will terminate the other process if either command fails."

interrupted=0
cleaning_up=0
concurrently_pid=""

cleanup() {
  if [[ "$cleaning_up" -eq 1 ]]; then
    return
  fi

  cleaning_up=1
  interrupted=1

  if [[ -n "$concurrently_pid" ]] && kill -0 "$concurrently_pid" 2>/dev/null; then
    log "Stopping webapp and desktopapp."
    kill -INT "$concurrently_pid" 2>/dev/null || true
  fi
}

trap cleanup INT TERM

pnpm exec concurrently \
  --names web,desktop \
  --prefix '[{name}]' \
  --prefix-colors blue,magenta \
  --kill-others-on-fail \
  "pnpm --dir apps/webapp exec node ./scripts/run-with-root-env.mjs next dev . --webpack" \
  "pnpm --dir apps/desktopapp exec tauri dev" &
concurrently_pid=$!

set +e
wait "$concurrently_pid"
status=$?
set -e

trap - INT TERM

if [[ "$interrupted" -eq 1 ]]; then
  log "Development processes stopped."
  exit 0
fi

if [[ "$status" -eq 130 || "$status" -eq 143 ]]; then
  log "Development processes stopped."
  exit 0
fi

exit "$status"
