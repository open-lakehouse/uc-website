---
title: "UC Delta API"
description: "The Delta-native REST catalog for Delta clients: configuration, tables and commits, and temporary credentials."
canonical: https://unitycatalog.io/docs/api/delta/
openapi: https://raw.githubusercontent.com/unitycatalog/unitycatalog/v0.7.0/api/delta.yaml
---

# UC Delta API

The Delta-native REST catalog for Delta clients: configuration, tables and commits, and temporary credentials.

OpenAPI document: <https://raw.githubusercontent.com/unitycatalog/unitycatalog/v0.7.0/api/delta.yaml> ([v0.7.0](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/api/delta.yaml)).

Paths are relative to `http://localhost:8080/api/2.1/unity-catalog`.

## DeltaConfiguration

- `GET /delta/v1/config`: Get catalog configuration

## DeltaTables

- `POST /delta/v1/catalogs/{catalog}/schemas/{schema}/staging-tables`: Create a staging table
- `POST /delta/v1/catalogs/{catalog}/schemas/{schema}/tables`: Create a table
- `GET /delta/v1/catalogs/{catalog}/schemas/{schema}/tables/{table}`: Load table metadata
- `POST /delta/v1/catalogs/{catalog}/schemas/{schema}/tables/{table}`: Update table
- `DELETE /delta/v1/catalogs/{catalog}/schemas/{schema}/tables/{table}`: Delete a table
- `HEAD /delta/v1/catalogs/{catalog}/schemas/{schema}/tables/{table}`: Check if table exists
- `POST /delta/v1/catalogs/{catalog}/schemas/{schema}/tables/{table}/metrics`: Report commit metrics
- `POST /delta/v1/catalogs/{catalog}/schemas/{schema}/tables/{table}/rename`: Rename a table

## DeltaTemporaryCredentials

- `GET /delta/v1/catalogs/{catalog}/schemas/{schema}/tables/{table}/credentials`: Get table credentials
- `GET /delta/v1/staging-tables/{table_id}/credentials`: Get staging table credentials by UUID
- `GET /delta/v1/temporary-path-credentials`: Get temporary path credentials
