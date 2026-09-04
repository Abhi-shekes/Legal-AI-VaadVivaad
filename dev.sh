#!/usr/bin/env bash
# Start the stack with hot reload. Source is mounted; edits reload themselves.
#
#   ./dev.sh          start (and rebuild the dev image if package.json changed)
#   ./dev.sh logs     follow both app services
#   ./dev.sh down     stop, leaving mongo/qdrant/redis data intact
#   ./dev.sh prod     switch back to the production stack on :8081
#
# BuildKit is off because resolving `# syntax=docker/dockerfile:1` needs
# registry access, and IPv6 to Docker Hub is unreachable on this host. The
# Dockerfiles use no BuildKit-only features, so the classic builder is fine.
set -euo pipefail
cd "$(dirname "$0")"

DEV=(-f docker-compose.yml -f docker-compose.dev.yml)
export DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0

case "${1:-up}" in
  up)
    docker compose "${DEV[@]}" build frontend
    docker compose "${DEV[@]}" up -d
    echo
    echo "  app  http://localhost:${DEV_FRONTEND_PORT:-5173}   (hot reload)"
    echo "  api  http://localhost:${BACKEND_PORT:-8000}        (auto reload)"
    ;;
  logs) docker compose "${DEV[@]}" logs -f backend frontend ;;
  down) docker compose "${DEV[@]}" down ;;
  prod)
    docker compose "${DEV[@]}" down
    docker compose build backend frontend
    docker compose up -d
    echo "  app  http://localhost:${FRONTEND_PORT:-8081}"
    ;;
  *) echo "usage: ./dev.sh [up|logs|down|prod]"; exit 1 ;;
esac
