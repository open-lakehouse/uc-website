---
title: Manage table schemas and properties
summary: Change a Unity Catalog managed table's columns and properties through
  Spark; change an external table with Spark or deltalake, then sync the
  catalog's record.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/change-table-schema/
companions:
  - url: "https://unitycatalog.io/docs/how-to/change-table-schema/snippets/change_schema.py"
    kind: python
    purpose: "Change a managed Delta table's columns and properties with Spark, and check"
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/change-table-schema/snippets/change_schema.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/change-table-schema/snippets/change_schema.sh"
    kind: shell
    purpose: "Show what Unity Catalog records for a table after a schema change, with the uc CLI."
    run: "bash change_schema.sh"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/change-table-schema/snippets/change_schema.sql"
    kind: sql
    purpose: "Change a managed Delta table's columns and properties, rename it by copying, and change an external table's Delta log. Enter the statements in the spark-sql shell that spark_sql.sh starts."
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/change-table-schema/snippets/delta_api.py"
    kind: python
    purpose: "Change an external table's columns, comment, and properties with Spark, then"
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/change-table-schema/snippets/delta_api.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/change-table-schema/snippets/external_deltalake.py"
    kind: python
    purpose: "Change an external Delta table's columns, comment, and properties with"
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/change-table-schema/snippets/external_deltalake.py"
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

