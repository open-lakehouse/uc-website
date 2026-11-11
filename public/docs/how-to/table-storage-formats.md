---
title: Register external files as tables
summary: Register Parquet, CSV, JSON, and other file-based data as external
  tables in Unity Catalog, and read them from PyArrow, Polars, or DuckDB.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/table-storage-formats/
companions:
  - url: "https://unitycatalog.io/docs/how-to/table-storage-formats/snippets/file_formats.py"
    kind: python
    purpose: "Register Parquet, CSV, and JSON files as external tables, read them, and drop them."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/table-storage-formats/snippets/file_formats.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/table-storage-formats/snippets/file_formats.sh"
    kind: shell
    purpose: "Register Parquet, CSV, and JSON files as external tables with the uc CLI, and drop them."
    run: "bash file_formats.sh"
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

- [`file_formats.py`](https://unitycatalog.io/docs/how-to/table-storage-formats/snippets/file_formats.py) (Python): Register Parquet, CSV, and JSON files as external tables, read them, and drop them.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/table-storage-formats/snippets/file_formats.py`
- [`file_formats.sh`](https://unitycatalog.io/docs/how-to/table-storage-formats/snippets/file_formats.sh) (Shell): Register Parquet, CSV, and JSON files as external tables with the uc CLI, and drop them.
  - run: `bash file_formats.sh` from `uc-docs-env/unitycatalog`

[Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") can give a folder of plain data files a governed name, just as it does for a Delta table. An external table in format `PARQUET`, `CSV`, `JSON`, `AVRO`, `ORC`, or `TEXT` records the table's name, columns, format, and location. The files stay where they are.

These files have no transaction log, so the catalog entry is the only place their schema is recorded. Registering them works the same way as [registering a Delta table](https://unitycatalog.io/docs/how-to/register-external-table/). Reading them is different: you look the table up, then read its location with the reader for its format.

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - A schema, such as `retail.sales`: [Manage catalogs and schemas](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/).
> - Data files the server can reach, such as a folder under the local server's [`UC_DOCS_ROOT`](https://unitycatalog.io/docs/how-to/run-local-server/#share-a-folder-with-the-server).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/), for the Python examples.

## Set up the client

If you don't have files at hand, write the same three rows as Parquet, CSV, and JSON, one folder per table:

`file_formats.py`

```python
orders = pa.table(
    {
        "order_id": pa.array([1, 2, 3], pa.int64()),
        "customer": ["ada", "grace", "linus"],
        "amount": [9.5, 20.0, 3.25],
    }
)
for fmt in ["parquet", "csv", "json"]:
    (ROOT / f"orders_{fmt}").mkdir(parents=True, exist_ok=True)

pa.parquet.write_table(orders, ROOT / "orders_parquet" / "part-0.parquet")
pa.csv.write_csv(orders, ROOT / "orders_csv" / "part-0.csv")
# JSON tables hold newline-delimited JSON: one object per line.
with open(ROOT / "orders_json" / "part-0.json", "w") as f:
    for row in orders.to_pylist():
        f.write(json.dumps(row) + "\n")
```

Set up the client for your interface:

**Python SDK**

Start Python with the SDK:

```bash
uv run --with unitycatalog-client==0.7.0 --with pyarrow \
  --with polars==1.44.2 --with duckdb==2.0.0 python -m asyncio
```

`file_formats.py`

```python
import pyarrow as pa
import pyarrow.csv
import pyarrow.parquet
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

`file_formats.sh`

```bash
uc() { docker exec unitycatalog bin/uc "$@"; }
```

## Register the tables

Create each table with type `EXTERNAL`, the files' format, and the folder that holds them. Point the location at a folder, not a single file. The table is every file in it.

**Python SDK**

The SDK needs each column's type name, SQL type, and `type_json`. A small mapping builds them from an Arrow schema:

`file_formats.py`

```python
# Arrow type → (UC type name, SQL type text, type_json type). Extend as you need.
ARROW_TO_UC = {
    pa.int32(): (ColumnTypeName.INT, "int", "integer"),
    pa.int64(): (ColumnTypeName.LONG, "bigint", "long"),
    pa.float64(): (ColumnTypeName.DOUBLE, "double", "double"),
    pa.string(): (ColumnTypeName.STRING, "string", "string"),
    pa.bool_(): (ColumnTypeName.BOOLEAN, "boolean", "boolean"),
    pa.date32(): (ColumnTypeName.DATE, "date", "date"),
}


def columns_from_arrow(schema: pa.Schema) -> list[ColumnInfo]:
    columns = []
    for position, field in enumerate(schema):
        type_name, type_text, json_type = ARROW_TO_UC[field.type]
        type_json = {
            "name": field.name,
            "type": json_type,
            "nullable": field.nullable,
            "metadata": {},
        }
        columns.append(
            ColumnInfo(
                name=field.name,
                type_name=type_name,
                type_text=type_text,
                type_json=json.dumps(type_json),
                position=position,
                nullable=field.nullable,
            )
        )
    return columns


```

Read the schema from one of the files and register each folder:

`file_formats.py`

```python
schema = pa.parquet.read_schema(ROOT / "orders_parquet" / "part-0.parquet")
for fmt in ["parquet", "csv", "json"]:
    await tables.create_table(
        CreateTable(
            name=f"orders_{fmt}",
            catalog_name="retail",
            schema_name="sales",
            table_type=TableType.EXTERNAL,
            data_source_format=DataSourceFormat(fmt.upper()),
            storage_location=f"file://{ROOT}/orders_{fmt}",
            columns=columns_from_arrow(schema),
        )
    )
```

**CLI**

`file_formats.sh`

```bash
for fmt in parquet csv json; do
  uc table create --full_name "retail.sales.orders_${fmt}" \
    --columns "order_id LONG, customer STRING, amount DOUBLE" \
    --format "$(echo "$fmt" | tr a-z A-Z)" \
    --storage_location "file://${UC_DOCS_ROOT:-/tmp/uc-docs}/orders_${fmt}"
done
```

Whatever the format, the CLI also writes a Delta transaction log, `_delta_log/`, into the location. It lists no data files, and the readers below skip it.

> **Warning**
>
> The server doesn't check that the files exist, match the columns, or use the declared format. It also stores no reader options, such as a CSV header or delimiter. If you want to record those, add them as table `properties`. Readers won't apply them on their own.

The privileges are the same as for [a Delta external table](https://unitycatalog.io/docs/how-to/register-external-table/#register-the-table).

## Read the data

Look the table up to get its format and location:

`file_formats.py`

```python
table = await tables.get_table(full_name="retail.sales.orders_csv")
fmt = table.data_source_format.value.lower()  # "parquet", "csv", or "json"
path = table.storage_location.removeprefix("file://")
print(fmt, path, [c.name for c in table.columns or []])
```

Then read the folder with that format's reader:

**PyArrow**

`file_formats.py`

```python
import pyarrow.dataset as ds

data = ds.dataset(path, format=fmt).to_table()
print(data)
```

**Polars**

`file_formats.py`

```python
import polars as pl

scan = {"parquet": pl.scan_parquet, "csv": pl.scan_csv, "json": pl.scan_ndjson}
data = scan[fmt](f"{path}/*.{fmt}").collect()
print(data)
```

**DuckDB**

`file_formats.py`

```python
import duckdb

data = duckdb.sql(f"SELECT * FROM read_{fmt}('{path}/*.{fmt}')")
data.show()
```

These readers infer column types from the files. The catalog's columns are what other users see, so keep the files consistent with them.

Polars `Catalog.scan_table`, the DuckDB `unity_catalog` extension, and `uc table read` can't read these tables by name. On cloud storage, readers also need credentials; see [Credential vending](https://unitycatalog.io/docs/explanation/credential-vending/).

## Drop the tables

Dropping an external table deletes only the catalog entry. The files are untouched.

**Python SDK**

`file_formats.py`

```python
for fmt in ["parquet", "csv", "json"]:
    await tables.delete_table(full_name=f"retail.sales.orders_{fmt}")
```

**CLI**

`file_formats.sh`

```bash
for fmt in parquet csv json; do
  uc table delete --full_name "retail.sales.orders_${fmt}"
done
```

To change a table's columns, drop it and register it again.

## When to use Delta instead

Plain files work for data written once and read many times, such as exports and drops from other systems. They lack what a table format adds:

- **No transactions.** A reader can see a half-written folder, and two writers can overwrite each other's files.
- **No row-level changes.** Updating or deleting rows means rewriting files yourself.
- **No schema enforcement or evolution.** Any file in the folder can have any columns.
- **Slower reads at scale.** Readers list the folder and read every file's footer or contents to plan a query. Delta keeps file lists and statistics in its log.

For data that changes, write Delta and [register it](https://unitycatalog.io/docs/how-to/register-external-table/), or let Unity Catalog [manage the table](https://unitycatalog.io/docs/tutorials/managed-delta-table/).

## Next steps

- [Register an existing external table](https://unitycatalog.io/docs/how-to/register-external-table/) covers Delta tables, which engines can read by name.
- [Manage volumes](https://unitycatalog.io/docs/how-to/manage-volumes/) to govern files that aren't tables.
