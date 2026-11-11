---
title: Manage SQL views
summary: Create, query, and inspect SQL views in Unity Catalog, and drop and
  recreate a view to change it.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/sql-views/
companions:
  - url: "https://unitycatalog.io/docs/how-to/sql-views/snippets/register_view.py"
    kind: python
    purpose: "Register a SQL view through the Unity Catalog REST API, then query it with"
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/sql-views/snippets/register_view.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/sql-views/snippets/sql_views.py"
    kind: python
    purpose: "Create, query, list, inspect, change, and drop SQL views over the TPC-H sample."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/sql-views/snippets/sql_views.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/sql-views/snippets/sql_views_spark41.py"
    kind: python
    purpose: "Compatibility evidence: Spark 4.1 reads Unity Catalog views but can't"
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/sql-views/snippets/sql_views_spark41.py"
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

- [`register_view.py`](https://unitycatalog.io/docs/how-to/sql-views/snippets/register_view.py) (Python): Register a SQL view through the Unity Catalog REST API, then query it with
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/sql-views/snippets/register_view.py`
- [`sql_views.py`](https://unitycatalog.io/docs/how-to/sql-views/snippets/sql_views.py) (Python): Create, query, list, inspect, change, and drop SQL views over the TPC-H sample.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/sql-views/snippets/sql_views.py`
- [`sql_views_spark41.py`](https://unitycatalog.io/docs/how-to/sql-views/snippets/sql_views_spark41.py) (Python): Compatibility evidence: Spark 4.1 reads Unity Catalog views but can't
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/sql-views/snippets/sql_views_spark41.py`

A SQL view stores its query text and output columns in Unity Catalog. The engine that reads the view expands the query and runs it. For how views fit next to tables and metric views, see [SQL views and metric views](https://unitycatalog.io/docs/explanation/views-and-metric-views/). Creating a view with SQL needs Spark 4.2 and the Unity Catalog connector. You can also register one through the REST API.

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - The TPC-H sample in `samples.tpch`: [Seed TPC-H data into Unity Catalog](https://unitycatalog.io/docs/how-to/seed-tpch-data/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/).
> - [Java 17](https://adoptium.net/temurin/releases/?version=17).

## Connect Spark

Start Python with Spark 4.2:

```bash
uv run --with pyspark==4.2.0 python
```

Then create a session with the Unity Catalog connector built for Spark 4.2, and register the catalog that holds your views and their source tables:

`sql_views.py`

```python
from pyspark.sql import SparkSession

UC_SPARK = "io.unitycatalog:unitycatalog-spark_4.2_2.13:0.7.0"
DELTA_SPARK = "io.delta:delta-spark_4.2_2.13:4.4.1"
CATALOG = "spark.sql.catalog.samples"

options = [
    ("spark.jars.packages", f"{UC_SPARK},{DELTA_SPARK}"),
    ("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension"),
    (
        "spark.sql.catalog.spark_catalog",
        "org.apache.spark.sql.delta.catalog.DeltaCatalog",
    ),
    (CATALOG, "io.unitycatalog.spark.UCSingleCatalog"),
    (f"{CATALOG}.uri", "http://localhost:8080"),
    (f"{CATALOG}.auth.type", "static"),
    (f"{CATALOG}.auth.token", "not-used"),
]
builder = SparkSession.builder.appName("sql-views")
for key, value in options:
    builder = builder.config(key, value)
spark = builder.getOrCreate()
```

## Create a view

Run `CREATE VIEW` with a query over catalog tables. A column list after the name renames the query's output columns, and `COMMENT` describes the view:

`sql_views.py`

```python
spark.sql("""
    CREATE VIEW samples.tpch.customer_orders (
        order_key, order_date, total_price, customer, market_segment
    )
    COMMENT 'Orders with the name and market segment of the customer who placed them'
    AS SELECT o.o_orderkey, o.o_orderdate, o.o_totalprice, c.c_name, c.c_mktsegment
    FROM samples.tpch.orders AS o
    JOIN samples.tpch.customer AS c ON o.o_custkey = c.c_custkey
""")
```

A name that's already taken fails with `Table already exists: samples.tpch.customer_orders`, whether a table or a view holds it.

## Query it

Select from the view like a table. Spark expands the stored query, so the result equals the join written by hand:

`sql_views.py`

```python
spark.sql("""
    SELECT market_segment, COUNT(*) AS orders, SUM(total_price) AS revenue
    FROM samples.tpch.customer_orders
    GROUP BY market_segment
    ORDER BY market_segment
""").show()
```

```text
+--------------+------+------------+
|market_segment|orders|     revenue|
+--------------+------+------------+
|    AUTOMOBILE|  2979|422504101.48|
|      BUILDING|  3706|530903495.60|
|     FURNITURE|  3007|419951999.46|
|     HOUSEHOLD|  2772|394447069.86|
|     MACHINERY|  2536|359590163.62|
+--------------+------+------------+
```

A view in one catalog can read tables in another, as long as the session registers both catalogs. This view lives in `unity.default` and reads `samples.tpch.orders`:

`sql_views.py`

```python
for key, value in [
    ("spark.sql.catalog.unity", "io.unitycatalog.spark.UCSingleCatalog"),
    ("spark.sql.catalog.unity.uri", "http://localhost:8080"),
    ("spark.sql.catalog.unity.auth.type", "static"),
    ("spark.sql.catalog.unity.auth.token", "not-used"),
]:
    spark.conf.set(key, value)

spark.sql("""
    CREATE VIEW unity.default.open_orders
    AS SELECT o_orderkey, o_orderdate, o_totalprice
    FROM samples.tpch.orders
    WHERE o_orderstatus = 'O'
""")
spark.sql("SELECT COUNT(*) FROM unity.default.open_orders").show()
```

```text
+--------+
|count(1)|
+--------+
|    7333|
+--------+
```

Reading through a view also needs access to its source tables. See [permissions on views](https://unitycatalog.io/docs/explanation/views-and-metric-views/#permissions).

## List and inspect views

`SHOW VIEWS` lists only a schema's views. `SHOW TABLES` lists them with the schema's tables:

`sql_views.py`

```python
spark.sql("SHOW VIEWS IN samples.tpch").show()
```

```text
+---------+---------------+-----------+
|namespace|       viewName|isTemporary|
+---------+---------------+-----------+
|     tpch|customer_orders|      false|
+---------+---------------+-----------+
```

`DESCRIBE EXTENDED` returns the view's columns and their types, its comment, the type `VIEW`, and the stored query:

`sql_views.py`

```python
details = dict(
    spark.sql("DESCRIBE EXTENDED samples.tpch.customer_orders")
    .select("col_name", "data_type")
    .collect()
)
print(details["Type"])
print(details["View Text"])
```

```text
VIEW
SELECT o.o_orderkey, o.o_orderdate, o.o_totalprice, c.c_name, c.c_mktsegment
    FROM samples.tpch.orders AS o
    JOIN samples.tpch.customer AS c ON o.o_custkey = c.c_custkey
```

## Change or rename a view

> **Note**
>
> A view can't be changed in place. `CREATE OR REPLACE VIEW`, `ALTER VIEW … AS`, and `ALTER VIEW … SET TBLPROPERTIES` fail with `Replacing a view is not supported yet`. `ALTER VIEW … RENAME TO` fails with `Renaming a view is not supported yet`.

To change a view, drop it and create it again. This version adds the customer's nation:

`sql_views.py`

```python
spark.sql("DROP VIEW samples.tpch.customer_orders")
spark.sql("""
    CREATE VIEW samples.tpch.customer_orders (
        order_key, order_date, total_price, customer, market_segment, nation
    )
    COMMENT 'Orders with the name, market segment, and nation of the customer who placed them'
    AS SELECT o.o_orderkey, o.o_orderdate, o.o_totalprice, c.c_name, c.c_mktsegment,
              n.n_name
    FROM samples.tpch.orders AS o
    JOIN samples.tpch.customer AS c ON o.o_custkey = c.c_custkey
    JOIN samples.tpch.nation AS n ON c.c_nationkey = n.n_nationkey
""")
```

To rename a view, create it under the new name, then drop the old one.

> **Warning**
>
> Between the drop and the create, queries against the name fail. Run the change when nothing reads the view, or create the new version under a new name first and move readers over.

## Register a view through the REST API

You can store a view without Spark, for example from a deployment pipeline, as a table of type `VIEW`. The server checks three fields:

- `view_definition`: the query. Without it, the request fails with `view_definition is required for view`.
- `columns`: at least one output column, with its type. An empty list fails with `columns must contain at least one entry for view`, and the client models reject a request that leaves `columns` out before sending it.
- `view_dependencies`: optional. Every table you list must exist, or the request fails with `View dependency table does not exist: …`.

From a Python session with the Unity Catalog client, with no `samples.tpch.orders_by_status` in the catalog yet:

```bash
uv run --with unitycatalog-client==0.7.0 python -m asyncio
```

`register_view.py`

```python
import json

from unitycatalog.client import (
    ApiClient,
    Configuration,
    CreateTable,
    TablesApi,
)
from unitycatalog.client.models import (
    ColumnInfo,
    ColumnTypeName,
    Dependency,
    DependencyList,
    TableDependency,
    TableType,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
api = ApiClient(config)
tables = TablesApi(api)

def column(position, name, type_name, type_text, **decimal):
    return ColumnInfo(
        name=name,
        position=position,
        type_name=type_name,
        type_text=type_text,
        type_json=json.dumps(
            {"name": name, "type": type_text, "nullable": True, "metadata": {}}
        ),
        nullable=True,
        **decimal,
    )

await tables.create_table(
    CreateTable(
        name="orders_by_status",
        catalog_name="samples",
        schema_name="tpch",
        table_type=TableType.VIEW,
        view_definition=(
            "SELECT o_orderstatus, COUNT(*) AS orders,"
            " SUM(o_totalprice) AS revenue"
            " FROM samples.tpch.orders GROUP BY o_orderstatus"
        ),
        view_dependencies=DependencyList(
            dependencies=[
                Dependency(
                    table=TableDependency(table_full_name="samples.tpch.orders")
                )
            ]
        ),
        columns=[
            column(0, "o_orderstatus", ColumnTypeName.STRING, "string"),
            column(1, "orders", ColumnTypeName.LONG, "long"),
            column(
                2,
                "revenue",
                ColumnTypeName.DECIMAL,
                "decimal(25,2)",
                type_precision=25,
                type_scale=2,
            ),
        ],
    )
)
```

Find and read registered views with the same API. A view's `storage_location` is empty:

`register_view.py`

```python
listed = await tables.list_tables(catalog_name="samples", schema_name="tpch")
print([t.name for t in listed.tables if t.table_type == TableType.VIEW])

view = await tables.get_table("samples.tpch.orders_by_status")
print([c.name for c in view.columns])
print(view.view_definition)
print(view.view_dependencies)
```

```text
['orders_by_status']
['o_orderstatus', 'orders', 'revenue']
SELECT o_orderstatus, COUNT(*) AS orders, SUM(o_totalprice) AS revenue FROM samples.tpch.orders GROUP BY o_orderstatus
dependencies=[Dependency(table=TableDependency(table_full_name='samples.tpch.orders'), function=None)]
```

Spark 4.2 queries and lists a registered view like one it created.

## Drop a view

Drop a view with `DROP VIEW` from Spark 4.2:

`sql_views.py`

```python
spark.sql("DROP VIEW samples.tpch.customer_orders")
```

Or delete it through the REST API with `delete_table`:

`register_view.py`

```python
await tables.delete_table("samples.tpch.orders_by_status")
```

Either way, the view's source tables stay in place.

## Related

- [Learn how SQL views and metric views work](https://unitycatalog.io/docs/explanation/views-and-metric-views/)
- [Manage metric views](https://unitycatalog.io/docs/how-to/metric-views/)
- [Working with metric views](https://unitycatalog.io/docs/tutorials/first-metric-view/)
- [Configure Spark to use Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark/)
- [Learn how ownership and privileges work](https://unitycatalog.io/docs/explanation/uc-basics/#ownership-and-privileges)
