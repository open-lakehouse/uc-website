---
title: Replace or overwrite a managed Delta table
summary: Replace a managed Delta table's definition and rows, all of its rows,
  or some of them with CREATE OR REPLACE, INSERT OVERWRITE, and REPLACE WHERE in
  Spark SQL.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/replace-and-overwrite-tables/
companions:
  - url: "https://unitycatalog.io/docs/how-to/replace-and-overwrite-tables/snippets/replace_overwrite.py"
    kind: python
    purpose: "Replace and overwrite a catalog-managed Delta table with Spark SQL."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/replace-and-overwrite-tables/snippets/replace_overwrite.py"
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

- [`replace_overwrite.py`](https://unitycatalog.io/docs/how-to/replace-and-overwrite-tables/snippets/replace_overwrite.py) (Python): Replace and overwrite a catalog-managed Delta table with Spark SQL.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/replace-and-overwrite-tables/snippets/replace_overwrite.py`

To replace data in a catalog-managed [Delta](https://delta.io "Open table-format specification: ACID transactions, schema evolution, and time travel over object storage.") table in [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification."), use `CREATE OR REPLACE TABLE` to change its columns and rows, `INSERT OVERWRITE` to swap all rows, and `INSERT INTO … REPLACE WHERE` or dynamic partition overwrite to swap some of them.

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/).
> - [Java 17](https://adoptium.net/temurin/releases/?version=17).
> - A catalog with managed storage and a schema in it, such as `replace_demo.sales`. See [Manage catalogs and schemas](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/).

## Set up the client

Open a Python session with PySpark:

```bash
uv run --with pyspark==4.1.0 python
```

The examples call `spark.sql` in a session whose default catalog is `replace_demo`:

`replace_overwrite.py`

```python
from pyspark.sql import SparkSession

```

`replace_overwrite.py`

```python
spark = (
    SparkSession.builder.appName("replace-orders")
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
    .config("spark.sql.catalog.replace_demo", "io.unitycatalog.spark.UCSingleCatalog")
    .config("spark.sql.catalog.replace_demo.uri", "http://localhost:8080")
    .config("spark.sql.catalog.replace_demo.auth.type", "static")
    .config("spark.sql.catalog.replace_demo.auth.token", "not-used")
    .config("spark.sql.defaultCatalog", "replace_demo")
    .getOrCreate()
)
```

[Use Spark with Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark/) explains each setting.

## Choose how to replace data

The statements differ in what they need to exist and what they replace:

| Statement                                           | If the table doesn't exist           | Columns                          | Partitioning                                        | What it replaces                                                           |
| --------------------------------------------------- | ------------------------------------ | -------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| `CREATE TABLE … AS SELECT`                          | Creates it                           | From the query                   | None, unless the statement has `PARTITIONED BY`     | Nothing. Fails with `TABLE_OR_VIEW_ALREADY_EXISTS` if the name is taken.   |
| `REPLACE TABLE … [AS SELECT]`                       | Fails with `TABLE_OR_VIEW_NOT_FOUND` | From the new definition or query | Only what the statement's `PARTITIONED BY` declares | The definition and all rows. Without `AS SELECT`, the table is left empty. |
| `CREATE OR REPLACE TABLE … [AS SELECT]`             | Creates it                           | From the new definition or query | Only what the statement's `PARTITIONED BY` declares | The definition and all rows                                                |
| `INSERT OVERWRITE`                                  | Fails with `TABLE_OR_VIEW_NOT_FOUND` | Kept. New rows must match them.  | Kept                                                | All rows                                                                   |
| `INSERT INTO … REPLACE WHERE`                       | Fails with `TABLE_OR_VIEW_NOT_FOUND` | Kept                             | Kept                                                | The rows that match the condition                                          |
| `INSERT OVERWRITE` with dynamic partition overwrite | Fails with `TABLE_OR_VIEW_NOT_FOUND` | Kept                             | Kept                                                | The partitions the new rows write to                                       |

## Create a table from a query

To create a managed table from the result of a query, use `CREATE TABLE … AS
SELECT` without a `LOCATION`:

`replace_overwrite.py`

```python
spark.sql("""
    CREATE TABLE sales.orders USING DELTA AS
    SELECT * FROM VALUES
        (1, 'ada',   9.50,  DATE'2026-10-01'),
        (2, 'grace', 20.00, DATE'2026-10-01'),
        (3, 'linus', 3.25,  DATE'2026-10-02')
    AS t(order_id, customer, amount, day)
""")
```

The new table is catalog-managed, like one made with `CREATE TABLE`, and its first version, 0, is a `CREATE TABLE AS SELECT`. It takes its four columns from the query and has no partition columns. Keep `USING DELTA`. Without it, Spark asks for the session's default format, and the statement fails with `Unity Catalog does not support non-Delta managed table`.

## Replace a table's definition and rows

To change a table's columns or partitioning and rewrite its rows in one commit, use `CREATE OR REPLACE TABLE … AS SELECT`. This statement adds a `tax` column and partitions the table by `day`:

`replace_overwrite.py`

```python
spark.sql("""
    CREATE OR REPLACE TABLE sales.orders USING DELTA
    PARTITIONED BY (day) AS
    SELECT *, amount * 0.20 AS tax FROM sales.orders
""")
```

> **Warning**
>
> The new version holds only the query's rows. To get the old rows back, read or restore the earlier version, as in [Check a replacement and undo it](#check-a-replacement-and-undo-it).

The query reads the table it replaces. The result is version 1 of the same table, with the same table ID and location. Version 0 still reads with its old four columns.

`REPLACE TABLE` does the same for a table that must already exist. Use it when replacing a table that isn't there should be an error rather than a new table.

## Overwrite all rows

To swap every row and keep the table's columns, use `INSERT OVERWRITE`:

`replace_overwrite.py`

```python
spark.sql("""
    INSERT OVERWRITE sales.orders VALUES
        (4, 'ada',   12.00, DATE'2026-10-03', 2.40),
        (5, 'grace', 8.00,  DATE'2026-10-03', 1.60),
        (6, 'linus', 5.00,  DATE'2026-10-04', 1.00)
""")
```

> **Warning**
>
> The new version holds only the new rows. To get the old rows back, read or restore the earlier version, as in [Check a replacement and undo it](#check-a-replacement-and-undo-it).

The table now holds orders 4, 5, and 6. The new rows must have every column of the table. Two values for this five-column table fail with `DELTA_INSERT_COLUMN_ARITY_MISMATCH`: `target table has 5 column(s) but the
inserted data has 2 column(s)`. To change the columns as well, replace the table instead.

## Overwrite some rows or partitions

### Replace the rows that match a condition

To replace only the rows that match a condition, use `INSERT INTO … REPLACE
WHERE`. This statement swaps the orders for October 3 for one new order:

`replace_overwrite.py`

```python
spark.sql("""
    INSERT INTO sales.orders
    REPLACE WHERE day = DATE'2026-10-03'
    VALUES (7, 'ada', 30.00, DATE'2026-10-03', 6.00)
""")
```

Order 6, from October 4, stays. Every new row must match the condition. A row outside it fails the whole statement with `DELTA_REPLACE_WHERE_MISMATCH`, and the table doesn't change.

### Overwrite the partitions the new rows write to

On a partitioned table, dynamic partition overwrite replaces only the partitions that the new rows land in. Turn it on for the session, run `INSERT OVERWRITE`, and turn it off again:

`replace_overwrite.py`

```python
spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")
spark.sql("""
    INSERT OVERWRITE sales.orders VALUES
        (8, 'grace', 4.00, DATE'2026-10-04', 0.80)
""")
spark.conf.unset("spark.sql.sources.partitionOverwriteMode")
```

The new order replaces order 6 in the October 4 partition. Order 7, on October 3, stays. While the setting is on, an `INSERT OVERWRITE` meant to replace the whole table keeps every partition its rows don't touch, so unset it after the write.

## Check a replacement and undo it

To see what each statement did, list the table's history:

`replace_overwrite.py`

```python
spark.sql("DESCRIBE HISTORY sales.orders").select("version", "operation").show(
    truncate=False
)
```

```text
+-------+---------------------------------+
|version|operation                        |
+-------+---------------------------------+
|4      |WRITE                            |
|3      |WRITE                            |
|2      |WRITE                            |
|1      |CREATE OR REPLACE TABLE AS SELECT|
|0      |CREATE TABLE AS SELECT           |
+-------+---------------------------------+
```

The overwrites are all `WRITE` operations. The `operationParameters` column tells them apart: `mode` is `Overwrite` for version 2, version 3 records the `REPLACE WHERE` condition as `predicate`, and version 4 has `isDynamicPartitionOverwrite` set to `true`.

To read the table as it was before a change, query an earlier version:

`replace_overwrite.py`

```python
spark.sql(
    "SELECT order_id, day FROM sales.orders VERSION AS OF 3 ORDER BY order_id"
).show()
```

```text
+--------+----------+
|order_id|       day|
+--------+----------+
|       6|2026-10-04|
|       7|2026-10-03|
+--------+----------+
```

To undo a change, restore that version:

`replace_overwrite.py`

```python
spark.sql("RESTORE TABLE sales.orders TO VERSION AS OF 3")
```

Restoring commits a new version, 5, whose operation is `RESTORE`. Versions 3 and 4 stay in the history.

> **Warning**
>
> Restoring and reading an earlier version need that version's data files. A replacement only marks the old files as removed; `VACUUM` deletes them once they're older than the table's `delta.deletedFileRetentionDuration`, 7 days by default. After that, the earlier version can't be read or restored. See [Data retention](https://github.com/delta-io/delta/blob/v4.4.0/docs/src/content/docs/delta-batch.mdx#data-retention) in the Delta docs.

## What a replacement can't change

A replacement keeps the table's identity. Statements that try to change it fail before they commit, and the table keeps its rows, ID, and history:

| You try to change                                                               | What you see                                                                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The format, for example `USING PARQUET`                                         | `Cannot change table format from DELTA to PARQUET`                                                        |
| The location, with `LOCATION`                                                   | `cannot specify 'location' or 'external': only catalog-managed Delta tables can be replaced on this path` |
| The table ID, with `TBLPROPERTIES ('io.unitycatalog.tableId' = …)`              | `cannot specify catalog-managed property 'io.unitycatalog.tableId'`                                       |
| The catalog-managed feature, with `'delta.feature.catalogManaged' = 'disabled'` | `cannot override 'delta.feature.catalogManaged'='disabled'; expected 'supported'`                         |
| An external table, with `CREATE OR REPLACE` or `REPLACE TABLE`                  | `REPLACE TABLE is only supported for catalog-managed UC Delta tables; … is EXTERNAL`                      |

Other table properties aren't protected this way. For example, a replacement with `TBLPROPERTIES ('delta.enableDeletionVectors' = 'false')` commits, and the table has deletion vectors off.

These statements are verified with Spark. DuckDB can't create a table from a query, and the `deltalake`-based clients can't open catalog-managed tables.

## Required privileges

With authorization enabled, each task needs these privileges. Owners have all of them.

| Task                                                           | Privileges                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Create a table from a query                                    | `USE CATALOG` on the catalog, `USE SCHEMA` and `CREATE TABLE` on the schema, and `SELECT` on the tables the query reads |
| Overwrite all rows, rows that match a condition, or partitions | `USE CATALOG`, `USE SCHEMA`, and `SELECT` and `MODIFY` on the table                                                     |
| Replace a table, or restore an earlier version                 | Owner of the table, or of its schema or catalog                                                                         |

See [Ownership and privileges](https://unitycatalog.io/docs/explanation/uc-basics/#ownership-and-privileges).

## Next steps

- [Read an earlier version](https://unitycatalog.io/docs/tutorials/managed-delta-table/#read-an-earlier-version) of a managed table, step by step.
- Learn how the catalog accepts each commit in [External tables and catalog-managed Delta tables](https://unitycatalog.io/docs/explanation/external-and-managed-tables/).
- To change rows in place, or a table's schema without rewriting it, see the guides *Read and write catalog-managed Delta tables* and *Change a table's schema and properties*.
