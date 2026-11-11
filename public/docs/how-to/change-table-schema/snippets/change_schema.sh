#!/usr/bin/env bash
# Show what Unity Catalog records for a table after a schema change, with the uc CLI.
#
# With the docs' local server running and warehouse.sales.orders changed as on
# the page, it prints the table's columns, comment, and properties.

uc() { docker exec unitycatalog bin/uc "$@"; }

uc table get --full_name warehouse.sales.orders --output jsonPretty
