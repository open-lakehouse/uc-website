#!/usr/bin/env bash
# Give a catalog and a schema S3 storage roots with the uc CLI and see where managed data lands.
#
# The CLI equivalents of managed_storage.py. With the docs' local server running, it runs
# every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }

uc catalog delete --name sales --force true || true
uc external_location delete --name lake --force true || true
uc credential delete --name lake_storage --force true || true

uc credential create --name lake_storage \
  --aws_iam_role_arn arn:aws:iam::123456789012:role/uc-storage-lake
uc external_location create --name lake \
  --url s3://amzn-s3-demo-bucket/lake --credential_name lake_storage

uc catalog create --name sales \
  --storage_root s3://amzn-s3-demo-bucket/lake/sales \
  --output jsonPretty

uc schema create --catalog sales --name raw
uc schema create --catalog sales --name curated \
  --storage_root s3://amzn-s3-demo-bucket/lake/curated \
  --output jsonPretty

uc volume create --full_name sales.raw.drops --volume_type MANAGED --output jsonPretty
uc volume create --full_name sales.curated.reports --volume_type MANAGED --output jsonPretty

uc volume create --full_name sales.raw.sneaky --volume_type EXTERNAL \
  --storage_location s3://amzn-s3-demo-bucket/lake/sales/__unitystorage/sneaky

uc catalog delete --name sales --force true
