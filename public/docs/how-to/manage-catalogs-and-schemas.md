---
title: Manage catalogs and schemas
summary: Create, inspect, update, rename, and delete Unity Catalog catalogs and
  schemas with the Python SDK or the CLI.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/
companions:
  - url: "https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/snippets/catalogs.py"
    kind: python
    purpose: "Create, inspect, update, and delete a catalog and a schema with the Python SDK."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/snippets/catalogs.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/snippets/catalogs.sh"
    kind: shell
    purpose: "Create, inspect, update, and delete a catalog and a schema with the uc CLI."
    run: "bash catalogs.sh"
    services: ["unitycatalog"]
environment:
  title: "Unity Catalog 0.7.0"
  dir: "uc-docs-env/unitycatalog"
  start: ["curl -fsSL https://unitycatalog.io/docs/env/unitycatalog.tar.gz | tar -xz", "cd uc-docs-env/unitycatalog && docker compose up -d --wait", "export UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog"]
  stop: "docker compose down"
  elements: ["unityCatalogServer"]
  index: "https://unitycatalog.io/docs/env/environments.json"
---

## Companion files

CI-tested scripts that run this page's examples end to end. A script that exits 0 has passed its checks.

They need Unity Catalog 0.7.0 running. To start it (also `environment` in this file's frontmatter):

```bash
curl -fsSL https://unitycatalog.io/docs/env/unitycatalog.tar.gz | tar -xz
cd uc-docs-env/unitycatalog && docker compose up -d --wait
export UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog
```

- [`catalogs.py`](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/snippets/catalogs.py) (Python): Create, inspect, update, and delete a catalog and a schema with the Python SDK.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/snippets/catalogs.py`
- [`catalogs.sh`](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/snippets/catalogs.sh) (Shell): Create, inspect, update, and delete a catalog and a schema with the uc CLI.
  - run: `bash catalogs.sh` from `uc-docs-env/unitycatalog`

Catalogs and schemas organize every asset in [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification."). A catalog is the top level of the three-level namespace. It contains schemas, and a schema contains tables, volumes, functions, and registered models. For how these objects relate, see [Core concepts](https://unitycatalog.io/docs/explanation/uc-basics/).

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/), for the Python examples.

## Set up the client

Set up the client for your interface:

**Python SDK**

Start Python with the SDK:

```bash
uv run --with unitycatalog-client==0.7.0 python -m asyncio
```

`catalogs.py`

```python
from unitycatalog.client import (
    ApiClient,
    CatalogsApi,
    Configuration,
    CreateCatalog,
    CreateSchema,
    SchemasApi,
    UpdateCatalog,
    UpdateSchema,
)
from unitycatalog.client.exceptions import BadRequestException, NotFoundException

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
```

Create one `CatalogsApi` and one `SchemasApi` from an open client: `async with ApiClient(config) as api: catalogs = CatalogsApi(api)`.

**CLI**

`catalogs.sh`

```bash
uc() { docker exec unitycatalog bin/uc "$@"; }
```

The CLI connects to `http://localhost:8080` by default. Pass `--server` and `--auth_token` to reach a different server.

## Create a catalog

Give the catalog a name, plus an optional comment and key-value properties.

**Python SDK**

`catalogs.py`

```python
catalog = await catalogs.create_catalog(
    CreateCatalog(
        name="retail",
        comment="Order and customer data for the retail team",
        properties={"owner_team": "retail-analytics"},
    )
)
print(catalog.name, catalog.properties)
```

**CLI**

`catalogs.sh`

```bash
uc catalog create --name retail \
  --comment "Order and customer data for the retail team" \
  --properties '{"owner_team": "retail-analytics"}'
```

To give the catalog its own managed storage for managed tables and volumes, also pass `storage_root` (`--storage_root` in the CLI), for example `file:///srv/uc/retail` or `s3://amzn-s3-demo-bucket/retail`. Without it, managed objects in this catalog need a storage root on their schema or a server-wide default.

**Required privileges:** `CREATE_CATALOG` on the metastore, or metastore ownership. With `storage_root`, you also need `CREATE_MANAGED_STORAGE` on (or ownership of) the external location that contains the path.

## View catalogs

List the catalogs you can see, or fetch one by name.

**Python SDK**

`catalogs.py`

```python
listed = await catalogs.list_catalogs()
print([c.name for c in listed.catalogs or []])

retail = await catalogs.get_catalog(name="retail")
print(retail.comment, retail.created_at)
```

**CLI**

`catalogs.sh`

```bash
uc catalog list --output jsonPretty
uc catalog get --name retail --output jsonPretty
```

**Required privileges:** to get a catalog, you need `USE_CATALOG` on it or ownership of it (or of the metastore). A list returns only the catalogs you could get.

## Update a catalog

Change the comment, the properties, or the name (`new_name`).

**Python SDK**

`catalogs.py`

```python
updated = await catalogs.update_catalog(
    name="retail",
    update_catalog=UpdateCatalog(
        comment="Curated retail data",
        properties={"owner_team": "retail-analytics", "tier": "gold"},
    ),
)
print(updated.comment, updated.properties)
```

**CLI**

`catalogs.sh`

```bash
uc catalog update --name retail \
  --comment "Curated retail data" \
  --properties '{"owner_team": "retail-analytics", "tier": "gold"}'
```

> **Warning**
>
> `properties` replaces the whole map, so include every key you want to keep. Updating only the comment leaves the properties unchanged.

**Required privileges:** ownership of the catalog.

## Create a schema

A schema always belongs to one catalog. Like a catalog, it accepts a comment, properties, and an optional `storage_root`. A schema's storage root takes precedence over its catalog's.

**Python SDK**

`catalogs.py`

```python
schema = await schemas.create_schema(
    CreateSchema(
        name="staging",
        catalog_name="retail",
        comment="Raw order extracts",
    )
)
print(schema.full_name)  # retail.staging
```

**CLI**

`catalogs.sh`

```bash
uc schema create --catalog retail --name staging --comment "Raw order extracts"
```

**Required privileges:** `USE_CATALOG` and `CREATE_SCHEMA` on the catalog, or ownership of the catalog. A `storage_root` needs the same external-location privilege as a catalog's.

## View schemas

**Python SDK**

`catalogs.py`

```python
listed_schemas = await schemas.list_schemas(catalog_name="retail")
print([s.full_name for s in listed_schemas.schemas or []])

staging = await schemas.get_schema(full_name="retail.staging")
print(staging.comment)
```

**CLI**

`catalogs.sh`

```bash
uc schema list --catalog retail --output jsonPretty
uc schema get --full_name retail.staging --output jsonPretty
```

**Required privileges:** `USE_CATALOG` on the catalog and `USE_SCHEMA` on the schema, or ownership of the schema, catalog, or metastore.

## Update or rename a schema

Pass `new_name` to rename a schema. The schema keeps its contents, and its full name changes from `retail.staging` to `retail.sales`.

**Python SDK**

`catalogs.py`

```python
renamed = await schemas.update_schema(
    full_name="retail.staging",
    update_schema=UpdateSchema(new_name="sales", comment="Cleaned order data"),
)
print(renamed.full_name)  # retail.sales
```

**CLI**

`catalogs.sh`

```bash
uc schema update --full_name retail.staging --new_name sales --comment "Cleaned order data"
```

**Required privileges:** ownership of the schema or the metastore.

> **Caution**
>
> The server also allows schema updates, renames included, for any principal with `USE_CATALOG` and `USE_SCHEMA`. Grant those privileges with that in mind.

## Delete a schema or catalog

The server rejects a delete while the target still contains objects. It returns HTTP 400 with `FAILED_PRECONDITION`, and the SDK raises `BadRequestException`:

**Python SDK**

`catalogs.py`

```python
try:
    await catalogs.delete_catalog(name="retail")
except BadRequestException as exc:
    print(f"HTTP {exc.status}: catalog still contains schemas")
```

**CLI**

`catalogs.sh`

```bash
uc catalog delete --name retail
```

The command exits non-zero, with the message `Cannot delete catalog with schemas. Use force=true to force deletion.`

Delete the contents first, starting with the innermost objects:

**Python SDK**

`catalogs.py`

```python
await schemas.delete_schema(full_name="retail.sales")
await catalogs.delete_catalog(name="retail")
```

**CLI**

`catalogs.sh`

```bash
uc schema delete --full_name retail.sales
uc catalog delete --name retail
```

Or delete a catalog with everything in it:

**Python SDK**

`catalogs.py`

```python
await catalogs.delete_catalog(name="retail", force=True)
```

**CLI**

`catalogs.sh`

```bash
uc catalog delete --name retail --force true
```

> **Danger**
>
> A forced delete removes every schema, table, volume, function, and model in the catalog, and it can't be undone. The server also deletes the directories of managed tables and volumes, after `server.storage-cleanup.initial-delay` (7 days by default). External tables and volumes lose only their metadata, and their files stay where they are.

**Required privileges:** to delete a catalog, you need ownership of the catalog or the metastore. To delete a schema, you need ownership of the schema plus `USE_CATALOG`, or ownership of the catalog or metastore.

## Next steps

- [Register an existing external table](https://unitycatalog.io/docs/how-to/register-external-table/) in your new schema.
- [Manage volumes](https://unitycatalog.io/docs/how-to/manage-volumes/) for files.
- [Use the Python client](https://unitycatalog.io/docs/tutorials/python-client/) for a guided walkthrough of the same SDK.
