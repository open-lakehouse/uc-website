#!/usr/bin/env bash
# Register an existing Delta table in Unity Catalog with the uc CLI, read it back, and drop it.
#
# The CLI equivalents of external_table.py. With the docs' local server running, it runs
# every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }

uc catalog delete --name retail --force true || true
uc catalog create --name retail
uc schema create --catalog retail --name sales

uc table create --full_name retail.sales.orders \
  --columns "order_id LONG, customer STRING, amount DOUBLE" \
  --format DELTA \
  --storage_location "file://${UC_DOCS_ROOT:-/tmp/uc-docs}/orders"

uc table get --full_name retail.sales.orders --output jsonPretty
uc table list --catalog retail --schema sales --output jsonPretty

uc table read --full_name retail.sales.orders --max_results 10

uc table delete --full_name retail.sales.orders
