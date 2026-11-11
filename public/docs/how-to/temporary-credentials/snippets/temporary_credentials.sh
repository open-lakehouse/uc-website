#!/usr/bin/env bash
# Request temporary S3 credentials from the Unity Catalog REST API with curl and jq.
#
# The REST equivalents of temporary_credentials.py. Run that script first: it
# creates the table, volume, and model version these requests name.

UC=http://localhost:8080/api/2.1/unity-catalog

TABLE_ID=$(curl -s "$UC/tables/analytics.ops.trips" | jq -r .table_id)
curl -s -X POST "$UC/temporary-table-credentials" \
  -H 'Content-Type: application/json' \
  -d "{\"table_id\": \"$TABLE_ID\", \"operation\": \"READ\"}"

VOLUME_ID=$(curl -s "$UC/volumes/analytics.ops.files" | jq -r .volume_id)
curl -s -X POST "$UC/temporary-volume-credentials" \
  -H 'Content-Type: application/json' \
  -d "{\"volume_id\": \"$VOLUME_ID\", \"operation\": \"WRITE_VOLUME\"}"

curl -s -X POST "$UC/temporary-model-version-credentials" \
  -H 'Content-Type: application/json' \
  -d '{"catalog_name": "analytics", "schema_name": "ops", "model_name": "churn",
       "version": 1, "operation": "READ_MODEL_VERSION"}'

curl -s -X POST "$UC/temporary-path-credentials" \
  -H 'Content-Type: application/json' \
  -d '{"url": "s3://amzn-s3-demo-bucket/lake/landing", "operation": "PATH_READ_WRITE"}'
