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

echo "Prod port status:"
print_port_status 8080 "Prod HTTP"
print_port_status 8443 "Prod HTTPS"

echo ""
echo "Prod compose services:"
cd "$ROOT_DIR"
docker compose -f docker-compose.prod.yml ps || true

echo ""
printf '%s' "Prod client https://localhost:8443: "
if curl -kfsS https://localhost:8443 >/dev/null 2>&1; then
  echo "ok"
else
  echo "unreachable"
fi
