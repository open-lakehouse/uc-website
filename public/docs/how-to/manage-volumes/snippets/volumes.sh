#!/usr/bin/env bash
# Create, inspect, update, and delete external and managed volumes with the uc CLI.
#
# The CLI equivalents of volumes.py. With the docs' local server running, it runs
# every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }
ROOT="${UC_DOCS_ROOT:-/tmp/uc-docs}"

uc catalog delete --name retail --force true || true

uc catalog create --name retail
uc schema create --catalog retail --name files --storage_root "file://$ROOT/managed"

uc volume create --full_name retail.files.landing \
  --volume_type EXTERNAL \
  --storage_location "file://$ROOT/landing" \
  --comment "Order exports dropped by the partner SFTP job"

uc volume create --full_name retail.files.reports --volume_type MANAGED

uc volume list --catalog retail --schema files --output jsonPretty
uc volume get --full_name retail.files.landing --output jsonPretty

uc volume read --full_name retail.files.landing
uc volume read --full_name retail.files.landing --path README.txt

uc volume update --full_name retail.files.landing \
  --new_name partner_landing \
  --comment "Partner order exports, retained 30 days"

uc volume delete --full_name retail.files.partner_landing
uc volume delete --full_name retail.files.reports
