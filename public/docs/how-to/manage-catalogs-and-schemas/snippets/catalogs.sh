#!/usr/bin/env bash
# Create, inspect, update, and delete a catalog and a schema with the uc CLI.
#
# The CLI equivalents of catalogs.py. With the docs' local server running, it
# runs every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }

uc catalog create --name retail \
  --comment "Order and customer data for the retail team" \
  --properties '{"owner_team": "retail-analytics"}'

uc catalog list --output jsonPretty
uc catalog get --name retail --output jsonPretty

uc catalog update --name retail \
  --comment "Curated retail data" \
  --properties '{"owner_team": "retail-analytics", "tier": "gold"}'

uc schema create --catalog retail --name staging --comment "Raw order extracts"

uc schema list --catalog retail --output jsonPretty
uc schema get --full_name retail.staging --output jsonPretty

uc schema update --full_name retail.staging --new_name sales --comment "Cleaned order data"

uc catalog delete --name retail

uc schema delete --full_name retail.sales
uc catalog delete --name retail

uc catalog delete --name retail --force true