- [`change_schema.py`](https://unitycatalog.io/docs/how-to/change-table-schema/snippets/change_schema.py) (Python): Change a managed Delta table's columns and properties with Spark, and check
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/change-table-schema/snippets/change_schema.py`
- [`change_schema.sh`](https://unitycatalog.io/docs/how-to/change-table-schema/snippets/change_schema.sh) (Shell): Show what Unity Catalog records for a table after a schema change, with the uc CLI.
  - run: `bash change_schema.sh` from `uc-docs-env/unitycatalog`
- [`change_schema.sql`](https://unitycatalog.io/docs/how-to/change-table-schema/snippets/change_schema.sql) (SQL): Change a managed Delta table's columns and properties, rename it by copying, and change an external table's Delta log. Enter the statements in the spark-sql shell that spark_sql.sh starts.
  - run: enter its statements in the SQL shell the page opens
- [`delta_api.py`](https://unitycatalog.io/docs/how-to/change-table-schema/snippets/delta_api.py) (Python): Change an external table's columns, comment, and properties with Spark, then
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/change-table-schema/snippets/delta_api.py`
- [`external_deltalake.py`](https://unitycatalog.io/docs/how-to/change-table-schema/snippets/external_deltalake.py) (Python): Change an external Delta table's columns, comment, and properties with
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/change-table-schema/snippets/external_deltalake.py`

Unity Catalog keeps two records of a Delta table: the Delta log in storage, and its own record of the table's columns, comment, and properties. A safe change leaves the two in agreement.

- **Managed tables:** Spark commits each change through the catalog, so both records move together.
- **External tables:** Spark and deltalake (delta-rs) write only the Delta log, so you sync the catalog's record afterwards.

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/).
> - [Java 17](https://adoptium.net/temurin/releases/?version=17), for Spark.
> - A catalog with managed storage, as in [Create and update a catalog-managed Delta table](https://unitycatalog.io/docs/tutorials/managed-delta-table/#give-a-catalog-managed-storage). The examples call it `warehouse`.
> - For the external-table steps, the external Delta table `warehouse.sales.order_events` at `file:///tmp/uc-docs/order_events`, with the columns `order_id` (`bigint`) and `status` (`string`). The delta-rs · Python setup below writes and registers it. For more on registering external tables, see [Register external Delta table](https://unitycatalog.io/docs/how-to/register-external-table/#register-the-table).

## Choose a client

| Client                                                | Managed table                                                                                                                         | External table                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spark with the Unity Catalog connector, SQL or Python | Yes. Each statement is one Delta commit that the catalog accepts.                                                                     | Yes, in the Delta log. Then sync the catalog's record.                                                                                                                                                                                                                                             |
| deltalake (delta-rs)                                  | No. Opening the table fails with `Max catalog version is required when loading a catalog-managed table`.                              | Yes, in the Delta log. It changes columns in place only by adding them, setting their metadata, or relaxing `NOT NULL`. Dropping, renaming, or changing the type of a column means overwriting the table with `schema_mode="overwrite"`, which rewrites every row. Then sync the catalog's record. |
| DuckDB, `unity_catalog` extension                     | No. `ALTER TABLE` fails with `UCTableSet::AlterTable`, and `COMMENT ON TABLE` fails with `Only altering tables is supported for now`. | No. Same errors, and `ALTER TABLE … SET (key = value)` fails with `UCTableSet::AlterTable`.                                                                                                                                                                                                        |
| `uc` CLI, Python SDK                                  | No. The tables API has no update. Use them to check the record.                                                                       | No. The tables API has no update. Use them to check the record, or to drop and register the table again.                                                                                                                                                                                           |

## Set up the client

**Spark · SQL**

Start the Spark SQL shell with Delta Lake and the Unity Catalog connector:

`spark_sql.sh`

```bash
uvx --from pyspark==4.1.0 spark-sql \
  --packages io.unitycatalog:unitycatalog-spark_4.1_2.13:0.7.0,io.delta:delta-spark_4.1_2.13:4.3.1 \
  --conf spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension \
  --conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog \
  --conf spark.sql.catalog.warehouse=io.unitycatalog.spark.UCSingleCatalog \
  --conf spark.sql.catalog.warehouse.uri=http://localhost:8080 \
  --conf spark.sql.catalog.warehouse.auth.type=static \
  --conf spark.sql.catalog.warehouse.auth.token=not-used \
  --conf spark.sql.defaultCatalog=warehouse
```

**Spark · Python**

Start Python with PySpark and the Unity Catalog client:

```bash
uv run --with pyspark==4.1.0 --with unitycatalog-client==0.7.0 python
```

Then start a Spark session that knows your catalog:

`change_schema.py`

```python
from pyspark.sql import SparkSession  # noqa: E402

spark = (
    SparkSession.builder.appName("change-schema")
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
    .config("spark.sql.catalog.warehouse", "io.unitycatalog.spark.UCSingleCatalog")
    .config("spark.sql.catalog.warehouse.uri", "http://localhost:8080")
    .config("spark.sql.catalog.warehouse.auth.type", "static")
    .config("spark.sql.catalog.warehouse.auth.token", "not-used")
    .config("spark.sql.defaultCatalog", "warehouse")
    .getOrCreate()
)
```

**delta-rs · Python**

deltalake changes external tables only. Start Python with it and the Unity Catalog client:

```bash
uv run --with deltalake==1.6.6 --with unitycatalog-client==0.7.0 python -m asyncio
```

The external-table examples change `warehouse.sales.order_events`. To follow along, write a two-row Delta table and register it:

`external_deltalake.py`

```python
import pyarrow as pa
from deltalake import write_deltalake
from unitycatalog.client import ApiClient, Configuration, CreateTable, TablesApi
from unitycatalog.client.models import (
    ColumnInfo,
    ColumnTypeName,
    DataSourceFormat,
    TableType,
)

location = "file:///tmp/uc-docs/order_events"
events = pa.table(
    {
        "order_id": pa.array([1, 2], pa.int64()),
        "status": ["created", "shipped"],
    }
)
write_deltalake(location, events)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
api = ApiClient(config)
await TablesApi(api).create_table(
    CreateTable(
        name="order_events",
        catalog_name="warehouse",
        schema_name="sales",
        table_type=TableType.EXTERNAL,
        data_source_format=DataSourceFormat.DELTA,
        storage_location=location,
        columns=[
            ColumnInfo(
                name="order_id",
                type_name=ColumnTypeName.LONG,
                type_text="bigint",
                type_json='{"name": "order_id", "type": "long", "nullable": true, "metadata": {}}',
                position=0,
                nullable=True,
            ),
            ColumnInfo(
                name="status",
                type_name=ColumnTypeName.STRING,
                type_text="string",
                type_json='{"name": "status", "type": "string", "nullable": true, "metadata": {}}',
                position=1,
                nullable=True,
            ),
        ],
    )
)
```

[Use Spark with Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark/) explains each Spark setting. The managed-table examples change the following table. To follow along, create it with Spark:

**Spark · SQL**

`change_schema.sql`

```sql
CREATE SCHEMA IF NOT EXISTS sales;
CREATE TABLE sales.orders (
  order_id    BIGINT,
  customer    STRING,
  amount      DECIMAL(10, 2),
  quantity    INT,
  legacy_code STRING
) USING DELTA;
INSERT INTO sales.orders VALUES
  (1, 'ada', 9.50, 1, 'A'),
  (2, 'grace', 20.00, 2, 'B');
```

**Spark · Python**

`change_schema.py`

```python
spark.sql("CREATE SCHEMA IF NOT EXISTS sales")
spark.sql("""
    CREATE TABLE sales.orders (
        order_id    BIGINT,
        customer    STRING,
        amount      DECIMAL(10, 2),
        quantity    INT,
        legacy_code STRING
    ) USING DELTA
""")
spark.sql("""
    INSERT INTO sales.orders VALUES
        (1, 'ada', 9.50, 1, 'A'),
        (2, 'grace', 20.00, 2, 'B')
""")
```

## Add columns and comments

To add a column, and to comment on a column or on the table, run:

**Spark · SQL**

`change_schema.sql`

```sql
ALTER TABLE sales.orders
  ADD COLUMNS (channel STRING COMMENT 'Where the order was placed');
ALTER TABLE sales.orders ALTER COLUMN amount COMMENT 'Order total in EUR';
COMMENT ON TABLE sales.orders IS 'One row per customer order';
```

**Spark · Python**

`change_schema.py`

```python
spark.sql("""
    ALTER TABLE sales.orders
    ADD COLUMNS (channel STRING COMMENT 'Where the order was placed')
""")
spark.sql("ALTER TABLE sales.orders ALTER COLUMN amount COMMENT 'Order total in EUR'")
spark.sql("COMMENT ON TABLE sales.orders IS 'One row per customer order'")
```

## Drop or widen a column

Dropping a column needs column mapping. With it, Delta drops the column without rewriting the data files; see [Delta column mapping](https://github.com/delta-io/delta/blob/v4.4.0/docs/src/content/docs/delta-column-mapping.mdx). Spark creates managed tables with column mapping on by default (`name`). To check a table first, run:

**Spark · SQL**

`change_schema.sql`

```sql
SHOW TBLPROPERTIES sales.orders ('delta.columnMapping.mode');
```

**Spark · Python**

`change_schema.py`

```python
spark.sql("SHOW TBLPROPERTIES sales.orders ('delta.columnMapping.mode')").show(
    truncate=False
)
```

```text
+------------------------+-----+
|key                     |value|
+------------------------+-----+
|delta.columnMapping.mode|name |
+------------------------+-----+
```

Then drop the column:

**Spark · SQL**

`change_schema.sql`

```sql
ALTER TABLE sales.orders DROP COLUMN legacy_code;
```

**Spark · Python**

`change_schema.py`

```python
spark.sql("ALTER TABLE sales.orders DROP COLUMN legacy_code")
```

A table created with column mapping off (`none`) can't drop columns this way: Spark fails with `DELTA_UNSUPPORTED_DROP_COLUMN`.

To change a column to a wider type, such as `INT` to `BIGINT`, turn on type widening first. Without it, Delta rejects the change with `DELTA_UNSUPPORTED_ALTER_TABLE_CHANGE_COL_OP`:

**Spark · SQL**

`change_schema.sql`

```sql
ALTER TABLE sales.orders SET TBLPROPERTIES ('delta.enableTypeWidening' = 'true');
ALTER TABLE sales.orders ALTER COLUMN quantity TYPE BIGINT;
```

**Spark · Python**

`change_schema.py`

```python
spark.sql(
    "ALTER TABLE sales.orders SET TBLPROPERTIES ('delta.enableTypeWidening' = 'true')"
)
spark.sql("ALTER TABLE sales.orders ALTER COLUMN quantity TYPE BIGINT")
```

## Set and remove table properties

Give the properties you add a prefix of your own, such as `sales.`. `SET TBLPROPERTIES` adds or changes them, and `UNSET TBLPROPERTIES` removes them:

**Spark · SQL**

`change_schema.sql`

```sql
ALTER TABLE sales.orders
  SET TBLPROPERTIES ('sales.owner' = 'orders-team', 'sales.tier' = 'gold');
ALTER TABLE sales.orders UNSET TBLPROPERTIES ('sales.tier');
SHOW TBLPROPERTIES sales.orders ('sales.owner');
```

**Spark · Python**

`change_schema.py`

```python
spark.sql("""
    ALTER TABLE sales.orders
    SET TBLPROPERTIES ('sales.owner' = 'orders-team', 'sales.tier' = 'gold')
""")
spark.sql("ALTER TABLE sales.orders UNSET TBLPROPERTIES ('sales.tier')")
spark.sql("SHOW TBLPROPERTIES sales.orders ('sales.owner')").show()
```

```text
+-----------+-----------+
|        key|      value|
+-----------+-----------+
|sales.owner|orders-team|
+-----------+-----------+
```

> **Info**
>
> The server requires these values when it creates a managed table, as the guide *Read and write catalog-managed Delta tables* describes:
>
> - `delta.enableDeletionVectors = true`
> - `delta.checkpointPolicy = v2`
> - `delta.enableInCommitTimestamps = true`
> - `delta.checkpoint.writeStatsAsStruct = true`
> - `delta.checkpoint.writeStatsAsJson = true`
>
> After the create, only the in-commit timestamp property is protected: Delta rejects a change to it with `[DELTA_CANNOT_MODIFY_CATALOG_MANAGED_DEPENDENCIES] Cannot override or unset in-commit timestamp table properties because this table is catalog-managed.` Spark commits a change to any of the other four, and the catalog records it. Leave all five as they are.

## Check what the catalog records

Each statement above added one version to the table's history:

**Spark · SQL**

`change_schema.sql`

```sql
DESCRIBE HISTORY sales.orders;
```

**Spark · Python**

`change_schema.py`

```python
spark.sql("DESCRIBE HISTORY sales.orders").select("version", "operation").show()
```

```text
+-------+-------------------+
|version|          operation|
+-------+-------------------+
|      9|UNSET TBLPROPERTIES|
|      8|  SET TBLPROPERTIES|
|      7|      CHANGE COLUMN|
|      6|  SET TBLPROPERTIES|
|      5|       DROP COLUMNS|
|      4|  SET TBLPROPERTIES|
|      3|      CHANGE COLUMN|
|      2|        ADD COLUMNS|
|      1|              WRITE|
|      0|       CREATE TABLE|
+-------+-------------------+
```

The catalog accepted each commit and updated its record of the table with it. To see that record:

**uc CLI**

With the `uc` shortcut from [Create your first catalog](https://unitycatalog.io/docs/tutorials/getting-started/#define-a-shortcut-for-the-cli), run:

`change_schema.sh`

```bash
uc table get --full_name warehouse.sales.orders --output jsonPretty
```

The output lists `channel` with its comment, the table's `comment`, and `sales.owner` under `properties`.

**Python SDK**

In a Python session with the Unity Catalog client, run:

`change_schema.py`

```python
import asyncio  # noqa: E402

from unitycatalog.client import ApiClient, Configuration, TablesApi  # noqa: E402


async def show_table() -> None:
    config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
    async with ApiClient(config) as api:
        table = await TablesApi(api).get_table(full_name="warehouse.sales.orders")
    print(table.comment)
    for column in table.columns:
        print(column.name, column.type_text, column.comment)
    print(table.properties["sales.owner"])


asyncio.run(show_table())
```

```text
One row per customer order
order_id bigint None
customer string None
amount decimal(10,2) Order total in EUR
quantity bigint None
channel string Where the order was placed
orders-team
```

## Rename a table or column

The Unity Catalog connector for Spark rejects both renames. `ALTER TABLE … RENAME COLUMN` fails with `ALTER TABLE RENAME COLUMN is not supported for Unity Catalog tables yet`, and `ALTER TABLE … RENAME TO` fails with `Renaming a table is not supported yet`.

To rename a table, create a table under the new name from the old one, then drop the old one:

**Spark · SQL**

`change_schema.sql`

```sql
CREATE TABLE sales.customer_orders USING DELTA AS SELECT * FROM sales.orders;
DROP TABLE sales.orders;
```

**Spark · Python**

`change_schema.py`

```python
spark.sql(
    "CREATE TABLE sales.customer_orders USING DELTA AS SELECT * FROM sales.orders"
)
spark.sql("DROP TABLE sales.orders")
```

The new table starts its own history at version 0. The old table's history, its comment, and its properties, such as `sales.owner`, don't carry over.

## Change an external table

An external table's writers commit to its Delta log without the catalog, so the catalog's record [can fall out of step with the files](https://unitycatalog.io/docs/explanation/external-and-managed-tables/#what-clients-must-support). Change the log first, then sync the record. The examples use the external table `warehouse.sales.order_events`.

### Change the Delta log

To add a column, comment on a column and on the table, and set a property, run:

**Spark · SQL**

`change_schema.sql`

```sql
ALTER TABLE sales.order_events ADD COLUMNS (carrier STRING);
ALTER TABLE sales.order_events ALTER COLUMN status COMMENT 'Latest order status';
COMMENT ON TABLE sales.order_events IS 'One row per order event';
ALTER TABLE sales.order_events SET TBLPROPERTIES ('sales.owner' = 'orders-team');
```

**Spark · Python**

`delta_api.py`

```python
spark.sql("ALTER TABLE sales.order_events ADD COLUMNS (carrier STRING)")
spark.sql(
    "ALTER TABLE sales.order_events ALTER COLUMN status COMMENT 'Latest order status'"
)
spark.sql("COMMENT ON TABLE sales.order_events IS 'One row per order event'")
spark.sql(
    "ALTER TABLE sales.order_events SET TBLPROPERTIES ('sales.owner' = 'orders-team')"
)
```

**delta-rs · Python**

deltalake opens the table by its storage location, which the Python SDK returns:

`external_deltalake.py`

```python
from deltalake import DeltaTable
from unitycatalog.client import ApiClient, Configuration, TablesApi

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
api = ApiClient(config)
table = await TablesApi(api).get_table(full_name="warehouse.sales.order_events")
dt = DeltaTable(table.storage_location)
```

Then change it:

`external_deltalake.py`

```python
from deltalake import Field

dt.alter.add_columns(Field("carrier", "string"))
dt.alter.set_column_metadata("status", {"comment": "Latest order status"})
dt.alter.set_table_description("One row per order event")
dt.alter.set_table_properties(
    {"sales.owner": "orders-team"}, raise_if_not_exists=False
)
```

deltalake accepts only the `delta.*` property keys it knows. A custom key such as `sales.owner` needs `raise_if_not_exists=False`. Without it, the call fails with `Error parsing property 'sales.owner':'orders-team'`.

The Delta log now has every change. The catalog's record doesn't: its columns, column comments, table comment, and properties all stay as they were registered.

### Sync the catalog's record

Send the table's columns, comment, and properties from the Delta log to the catalog in one request to the Unity Catalog Delta API. You send it from Python. If you changed the table in the Spark SQL shell, use the delta-rs · Python tab, which reads the same Delta log: start its session as in [Set up the client](#set-up-the-client), and open the table as in [Change the Delta log](#change-the-delta-log).

These two helpers load a table and update it:

`delta_api.py`

```python
import json  # noqa: E402
import urllib.error  # noqa: E402
import urllib.request  # noqa: E402

TABLES = (
    "http://localhost:8080/api/2.1/unity-catalog"
    "/delta/v1/catalogs/warehouse/schemas/sales/tables"
)


def load_table(name: str) -> dict:
    with urllib.request.urlopen(f"{TABLES}/{name}") as resp:
        return json.load(resp)["metadata"]


def update_table(name: str, requirements: list, updates: list) -> dict:
    body = json.dumps({"requirements": requirements, "updates": updates}).encode()
    request = urllib.request.Request(
        f"{TABLES}/{name}",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request) as resp:
        return json.load(resp)["metadata"]
```

Then send what your engine reads from the Delta log:

**Spark · Python**

`delta_api.py`

```python
detail = spark.sql("DESCRIBE DETAIL sales.order_events").first()
metadata = load_table("order_events")
update_table(
    "order_events",
    requirements=[
        {"type": "assert-table-uuid", "uuid": metadata["table-uuid"]},
        {"type": "assert-etag", "etag": metadata["etag"]},
    ],
    updates=[
        {
            "action": "set-columns",
            "columns": spark.table("sales.order_events").schema.jsonValue(),
        },
        {"action": "set-table-comment", "comment": detail.description},
        {"action": "set-properties", "updates": detail.properties},
    ],
)
```

**delta-rs · Python**

`external_deltalake.py`

```python
dt = DeltaTable(table.storage_location)
metadata = load_table("order_events")
update_table(
    "order_events",
    requirements=[
        {"type": "assert-table-uuid", "uuid": metadata["table-uuid"]},
        {"type": "assert-etag", "etag": metadata["etag"]},
    ],
    updates=[
        {"action": "set-columns", "columns": json.loads(dt.schema().to_json())},
        {"action": "set-table-comment", "comment": dt.metadata().description},
        {"action": "set-properties", "updates": dt.metadata().configuration},
    ],
)
```

Load the table again and retry if the server returns HTTP 409 `UpdateRequirementConflictException`. It means the table changed after you loaded it, and the server applied none of the updates.

[The Unity Catalog Delta API](https://unitycatalog.io/docs/explanation/delta-api/) explains why the server checks requirements and applies updates all or nothing.

You can also drop the table from the catalog and register it again, as in [Register external Delta table](https://unitycatalog.io/docs/how-to/register-external-table/#change-a-registered-table).

## Required privileges

With authorization enabled, each task needs these privileges. Owners have all of them.

| Task                                                  | Privileges                                                                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Change a table's columns, comment, or properties      | Owner of the table, or of its schema or catalog                                                                                                                               |
| Rename a table by copying it                          | `USE CATALOG` on the catalog, `USE SCHEMA` and `CREATE TABLE` on the schema, `SELECT` on the old table, and ownership of the old table, its schema, or its catalog to drop it |
| Sync an external table's record through the Delta API | Not checked: the examples run without authorization                                                                                                                           |

See [Ownership and privileges](https://unitycatalog.io/docs/explanation/uc-basics/#ownership-and-privileges).

## Next steps

- [Create and update a catalog-managed Delta table](https://unitycatalog.io/docs/tutorials/managed-delta-table/) walks through a managed table's life from creation to drop.
- [Register external Delta table](https://unitycatalog.io/docs/how-to/register-external-table/) covers registering, reading, and dropping an external table.
- [Use Spark with Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark/) covers the session settings and storage credentials.
- [Learn how managed and external tables differ](https://unitycatalog.io/docs/explanation/external-and-managed-tables/) and why the catalog accepts each commit.
