#!/usr/bin/env bash
# Register Parquet, CSV, and JSON files as external tables with the uc CLI, and drop them.
#
# The CLI equivalents of file_formats.py. With the docs' local server running and the
# sample files written, it runs every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }

uc catalog delete --name retail --force true || true
uc catalog create --name retail
uc schema create --catalog retail --name sales

for fmt in parquet csv json; do
  uc table create --full_name "retail.sales.orders_${fmt}" \
    --columns "order_id LONG, customer STRING, amount DOUBLE" \
    --format "$(echo "$fmt" | tr a-z A-Z)" \
    --storage_location "file://${UC_DOCS_ROOT:-/tmp/uc-docs}/orders_${fmt}"
done

uc table get --full_name retail.sales.orders_csv --output jsonPretty

for fmt in parquet csv json; do
  uc table delete --full_name "retail.sales.orders_${fmt}"
done
