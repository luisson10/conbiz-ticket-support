#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  for candidate in DATABASE_PRIVATE_URL DATABASE_PUBLIC_URL POSTGRES_PRISMA_URL POSTGRES_URL; do
    value="${!candidate:-}"
    if [ -n "$value" ]; then
      export DATABASE_URL="$value"
      break
    fi
  done
fi

if [ -z "${DATABASE_URL:-}" ] && [ -n "${PGHOST:-}" ] && [ -n "${PGUSER:-}" ] && [ -n "${PGPASSWORD:-}" ] && [ -n "${PGDATABASE:-}" ]; then
  export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE}?sslmode=${PGSSLMODE:-require}"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Pre-deploy migration skipped: no database URL resolved."
  echo "Set one of DATABASE_URL / DATABASE_PRIVATE_URL / POSTGRES_URL or PGHOST+PGUSER+PGPASSWORD+PGDATABASE."
  exit 1
fi

echo "Running Prisma migrations with resolved DATABASE_URL..."
npx prisma migrate deploy
