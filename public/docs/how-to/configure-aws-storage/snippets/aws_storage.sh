#!/usr/bin/env bash
# Register an S3 storage credential and external location with the uc CLI, and check vending.
#
# The CLI equivalents of aws_storage.py. With the docs' local server running, it runs
# every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }
UC=http://localhost:8080/api/2.1/unity-catalog

uc external_location delete --name lake --force true || true
uc credential delete --name lake_storage --force true || true

uc credential create --name lake_storage \
  --aws_iam_role_arn arn:aws:iam::123456789012:role/uc-storage-lake \
  --comment "Read/write on s3://amzn-s3-demo-bucket/lake" \
  --output jsonPretty

uc external_location create --name lake \
  --url s3://amzn-s3-demo-bucket/lake \
  --credential_name lake_storage \
  --output jsonPretty

curl -s -X POST "$UC/temporary-path-credentials" \
  -H 'Content-Type: application/json' \
  -d '{"url": "s3://amzn-s3-demo-bucket/lake/landing", "operation": "PATH_READ"}'

uc credential get --name lake_storage --output jsonPretty
uc external_location list --output jsonPretty

uc credential update --name lake_storage \
  --aws_iam_role_arn arn:aws:iam::123456789012:role/uc-storage-lake-v2 \
  --output jsonPretty

uc external_location update --name lake \
  --comment "Landing and curated data" \
  --output jsonPretty

uc external_location delete --name lake
uc credential delete --name lake_storage
