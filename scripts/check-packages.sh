#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./_common.sh
source "$SCRIPT_DIR/_common.sh"

ensure_repo_root
require_pnpm
require_workspace_install

log "Checking shared package type health."
run_cmd pnpm --filter @assembly/shared-types typecheck
run_cmd pnpm --filter @assembly/domain typecheck
run_cmd pnpm --filter @assembly/prompts typecheck

IMPORT_SMOKE_TEST="(async () => { await import('@assembly/shared-types'); await import('@assembly/domain'); await import('@assembly/prompts'); console.log('[assembly] import ok: shared package roots'); })()"

log "Checking shared package export resolution from the webapp consumer context."
run_cmd pnpm --filter webapp exec tsx --eval "$IMPORT_SMOKE_TEST"

log "Checking shared package export resolution from the desktopapp consumer context."
run_cmd pnpm --filter desktopapp exec tsx --eval "$IMPORT_SMOKE_TEST"

log "Shared package checks passed."
