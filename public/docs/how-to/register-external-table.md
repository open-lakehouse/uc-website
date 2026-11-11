---
title: Register external Delta table
summary: Register a Delta table that already exists in storage as an external
  table in Unity Catalog, inspect and read it, and drop it without losing data.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/register-external-table/
companions:
  - url: "https://unitycatalog.io/docs/how-to/register-external-table/snippets/external_table.py"
    kind: python
    purpose: "Register an existing Delta table in Unity Catalog, read it back, and drop it."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/register-external-table/snippets/external_table.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/register-external-table/snippets/external_table.sh"
    kind: shell
    purpose: "Register an existing Delta table in Unity Catalog with the uc CLI, read it back, and drop it."
    run: "bash external_table.sh"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/register-external-table/snippets/read_engines.py"
    kind: python
    purpose: "Read the registered external table by name from Polars, Daft, and DuckDB."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/register-external-table/snippets/read_engines.py"
    requires-python: ">=3.11"
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

- [`external_table.py`](https://unitycatalog.io/docs/how-to/register-external-table/snippets/external_table.py) (Python): Register an existing Delta table in Unity Catalog, read it back, and drop it.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/register-external-table/snippets/external_table.py`
- [`external_table.sh`](https://unitycatalog.io/docs/how-to/register-external-table/snippets/external_table.sh) (Shell): Register an existing Delta table in Unity Catalog with the uc CLI, read it back, and drop it.
  - run: `bash external_table.sh` from `uc-docs-env/unitycatalog`
- [`read_engines.py`](https://unitycatalog.io/docs/how-to/register-external-table/snippets/read_engines.py) (Python): Read the registered external table by name from Polars, Daft, and DuckDB.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/register-external-table/snippets/read_engines.py`

Registering a [Delta](https://delta.io "Open table-format specification: ACID transactions, schema evolution, and time travel over object storage.") table that already exists in storage as an *external table* gives it a governed name in [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification."), so that every engine can find it as `catalog.schema.table`. An external table is a catalog entry that records a table's name, columns, format, and storage location. The data stays where it is, owned by whatever process writes it. Unity Catalog never moves or rewrites the files.

To let Unity Catalog allocate storage and coordinate writes, use a [managed table](https://unitycatalog.io/docs/tutorials/managed-delta-table/) instead. For the difference, see [External tables and catalog-managed Delta tables](https://unitycatalog.io/docs/explanation/external-and-managed-tables/).

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - A schema, such as `retail.sales`: [Manage catalogs and schemas](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/).
> - A Delta table the server can reach, such as one under the local server's [`UC_DOCS_ROOT`](https://unitycatalog.io/docs/how-to/run-local-server/#share-a-folder-with-the-server).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/), for the Python examples.

## Set up the client

If you don't have a table at hand, write a small one:

`external_table.py`

```python
location = f"file://{ROOT}/orders"
orders = pa.table(
    {
        "order_id": pa.array([1, 2, 3], pa.int64()),
        "customer": ["ada", "grace", "linus"],
        "amount": [9.5, 20.0, 3.25],
    }
)
write_deltalake(location, orders)
```

Set up the client for your interface:

**Python SDK**

Start Python with the SDK:

```bash
uv run --with unitycatalog-client==0.7.0 --with deltalake==1.6.6 \
  --with polars==1.44.2 --with "daft[unity]==0.7.25" --with tenacity \
  --with duckdb==2.0.0 python -m asyncio
```

`external_table.py`

```python
import pyarrow as pa
from deltalake import DeltaTable, write_deltalake
from unitycatalog.client import ApiClient, Configuration, CreateTable, TablesApi
from unitycatalog.client.models import (
    ColumnInfo,
    ColumnTypeName,
    DataSourceFormat,
    TableType,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
```

**CLI**

`external_table.sh`

```bash
uc() { docker exec unitycatalog bin/uc "$@"; }
```

## Describe the table's columns

The catalog stores its own copy of the table's columns. You supply them when you register the table, and they should match the Delta schema.

**Python SDK**

Each `ColumnInfo` needs a type name, a SQL type string, and `type_json`, the column's JSON in Delta schema form. Reading the schema from the Delta log provides all three:

`external_table.py`

```python
# Delta primitive type → (UC type name, SQL type text). Extend as your tables need.
DELTA_TO_UC = {
    "boolean": (ColumnTypeName.BOOLEAN, "boolean"),
    "integer": (ColumnTypeName.INT, "int"),
    "long": (ColumnTypeName.LONG, "bigint"),
    "double": (ColumnTypeName.DOUBLE, "double"),
    "string": (ColumnTypeName.STRING, "string"),
    "date": (ColumnTypeName.DATE, "date"),
    "timestamp": (ColumnTypeName.TIMESTAMP, "timestamp"),
}


def columns_from_delta(location: str) -> list[ColumnInfo]:
    fields = json.loads(DeltaTable(location).schema().to_json())["fields"]
    columns = []
    for position, field in enumerate(fields):
        type_name, type_text = DELTA_TO_UC[field["type"]]
        columns.append(
            ColumnInfo(
                name=field["name"],
                type_name=type_name,
                type_text=type_text,
                type_json=json.dumps(field),
                position=position,
                nullable=field["nullable"],
            )
        )
    return columns


```

**CLI**

The CLI takes the columns as one `"name TYPE, ..."` string and builds the column metadata itself. Supported types: `BOOLEAN`, `BYTE`, `SHORT`, `INT`, `LONG`, `FLOAT`, `DOUBLE`, `DATE`, `TIMESTAMP`, `TIMESTAMP_NTZ`, `STRING`, `BINARY`, and `DECIMAL`.

## Register the table

Create the table with type `EXTERNAL`, format `DELTA`, and the table's location.

**Python SDK**

`external_table.py`

```python
table = await tables.create_table(
    CreateTable(
        name="orders",
        catalog_name="retail",
        schema_name="sales",
        table_type=TableType.EXTERNAL,
        data_source_format=DataSourceFormat.DELTA,
        storage_location=location,
        columns=columns_from_delta(location),
        comment="Orders exported by the order service",
    )
)
print(table.table_id, table.storage_location)
```

**CLI**

`external_table.sh`

```bash
uc table create --full_name retail.sales.orders \
  --columns "order_id LONG, customer STRING, amount DOUBLE" \
  --format DELTA \
  --storage_location "file://${UC_DOCS_ROOT:-/tmp/uc-docs}/orders"
```

> **Note**
>
> Unlike the API, the CLI creates an empty Delta table if the location doesn't have one. If the location already holds a Delta table, the CLI leaves it unchanged.

> **Warning**
>
> Registration is metadata only. The server doesn't check that the location exists or that the columns match the files. A typo in `storage_location` still registers, and the error surfaces later, when an engine tries to read the table.

For Parquet, CSV, and other formats, see [Table storage formats](https://unitycatalog.io/docs/how-to/table-storage-formats/).

**Required privileges:** `USE_CATALOG` on the catalog (or ownership of it), plus ownership of the schema or `USE_SCHEMA` and `CREATE_TABLE` on it. The location must not overlap another table or volume. If it falls inside an external location, you also need `CREATE_EXTERNAL_TABLE` on that external location, or ownership of it.

## View the table

**Python SDK**

`external_table.py`

```python
orders = await tables.get_table(full_name="retail.sales.orders")
print([(c.name, c.type_text) for c in orders.columns or []])

listed = await tables.list_tables(catalog_name="retail", schema_name="sales")
print([t.name for t in listed.tables or []])
```

**CLI**

`external_table.sh`

```bash
uc table get --full_name retail.sales.orders --output jsonPretty
uc table list --catalog retail --schema sales --output jsonPretty
```

**Required privileges:** `SELECT`, `MODIFY`, or ownership on the table, plus `USE_SCHEMA` and `USE_CATALOG`. Owners of the schema (with `USE_CATALOG`), the catalog, or the metastore can also view it.

## Read the data

Unity Catalog isn't in the data path. A client looks up the table, then reads the files at `storage_location` with a Delta reader.

**Python SDK**

`external_table.py`

```python
data = DeltaTable(orders.storage_location).to_pyarrow_table()
print(data.num_rows, data.column_names)
```

**CLI**

`external_table.sh`

```bash
uc table read --full_name retail.sales.orders --max_results 10
```

`table read` runs inside the server container, so it reads the files at the container's view of `storage_location`.

**Polars**

`read_engines.py`

```python
import polars as pl

catalog = pl.Catalog("http://localhost:8080", require_https=False)
orders = catalog.scan_table("retail", "sales", "orders").collect()
print(orders)
```

Polars looks up the table by name and reads its location. See [Query Unity Catalog tables from Python DataFrame libraries](https://unitycatalog.io/docs/how-to/python-dataframes/).

**Daft**

`read_engines.py`

```python
from daft.catalog import Catalog
from daft.catalog.__unity import UnityCatalogClient

client = UnityCatalogClient("http://localhost:8080", token="not-used")
orders = Catalog.from_unity(client).get_table("retail.sales.orders").read()
orders.show()
```

See [Query Unity Catalog tables from Python DataFrame libraries](https://unitycatalog.io/docs/how-to/python-dataframes/).

**DuckDB**

`read_engines.py`

```python
import duckdb

con = duckdb.connect()
con.execute("INSTALL delta")
con.execute("LOAD delta")
con.execute("INSTALL unity_catalog")
con.execute("LOAD unity_catalog")
con.execute("""
    CREATE SECRET (
        TYPE unity_catalog,
        TOKEN 'not-used',
        ENDPOINT 'http://localhost:8080'
    )
""")
con.execute("ATTACH 'retail' AS retail (TYPE unity_catalog)")
con.sql("SELECT * FROM retail.sales.orders").show()
```

See [Read and write Unity Catalog tables from DuckDB](https://unitycatalog.io/docs/how-to/duckdb/).

On cloud storage, the reader also needs credentials. A client with the right privileges can ask the server for short-lived ones; see [Credential vending](https://unitycatalog.io/docs/explanation/credential-vending/).

## Change a registered table

To change an external table's columns or comment, drop it and register it again. The data isn't affected. For Delta tables that Unity Catalog manages, engines change the schema and properties through Delta commits instead.

## Drop the table

Dropping an external table deletes only the catalog entry.

**Python SDK**

`external_table.py`

```python
await tables.delete_table(full_name="retail.sales.orders")
```

**CLI**

`external_table.sh`

```bash
uc table delete --full_name retail.sales.orders
```

The files at the old location are untouched. You can read them by path or register them again. To delete the data too, delete the files with your storage tools.

**Required privileges:** ownership of the table plus `USE_SCHEMA` and `USE_CATALOG`, or ownership of the schema (with `USE_CATALOG`) or the catalog.

## Next steps

- [Manage volumes](https://unitycatalog.io/docs/how-to/manage-volumes/) to govern non-tabular files in the same schema.
- [Credential vending](https://unitycatalog.io/docs/explanation/credential-vending/) explains how engines get access to cloud storage.
