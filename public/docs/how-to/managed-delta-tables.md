---
title: Read and write catalog-managed Delta tables
summary: Create catalog-managed Delta tables in Unity Catalog, and read and
  write them through Spark or DuckDB.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/managed-delta-tables/
companions:
  - url: "https://unitycatalog.io/docs/how-to/managed-delta-tables/snippets/managed_tables.py"
    kind: python
    purpose: "Create, write, read, and drop a catalog-managed Delta table with Spark and DuckDB."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/managed-delta-tables/snippets/managed_tables.py"
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

- [`managed_tables.py`](https://unitycatalog.io/docs/how-to/managed-delta-tables/snippets/managed_tables.py) (Python): Create, write, read, and drop a catalog-managed Delta table with Spark and DuckDB.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/managed-delta-tables/snippets/managed_tables.py`

For catalog-managed [Delta](https://delta.io "Open table-format specification: ACID transactions, schema evolution, and time travel over object storage.") tables, the catalog brokers all reads and writes, enabling advanced features, better performance, and higher reliability. See [External tables and catalog-managed Delta tables](https://unitycatalog.io/docs/explanation/external-and-managed-tables/) for details.

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - A schema in a catalog with a storage root, such as `inventory.stock`: [Manage catalogs and schemas](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/), or [Set managed storage for catalogs and schemas on S3](https://unitycatalog.io/docs/how-to/managed-storage-s3/).
> - Table files that your engine and the server can both reach, such as the local server's [shared folder](https://unitycatalog.io/docs/how-to/run-local-server/#share-a-folder-with-the-server).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/).
> - [Java 17](https://adoptium.net/temurin/releases/?version=17), for Spark.

## Set up the client

**Spark**

Open a Python session with PySpark:

```bash
uv run --with pyspark==4.1.0 python
```

Create a Spark session with the connector and a Spark catalog named after the Unity Catalog catalog:

`managed_tables.py`

```python
from pyspark.sql import SparkSession  # noqa: E402

spark = (
    SparkSession.builder.appName("managed-delta-tables")
    .config(
        "spark.jars.packages",
        "io.unitycatalog:unitycatalog-spark_4.1_2.13:0.7.0,"
        "io.delta:delta-spark_4.1_2.13:4.3.1",
    )
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
    .config(
        "spark.sql.catalog.spark_catalog",
        "org.apache.spark.sql.delta.catalog.DeltaCatalog",
    )
    .config("spark.sql.catalog.inventory", "io.unitycatalog.spark.UCSingleCatalog")
    .config("spark.sql.catalog.inventory.uri", "http://localhost:8080")
    .config("spark.sql.catalog.inventory.auth.type", "static")
    .config("spark.sql.catalog.inventory.auth.token", "not-used")
    .getOrCreate()
)
```

[Use Spark with Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark/) explains each setting and the connector versions.

**DuckDB**

Open a Python session with DuckDB:

```bash
uv run --with duckdb==2.0.0 python
```

Install the `delta` and `unity_catalog` extensions, then attach the catalog:

`managed_tables.py`

```python
import duckdb  # noqa: E402

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
con.execute(
    "ATTACH 'inventory' AS inventory (TYPE unity_catalog, DEFAULT_SCHEMA 'stock')"
)
```

When an engine reads or writes the table, it asks the server for credentials scoped to the table's location; see [Tune storage credentials](https://unitycatalog.io/docs/how-to/configure-spark/#tune-storage-credentials) for Spark's settings and [Credential vending](https://unitycatalog.io/docs/explanation/credential-vending/) for what they protect.

## Create a managed table

Create the table in Spark:

`managed_tables.py`

```python
spark.sql("""
    CREATE TABLE inventory.stock.items (
        sku STRING,
        qty INT
    ) USING DELTA
""")
```

The connector creates it as a catalog-managed table and sets `delta.feature.catalogManaged` for you. You don't choose where it lives: the server allocates a path under the nearest storage root.

DuckDB creates one with `CREATE TABLE` too; see [Use DuckDB with Unity Catalog](https://unitycatalog.io/docs/how-to/duckdb/#create-change-and-drop-tables).

Creating a table from a query (`CREATE TABLE … AS SELECT`) is covered in the guide *Replace or overwrite a managed Delta table*.

### Required table features

Before Spark writes a new table's first version, it asks the server to stage the table. The server's answer lists the table features and properties the table must have, and the ones it suggests. Spark turns on every requirement, and every suggestion you don't override.

The [Delta protocol](https://github.com/delta-io/delta/blob/v4.3.1/PROTOCOL.md#catalog-managed-table-enablement) requires little of a catalog-managed table: reader version 3, writer version 7, and the `catalogManaged` and `inCommitTimestamp` features. Which other features a table needs is up to the catalog.

The [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") server requires `catalogManaged`, `deletionVectors`, `v2Checkpoint`, `vacuumProtocolCheck`, and `inCommitTimestamp`, and the properties that turn them on, such as `delta.enableDeletionVectors`. It suggests column mapping in `name` mode, row tracking, and domain metadata. To override a suggestion, set its property yourself, such as `'delta.columnMapping.mode' = 'none'`. A requirement can't be overridden.

To list a table's protocol versions and features, run:

`managed_tables.py`

```python
spark.sql("""
    DESCRIBE DETAIL inventory.stock.items
""").select("minReaderVersion", "minWriterVersion", "tableFeatures").show(
    truncate=False
)
```

A create that turns off deletion vectors fails:

`managed_tables.py`

```python
try:
    spark.sql("""
        CREATE TABLE inventory.stock.returns (sku STRING, qty INT)
        USING DELTA
        TBLPROPERTIES ('delta.enableDeletionVectors' = 'false')
    """)
except Exception as err:
    print(err)
```

```text
Cannot create table inventory.stock.returns: catalog requires table property 'delta.enableDeletionVectors'='true' but the caller supplied 'delta.enableDeletionVectors'='false'. Remove the conflicting TBLPROPERTIES entry and retry.
```

## Write to the table

Append rows with `INSERT INTO`:

**Spark**

`managed_tables.py`

```python
spark.sql("""
    INSERT INTO inventory.stock.items VALUES
        ('apple', 10),
        ('pear', 4),
        ('plum', 0)
""")
```

**DuckDB**

`managed_tables.py`

```python
con.execute("INSERT INTO inventory.stock.restock VALUES ('fig', 7)")
```

After DuckDB has read the table, it keeps that version. When another engine then writes to the table, DuckDB's queries don't show the new rows, and its next append fails with `Failed to commit: … (HTTP 409): Conflict` and leaves the table unchanged. The same append fails again until you detach and attach the catalog:

`managed_tables.py`

```python
con.execute("DETACH inventory")
con.execute(
    "ATTACH 'inventory' AS inventory (TYPE unity_catalog, DEFAULT_SCHEMA 'stock')"
)
con.execute("INSERT INTO inventory.stock.restock VALUES ('lime', 3)")
```

Update and delete rows in Spark:

`managed_tables.py`

```python
spark.sql("UPDATE inventory.stock.items SET qty = qty + 5 WHERE sku = 'pear'")
spark.sql("DELETE FROM inventory.stock.items WHERE qty = 0")
```

DuckDB can't update or delete rows.

The server accepts one commit for each version, so when two writers race for the same version, one of them fails. See [Why a catalog should accept commits](https://unitycatalog.io/docs/explanation/external-and-managed-tables/#why-a-catalog-should-accept-commits).

## Read the table

Query the table by its three-part name:

**Spark**

`managed_tables.py`

```python
spark.sql("""
    SELECT sku, qty
    FROM inventory.stock.items
    ORDER BY sku
""").show()
```

```text
+-----+---+
|  sku|qty|
+-----+---+
|apple| 10|
| pear|  9|
+-----+---+
```

**DuckDB**

`managed_tables.py`

```python
con.sql("""
    SELECT sku, qty
    FROM inventory.stock.items
    ORDER BY sku
""").show()
```

```text
┌─────────┬───────┐
│   sku   │  qty  │
│ varchar │ int32 │
├─────────┼───────┤
│ apple   │    10 │
│ pear    │     9 │
└─────────┴───────┘
```

### Read an earlier version

To query the table as it was at an earlier version, add `VERSION AS OF` in Spark:

`managed_tables.py`

```python
spark.sql("""
    SELECT sku, qty
    FROM inventory.stock.items VERSION AS OF 1
    ORDER BY sku
""").show()
```

```text
+-----+---+
|  sku|qty|
+-----+---+
|apple| 10|
| pear|  4|
| plum|  0|
+-----+---+
```

Version 1 is the table after the first insert, before the update and delete.

## Don't write to the table's path

> **Warning**
>
> Always use the table's name. Clients that open a catalog-managed table by its path refuse to read or write it:
>
> - Spark fails with `[DELTA_PATH_BASED_ACCESS_TO_CATALOG_MANAGED_TABLE_BLOCKED] Path-based access is not allowed for Catalog-Managed table`.
> - `deltalake`, and Polars, Daft, and pandas through it, fail with `Max catalog version is required when loading a catalog-managed table`.
>
> A tool that writes files to the path anyway bypasses the server's commit acceptance, so the catalog never accepts its version. Anyone who can reach the storage directly also bypasses the catalog's grants.

## Drop a managed table

Drop the table in Spark:

`managed_tables.py`

```python
spark.sql("DROP TABLE inventory.stock.items")
```

> **Danger**
>
> Dropping removes the table from the catalog right away. The server deletes its files once `server.storage-cleanup.initial-delay` has passed, 7 days by default. Keep a copy of any data you need before you drop the table.

The server deletes the files only if it can write to them.

## Required privileges

With authorization enabled, each task needs these privileges. Owners have all of them.

| Task                           | Privileges                                                                  |
| ------------------------------ | --------------------------------------------------------------------------- |
| Create a table                 | `USE CATALOG` on the catalog, `USE SCHEMA` and `CREATE TABLE` on the schema |
| Read a table                   | `USE CATALOG`, `USE SCHEMA`, and `SELECT` on the table                      |
| Append, update, or delete rows | `USE CATALOG`, `USE SCHEMA`, and `SELECT` and `MODIFY` on the table         |
| Drop a table                   | Owner of the table, or of its schema or catalog                             |

See [Ownership and privileges](https://unitycatalog.io/docs/explanation/uc-basics/#ownership-and-privileges).

## Next steps

- [Create and update a catalog-managed Delta table](https://unitycatalog.io/docs/tutorials/managed-delta-table/) walks the same lifecycle step by step.
- [Use Spark with Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark/) configures authentication and credential options for the connector.
- [Use DuckDB with Unity Catalog](https://unitycatalog.io/docs/how-to/duckdb/) covers DuckDB's secrets and table listing.
- [External tables and catalog-managed Delta tables](https://unitycatalog.io/docs/explanation/external-and-managed-tables/) explains how the server accepts commits.
