#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./_common.sh
source "$SCRIPT_DIR/_common.sh"

ensure_repo_root
check_node_version
check_webapp_env_files

log "Canonical env location: repo root (.env / .env.local)."
log "apps/webapp scripts load repo-root env files explicitly."
log "desktopapp currently has no app-level env requirement beyond toolchain prerequisites."
log "Env file check passed."
