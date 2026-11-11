---
title: Use the Python client
summary: Use the official Python SDK to write, read, and organize data.
diataxis: tutorial
---

In this tutorial you build the same small catalog as in
[Create your first catalog](/docs/tutorials/getting-started/), this time from
Python with [`unitycatalog-client`](https://pypi.org/project/unitycatalog-client/),
the official SDK for the [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") REST API. You
connect, create a catalog, a schema, and a table, see how the client reports
an object that doesn't exist, and clean up. Applications, notebooks, and
scripts use the same calls to manage catalog objects.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- [uv](https://docs.astral.sh/uv/getting-started/installation/).
:::

::::journey
## Start the environment

Download the docs' environment and start Unity Catalog 0.7.0. Already running it? Skip this.

```bash
curl -fsSL https://unitycatalog.io/docs/env/unitycatalog.tar.gz | tar -xz
cd uc-docs-env/unitycatalog && docker compose up -d --wait
export UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog
```

```trestle /docs/assets/trestle/unitycatalog/diagram.trestle-graph.json
The services Unity Catalog 0.7.0 runs and how clients reach them
```

```mermaid fallback
flowchart LR
    n0(["<b>Clients</b>"]):::clients
    n1["<b>Unity Catalog</b><br/>data catalog"]:::component
    n0 -->|":8080"| n1
    classDef clients fill:#f1f5f9,stroke:#64748b
    classDef gateway fill:#ede9fe,stroke:#7c3aed
    classDef component fill:#eff6ff,stroke:#2563eb
    classDef external fill:#fafafa,stroke:#737373,stroke-dasharray: 4 3
```

Stop it later with `docker compose down` from `uc-docs-env/unitycatalog`.

## Open a Python session

Open a Python session with the
client installed:

```bash
uv run --with unitycatalog-client==0.7.0 python -m asyncio
```

Enter each of the following snippets in it, in order.

:::note
`python -m asyncio` is a Python shell that accepts `await` at the top level,
which the asynchronous client needs.
:::

## Connect to the server

Point a `Configuration` at the server and open an `ApiClient`. Each resource
type has its own API class built on that client:

```python title="catalog_flow.py" script="/docs/tutorials/python-client/snippets/catalog_flow.py"
from unitycatalog.client import (
    ApiClient,
    CatalogsApi,
    Configuration,
    SchemasApi,
    TablesApi,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
api = ApiClient(config)
catalogs = CatalogsApi(api)
schemas = SchemasApi(api)
tables = TablesApi(api)
```

The host includes the API prefix, `/api/2.1/unity-catalog`. Authorization is
off on the local server, so the client needs no token.

## Create a catalog

Every create call takes one request object:

```python title="catalog_flow.py" script="/docs/tutorials/python-client/snippets/catalog_flow.py"
from unitycatalog.client import CreateCatalog

catalog = await catalogs.create_catalog(
    CreateCatalog(name="quickstart", comment="Created from Python")
)
print(catalog.name, catalog.id)
```

The server returns the new catalog, including the `id` it generated.

## List catalogs

A list call returns a response object. Its `catalogs` field holds the items:

```python title="catalog_flow.py" script="/docs/tutorials/python-client/snippets/catalog_flow.py"
listed = await catalogs.list_catalogs()
print([c.name for c in listed.catalogs])
```

`quickstart` is listed next to the sample catalog `unity`.

## Create a schema

A schema lives inside one catalog:

```python title="catalog_flow.py" script="/docs/tutorials/python-client/snippets/catalog_flow.py"
from unitycatalog.client import CreateSchema

schema = await schemas.create_schema(
    CreateSchema(name="sales", catalog_name="quickstart")
)
print(schema.full_name)  # quickstart.sales
```

## Create a table

Register an external Delta table with one column in the new schema:

```python title="catalog_flow.py" script="/docs/tutorials/python-client/snippets/catalog_flow.py"
from unitycatalog.client import CreateTable
from unitycatalog.client.models import (
    ColumnInfo,
    ColumnTypeName,
    DataSourceFormat,
    TableType,
)

table = await tables.create_table(
    CreateTable(
        name="orders",
        catalog_name="quickstart",
        schema_name="sales",
        table_type=TableType.EXTERNAL,
        data_source_format=DataSourceFormat.DELTA,
        storage_location="file:///tmp/uc-docs/quickstart/orders",
        columns=[
            ColumnInfo(
                name="order_id",
                type_name=ColumnTypeName.LONG,
                type_text="bigint",
                type_json='{"name":"order_id","type":"long","nullable":false,"metadata":{}}',
                position=0,
                nullable=False,
            )
        ],
    )
)
print(table.catalog_name, table.schema_name, table.name, table.table_type)
```

Each column carries its type three ways: a `type_name` enum, a SQL
`type_text`, and `type_json`, the column in Delta schema form. Registering a
table stores only metadata, so the location doesn't need to exist yet.
[Register an existing external table](/docs/how-to/register-external-table/)
shows how to read these values from a real Delta table.

## Handle a missing object

Asking for an object that doesn't exist raises a typed exception that carries
the HTTP status:

```python title="catalog_flow.py" script="/docs/tutorials/python-client/snippets/catalog_flow.py"
from unitycatalog.client.exceptions import NotFoundException

try:
    await tables.get_table(full_name="quickstart.sales.returns")
except NotFoundException as exc:
    print("not found:", exc.status)  # not found: 404
```

Other error responses raise sibling exceptions such as `BadRequestException`
and `UnauthorizedException`, all subclasses of `ApiException`.

## Clean up

Delete from the inside out, the table before its schema and the schema before
its catalog:

```python title="catalog_flow.py" script="/docs/tutorials/python-client/snippets/catalog_flow.py"
await tables.delete_table(full_name="quickstart.sales.orders")
await schemas.delete_schema(full_name="quickstart.sales")
await catalogs.delete_catalog(name="quickstart")
await api.close()
```

The server refuses to delete a catalog or schema that still holds objects,
unless you pass `force=True`. Leave the session with `Ctrl+D`.
::::

## What you did

You managed catalog objects from Python with the same requests the `uc` CLI
sends. Every client, from this SDK to Spark, talks to the same REST API and
sees the same names.

## Next steps

- [Manage catalogs and schemas](/docs/how-to/manage-catalogs-and-schemas/)
  covers updating, renaming, and deleting them from Python or the CLI.
- [Create and update a catalog-managed Delta table](/docs/tutorials/managed-delta-table/)
  writes real data into a table that Unity Catalog manages.
