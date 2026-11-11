---
title: Use Iceberg REST clients with Unity Catalog
summary: Connect Spark, DuckDB, PyIceberg, and DataFusion to Unity Catalog's
  Iceberg REST API, then create, write, change, rename, and drop managed Iceberg
  tables with vended S3 credentials.
diataxis: how-to
---

[Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") serves the
[Iceberg REST catalog API](https://iceberg.apache.org/rest-catalog-spec/ "Open specification for an Iceberg catalog served over REST: engines use it to create, load, and commit Iceberg tables through any conforming catalog."), so any client that speaks
it can create, write, read, rename, and drop [Iceberg](https://iceberg.apache.org "Open table-format specification for huge analytic datasets, with hidden partitioning and snapshot isolation.")
tables in a Unity Catalog catalog. The server allocates storage for each new
table and vends short-lived credentials for it, so clients never hold bucket
keys. Iceberg tables live next to Delta tables in the same schemas, under the
same privileges.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0 with simulated S3 and PostgreSQL, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/#start-the-server-with-simulated-s3).
- A catalog with managed storage on S3, such as `retail`:
  [Set managed storage for catalogs and schemas on S3](/docs/how-to/managed-storage-s3/).
- [uv](https://docs.astral.sh/uv/getting-started/installation/).
- [Java 17](https://adoptium.net/temurin/releases/?version=17), for Spark.
- [Rust](https://www.rust-lang.org/tools/install), for DataFusion.
:::

## How Iceberg names map to the catalog

Every client is configured with the same three values:

| Iceberg REST setting | Value                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog URI          | `http://localhost:8080/api/2.1/unity-catalog/iceberg`                                                                                           |
| Warehouse            | The name of one Unity Catalog catalog, here `retail`. A client works with one catalog at a time; configure a second client catalog for another. |
| Token                | A Unity Catalog access token, sent as a bearer token. The local server has authorization disabled and accepts any value.                        |

Inside that catalog, an Iceberg namespace is a Unity Catalog schema, and an
Iceberg table is a table whose data source format is `ICEBERG`. Namespaces
don't nest. A table created without a location is a managed table under the
schema's or catalog's storage root; the server records where it lives and
deletes its files when you drop it.

Through this API, the server lists Iceberg tables, and Delta tables only when
they carry UniForm Iceberg metadata. Reach other Delta tables with a Delta
client, or [with both in one Spark session](#join-delta-and-iceberg-tables-in-spark).

## Connect a client

:::tab[Spark]
Open a Python session with PySpark:

```bash
uv run --with pyspark==4.1.0 python
```

```python title="spark_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/spark_iceberg.py"
from pyspark.sql import SparkSession

ICEBERG_SPARK = "org.apache.iceberg:iceberg-spark-runtime-4.1_2.13:1.11.0"
ICEBERG_AWS = "org.apache.iceberg:iceberg-aws-bundle:1.11.0"

spark = (
    SparkSession.builder.appName("uc-iceberg")
    .config("spark.jars.packages", f"{ICEBERG_SPARK},{ICEBERG_AWS}")
    .config(
        "spark.sql.extensions",
        "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions",
    )
    .config("spark.sql.catalog.retail", "org.apache.iceberg.spark.SparkCatalog")
    .config("spark.sql.catalog.retail.type", "rest")
    .config(
        "spark.sql.catalog.retail.uri",
        "http://localhost:8080/api/2.1/unity-catalog/iceberg",
    )
    .config("spark.sql.catalog.retail.warehouse", "retail")
    .config("spark.sql.catalog.retail.token", "not-used")
    .config("spark.sql.defaultCatalog", "retail")
    .getOrCreate()
)
```

This is Iceberg's own Spark catalog, not the Unity Catalog connector. The
Iceberg runtime is built per Spark minor version, and the AWS bundle adds the
S3 file system that reads and writes table files with the credentials the
server vends. The `warehouse` setting picks the Unity Catalog catalog. The
`retail` in `spark.sql.catalog.retail` is only Spark's name for it, and making
it the default catalog lets later statements name tables as `sales.orders`.
:::

::::tab[DuckDB]
Open a Python session with DuckDB:

```bash
uv run --with duckdb==2.0.0 python
```

Install and load the `iceberg` extension:

```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
import duckdb

con = duckdb.connect()
con.execute("INSTALL iceberg")
con.execute("LOAD iceberg")
con.execute("SET iceberg_use_metadata_log = false")
```

Then create a secret that holds the token and attach the catalog:

```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.execute("CREATE SECRET uc (TYPE iceberg, TOKEN 'not-used')")
con.execute("""
    ATTACH 'retail' AS retail (
        TYPE iceberg,
        SECRET uc,
        ENDPOINT 'http://localhost:8080/api/2.1/unity-catalog/iceberg'
    )
""")
```

`ATTACH` takes the warehouse, here `retail`. DuckDB uses the credentials the
server vends for each table.

Turning off `iceberg_use_metadata_log` avoids an intermittent commit failure
on a session's second write to a table.

:::note
DuckDB doesn't read `AWS_ENDPOINT_URL`. Against the local environment's
simulated S3, point it at the endpoint yourself:

```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.execute("SET s3_endpoint = 'localhost:9000'")
con.execute("SET s3_use_ssl = false")
con.execute("SET s3_url_style = 'path'")
```

On real AWS, leave these settings out.
:::
::::

::::tab[PyIceberg]
Open a Python session with PyIceberg:

```bash
uv run --with "pyiceberg[pyarrow]==0.12.0" python
```

```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
import pyarrow as pa
from pyiceberg.catalog import load_catalog

```

```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
catalog = load_catalog(
    "retail",
    type="rest",
    uri="http://localhost:8080/api/2.1/unity-catalog/iceberg",
    warehouse="retail",
    token="not-used",
)
```

`load_catalog` takes the client-side name first, then the same three values.
PyIceberg uses the credentials the server vends for each table.

:::note
PyIceberg doesn't read `AWS_ENDPOINT_URL`. Against the local environment's
simulated S3, also export
`PYICEBERG_CATALOG__RETAIL__S3__ENDPOINT=http://localhost:9000` before you
start Python. The `RETAIL` part is the name you pass to `load_catalog`. On
real AWS, leave it unset.
:::
::::

:::tab[DataFusion]
Create a Cargo project with [iceberg-rust](https://rust.iceberg.apache.org "Rust implementation of Apache Iceberg with REST catalog and table APIs, and a DataFusion integration.")'s REST catalog,
its [DataFusion](https://datafusion.apache.org "Extensible, high-performance query engine in Rust using Apache Arrow.") integration and S3 storage, DataFusion, and
the Tokio runtime:

```bash
cargo new iceberg-datafusion && cd iceberg-datafusion
cargo add iceberg-datafusion --git https://github.com/apache/datafusion-iceberg --rev 8979482936eff6509e40c2e4e3bfc1235d965d60
cargo add iceberg iceberg-catalog-rest iceberg-storage-opendal --git https://github.com/apache/iceberg-rust --rev 5b82ab99aeaf50bf4f5b3b776ac9cd6380a5f3e3
cargo add datafusion@55.1
cargo add tokio --features macros,rt-multi-thread
```

The DataFusion integration isn't on crates.io, so the first command adds it
from a commit of its repository, and the next two add the iceberg-rust commit
and DataFusion release it builds on.

The steps below go into `src/main.rs`, in a
`#[tokio::main] async fn main() -> Result<(), Box<dyn std::error::Error>>`.
Run them with `cargo run`. They use these imports:

```rust title="datafusion_iceberg.rs" script="/docs/how-to/iceberg-rest/snippets/datafusion_iceberg.rs"
use std::collections::HashMap;
use std::sync::Arc;

use datafusion::prelude::SessionContext;
use iceberg::{Catalog, CatalogBuilder, NamespaceIdent, TableIdent};
use iceberg_catalog_rest::RestCatalogBuilder;
use iceberg_datafusion::IcebergCatalogProvider;
use iceberg_storage_opendal::OpenDalStorageFactory;
```

```rust title="datafusion_iceberg.rs" script="/docs/how-to/iceberg-rest/snippets/datafusion_iceberg.rs"
let catalog: Arc<dyn Catalog> = Arc::new(
    RestCatalogBuilder::default()
        .with_storage_factory(Arc::new(OpenDalStorageFactory::S3 {
            customized_credential_load: None,
        }))
        .load(
            "retail",
            HashMap::from([
                (
                    "uri".to_string(),
                    "http://localhost:8080/api/2.1/unity-catalog/iceberg".to_string(),
                ),
                ("warehouse".to_string(), "retail".to_string()),
                ("token".to_string(), "not-used".to_string()),
            ]),
        )
        .await?,
);
let ctx = SessionContext::new();
let provider = IcebergCatalogProvider::try_new(catalog.clone()).await?;
ctx.register_catalog("retail", Arc::new(provider));
```

The REST catalog takes the same three values, and its S3 storage uses the
credentials the server vends for each table. `register_catalog` makes the
catalog's schemas DataFusion schemas, so SQL names a table
`retail.sales.orders`. Keep `catalog` as well: schemas and renames go through
it.
:::

## Create a schema

:::tab[Spark]
```python title="spark_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/spark_iceberg.py"
spark.sql("CREATE NAMESPACE staging")
spark.sql("SHOW NAMESPACES").show()
```
:::

:::tab[DuckDB]
```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.execute("CREATE SCHEMA retail.staging")
con.sql(
    "SELECT schema_name FROM duckdb_schemas() WHERE database_name = 'retail'"
).show()
```
:::

:::tab[PyIceberg]
```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
catalog.create_namespace("staging")
print(catalog.list_namespaces())
```
:::

:::tab[DataFusion]
```rust title="datafusion_iceberg.rs" script="/docs/how-to/iceberg-rest/snippets/datafusion_iceberg.rs"
let staging = NamespaceIdent::new("staging".to_string());
catalog.create_namespace(&staging, HashMap::new()).await?;
for namespace in catalog.list_namespaces(None).await? {
    println!("{namespace}");
}
```

DataFusion SQL has no `CREATE SCHEMA` for an Iceberg catalog, so create the
namespace through the catalog. DataFusion lists the schemas when you create
the provider; create it again to query tables in the new schema.
:::

The new namespace is an ordinary Unity Catalog schema, `retail.staging`, and
other clients see it at once.

## Create a table

:::tab[Spark]
```python title="spark_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/spark_iceberg.py"
spark.sql("""
    CREATE TABLE sales.orders (
        order_id BIGINT,
        customer STRING,
        amount DOUBLE
    ) USING iceberg
""")
```
:::

:::tab[DuckDB]
```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.execute("""
    CREATE TABLE retail.sales.orders (
        order_id BIGINT,
        customer VARCHAR,
        amount DOUBLE
    )
""")
```
:::

:::tab[PyIceberg]
```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
orders_schema = pa.schema(
    [("order_id", pa.int64()), ("customer", pa.string()), ("amount", pa.float64())]
)
orders = catalog.create_table("sales.orders", schema=orders_schema)
```
:::

:::tab[DataFusion]
```rust title="datafusion_iceberg.rs" script="/docs/how-to/iceberg-rest/snippets/datafusion_iceberg.rs"
ctx.sql(
    "CREATE TABLE retail.sales.orders (
        order_id BIGINT,
        customer VARCHAR,
        amount DOUBLE
    )",
)
.await?
.collect()
.await?;
```
:::

The server creates the table as `MANAGED`, with data source format `ICEBERG`,
at a location under the catalog's storage root:
`s3://amzn-s3-demo-bucket/retail/managed/__unitystorage/catalogs/<catalog id>/tables/<table id>`.

## Write and read rows

:::tab[Spark]
```python title="spark_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/spark_iceberg.py"
spark.sql("""
    INSERT INTO sales.orders VALUES
        (1, 'ada', 9.5),
        (2, 'grace', 20.0),
        (3, 'linus', 3.25)
""")
```

```python title="spark_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/spark_iceberg.py"
spark.sql("SELECT * FROM sales.orders WHERE amount > 5 ORDER BY order_id").show()
```

```text
+--------+--------+------+
|order_id|customer|amount|
+--------+--------+------+
|       1|     ada|   9.5|
|       2|   grace|  20.0|
+--------+--------+------+
```
:::

:::tab[DuckDB]
```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.execute("""
    INSERT INTO retail.sales.orders VALUES
        (1, 'ada', 9.5),
        (2, 'grace', 20.0),
        (3, 'linus', 3.25)
""")
```

```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.sql("SELECT * FROM retail.sales.orders WHERE amount > 5 ORDER BY order_id").show()
```

```text
┌──────────┬──────────┬────────┐
│ order_id │ customer │ amount │
│  int64   │ varchar  │ double │
├──────────┼──────────┼────────┤
│        1 │ ada      │    9.5 │
│        2 │ grace    │   20.0 │
└──────────┴──────────┴────────┘
```
:::

:::tab[PyIceberg]
```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
orders.append(
    pa.table(
        {
            "order_id": [1, 2, 3],
            "customer": ["ada", "grace", "linus"],
            "amount": [9.5, 20.0, 3.25],
        },
        schema=orders_schema,
    )
)
```

```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
print(orders.scan(row_filter="amount > 5").to_arrow().sort_by("order_id"))
```

```text
pyarrow.Table
order_id: int64
customer: string
amount: double
----
order_id: [[1,2]]
customer: [["ada","grace"]]
amount: [[9.5,20]]
```
:::

:::tab[DataFusion]
```rust title="datafusion_iceberg.rs" script="/docs/how-to/iceberg-rest/snippets/datafusion_iceberg.rs"
ctx.sql(
    "INSERT INTO retail.sales.orders VALUES
        (1, 'ada', 9.5),
        (2, 'grace', 20.0),
        (3, 'linus', 3.25)",
)
.await?
.collect()
.await?;
```

```rust title="datafusion_iceberg.rs" script="/docs/how-to/iceberg-rest/snippets/datafusion_iceberg.rs"
ctx.sql("SELECT * FROM retail.sales.orders WHERE amount > 5 ORDER BY order_id")
    .await?
    .show()
    .await?;
```

```text
+----------+----------+--------+
| order_id | customer | amount |
+----------+----------+--------+
| 1        | ada      | 9.5    |
| 2        | grace    | 20.0   |
+----------+----------+--------+
```
:::

The client writes data and metadata files with the vended credentials, then
asks the server to commit the new snapshot. The server accepts a commit only if
the table hasn't changed since the client read it, so concurrent writers can't
overwrite each other.

## Update and delete rows

:::tab[Spark]
```python title="spark_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/spark_iceberg.py"
spark.sql("UPDATE sales.orders SET amount = 21.0 WHERE order_id = 2")
spark.sql("DELETE FROM sales.orders WHERE customer = 'linus'")
spark.sql("""
    MERGE INTO sales.orders AS t
    USING (SELECT 4 AS order_id, 'barbara' AS customer, 12.0 AS amount) AS s
    ON t.order_id = s.order_id
    WHEN MATCHED THEN UPDATE SET *
    WHEN NOT MATCHED THEN INSERT *
""")
```

`UPDATE`, `DELETE FROM`, and `MERGE INTO` need the Iceberg SQL extensions from
the session configuration.
:::

:::tab[DuckDB]
```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.execute("UPDATE retail.sales.orders SET amount = 21.0 WHERE order_id = 2")
con.execute("DELETE FROM retail.sales.orders WHERE customer = 'linus'")
```
:::

:::tab[PyIceberg]
```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
orders.delete(delete_filter="customer = 'linus'")
orders.overwrite(
    pa.table(
        {"order_id": [2], "customer": ["grace"], "amount": [21.0]},
        schema=orders_schema,
    ),
    overwrite_filter="order_id = 2",
)
```

PyIceberg has no `UPDATE`. Replace the matching rows with `overwrite` and an
`overwrite_filter`.
:::

:::tab[DataFusion]
DataFusion's Iceberg integration has no `UPDATE` or `DELETE FROM`; its
`INSERT INTO` only appends.
:::

## Rename and drop a table

:::tab[Spark]
```python title="spark_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/spark_iceberg.py"
spark.sql("ALTER TABLE sales.orders RENAME TO sales.order_history")
```

```python title="spark_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/spark_iceberg.py"
spark.sql("DROP TABLE sales.order_history")
spark.sql("DROP NAMESPACE staging")
```
:::

:::tab[DuckDB]
```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.execute("ALTER TABLE retail.sales.orders RENAME TO order_history")
```

```python title="duckdb_iceberg.py" script="/docs/how-to/iceberg-rest/snippets/duckdb_iceberg.py"
con.execute("DROP TABLE retail.sales.order_history")
con.execute("DROP SCHEMA retail.staging")
```
:::

:::tab[PyIceberg]
```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
catalog.rename_table("sales.orders", "sales.order_history")
```

```python title="pyiceberg_tables.py" script="/docs/how-to/iceberg-rest/snippets/pyiceberg_tables.py"
catalog.drop_table("sales.order_history")
catalog.drop_namespace("staging")
```
:::

:::tab[DataFusion]
```rust title="datafusion_iceberg.rs" script="/docs/how-to/iceberg-rest/snippets/datafusion_iceberg.rs"
catalog
    .rename_table(
        &TableIdent::from_strs(["sales", "orders"])?,
        &TableIdent::from_strs(["sales", "order_history"])?,
    )
    .await?;
```

```rust title="datafusion_iceberg.rs" script="/docs/how-to/iceberg-rest/snippets/datafusion_iceberg.rs"
catalog
    .drop_table(&TableIdent::from_strs(["sales", "order_history"])?)
    .await?;
catalog.drop_namespace(&staging).await?;
```

DataFusion SQL has no `ALTER TABLE … RENAME`, so rename through the catalog.
DataFusion keeps the table names it has already seen, so drop the renamed
table through the catalog too, or create the provider again before you name
it in SQL.
:::

A rename keeps the table in its schema. Dropping a managed table removes it
from the catalog, and a background worker on the server deletes its files. An
external table, one created with an explicit location, keeps its files; the
server accepts a purge request for it but leaves the files in place.

Only tables created through Iceberg REST can be dropped through it. Drop a
Delta table through Spark's Unity Catalog connector or the
[Unity Catalog API](/docs/tutorials/python-client/).

## Join Delta and Iceberg tables in Spark

One Spark session can hold both kinds of table: register the catalog twice,
once through the Unity Catalog connector for Delta tables and once through
Iceberg REST for Iceberg tables.

```python title="spark_cross_format.py" script="/docs/how-to/iceberg-rest/snippets/spark_cross_format.py"
from pyspark.sql import SparkSession

PACKAGES = [
    "io.unitycatalog:unitycatalog-spark_4.1_2.13:0.7.0",
    "io.delta:delta-spark_4.1_2.13:4.3.1",
    "org.apache.hadoop:hadoop-aws:3.4.2",
    "org.apache.iceberg:iceberg-spark-runtime-4.1_2.13:1.11.0",
    "org.apache.iceberg:iceberg-aws-bundle:1.11.0",
]

spark = (
    SparkSession.builder.appName("uc-delta-and-iceberg")
    .config("spark.jars.packages", ",".join(PACKAGES))
    .config(
        "spark.sql.extensions",
        "io.delta.sql.DeltaSparkSessionExtension,"
        "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions",
    )
    .config(
        "spark.sql.catalog.spark_catalog",
        "org.apache.spark.sql.delta.catalog.DeltaCatalog",
    )
    .config("spark.hadoop.fs.s3.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
    # Delta tables, through the Unity Catalog connector.
    .config("spark.sql.catalog.retail", "io.unitycatalog.spark.UCSingleCatalog")
    .config("spark.sql.catalog.retail.uri", "http://localhost:8080")
    .config("spark.sql.catalog.retail.auth.type", "static")
    .config("spark.sql.catalog.retail.auth.token", "not-used")
    # Iceberg tables in the same catalog, through Iceberg REST.
    .config("spark.sql.catalog.retail_iceberg", "org.apache.iceberg.spark.SparkCatalog")
    .config("spark.sql.catalog.retail_iceberg.type", "rest")
    .config(
        "spark.sql.catalog.retail_iceberg.uri",
        "http://localhost:8080/api/2.1/unity-catalog/iceberg",
    )
    .config("spark.sql.catalog.retail_iceberg.warehouse", "retail")
    .config("spark.sql.catalog.retail_iceberg.token", "not-used")
    .getOrCreate()
)
```

The connector needs `hadoop-aws` for `s3://` paths; use the version that
matches your Spark's Hadoop libraries (3.4.2 for Spark 4.1). For the connector
settings, see [Use Spark with Unity Catalog](/docs/how-to/configure-spark/).
Create a table of each kind, then query them together:

```python title="spark_cross_format.py" script="/docs/how-to/iceberg-rest/snippets/spark_cross_format.py"
spark.sql("CREATE TABLE retail.sales.customers (id BIGINT, name STRING) USING DELTA")
spark.sql("INSERT INTO retail.sales.customers VALUES (1, 'ada'), (2, 'grace')")

spark.sql("""
    CREATE TABLE retail_iceberg.sales.orders (
        order_id BIGINT, customer_id BIGINT, amount DOUBLE
    ) USING iceberg
""")
spark.sql("""
    INSERT INTO retail_iceberg.sales.orders VALUES
        (10, 1, 9.5), (11, 2, 20.0), (12, 1, 1.5)
""")
```

```python title="spark_cross_format.py" script="/docs/how-to/iceberg-rest/snippets/spark_cross_format.py"
spark.sql("""
    SELECT c.name, sum(o.amount) AS total
    FROM retail.sales.customers AS c
    JOIN retail_iceberg.sales.orders AS o ON o.customer_id = c.id
    GROUP BY c.name
    ORDER BY c.name
""").show()
```

```text
+-----+-----+
| name|total|
+-----+-----+
|  ada| 11.0|
|grace| 20.0|
+-----+-----+
```

Name each table through the catalog for its format. The connector lists the
Iceberg table too, but can't read it, and Iceberg REST doesn't list Delta
tables.

## Required privileges

With authorization enabled, the server checks the same privileges as for any
other table. Reading needs `USE CATALOG` on the catalog, `USE SCHEMA` on the
schema, and `SELECT` on the table. Writing also needs `MODIFY`; without it, the
server vends read-only credentials. Creating a table needs `CREATE TABLE` on the
schema, and creating a schema needs `CREATE SCHEMA` on the catalog. Owners have
all of these. See
[Core concepts](/docs/explanation/uc-basics/#ownership-and-privileges).

## Next steps

- [Credential vending](/docs/explanation/credential-vending/) explains
  how the server scopes the credentials it hands each client.
- [External tables and catalog-managed Delta tables](/docs/explanation/external-and-managed-tables/)
  covers the Delta side of the same catalog.
- The [Iceberg REST catalog specification](https://github.com/apache/iceberg/blob/apache-iceberg-1.11.0/open-api/rest-catalog-open-api.yaml)
  lists the endpoints these clients call.
