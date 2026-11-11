#!/usr/bin/env bash
# Create a catalog, schema, and table with the uc CLI, write and read rows, then clean up.
#
# With the docs' local server running, it runs every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }

uc catalog list --output jsonPretty
uc schema list --catalog unity --output jsonPretty
uc table list --catalog unity --schema default --output jsonPretty

uc table read --full_name unity.default.numbers --max_results 5

uc catalog create --name quickstart --comment "My first catalog"

uc schema create --catalog quickstart --name sales --comment "Order data"

uc table create --full_name quickstart.sales.orders \
  --columns "order_id INT, customer STRING, amount DOUBLE" \
  --format DELTA \
  --storage_location file:///tmp/uc/orders

uc table write --full_name quickstart.sales.orders

uc table read --full_name quickstart.sales.orders --max_results 5

uc catalog delete --name quickstart --force true
