#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
RECOMMENDED_NODE_VERSION_FILE="$REPO_ROOT/.node-version"

log() {
  printf '[assembly] %s\n' "$*"
}

fail() {
  printf '[assembly] ERROR: %s\n' "$*" >&2
  exit 1
}

run_cmd() {
  log "Running: $*"
  "$@"
}

ensure_repo_root() {
  cd "$REPO_ROOT"
}

require_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1 || fail "Missing required command: $command_name"
}

require_pnpm() {
  require_command pnpm
}

check_node_version() {
  require_command node

  local current_node_version
  current_node_version=$(node -v | sed 's/^v//')
  log "Detected Node $current_node_version"

  if [[ -f "$RECOMMENDED_NODE_VERSION_FILE" ]]; then
    local recommended_node_version
    local current_major
    local recommended_major

    recommended_node_version=$(tr -d '[:space:]' <"$RECOMMENDED_NODE_VERSION_FILE")
    current_major=${current_node_version%%.*}
    recommended_major=${recommended_node_version%%.*}

    if [[ "$current_major" != "$recommended_major" ]]; then
      fail "Node $current_node_version is not supported. Use Node $recommended_node_version."
    fi

    if [[ "$current_node_version" != "$recommended_node_version" ]]; then
      log "Recommended Node version is $recommended_node_version. Current version is $current_node_version."
    fi
  fi
}

log_pnpm_version() {
  require_pnpm
  log "Detected pnpm $(pnpm --version)"
}

require_workspace_install() {
  [[ -d "$REPO_ROOT/node_modules/.pnpm" ]] || fail "Dependencies are not installed. Run ./scripts/bootstrap.sh first."
}

read_effective_webapp_env_value() {
  local key="$1"
  local files=(
    "$REPO_ROOT/apps/webapp/.env.local"
    "$REPO_ROOT/apps/webapp/.env"
    "$REPO_ROOT/.env.local"
    "$REPO_ROOT/.env"
  )
  local file

  for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
      local line
      line=$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 || true)
      if [[ -n "$line" ]]; then
        local value="${line#*=}"
        value="${value%$'\r'}"
        value="${value#\"}"
        value="${value%\"}"
        value="${value#\'}"
        value="${value%\'}"
        printf '%s' "$value"
        return 0
      fi
    fi
  done

  return 1
}

read_effective_webapp_env_values() {
  local key

  for key in "$@"; do
    local value
    value=$(read_effective_webapp_env_value "$key" || true)
    if [[ -n "$value" ]]; then
      printf '%s=%s' "$key" "$value"
      return 0
    fi
  done

  return 1
}

validate_webapp_env_configuration() {
  local storage_mode
  storage_mode=$(read_effective_webapp_env_value STORAGE_MODE || true)
  storage_mode=${storage_mode:-memory}

  log "Effective webapp STORAGE_MODE=$storage_mode"

  if [[ "$storage_mode" == "db" ]]; then
    if [[ -z "$(read_effective_webapp_env_value DATABASE_URL || true)" ]]; then
      fail "STORAGE_MODE=db requires DATABASE_URL in the repo root env files or apps/webapp overrides."
    fi
    log "DATABASE_URL is configured for DB mode."
  else
    log "DATABASE_URL is optional while STORAGE_MODE is not db."
    log "DB-backed auth and persisted webapp flows remain unavailable unless STORAGE_MODE=db."
  fi

  local kms_entry
  kms_entry=$(read_effective_webapp_env_values ASSEMBLY_KMS_KEY LEDGER_KMS_KEY || true)
  if [[ -n "$kms_entry" ]]; then
    local kms_key_name="${kms_entry%%=*}"
    if [[ "$kms_key_name" == "ASSEMBLY_KMS_KEY" ]]; then
      log "ASSEMBLY_KMS_KEY is configured."
    else
      log "Using legacy LEDGER_KMS_KEY fallback. Prefer ASSEMBLY_KMS_KEY."
    fi
  else
    log "ASSEMBLY_KMS_KEY is not configured. Workspace API key encryption remains unavailable."
  fi

  local github_keys=(
    GITHUB_APP_ID
    GITHUB_CLIENT_ID
    GITHUB_CLIENT_SECRET
    GITHUB_PRIVATE_KEY_PEM
    GITHUB_APP_SLUG
  )
  local configured_github_keys=0
  local missing_configured_github_keys=()
  local key

  for key in "${github_keys[@]}"; do
    if [[ -n "$(read_effective_webapp_env_value "$key" || true)" ]]; then
      configured_github_keys=$((configured_github_keys + 1))
    else
      missing_configured_github_keys+=("$key")
    fi
  done

  if [[ "$configured_github_keys" -eq 0 ]]; then
    log "GitHub integration env is not configured. That integration will remain disabled."
  elif [[ "$configured_github_keys" -ne "${#github_keys[@]}" ]]; then
    fail "GitHub integration env is partially configured. Missing: ${missing_configured_github_keys[*]}"
  else
    log "GitHub integration env is fully configured."
  fi

  if [[ -n "$(read_effective_webapp_env_value OPENAI_API_KEY || true)" ]]; then
    log "OPENAI_API_KEY is configured."
  else
    log "OPENAI_API_KEY is not configured. AI endpoints will remain optional/inactive."
  fi
}

