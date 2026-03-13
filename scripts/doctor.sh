#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./_common.sh
source "$SCRIPT_DIR/_common.sh"

ensure_repo_root

log "Running Assembly monorepo doctor."
run_cmd pnpm run check:env
run_cmd pnpm run lint
run_cmd pnpm run typecheck
run_cmd pnpm run verify:web
run_cmd pnpm run verify:desktop

log "Doctor passed. The monorepo is in a healthy state."
