---
title: Use DuckDB with Unity Catalog
summary: Attach a Unity Catalog catalog in DuckDB, query its Delta tables with
  SQL, append rows, and create tables.
diataxis: how-to
---

DuckDB queries [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") tables with SQL,
appends rows to them, and creates catalog-managed Delta tables. DuckDB's
`unity_catalog` extension attaches a catalog as a DuckDB database, and its
`delta` extension reads and writes the [Delta](https://delta.io "Open table-format specification: ACID transactions, schema evolution, and time travel over object storage.") files. Appends
to a catalog-managed table go through the server, like a Spark write.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/).
- A Delta table in Unity Catalog, such as `retail.sales.orders` from
  [Create and update a catalog-managed Delta table](/docs/tutorials/managed-delta-table/).
- Table files that DuckDB can reach, such as the local server's
  [shared folder](/docs/how-to/run-local-server/#share-a-folder-with-the-server).
- [uv](https://docs.astral.sh/uv/getting-started/installation/).
:::

## Install the extensions

Open a Python session with DuckDB:

```bash
uv run --with duckdb==2.0.0 python
```

Install and load the `delta` and `unity_catalog` extensions:

```python title="duckdb_tables.py" script="/docs/how-to/duckdb/snippets/duckdb_tables.py"
import duckdb

con = duckdb.connect()
con.execute("INSTALL delta")
con.execute("LOAD delta")
con.execute("INSTALL unity_catalog")
con.execute("LOAD unity_catalog")
```

## Attach a catalog

Create a secret that holds the server's address and a token, then attach one
Unity Catalog catalog as a DuckDB database:

```python title="duckdb_tables.py" script="/docs/how-to/duckdb/snippets/duckdb_tables.py"
con.execute("""
    CREATE SECRET (
        TYPE unity_catalog,
        TOKEN 'not-used',
        ENDPOINT 'http://localhost:8080'
    )
""")
con.execute("ATTACH 'retail' AS retail (TYPE unity_catalog, DEFAULT_SCHEMA 'sales')")
```

- `ENDPOINT` is the server's base URL, without `/api/2.1/unity-catalog`.
- `TOKEN` is sent as a bearer token. The local server has authorization
  disabled and accepts any value. On a secured server, use a Unity Catalog
  access token.
- `DEFAULT_SCHEMA` is the schema DuckDB uses for unqualified table names.

Leave the secret unnamed. With a named secret (`CREATE SECRET uc (...)`),
`ATTACH` fails with `Could not resolve hostname`.

## List tables

```python title="duckdb_tables.py" script="/docs/how-to/duckdb/snippets/duckdb_tables.py"
con.sql("SELECT database, schema, name FROM (SHOW ALL TABLES)").show()
```

```text
┌──────────┬─────────┬─────────┐
│ database │ schema  │  name   │
│ varchar  │ varchar │ varchar │
├──────────┼─────────┼─────────┤
│ retail   │ sales   │ orders  │
└──────────┴─────────┴─────────┘
```

## Query a table

Use three-part names, or just the table name for tables in the default schema:

```python title="duckdb_tables.py" script="/docs/how-to/duckdb/snippets/duckdb_tables.py"
con.sql("""
    SELECT customer, amount
    FROM retail.sales.orders
    WHERE amount > 5
    ORDER BY order_id
""").show()
```

```text
┌──────────┬───────────────┐
│ customer │    amount     │
│ varchar  │ decimal(10,2) │
├──────────┼───────────────┤
│ ada      │          9.50 │
│ grace    │         20.00 │
└──────────┴───────────────┘
```

DuckDB asks the server for the table's location and for temporary credentials,
then reads the Delta files directly from storage. For a catalog-managed table it
reads the latest version the server has accepted. DuckDB reads tables with
column mapping through Unity Catalog, too.

## Append rows

`INSERT` adds rows to the table:

```python title="duckdb_tables.py" script="/docs/how-to/duckdb/snippets/duckdb_tables.py"
con.execute("INSERT INTO retail.sales.orders VALUES (4, 'barbara', 12.00)")
```

On a catalog-managed table, DuckDB writes the new data and commit file, then
asks the server to accept the commit as the table's next version. From then on,
Spark and every other client see the new rows.

DuckDB can't append to a partitioned table that uses column mapping. The
insert fails with `Not implemented Error: Inserting into a partitioned Delta table that uses column mapping is not supported`,
and the table doesn't change.

## Create, change, and drop tables

`CREATE TABLE` creates a catalog-managed table, and `INSERT` adds its rows:

```python title="duckdb_tables.py" script="/docs/how-to/duckdb/snippets/duckdb_tables.py"
con.execute("CREATE TABLE retail.sales.returns (order_id BIGINT, reason VARCHAR)")
con.execute("INSERT INTO retail.sales.returns VALUES (4, 'damaged')")
```

The server stages the new table as it does for Spark, so Spark and other
clients read it and append to it.

DuckDB can't create a table from a query (`CREATE TABLE … AS SELECT`), update
or delete rows, or drop a table. Do those with Spark, as in
[Create and update a catalog-managed Delta table](/docs/tutorials/managed-delta-table/).

## Required privileges

With authorization enabled, reading needs `USE CATALOG` on the catalog,
`USE SCHEMA` on the schema, and `SELECT` on the table. Appending also needs
`MODIFY` on the table, and creating a table needs `CREATE TABLE` on the
schema. Owners have all of these. See
[Core concepts](/docs/explanation/uc-basics/#ownership-and-privileges).

## Next steps

- [External tables and catalog-managed Delta tables](/docs/explanation/external-and-managed-tables/)
  explains why an append from DuckDB is safe next to a Spark writer.
- [DuckDB's Unity Catalog extension documentation](https://duckdb.org/docs/stable/core_extensions/unity_catalog)
  covers its other secret options and cloud storage.
