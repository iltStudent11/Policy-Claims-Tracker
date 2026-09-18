#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEV_API_PID_FILE="/tmp/pct-dev-api.pid"
DEV_CLIENT_PID_FILE="/tmp/pct-dev-client.pid"

stop_pid_file() {
  local pid_file="$1"

  if [[ ! -f "$pid_file" ]]; then
    return
  fi

  local pid
  pid="$(cat "$pid_file" || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi

  rm -f "$pid_file"
}

get_listening_pids() {
  local port="$1"
  ss -ltnp "( sport = :$port )" 2>/dev/null |
    grep -o 'pid=[0-9]*' |
    cut -d= -f2 |
    sort -u
}

safe_stop_port_listener() {
  local port="$1"
  local label="$2"
  local found_any="false"

  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    found_any="true"

    if [[ ! -r "/proc/$pid/cmdline" ]]; then
      continue
    fi

    local cmdline
    cmdline="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
    if [[ -z "$cmdline" ]]; then
      continue
    fi

    if [[ "$cmdline" == *"$ROOT_DIR"* ]]; then
      kill "$pid" 2>/dev/null || true
      echo "- Stopped $label listener on :$port (pid $pid)."
    else
      echo "- Skipped non-repo process on :$port (pid $pid)."
    fi
  done < <(get_listening_pids "$port")

  if [[ "$found_any" == "false" ]]; then
    echo "- No listener found on :$port."
  fi
}

echo "[1/3] Stopping dev API/frontend background processes..."
stop_pid_file "$DEV_API_PID_FILE"
stop_pid_file "$DEV_CLIENT_PID_FILE"

echo "[2/3] Stopping any unmanaged dev listeners on :5000/:5173..."
safe_stop_port_listener 5000 "Dev API"
safe_stop_port_listener 5173 "Dev frontend"

echo "[3/3] Stopping dedicated dev Mongo container..."
if docker ps -a --format '{{.Names}}' | grep -q '^pct-dev-mongo$'; then
  docker rm -f pct-dev-mongo >/dev/null || true
fi

echo "Dev environment stopped."
