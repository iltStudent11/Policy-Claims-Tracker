#!/usr/bin/env bash
set -euo pipefail

DEV_API_PID_FILE="/tmp/pct-dev-api.pid"
DEV_CLIENT_PID_FILE="/tmp/pct-dev-client.pid"

print_port_status() {
  local port="$1"
  local label="$2"
  local pid_file="${3:-}"

  if ss -ltn "( sport = :$port )" | grep -q ":$port"; then
    if [[ -n "$pid_file" ]]; then
      if [[ -f "$pid_file" ]] && [[ -n "$(cat "$pid_file" 2>/dev/null || true)" ]] && kill -0 "$(cat "$pid_file" 2>/dev/null || true)" 2>/dev/null; then
        echo "- $label (:${port}): listening (managed)"
      else
        echo "- $label (:${port}): listening (unmanaged process detected)"
      fi
    else
      echo "- $label (:${port}): listening"
    fi
  else
    echo "- $label (:${port}): not listening"
  fi
}

echo "Dev port status:"
print_port_status 5173 "Dev frontend" "$DEV_CLIENT_PID_FILE"
print_port_status 5000 "Dev API" "$DEV_API_PID_FILE"
print_port_status 27018 "Dev Mongo"

echo ""
echo "Dev container status:"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | sed -n '1p;/pct-dev-mongo/p'

echo ""
printf '%s' "Dev API /api/health: "
if curl -fsS http://localhost:5000/api/health >/dev/null 2>&1; then
  echo "ok"
else
  echo "unreachable"
fi
