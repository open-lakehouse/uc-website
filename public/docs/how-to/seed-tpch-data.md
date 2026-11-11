---
title: Seed TPC-H data into Unity Catalog
summary: Generate the eight-table TPC-H benchmark dataset with DuckDB, write it
  as Delta tables, and register them in Unity Catalog as samples.tpch.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/seed-tpch-data/
companions:
  - url: "https://unitycatalog.io/docs/how-to/seed-tpch-data/seed_tpch.py"
    kind: python
    purpose: "Seed the classic TPC-H dataset into Unity Catalog as governed Delta tables."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/seed-tpch-data/seed_tpch.py"
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

- [`seed_tpch.py`](https://unitycatalog.io/docs/how-to/seed-tpch-data/seed_tpch.py) (Python): Seed the classic TPC-H dataset into Unity Catalog as governed Delta tables.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/seed-tpch-data/seed_tpch.py`

[TPC-H](https://www.tpc.org/tpch/) is the standard benchmark schema. Its eight related tables model a wholesale supplier: `region`, `nation`, `supplier`, `customer`, `part`, `partsupp`, `orders`, and `lineitem`. Seeded into [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification."), it gives you realistic business data to try joins, access grants, and cross-engine queries on.

This guide generates TPC-H with DuckDB, writes each table as Delta, and registers it as an external table, three steps per table:

> **generate** (DuckDB) → **write Delta** (deltalake) → **register** (Unity Catalog)

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/).

Unity Catalog only records where an external table lives. It never reads the files itself, so the script writes the Delta tables to a local directory it owns. Set `TPCH_STORAGE_ROOT` to use another directory.

## Step 1 — Generate TPC-H

[DuckDB](https://duckdb.org/docs/stable/core_extensions/tpch) ships a `tpch` extension that generates the benchmark data in-process. `dbgen(sf = ...)` builds every table at the given **scale factor**, and each table comes straight back as an Arrow table. A scale factor of `0.01` keeps it small and fast; raise it for more data.

`seed_tpch.py`

```python
con = duckdb.connect()  # in-memory
con.execute("INSTALL tpch; LOAD tpch;")
con.execute(f"CALL dbgen(sf = {sf})")  # deterministic for a given scale factor
tables = {name: con.table(name).to_arrow_table() for name in TPCH_TABLES}
```

## Step 2 — Write each table as Delta

Point [`write_deltalake`](https://delta-io.github.io/delta-rs/) at a location under the storage root and hand it the Arrow table. That writes a real Delta table — transaction log and all — and returns its `file://` URI.

`seed_tpch.py`

```python
location = root / name
write_deltalake(location, arrow, mode="overwrite")
```

## Step 3 — Register the tables in Unity Catalog

Connect with the async SDK, then create the catalog `samples` with the schema `tpch`. For each Delta table written, register an **external** table, with the column list derived from the table's Arrow schema. The tables are then `samples.tpch.lineitem`, `samples.tpch.orders`, and so on.

`seed_tpch.py`

```python
await catalogs.create_catalog(
    CreateCatalog(name="samples", comment="TPC-H dataset")
)
await schemas.create_schema(CreateSchema(name="tpch", catalog_name="samples"))

# Register each Delta table we wrote as an EXTERNAL table Unity Catalog
# governs — UC stores the schema and location, the data stays in Delta.
for name, arrow in arrow_tables.items():
    await tables.create_table(
        CreateTable(
            name=name,
            catalog_name="samples",
            schema_name="tpch",
            table_type=TableType.EXTERNAL,
            data_source_format=DataSourceFormat.DELTA,
            storage_location=locations[name],
            columns=arrow_to_columns(arrow.schema),
        )
    )
    print(f"registered samples.tpch.{name}")
```

> **Tip**
>
> The `arrow_to_columns` helper, just above `main` in the script, maps Arrow types to Unity Catalog column types. It also builds the `type_json` each column needs, including the `metadata` field the server requires.

## Step 4 — Verify the catalog

List the schema's tables to confirm all eight registered, then read one straight back from Delta to prove the data is really there.

`seed_tpch.py`

```python
listed = await tables.list_tables(catalog_name="samples", schema_name="tpch")
registered = sorted(t.name for t in listed.tables or [])
print(f"{len(registered)} tables in samples.tpch: {registered}")

# Read a table straight back from Delta to prove the data is really there.
lineitem_rows = DeltaTable(locations["lineitem"]).to_pyarrow_table().num_rows
print(f"lineitem has {lineitem_rows} rows")
```

## Next steps

You now have an eight-table TPC-H dataset in Unity Catalog. To regenerate it at a larger scale, raise the `sf` argument to `main` and run the script again. For example, `0.1` gives about 600,000 `lineitem` rows. The new run replaces the earlier tables.

- [Read and write Unity Catalog tables from DuckDB](https://unitycatalog.io/docs/how-to/duckdb/) queries the tables by name.
- [Query Unity Catalog tables from Python DataFrame libraries](https://unitycatalog.io/docs/how-to/python-dataframes/) reads them from Polars, Daft, or pandas.
