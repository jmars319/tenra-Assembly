#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./_common.sh
source "$SCRIPT_DIR/_common.sh"

ensure_repo_root
require_desktop_prereqs

log "Verifying shared packages required by the desktopapp."
run_cmd pnpm run check:packages

log "Verifying desktopapp TypeScript and frontend build."
run_cmd pnpm --filter desktopapp typecheck
run_cmd pnpm --filter desktopapp build

log "Verifying Tauri + Rust integration with a lightweight debug build."
run_cmd pnpm --filter desktopapp tauri build --debug --no-bundle

log "Desktop verification passed."
