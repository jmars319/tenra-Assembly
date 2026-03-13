#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./_common.sh
source "$SCRIPT_DIR/_common.sh"

ensure_repo_root
require_pnpm
check_node_version
log_pnpm_version

run_cmd pnpm install
run_cmd bash ./scripts/check-env-links.sh

if report_desktop_prereqs; then
  log "Desktop prerequisites look ready."
else
  log "Desktop prerequisites are incomplete. Web-only work can continue, but desktop commands will fail until the warnings are addressed."
fi

log "Bootstrap complete."
log "Next steps:"
log "  pnpm run dev:web"
log "  pnpm run dev:desktop"
log "  pnpm run dev:both"
log "  pnpm run verify:all"
