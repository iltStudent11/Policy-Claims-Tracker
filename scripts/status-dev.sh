#!/usr/bin/env bash
set -euo pipefail

print_port_status() {
  local port="$1"
  local label="$2"

  if ss -ltn "( sport = :$port )" | grep -q ":$port"; then
    echo "- $label (:${port}): listening"
  else
    echo "- $label (:${port}): not listening"
  fi
}

echo "Dev port status:"
print_port_status 5173 "Dev frontend"
print_port_status 5000 "Dev API"
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
