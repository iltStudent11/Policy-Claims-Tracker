#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Prod environment is running:"
echo "- HTTP:  http://localhost:8080"
echo "- HTTPS: https://localhost:8443"
