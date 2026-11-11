#!/usr/bin/env bash
# Run the local server on PostgreSQL and check that its metadata survives.
#
# Run it from uc-docs-env/uc-aws: it starts that environment of the docs' local
# server, whose metadata is in PostgreSQL, then runs every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }

docker compose up -d --wait

uc catalog create --name persisted --comment "Survives a new server container"

docker compose up -d --wait --force-recreate unitycatalog
uc catalog get --name persisted --output jsonPretty

docker compose exec db \
  psql -U postgres -d unitycatalog -c 'SELECT name, comment FROM uc_catalogs'

docker compose exec db \
  pg_dump -U postgres unitycatalog > uc-metadata.sql

docker compose down -v