check_webapp_env_files() {
  local failures=0
  local root_envs=(".env" ".env.local")
  local app_envs=("$REPO_ROOT/apps/webapp/.env" "$REPO_ROOT/apps/webapp/.env.local")

  for app_env_path in "${app_envs[@]}"; do
    if [[ -L "$app_env_path" && ! -e "$app_env_path" ]]; then
      printf '[assembly] ERROR: Broken env symlink: %s -> %s\n' "$app_env_path" "$(readlink "$app_env_path")" >&2
      failures=1
    fi
  done

  if [[ -f "$REPO_ROOT/.env" ]]; then
    log "Detected repo-root .env"
  else
    log "No repo-root .env found. Continuing."
  fi

  if [[ -f "$REPO_ROOT/.env.local" ]]; then
    log "Detected repo-root .env.local"
  else
    log "No repo-root .env.local found. Continuing."
  fi

  for env_name in "${root_envs[@]}"; do
    local app_env_path="$REPO_ROOT/apps/webapp/$env_name"
    if [[ -f "$app_env_path" && ! -L "$app_env_path" ]]; then
      log "Detected app-local override: apps/webapp/$env_name"
    fi
  done

  if [[ "$failures" -ne 0 ]]; then
    fail "Fix broken webapp env links before continuing."
  fi

  validate_webapp_env_configuration
}

require_desktop_prereqs() {
  require_pnpm
  require_workspace_install
  require_command cargo
  require_command rustc

  if ! pnpm --filter desktopapp exec tauri --version >/dev/null 2>&1; then
    fail "Tauri CLI is not available through the workspace install. Run ./scripts/bootstrap.sh first."
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && ! xcode-select -p >/dev/null 2>&1; then
    fail "Xcode Command Line Tools are required for Tauri builds on macOS."
  fi
}

report_desktop_prereqs() {
  local has_issue=0

  if command -v cargo >/dev/null 2>&1; then
    log "Detected $(cargo -V)"
  else
    printf '[assembly] WARNING: cargo is not installed. Desktop dev/build commands will fail.\n' >&2
    has_issue=1
  fi

  if command -v rustc >/dev/null 2>&1; then
    log "Detected $(rustc -V)"
  else
    printf '[assembly] WARNING: rustc is not installed. Desktop dev/build commands will fail.\n' >&2
    has_issue=1
  fi

  if [[ -d "$REPO_ROOT/node_modules/.pnpm" ]] && pnpm --filter desktopapp exec tauri --version >/dev/null 2>&1; then
    log "Tauri CLI is available through the workspace install."
  else
    printf '[assembly] WARNING: Tauri CLI is not currently available through the workspace.\n' >&2
    has_issue=1
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && ! xcode-select -p >/dev/null 2>&1; then
    printf '[assembly] WARNING: Xcode Command Line Tools are not configured. Desktop builds will fail on macOS.\n' >&2
    has_issue=1
  fi

  return "$has_issue"
}
