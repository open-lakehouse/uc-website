---
title: Query Unity Catalog tables from Python DataFrame libraries
summary: Find, read, and append to external Delta tables in Unity Catalog from
  Polars, Daft, and pandas, with storage credentials vended by the server.
diataxis: how-to
---

Polars, Daft, and pandas can find [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.")
tables by name and read and append to them. Each library looks up the table,
asks the server for temporary storage credentials, and then reads or writes the
[Delta](https://delta.io "Open table-format specification: ACID transactions, schema evolution, and time travel over object storage.") files directly in storage.

All three work with external Delta tables, through
[delta-rs](https://delta-io.github.io/delta-rs/ "Native Rust implementation of the Delta protocol with Python bindings."). For catalog-managed tables, use
[Spark](/docs/how-to/configure-spark/) or [DuckDB](/docs/how-to/duckdb/), which
commit through the server.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0 with simulated S3 and PostgreSQL, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/#start-the-server-with-simulated-s3).
- An external Delta table in Unity Catalog, such as `retail.sales.orders`:
  [Register an existing external table](/docs/how-to/register-external-table/).
- For tables on S3, an [external location](/docs/how-to/configure-aws-storage/)
  that covers the table's path.
- [uv](https://docs.astral.sh/uv/getting-started/installation/).
:::

The Polars and pandas examples use a table on S3, and the Daft examples a table
on local storage, which is what each library is tested with here.
The local environment above simulates S3. On real AWS, leave its
`AWS_ENDPOINT_URL` and `AWS_ALLOW_HTTP` variables unset.

## Connect to the server

:::tab[Polars]
Open a Python session with Polars:

```bash
uv run --with polars==1.44.2 --with deltalake==1.6.6 python
```

```python title="polars_tables.py" script="/docs/how-to/python-dataframes/snippets/polars_tables.py"
import polars as pl

catalog = pl.Catalog("http://localhost:8080", require_https=False)
```

`pl.Catalog` takes the server's base URL, without `/api/2.1/unity-catalog`.
`require_https=False` allows the local `http://` address. On a secured server,
pass a Unity Catalog access token as `bearer_token`. Polars marks `pl.Catalog`
as unstable, so its API may change in any release.
:::

:::tab[Daft]
Open a Python session with Daft:

```bash
uv run --with "daft[unity]==0.7.25" --with tenacity python
```

```python title="daft_tables.py" script="/docs/how-to/python-dataframes/snippets/daft_tables.py"
import daft
from daft.catalog import Catalog
from daft.catalog.__unity import UnityCatalogClient

client = UnityCatalogClient("http://localhost:8080", token="not-used")
catalog = Catalog.from_unity(client)
```

Pass a `token` even though the local server has authorization disabled. Without
one, Daft 0.7.25 sends an empty `Authorization` header and every request fails.
On a secured server, use a Unity Catalog access token. Daft 0.7.25 exposes the
client only from `daft.catalog.__unity`.
:::

:::tab[pandas]
Open a Python session with pandas and `deltalake`:

```bash
uv run --with pandas==2.3.3 --with deltalake==1.6.6 python
```

```python title="pandas_tables.py" script="/docs/how-to/python-dataframes/snippets/pandas_tables.py"
import pandas as pd
from deltalake import DeltaTable, write_deltalake

UNITY = {
    "unity_workspace_url": "http://localhost:8080",
    "unity_access_token": "not-used",
    "unity_allow_http_url": "true",
}
```

pandas has no catalog support of its own. The `deltalake` package resolves
`uc://catalog.schema.table` names through these `unity_*` options and returns
pandas DataFrames.
:::

## List tables

:::tab[Polars]
```python title="polars_tables.py" script="/docs/how-to/python-dataframes/snippets/polars_tables.py"
for table in catalog.list_tables("retail", "sales"):
    print(table.name, table.table_type, table.storage_location)
```

```text
orders EXTERNAL s3://amzn-s3-demo-bucket/retail/orders
```

`list_catalogs()` and `list_namespaces(catalog)` list the levels above.
:::

:::tab[Daft]
```python title="daft_tables.py" script="/docs/how-to/python-dataframes/snippets/daft_tables.py"
print(catalog.list_tables("retail.sales"))
```

```text
[Identifier('retail.sales.orders')]
```
:::

`deltalake` can't list tables. With pandas, use the
[Python client](/docs/tutorials/python-client/) to find them.

## Read a table

:::tab[Polars]
```python title="polars_tables.py" script="/docs/how-to/python-dataframes/snippets/polars_tables.py"
orders = catalog.scan_table("retail", "sales", "orders")
print(orders.filter(pl.col("amount") > 5).collect())
```

`scan_table` returns a `LazyFrame`, so filters run as Polars reads the files.
:::

:::tab[Daft]
```python title="daft_tables.py" script="/docs/how-to/python-dataframes/snippets/daft_tables.py"
orders = catalog.get_table("retail.sales.orders").read()
orders.where(daft.col("amount") > 5).show()
```
:::

:::tab[pandas]
```python title="pandas_tables.py" script="/docs/how-to/python-dataframes/snippets/pandas_tables.py"
orders = DeltaTable("uc://retail.sales.orders", storage_options=UNITY).to_pandas()
print(orders[orders["amount"] > 5])
```
:::

Each library requests read credentials for the table's location from the
server, and then reads the Delta files with them. For how vending works, see
[Credential vending](/docs/explanation/credential-vending/).

## Append rows

:::tab[Polars]
```python title="polars_tables.py" script="/docs/how-to/python-dataframes/snippets/polars_tables.py"
new_orders = pl.DataFrame(
    {"order_id": [4], "customer": ["margaret"], "amount": [12.0]}
)
catalog.write_table(new_orders, "retail", "sales", "orders", delta_mode="append")
```
:::

:::tab[pandas]
```python title="pandas_tables.py" script="/docs/how-to/python-dataframes/snippets/pandas_tables.py"
new_orders = pd.DataFrame(
    {"order_id": [4], "customer": ["margaret"], "amount": [12.0]}
)
write_deltalake(
    "uc://retail.sales.orders", new_orders, mode="append", storage_options=UNITY
)
```
:::

The library requests read-write credentials, writes new Parquet files, and
commits a new version to the table's Delta log. The server isn't involved in
the commit, so it doesn't coordinate writers on an external table.

## Other table operations

Create and drop tables with the [Python client](/docs/tutorials/python-client/)
or Spark.

## Required privileges

With authorization enabled, reading needs `USE CATALOG` on the catalog,
`USE SCHEMA` on the schema, and `SELECT` on the table. Appending also needs
`MODIFY` on the table. Owners have all of these. See
[Core concepts](/docs/explanation/uc-basics/#ownership-and-privileges).

## Next steps

- [External tables and catalog-managed Delta tables](/docs/explanation/external-and-managed-tables/)
  explains why path-based libraries can't use managed tables.
- The [Polars](https://docs.pola.rs/api/python/stable/reference/catalog/index.html),
  [Daft](https://docs.daft.ai/en/stable/connectors/unity_catalog/), and
  [delta-rs](https://delta-io.github.io/delta-rs/) documentation cover other
  storage options and authentication methods.
