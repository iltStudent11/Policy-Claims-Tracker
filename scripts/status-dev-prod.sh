#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_port_status() {
  local port="$1"
  local label="$2"

  if ss -ltn "( sport = :$port )" | grep -q ":$port"; then
    echo "- $label (:${port}): listening"
  else
    echo "- $label (:${port}): not listening"
  fi
}

echo "Port status:"
print_port_status 5173 "Dev frontend"
print_port_status 5000 "Dev API"
print_port_status 27018 "Dev Mongo"
print_port_status 8080 "Prod HTTP"
print_port_status 8443 "Prod HTTPS"

echo ""
echo "Container status (dev/prod mongo + prod stack):"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | sed -n '1p;/^pct-/p'

echo ""
echo "Prod compose services:"
cd "$ROOT_DIR"
docker compose -f docker-compose.prod.yml ps || true

echo ""
echo "Health checks:"
printf '%s' "- Dev API /api/health: "
if curl -fsS http://localhost:5000/api/health >/dev/null 2>&1; then
  echo "ok"
else
  echo "unreachable"
fi

printf '%s' "- Prod client https://localhost:8443: "
if curl -kfsS https://localhost:8443 >/dev/null 2>&1; then
  echo "ok"
else
  echo "unreachable"
fi
