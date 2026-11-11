---
title: Manage metric views
summary: Keep metric-view definitions in YAML files, create them with Spark over
  tables or queries, register them through the REST API, and change or drop
  them.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/metric-views/
companions:
  - url: "https://unitycatalog.io/docs/how-to/metric-views/snippets/metric_views.py"
    kind: python
    purpose: "Create, query, inspect, change, and drop metric views over the TPC-H sample."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/metric-views/snippets/metric_views.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/metric-views/snippets/register_metric_view.py"
    kind: python
    purpose: "Register a metric view through the Unity Catalog REST API, then query it"
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/metric-views/snippets/register_metric_view.py"
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

- [`metric_views.py`](https://unitycatalog.io/docs/how-to/metric-views/snippets/metric_views.py) (Python): Create, query, inspect, change, and drop metric views over the TPC-H sample.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/metric-views/snippets/metric_views.py`
- [`register_metric_view.py`](https://unitycatalog.io/docs/how-to/metric-views/snippets/register_metric_view.py) (Python): Register a metric view through the Unity Catalog REST API, then query it
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/metric-views/snippets/register_metric_view.py`

A metric view stores dimensions and measures in Unity Catalog as YAML. The catalog keeps the definition, and the engine computes measures from it when you query. This guide uses Spark 4.2, the engine that runs metric views against Unity Catalog, over the TPC-H sample tables in `samples.tpch`. For a first walk-through on a small table, see [Working with metric views](https://unitycatalog.io/docs/tutorials/first-metric-view/).

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - The TPC-H sample in `samples.tpch`: [Seed TPC-H data into Unity Catalog](https://unitycatalog.io/docs/how-to/seed-tpch-data/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/).
> - [Java 17](https://adoptium.net/temurin/releases/?version=17).

## Connect Spark

Metric views need Spark 4.2 and the connector built for it:

```bash
uv run --with pyspark==4.2.0 python
```

Register every Unity Catalog catalog your metric views and their sources live in. A name in a catalog that the session doesn't know fails with `Nested namespaces are not supported`:

`metric_views.py`

```python
from pathlib import Path

from pyspark.sql import SparkSession


def uc_catalog(builder, name):
    prefix = f"spark.sql.catalog.{name}"
    return (
        builder.config(prefix, "io.unitycatalog.spark.UCSingleCatalog")
        .config(f"{prefix}.uri", "http://localhost:8080")
        .config(f"{prefix}.auth.type", "static")
        .config(f"{prefix}.auth.token", "not-used")
    )


builder = (
    SparkSession.builder.appName("metric-views")
    .config(
        "spark.jars.packages",
        "io.unitycatalog:unitycatalog-spark_4.2_2.13:0.7.0,"
        "io.delta:delta-spark_4.2_2.13:4.4.1",
    )
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
    .config(
        "spark.sql.catalog.spark_catalog",
        "org.apache.spark.sql.delta.catalog.DeltaCatalog",
    )
)
spark = uc_catalog(builder, "samples").getOrCreate()
```

## Write a definition

Keep each definition in a YAML file next to your other code, so that changes to a metric go through review like any other change. Spark reads these keys:

| Key          | What it holds                                                                 |
| ------------ | ----------------------------------------------------------------------------- |
| `version`    | `"0.1"`, quoted. Spark rejects other versions.                                |
| `source`     | A table or view name, or a `SELECT` query.                                    |
| `filter`     | Optional. A condition on source rows, applied before every measure.           |
| `dimensions` | The values you group and filter by: a `name` and an `expr` over a source row. |
| `measures`   | The aggregations you report: a `name` and an aggregate `expr`.                |

Save this definition as `orders_metrics.yaml`, in the folder you started Python in. A dimension can be any expression on a row, such as a `CASE` that turns codes into labels. A measure can combine aggregates, such as revenue divided by the number of distinct customers:

`orders_metrics.yaml`

```yaml
version: "0.1"
source: samples.tpch.orders
filter: o_orderdate >= DATE'1995-01-01'

dimensions:
  - name: Order Month
    expr: DATE_TRUNC('MONTH', o_orderdate)

  - name: Order Status
    expr: |-
      CASE o_orderstatus
        WHEN 'O' THEN 'Open'
        WHEN 'P' THEN 'Processing'
        WHEN 'F' THEN 'Fulfilled'
      END

measures:
  - name: Order Count
    expr: COUNT(1)

  - name: Total Revenue
    expr: SUM(o_totalprice)

  - name: Revenue per Customer
    expr: SUM(o_totalprice) / COUNT(DISTINCT o_custkey)
```

Each dimension and measure takes only `name` and `expr`. Spark rejects `comment`, `display_name`, `format`, and `synonyms`, as well as `joins` and any `version` but `"0.1"`. To join tables, write the join in the `source` query, as shown in [Compute over a query](#compute-over-a-query).

## Create the metric view

Pass the file's contents to `CREATE VIEW … WITH METRICS LANGUAGE YAML`:

`metric_views.py`

```python
definition = Path("orders_metrics.yaml").read_text()
spark.sql(f"""
    CREATE VIEW samples.tpch.orders_metrics
    WITH METRICS
    LANGUAGE YAML
    AS $$
{definition}
$$
""")
```

## Query it

Wrap each measure in `MEASURE()`. Group by any dimensions, filter on them in `WHERE`, or leave out `GROUP BY` for a total:

`metric_views.py`

```python
spark.sql("""
    SELECT `Order Status`, MEASURE(`Order Count`), MEASURE(`Total Revenue`)
    FROM samples.tpch.orders_metrics
    WHERE YEAR(`Order Month`) = 1995
    GROUP BY ALL
    ORDER BY `Order Status`
""").show()
```

```text
+------------+--------------------+----------------------+
|Order Status|measure(Order Count)|measure(Total Revenue)|
+------------+--------------------+----------------------+
|   Fulfilled|                 438|           56417430.31|
|        Open|                1403|          196330856.33|
|  Processing|                 363|           63339475.32|
+------------+--------------------+----------------------+
```

Spark computes each measure from the source rows that pass the definition's `filter` and the query's `WHERE`, so the result equals the aggregation written by hand. Selecting a measure column without `MEASURE()` fails.

## Compute over a query

When the source is a `SELECT`, the metric view computes over its result. Use this to join a fact table to its dimension tables:

`metric_views.py`

```python
spark.sql("""
CREATE VIEW samples.tpch.segment_metrics
WITH METRICS
LANGUAGE YAML
AS $$
version: "0.1"
source: >-
  SELECT o.o_totalprice, o.o_custkey, c.c_mktsegment
  FROM samples.tpch.orders AS o
  JOIN samples.tpch.customer AS c ON o.o_custkey = c.c_custkey
dimensions:
  - name: Market Segment
    expr: c_mktsegment
measures:
  - name: Total Revenue
    expr: SUM(o_totalprice)
  - name: Customers
    expr: COUNT(DISTINCT o_custkey)
$$
""")
spark.sql("""
    SELECT `Market Segment`, MEASURE(`Total Revenue`), MEASURE(`Customers`)
    FROM samples.tpch.segment_metrics
    GROUP BY ALL
    ORDER BY `Market Segment`
""").show()
```

```text
+--------------+----------------------+------------------+
|Market Segment|measure(Total Revenue)|measure(Customers)|
+--------------+----------------------+------------------+
|    AUTOMOBILE|          422504101.48|               199|
|      BUILDING|          530903495.60|               247|
|     FURNITURE|          419951999.46|               192|
|     HOUSEHOLD|          394447069.86|               185|
|     MACHINERY|          359590163.62|               177|
+--------------+----------------------+------------------+
```

## List and inspect metric views

Metric views are listed with a schema's views, and with its tables:

`metric_views.py`

```python
spark.sql("SHOW VIEWS IN samples.tpch").show()
```

```text
+---------+---------------+-----------+
|namespace|       viewName|isTemporary|
+---------+---------------+-----------+
|     tpch| orders_metrics|      false|
|     tpch|segment_metrics|      false|
+---------+---------------+-----------+
```

`DESCRIBE EXTENDED` returns the type, `METRIC_VIEW`, and the stored YAML:

`metric_views.py`

```python
details = dict(
    spark.sql("DESCRIBE EXTENDED samples.tpch.orders_metrics")
    .select("col_name", "data_type")
    .collect()
)
print(details["Type"])
print(details["View Text"])
```

## Change a definition

A metric view can't be replaced or renamed in place: `CREATE OR REPLACE VIEW` fails with `Replacing a view is not supported yet`, and `ALTER VIEW … RENAME TO` with `Renaming a view is not supported yet`. To change a definition, edit the file, then drop the metric view and create it again. For example, add a measure to the end of `orders_metrics.yaml`:

`new_measure.yaml`

```yaml
  - name: Average Order Value
    expr: AVG(o_totalprice)
```

Then recreate the view from the file:

`metric_views.py`

```python
spark.sql("DROP VIEW samples.tpch.orders_metrics")

definition = Path("orders_metrics.yaml").read_text()
spark.sql(f"""
    CREATE VIEW samples.tpch.orders_metrics
    WITH METRICS
    LANGUAGE YAML
    AS $$
{definition}
$$
""")
```

Between the drop and the create, queries against the name fail. Run the change when nothing reads the view, or create the new version under a new name first and move readers over.

## Register a definition through the REST API

You can store a definition without Spark, for example from a deployment pipeline, as a table of type `METRIC_VIEW`. The server requires two things that Spark otherwise fills in:

- `columns`: every dimension and then every measure, in order, with the type Spark computes for it. Spark uses these as the view's schema, so a wrong type fails at query time, with an error such as `Cannot up cast`. Read the types off `DESCRIBE` of a view Spark created from the same definition.
- `view_dependencies`: at least one table the definition reads.

From a Python session with the Unity Catalog client (`uv run --with unitycatalog-client==0.7.0 python`), in the folder with `orders_metrics.yaml`, and with no `samples.tpch.orders_metrics` in the catalog yet:

`register_metric_view.py`

```python
import json  # noqa: E402
from pathlib import Path  # noqa: E402

from unitycatalog.client import (  # noqa: E402
    ApiClient,
    Configuration,
    CreateTable,
    TablesApi,
)
from unitycatalog.client.models import (  # noqa: E402
    ColumnInfo,
    ColumnTypeName,
    Dependency,
    DependencyList,
    TableDependency,
    TableType,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")


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


async def register():
    async with ApiClient(config) as api:
        await TablesApi(api).create_table(
            CreateTable(
                name="orders_metrics",
                catalog_name="samples",
                schema_name="tpch",
                table_type=TableType.METRIC_VIEW,
                view_definition=Path("orders_metrics.yaml").read_text(),
                view_dependencies=DependencyList(
                    dependencies=[
                        Dependency(
                            table=TableDependency(table_full_name="samples.tpch.orders")
                        )
                    ]
                ),
                columns=[
                    column(0, "Order Month", ColumnTypeName.TIMESTAMP, "timestamp"),
                    column(1, "Order Status", ColumnTypeName.STRING, "string"),
                    column(2, "Order Count", ColumnTypeName.LONG, "long"),
                    column(
                        3,
                        "Total Revenue",
                        ColumnTypeName.DECIMAL,
                        "decimal(25,2)",
                        type_precision=25,
                        type_scale=2,
                    ),
                    column(
                        4,
                        "Revenue per Customer",
                        ColumnTypeName.DECIMAL,
                        "decimal(38,15)",
                        type_precision=38,
                        type_scale=15,
                    ),
                ],
            )
        )


asyncio.run(register())
```

The server stores the YAML as it is, without parsing it. It's checked only when an engine reads the view. Find and read registered metric views with the same API:

`register_metric_view.py`

```python
async def show():
    async with ApiClient(config) as api:
        tables = TablesApi(api)
        listed = await tables.list_tables(catalog_name="samples", schema_name="tpch")
        print([t.name for t in listed.tables if t.table_type == TableType.METRIC_VIEW])

        view = await tables.get_table("samples.tpch.orders_metrics")
        print([c.name for c in view.columns])
        print(view.view_dependencies)
        return view


view = asyncio.run(show())
```

```text
['orders_metrics']
['Order Month', 'Order Status', 'Order Count', 'Total Revenue', 'Revenue per Customer']
dependencies=[Dependency(table=TableDependency(table_full_name='samples.tpch.orders'), function=None)]
```

Spark queries a registered metric view like one it created. Delete it with `delete_table`:

`register_metric_view.py`

```python
async def delete():
    async with ApiClient(config) as api:
        await TablesApi(api).delete_table("samples.tpch.orders_metrics")


asyncio.run(delete())
```

## Drop a metric view

Dropping a metric view leaves its source tables in place:

`metric_views.py`

```python
spark.sql("DROP VIEW samples.tpch.segment_metrics")
spark.sql("DROP VIEW samples.tpch.orders_metrics")
```

## Related

- [Working with metric views](https://unitycatalog.io/docs/tutorials/first-metric-view/)
- [Learn how SQL views and metric views work](https://unitycatalog.io/docs/explanation/views-and-metric-views/)
- [Manage SQL views](https://unitycatalog.io/docs/how-to/sql-views/)
- [Configure Spark to use Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark/)
