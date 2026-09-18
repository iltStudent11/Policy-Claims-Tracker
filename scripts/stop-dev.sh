#!/usr/bin/env bash
set -euo pipefail

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

echo "[1/2] Stopping dev API/frontend background processes..."
stop_pid_file "$DEV_API_PID_FILE"
stop_pid_file "$DEV_CLIENT_PID_FILE"

echo "[2/2] Stopping dedicated dev Mongo container..."
if docker ps -a --format '{{.Names}}' | grep -q '^pct-dev-mongo$'; then
  docker rm -f pct-dev-mongo >/dev/null || true
fi

echo "Dev environment stopped."
