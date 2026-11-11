---
title: "Unity Catalog REST API"
description: "Catalogs, schemas, tables, volumes, functions, registered models, temporary credentials, and permissions."
canonical: https://unitycatalog.io/docs/api/catalog/
openapi: https://raw.githubusercontent.com/unitycatalog/unitycatalog/v0.7.0/api/all.yaml
---

# Unity Catalog REST API

Catalogs, schemas, tables, volumes, functions, registered models, temporary credentials, and permissions.

OpenAPI document: <https://raw.githubusercontent.com/unitycatalog/unitycatalog/v0.7.0/api/all.yaml> ([v0.7.0](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/api/all.yaml)).

Paths are relative to `http://localhost:8080/api/2.1/unity-catalog`.

## Catalogs

- `GET /catalogs`: List catalogs
- `POST /catalogs`: Create a catalog
- `GET /catalogs/{name}`: Get a catalog
- `PATCH /catalogs/{name}`: Update a catalog
- `DELETE /catalogs/{name}`: Delete a catalog

## Schemas

- `GET /schemas`: List schemas
- `POST /schemas`: Create a schema
- `GET /schemas/{full_name}`: Get a schema
- `PATCH /schemas/{full_name}`: Update a schema
- `DELETE /schemas/{full_name}`: Delete a schema

## Tables

- `POST /staging-tables`: Create a staging table
- `GET /tables`: List tables
- `POST /tables`: Create a table. Only external table creation is supported.
WARNING: This API is experimental and will change in future versions.
- `GET /tables/{full_name}`: Get a table
- `DELETE /tables/{full_name}`: Delete a table

## Volumes

- `GET /volumes`: List Volumes
- `POST /volumes`: Create a Volume
- `GET /volumes/{name}`: Get a Volume
- `PATCH /volumes/{name}`: Update a Volume
- `DELETE /volumes/{name}`: Delete a Volume

## Functions

- `GET /functions`: List functions
- `POST /functions`: Create a function.
WARNING: This API is experimental and will change in future versions.
- `GET /functions/{name}`: Get a function
- `DELETE /functions/{name}`: Delete a function

## RegisteredModels

- `GET /models`: List models
- `POST /models`: Create a model.
WARNING: This API is experimental and will change in future versions.
- `GET /models/{full_name}`: Get a specified registered model
- `PATCH /models/{full_name}`: Update a registered model
- `DELETE /models/{full_name}`: Delete a specified registered model.

## ModelVersions

- `POST /models/versions`: Create a model version.
- `GET /models/{full_name}/versions`: List model versions of the specified registered model.
- `GET /models/{full_name}/versions/{version}`: Get a model version
- `PATCH /models/{full_name}/versions/{version}`: Update a model version
- `DELETE /models/{full_name}/versions/{version}`: Delete a model version
- `PATCH /models/{full_name}/versions/{version}/finalize`: Finalize a model version

## TemporaryCredentials

- `POST /temporary-model-version-credentials`: Generate temporary model version credentials. These credentials are used by clients to write and retrieve model artifacts from the model versions external storage location.
- `POST /temporary-table-credentials`: Generate temporary table credentials.
- `POST /temporary-volume-credentials`: Generate temporary volume credentials.
- `POST /temporary-path-credentials`: Generate temporary path credentials.

## Metastores

- `GET /metastore_summary`: Get metastore summary

## DeltaCommits

- `GET /delta/preview/commits`: List unbackfilled Delta table commits.
WARNING: This API is experimental and may change in future versions.
- `POST /delta/preview/commits`: Commit changes to a specified Delta table.
The server has a limit defined in config on how many unbackfilled commits it can hold.
Clients are expected to do active backfill of the commit after committing to UC. So in
most cases the number of unbackfilled commits should be close to zero or one. But if
clients misbehave and unbackfilled commits accumulate beyond the limit, server will
reject further commits until more backfill is done.
Replaying an already-accepted commit (same version and file-name) is an idempotent no-op
that returns 200, so a client that lost the response can safely resend.
WARNING: This API is experimental and may change in future versions.

## Grants

- `GET /permissions/{securable_type}/{full_name}`: Get permissions
- `PATCH /permissions/{securable_type}/{full_name}`: Update a permission

## Credentials

- `GET /credentials`: List credentials
- `POST /credentials`: Create a credential
- `GET /credentials/{name}`: Get a credential
- `PATCH /credentials/{name}`: Update a credential
- `DELETE /credentials/{name}`: Delete a credential

## External Locations

- `GET /external-locations`: List external locations
- `POST /external-locations`: Create an external location
- `GET /external-locations/{name}`: Get an external location
- `PATCH /external-locations/{name}`: Update an external location
- `DELETE /external-locations/{name}`: Delete an external location
