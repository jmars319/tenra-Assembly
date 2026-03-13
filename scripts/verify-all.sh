#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./_common.sh
source "$SCRIPT_DIR/_common.sh"

ensure_repo_root

log "Running full monorepo verification."
run_cmd bash ./scripts/verify-web.sh
run_cmd bash ./scripts/verify-desktop.sh

log "All verification checks passed."
