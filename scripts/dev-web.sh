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

log "Starting Assembly webapp from repo root."

interrupted=0
cleaning_up=0
child_pid=""

cleanup() {
  if [[ "$cleaning_up" -eq 1 ]]; then
    return
  fi

  cleaning_up=1
  interrupted=1

  if [[ -n "$child_pid" ]] && kill -0 "$child_pid" 2>/dev/null; then
    log "Stopping Assembly webapp."
    kill -INT "$child_pid" 2>/dev/null || true
  fi
}

trap cleanup INT TERM

pnpm --dir "$REPO_ROOT/apps/webapp" exec node ./scripts/run-with-root-env.mjs next dev . --webpack &
child_pid=$!

set +e
wait "$child_pid"
status=$?
set -e

trap - INT TERM

if [[ "$interrupted" -eq 1 ]]; then
  log "Assembly webapp stopped."
  exit 0
fi

if [[ "$status" -eq 130 || "$status" -eq 143 ]]; then
  log "Assembly webapp stopped."
  exit 0
fi

exit "$status"
