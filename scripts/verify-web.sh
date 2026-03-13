#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./_common.sh
source "$SCRIPT_DIR/_common.sh"

ensure_repo_root
require_pnpm
require_workspace_install
check_webapp_env_files

log "Verifying shared packages required by the webapp."
run_cmd pnpm run check:packages

log "Verifying webapp Prisma integration."
run_cmd pnpm --filter webapp prisma:generate
run_cmd pnpm --filter webapp prisma:validate

log "Verifying webapp TypeScript and build."
run_cmd pnpm --filter webapp typecheck
run_cmd pnpm --filter webapp build

log "Web verification passed."
