---
title: "Iceberg REST Catalog API"
description: "The Apache Iceberg REST Catalog spec, which Unity Catalog implements at /api/2.1/unity-catalog/iceberg."
canonical: https://unitycatalog.io/docs/api/iceberg/
openapi: https://raw.githubusercontent.com/apache/iceberg/apache-iceberg-1.11.0/open-api/rest-catalog-open-api.yaml
---

# Iceberg REST Catalog API

The Apache Iceberg REST Catalog spec, which Unity Catalog implements at /api/2.1/unity-catalog/iceberg.

OpenAPI document: <https://raw.githubusercontent.com/apache/iceberg/apache-iceberg-1.11.0/open-api/rest-catalog-open-api.yaml> ([apache-iceberg-1.11.0](https://github.com/apache/iceberg/blob/apache-iceberg-1.11.0/open-api/rest-catalog-open-api.yaml)).

Paths are relative to `http://localhost:8080/api/2.1/unity-catalog/iceberg`.

## Configuration API

- `GET /v1/config`: List all catalog configuration settings

## OAuth2 API

- `POST /v1/oauth/tokens`: Get a token using an OAuth2 flow (DEPRECATED for REMOVAL)

## Catalog API

- `GET /v1/{prefix}/namespaces`: List namespaces, optionally providing a parent namespace to list underneath
- `POST /v1/{prefix}/namespaces`: Create a namespace
- `GET /v1/{prefix}/namespaces/{namespace}`: Load the metadata properties for a namespace
- `DELETE /v1/{prefix}/namespaces/{namespace}`: Drop a namespace from the catalog. Namespace must be empty.
- `HEAD /v1/{prefix}/namespaces/{namespace}`: Check if a namespace exists
- `POST /v1/{prefix}/namespaces/{namespace}/properties`: Set or remove properties on a namespace
- `GET /v1/{prefix}/namespaces/{namespace}/tables`: List all table identifiers underneath a given namespace
- `POST /v1/{prefix}/namespaces/{namespace}/tables`: Create a table in the given namespace
- `POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/plan`: Submit a scan for planning
- `GET /v1/{prefix}/namespaces/{namespace}/tables/{table}/plan/{plan-id}`: Fetches the result of scan planning for a plan-id
- `DELETE /v1/{prefix}/namespaces/{namespace}/tables/{table}/plan/{plan-id}`: Cancels scan planning for a plan-id
- `POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/tasks`: Fetches result tasks for a plan task
- `POST /v1/{prefix}/namespaces/{namespace}/register`: Register a table in the given namespace using given metadata file location
- `GET /v1/{prefix}/namespaces/{namespace}/tables/{table}`: Load a table from the catalog
- `POST /v1/{prefix}/namespaces/{namespace}/tables/{table}`: Commit updates to a table
- `DELETE /v1/{prefix}/namespaces/{namespace}/tables/{table}`: Drop a table from the catalog
- `HEAD /v1/{prefix}/namespaces/{namespace}/tables/{table}`: Check if a table exists
- `GET /v1/{prefix}/namespaces/{namespace}/tables/{table}/credentials`: Load vended credentials for a table from the catalog
- `POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/sign`: Remotely signs requests to object storage
- `POST /v1/{prefix}/tables/rename`: Rename a table from its current name to a new name
- `POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/metrics`: Send a metrics report to this endpoint to be processed by the backend
- `POST /v1/{prefix}/transactions/commit`: Commit updates to multiple tables in an atomic operation
- `GET /v1/{prefix}/namespaces/{namespace}/views`: List all view identifiers underneath a given namespace
- `POST /v1/{prefix}/namespaces/{namespace}/views`: Create a view in the given namespace
- `GET /v1/{prefix}/namespaces/{namespace}/views/{view}`: Load a view from the catalog
- `POST /v1/{prefix}/namespaces/{namespace}/views/{view}`: Replace a view
- `DELETE /v1/{prefix}/namespaces/{namespace}/views/{view}`: Drop a view from the catalog
- `HEAD /v1/{prefix}/namespaces/{namespace}/views/{view}`: Check if a view exists
- `POST /v1/{prefix}/views/rename`: Rename a view from its current name to a new name
- `POST /v1/{prefix}/namespaces/{namespace}/register-view`: Register a view in the catalog
