#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/capstone-api"
CLIENT_DIR="$ROOT_DIR/capstone-client"

DEV_API_PID_FILE="/tmp/pct-dev-api.pid"
DEV_CLIENT_PID_FILE="/tmp/pct-dev-client.pid"
DEV_API_LOG="/tmp/pct-dev-api.out"
DEV_CLIENT_LOG="/tmp/pct-dev-client.out"

ensure_container_running() {
  local name="$1"
  local image="$2"
  shift 2
  local run_args=("$@")

  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    if ! docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
      docker start "$name" >/dev/null
    fi
  else
    docker run -d --name "$name" "${run_args[@]}" "$image" >/dev/null
  fi
}

start_background_npm() {
  local project_dir="$1"
  local pid_file="$2"
  local log_file="$3"
  shift 3
  local command=("$@")

  if [[ -f "$pid_file" ]]; then
    local existing_pid
    existing_pid="$(cat "$pid_file" || true)"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
      return
    fi
    rm -f "$pid_file"
  fi

  (
    cd "$project_dir"
    nohup "${command[@]}" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )
}

echo "[1/3] Ensuring dedicated dev Mongo is running on host port 27018..."
ensure_container_running "pct-dev-mongo" "mongo:7" -p 27018:27017

echo "[2/3] Starting dev API on :5000 (Mongo: 127.0.0.1:27018)..."
start_background_npm "$API_DIR" "$DEV_API_PID_FILE" "$DEV_API_LOG" env MONGODB_URI=mongodb://127.0.0.1:27018/policy-claims npm run dev

echo "[3/3] Starting dev frontend on :5173..."
start_background_npm "$CLIENT_DIR" "$DEV_CLIENT_PID_FILE" "$DEV_CLIENT_LOG" npm run dev -- --host 127.0.0.1 --port 5173

echo ""
echo "Dev environment is running:"
echo "- Frontend: http://localhost:5173"
echo "- API:      http://localhost:5000"
echo "- Mongo:    mongodb://127.0.0.1:27018"
