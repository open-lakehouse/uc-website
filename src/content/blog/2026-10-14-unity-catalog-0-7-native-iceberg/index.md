---
title: Introducing Full Native Apache Iceberg Support in Unity Catalog 0.7.0
description: Unity Catalog 0.7.0 can create, write, rename, and drop native Apache Iceberg tables, with no Delta UniForm required. This hands-on walkthrough uses the unitycatalog-playground to drive its Iceberg REST catalog with curl, Apache Spark, and PyIceberg, all under the same governance.
authors:
  - scott-haines
category: guide
topics:
  - releases
  - guide
date: October 14, 2026
thumbnail: ./thumbnail.jpg
---

:::tldr

- Unity Catalog 0.7.0 adds native Apache Iceberg tables. Its Iceberg REST catalog now creates, commits to, renames, and drops tables, with no Delta UniForm required.
- The unitycatalog-playground v0.2.0 runs this whole walkthrough locally with one command, including a dedicated Spark 4.1.3, Iceberg 1.11, and PyIceberg 0.12 notebook service.
- Spark and PyIceberg read and write the same managed Iceberg tables through one catalog, and a CI smoke test checks that round trip on every pull request.
- The same Unity Catalog grants (`USE CATALOG`, `USE SCHEMA`, `SELECT`) decide what every engine can do over Iceberg REST.

:::

We're excited to introduce full native support for Apache Iceberg in Unity Catalog. The community asked for it, and we delivered. While we've had read-only support for Iceberg since our initial 0.1.0 release, the catch was that this required Delta UniForm to generate the Iceberg metadata needed to enable Iceberg reads off your tables. This requirement introduced issues for teams looking to go all in on Apache Iceberg, who wanted to skip the table middle man (Delta UniForm), and still use Unity Catalog to support their various data and AI needs. We heard you, and here is the answer.

This post is the hands-on companion. Everything in it runs in the [unitycatalog-playground](https://github.com/open-lakehouse/unitycatalog-playground), which as of v0.2.0 ships end-to-end native Iceberg notebooks right next to the Delta ones. We'll start the stack, talk to Unity Catalog's Iceberg REST catalog with nothing but `curl`, and then let Apache Spark and PyIceberg take an animal sanctuary's adoption records through the life of a native Iceberg table. We'll finish with the CI test that keeps all of it honest. If you want the full story of what changed inside Unity Catalog (commits, credential vending, the privilege model), [the release notes](https://github.com/unitycatalog/unitycatalog/releases/tag/v0.7.0) have it.

:::info[Prerequisites]
Docker (with at least 4 GB of memory available to Spark), Git, `curl`, `jq`, and [`just`](https://github.com/casey/just). Every output below comes from playground [v0.2.0](https://github.com/open-lakehouse/unitycatalog-playground/releases/tag/v0.2.0) on October 14, 2026, running the official `unitycatalog/unitycatalog:v0.7.0` image with Spark 4.1.3, Apache Iceberg 1.11.0, and PyIceberg 0.12.0. Your ids and timestamps will differ from ours, and that's expected.
:::

## Getting Started

We know you're eager to get started so we've made it incredibly simple to do just that. Just deploy the v0.7.0 Unity Catalog server, and you'll have a working Iceberg REST Catalog (IRC) that supports creating, writing to, reading from, renaming, and dropping of tables inside of Unity Catalog. Before it can create tables, though, it needs to know where table data should live. The playground takes care of that for us, and we'll see exactly how in a minute.

### Get Up and Running with Docker

The server on its own is one `docker pull unitycatalog/unitycatalog:v0.7.0` away. For this post, we'll let the playground run that same image for us, along with everything around it:

```bash
git clone https://github.com/open-lakehouse/unitycatalog-playground.git
cd unitycatalog-playground
git checkout v0.2.0
just uc=local start
```

The first start builds two notebook images, so it takes a few minutes (about four on our two-core test machine). When everything is up, it prints a URL for each notebook service:

```text
marimo (marimo-spark) is ready — open it in your browser:
  http://localhost:2718?access_token=...

  access token: ...

marimo (marimo-iceberg) is ready — open it in your browser:
  http://localhost:2719?access_token=...

  access token: ...
```

That second URL is new in v0.2.0. The Delta notebooks keep their Spark 4.2 home, and the Iceberg notebooks get a service of their own (the Spark note below explains why):

| Service          | Port | Stack                                                    | Print the URL again |
| ---------------- | ---- | -------------------------------------------------------- | ------------------- |
| `marimo-spark`   | 2718 | Spark 4.2, Delta Lake 4.4, Unity Catalog Spark connector | `just url`          |
| `marimo-iceberg` | 2719 | Spark 4.1.3, Apache Iceberg 1.11, PyIceberg 0.12         | `just url-iceberg`  |

Behind those two URLs, the same command brought up the rest of the stack:

- the official `unitycatalog/unitycatalog:v0.7.0` image, pinned by digest in `docker-compose.yaml`
- PostgreSQL for Unity Catalog's metadata, so our tables survive a restart
- [RustFS](https://github.com/rustfs/rustfs), an S3-compatible object store, with a `uc-warehouse` bucket
- a `server.properties` with `storage-root.tables=s3://uc-warehouse` (that's the "where table data should live" part) and `server.storage-cleanup.initial-delay=PT5M`, so dropped tables are cleaned up in minutes instead of the default seven days
- `AWS_ENDPOINT_URL_S3=http://rustfs:9000` on the Unity Catalog container, because in 0.7.0 the server writes some table files itself (more on that shortly) and needs its own route to the bucket

:::note
If you are using Unity Catalog and don't want to support native Iceberg tables, you can flip the flag `server.iceberg-table.enabled=false` in the `server.properties` of your Unity Catalog server deployment. The IRC keeps serving reads (existing Iceberg tables and UniForm tables stay readable), but every write through it is turned off: creating and dropping namespaces or updating their properties, and creating, committing to, renaming, or dropping tables.
:::

Once you have the Docker environment running, you can start off by creating a few namespaces to work from. We'll do that and then some next.

## Using the Iceberg REST Catalog

With the Unity Catalog server up and running, it is easy to get started using the Unity Catalog API. To do that, we'll open a new terminal window, and run the following command:

```bash
curl -s "http://localhost:8080/api/2.1/unity-catalog/iceberg/v1/config?warehouse=unity" | jq .
```

You should see a response like:

```json
{
  "defaults": {},
  "overrides": {
    "prefix": "catalogs/unity"
  },
  "endpoints": [
    "GET /v1/{prefix}/namespaces",
    "GET /v1/{prefix}/namespaces/{namespace}",
    "HEAD /v1/{prefix}/namespaces/{namespace}",
    "HEAD /v1/{prefix}/namespaces/{namespace}/tables/{table}",
    "GET /v1/{prefix}/namespaces/{namespace}/tables/{table}",
    "GET /v1/{prefix}/namespaces/{namespace}/tables/{table}/credentials",
    "GET /v1/{prefix}/namespaces/{namespace}/views/{view}",
    "POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/metrics",
    "GET /v1/{prefix}/namespaces/{namespace}/tables",
    "POST /v1/{prefix}/namespaces",
    "DELETE /v1/{prefix}/namespaces/{namespace}",
    "POST /v1/{prefix}/namespaces/{namespace}/properties",
    "POST /v1/{prefix}/namespaces/{namespace}/tables",
    "POST /v1/{prefix}/namespaces/{namespace}/tables/{table}",
    "DELETE /v1/{prefix}/namespaces/{namespace}/tables/{table}",
    "POST /v1/{prefix}/tables/rename"
  ]
}
```

This means things are working. That `GET /v1/config` call is the handshake every Iceberg client makes first, and it tells us two things. The `warehouse=unity` we sent came back as the prefix `catalogs/unity`, because in Unity Catalog the warehouse names a _catalog_. And the `endpoints` list is the server telling clients what they're allowed to ask for. Through 0.6.0, every route on it was a read (the metrics POST is just a telemetry sink). The bottom seven entries (create and drop namespaces, update their properties, create, commit to, and drop tables, and rename) are the write half of the protocol, and all seven are new in 0.7.0.

:::tip
If you `curl` the base path on its own (`/api/2.1/unity-catalog/iceberg`), you'll get `404 Not Found`. Nothing is broken. The base path is a prefix for the Iceberg REST routes, not a route itself.
:::

Let's go create a namespace.

## Creating a Namespace for Your Iceberg Tables

If you're new to Apache Iceberg, a namespace is how the REST catalog groups tables, much like a schema does. In Unity Catalog, the `warehouse` you connect with picks the catalog, and a namespace is a schema inside that catalog. So warehouse `unity` plus namespace `adoption_desk` is the UC schema `unity.adoption_desk`.

```bash
# create a new namespace
curl -s -X POST http://localhost:8080/api/2.1/unity-catalog/iceberg/v1/catalogs/unity/namespaces \
  -H 'Content-Type: application/json' \
  -d '{"namespace": ["adoption_desk"], "properties": {"comment": "Where adoptions get recorded"}}'
```

```text
{"namespace":["adoption_desk"],"properties":{"comment":"Where adoptions get recorded"}}
```

Unity Catalog's own REST API (not the Iceberg endpoint) sees an ordinary schema:

```bash
curl -s http://localhost:8080/api/2.1/unity-catalog/schemas/unity.adoption_desk | jq '{full_name, properties, storage_root}'
```

```json
{
  "full_name": "unity.adoption_desk",
  "properties": {
    "comment": "Where adoptions get recorded"
  },
  "storage_root": null
}
```

Notice that `storage_root` is `null`. On the default server, without an s3-compatible filesystem like MinIO or RustFS, this will always be true since a table created without a location is a **managed** table, and Unity Catalog looks for a place to put it on the schema, then the catalog, then the server-wide `storage-root.tables` property. Find none of them, and creating a table fails with `400 None of catalog, schema or storage-root.tables server property has managed location configured`. The playground sets `storage-root.tables`, so the same request just works. Here's a two-column table, still with nothing but `curl`, saved as `create-table.json`:

```json title="create-table.json"
{
  "name": "adoptions",
  "schema": {
    "type": "struct",
    "schema-id": 0,
    "fields": [
      { "id": 1, "name": "adoption_id", "type": "long", "required": true },
      { "id": 2, "name": "pet_name", "type": "string", "required": false }
    ]
  }
}
```

```bash
curl -s -X POST http://localhost:8080/api/2.1/unity-catalog/iceberg/v1/catalogs/unity/namespaces/adoption_desk/tables \
  -H 'Content-Type: application/json' -d @create-table.json \
  | jq '{"metadata-location": .["metadata-location"], "format-version": .metadata["format-version"], location: .metadata.location}'
```

```json
{
  "metadata-location": "s3://uc-warehouse/__unitystorage/tables/12f5eae7-6a9b-4217-ba27-cc5d4692e197/metadata/00000-4119bef5-d0d3-42ce-a6f8-2b3b98973fc5.metadata.json",
  "format-version": 2,
  "location": "s3://uc-warehouse/__unitystorage/tables/12f5eae7-6a9b-4217-ba27-cc5d4692e197"
}
```

We trimmed the response with `jq` for a reason: the full body also carries short-lived storage credentials for the table under `config`, which is how Unity Catalog hands engines access to the files. So be careful where you paste it.

So who wrote that `00000-...metadata.json`? We haven't written a single row, and no engine has touched the bucket yet. Listing the table's directory in RustFS (with the same `aws` CLI image the stack uses) shows it's the only file there:

```bash
docker run --rm --network unitycatalog-playground_unity \
  -e AWS_ACCESS_KEY_ID=rustfsadmin \
  -e AWS_SECRET_ACCESS_KEY=rustfsadmin \
  -e AWS_DEFAULT_REGION=us-east-1 \
  amazon/aws-cli:2.36.23 --endpoint-url http://rustfs:9000 \
  s3 ls --recursive s3://uc-warehouse/__unitystorage/tables/12f5eae7-6a9b-4217-ba27-cc5d4692e197/
```

```text
2026-10-14 15:50:22        778 __unitystorage/tables/12f5eae7-6a9b-4217-ba27-cc5d4692e197/metadata/00000-4119bef5-d0d3-42ce-a6f8-2b3b98973fc5.metadata.json
```

The Unity Catalog server wrote it. In 0.7.0, the catalog writes every `metadata.json` for its native Iceberg tables and swaps the table's pointer to the new one on each commit, while engines write the data files and manifests. That's why the playground gives the server its own route to RustFS. It's also why the catalog, not any one engine, stays the source of truth for what a table looks like right now.

That was a throwaway, so let's tidy up. Both calls answer `204 No Content`, and because this is a managed table, a background worker deletes its directory a little over five minutes later (the playground's five-minute delay, plus the worker's polling):

```bash
curl -s -X DELETE http://localhost:8080/api/2.1/unity-catalog/iceberg/v1/catalogs/unity/namespaces/adoption_desk/tables/adoptions
curl -s -X DELETE http://localhost:8080/api/2.1/unity-catalog/iceberg/v1/catalogs/unity/namespaces/adoption_desk
```

Creating tables by hand with `curl` gets old fast, and we still haven't written a single record. For that, we are going to switch back to using our friend Apache Spark to make this process easy breezy.

:::note
One thing to keep in mind for this release: while Apache Spark is currently at 4.2, with 4.3 in active development, Apache Iceberg only publishes its Spark runtime (`iceberg-spark-runtime`) for Spark 4.0 and 4.1 (Iceberg 1.11.0 at the time of writing). So in order to show you how to use all these neat features, we'll need to use an older version of Spark than we have in prior walkthroughs. That's the reason for the playground's second notebook service.
:::

## Using Native Apache Iceberg Tables with Apache Spark and Unity Catalog

Here we are. This is what so many of you all have dreamed of for years, and now you are about to write your first Apache Iceberg table (natively) without Delta UniForm. We've updated the [unitycatalog-playground](https://github.com/open-lakehouse/unitycatalog-playground) project to include everything you'll need to be successful from day one, with zero friction.

:::tip
If this is your first time using the unitycatalog-playground, it is fully set up for your favorite coding agent to help you get things running. The repo's `AGENTS.md` teaches the agent the `just` recipes, the two notebook services, and how to handle corporate PyPI and Maven proxies. A prompt like this one is enough to get going:

_"Clone github.com/open-lakehouse/unitycatalog-playground and read AGENTS.md. Start the stack with the bundled Unity Catalog (`just uc=local start`) and give me the marimo-iceberg URL. If a step fails, show me the output of `just uc=local ps` and `docker compose --profile local-uc logs --tail 100`, and explain what went wrong before changing anything."_
:::

Open the `:2719` URL and pick `iceberg/unitycatalog-iceberg-spark.py`. We'll walk through the highlights here. The notebook itself goes further, through row-level `UPDATE`, `DELETE`, and `MERGE INTO`, schema and partition evolution, `CREATE TABLE ... AS SELECT` and rename, an external table, and drop.

### Wiring Spark to Unity Catalog

The first cell builds the Spark session, and notice what's _not_ in it: there's no Unity Catalog Spark connector. Spark talks to Unity Catalog through Iceberg's own `SparkCatalog` in `rest` mode, which is the whole point of an open protocol. The helper lives in `iceberg/iceberg_common.py`, and here's the core of what it registers:

```properties
spark.sql.catalog.unity           = org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.unity.type      = rest
spark.sql.catalog.unity.uri       = http://unitycatalog:8080/api/2.1/unity-catalog/iceberg
spark.sql.catalog.unity.warehouse = unity          # the UC catalog name
spark.sql.catalog.unity.io-impl   = org.apache.iceberg.aws.s3.S3FileIO
```

The `uri` is the same Iceberg endpoint we just used with `curl` (`unitycatalog` is the Docker service name), and `warehouse` is the Unity Catalog catalog. The helper also points the S3 client at RustFS with path-style access, since our bucket lives on a laptop rather than in Amazon S3.

### Giving the Adoption Desk a Table

Every time a rescue goes home, the adoption desk records it. We'll partition the table by `species` and by the _day_ of `adopted_at`, using Iceberg's hidden partitioning (the table derives the partition value from a column, so nobody maintains a separate date column). There's no `LOCATION`, so this is a **managed** table:

```python
spark.sql(f"""
CREATE OR REPLACE TABLE {ADOPTIONS} (
  adoption_id BIGINT NOT NULL COMMENT 'surrogate key',
  pet_uuid    STRING NOT NULL COMMENT 'sanctuary roster uuid (unity.sanctuary.pets.uuid)',
  pet_name    STRING,
  species     STRING,
  shelter     STRING,
  adopted_at  TIMESTAMP,
  fee         DOUBLE
)
USING iceberg
PARTITIONED BY (species, days(adopted_at))
TBLPROPERTIES ('format-version' = '2')
""")
```

`ADOPTIONS` is `unity.iceberg_spark.adoptions`, in a namespace the notebook creates a cell earlier. (In later cells you'll see `adoptions_ready`, which holds the same name; marimo passes names like it between cells so they run in order.) The next cell asks Unity Catalog's tables API what we just made. Here's the end of its output (we trimmed the `DESCRIBE TABLE EXTENDED` listing above it):

```json
{
  "full_name": "unity.iceberg_spark.adoptions",
  "table_type": "MANAGED",
  "data_source_format": "ICEBERG",
  "storage_location": "s3://uc-warehouse/__unitystorage/tables/6f84b7c4-e6bb-422e-b584-6d52b809358a"
}
```

`MANAGED` means Unity Catalog picked the location and owns the storage lifecycle. `ICEBERG` means this is a native Iceberg table, not a Delta table wearing an Iceberg costume (that's UniForm).

### Sending Pets Home

If you've run the playground's Delta notebook, you've met our sanctuary's 100-pet roster. It lives in `notebooks/sanctuary.py`, and it's seeded, so every notebook (Delta or Iceberg, Spark or PyIceberg) gets the same pets. Every pet marked `adopted` gets one adoption record:

```python
roster = sanctuary.roster()
roster_adoptions = sanctuary.adoptions(roster)
print(f"{len(roster)} pets in the roster, {len(roster_adoptions)} adopted")
```

```text
100 pets in the roster, 44 adopted
```

They go home in two batches. Each `append()` is one Iceberg commit through Unity Catalog, and each commit is a snapshot we can travel back to later:

```python
for _batch in (roster_adoptions[:30], roster_adoptions[30:]):
    sanctuary.to_spark_dataframe(_batch, spark).writeTo(adoptions_ready).append()

spark.sql(f"""
SELECT species, COUNT(*) AS adoptions, ROUND(SUM(fee), 2) AS fees
FROM {adoptions_ready}
GROUP BY species
ORDER BY adoptions DESC
""").show()
```

```text
+-------+---------+-------+
|species|adoptions|   fees|
+-------+---------+-------+
| rabbit|       11|  972.9|
|    dog|        9|2310.28|
| parrot|        9|2715.51|
|hamster|        9| 228.44|
|    cat|        6| 919.15|
+-------+---------+-------+
```

Forty-four adoptions, and the rabbits are winning. Because the roster is seeded, your counts should match ours. (In the notebook, the write and the query are two cells; we've put them together here.)

### Time Travel

Next, the notebook gives the desk a busy afternoon: an `UPDATE` (the south shelter waives some fees), a `DELETE` (the hamsters move to a partner program), and a `MERGE INTO` that corrects three fees and sends three more pets home. Every one of those commits is a snapshot, and Iceberg's `ancestors_of` procedure lists them, newest first:

```python
snapshots = spark.sql(f"CALL {CATALOG}.system.ancestors_of(table => '{adoptions_ready}')")
snapshots.show(truncate=False)
```

```text
+-------------------+-------------+
|snapshot_id        |timestamp    |
+-------------------+-------------+
|4317749794834568732|1791962425274|
|5655732798113390625|1791962422724|
|9088329569874253462|1791962422311|
|3294847683349032398|1791962418751|
|8655717780038972738|1791962417405|
+-------------------+-------------+
```

So what did the desk look like after that very first batch? `VERSION AS OF` reads any snapshot:

```python
# ancestors_of lists the current snapshot first and the oldest ancestor last.
_rows = snapshots.collect()
for _label, _snap in (("first", _rows[-1]), ("current", _rows[0])):
    _count = spark.sql(
        f"SELECT COUNT(*) AS n FROM {adoptions_ready} VERSION AS OF {_snap.snapshot_id}"
    ).first().n
    print(f"{_label:>8} snapshot {_snap.snapshot_id}: {_count} rows")
```

```text
   first snapshot 8655717780038972738: 30 rows
 current snapshot 4317749794834568732: 38 rows
```

Thirty rows after the first batch, and 38 now: 44 adoptions, minus 9 hamsters, plus the 3 pets the `MERGE` sent home. Spark has had the desk to itself so far. Next, let's invite an engine with no JVM at all.

## Any Engine: PyIceberg

Our vet team doesn't run Spark. They have Python scripts, a spreadsheet habit they're trying to kick, and a firm belief that every pet in our care deserves a proper record. [PyIceberg](https://py.iceberg.apache.org/) is a Python-native Iceberg client (no JVM, no Spark) that talks to the same Iceberg REST catalog. Open `iceberg/unitycatalog-pyiceberg.py` from the same `:2719` service. It doesn't start Spark, so it runs right away, and two lines from its first few cells show which catalog it connected to and, once it has created the vets' own namespace, which namespaces it can see:

```text
PyIceberg: 0.12.0
catalog: RestCatalog -> http://unitycatalog:8080/api/2.1/unity-catalog/iceberg (warehouse=unity)
```

```text
namespaces: [('iceberg_py',), ('iceberg_spark',)]
```

Notice `iceberg_spark` in that list (we trimmed the cells' other output lines). PyIceberg sees the namespace Spark created a few minutes ago, because there's only one catalog. The vets' own table is the sanctuary roster itself, created with an explicit Iceberg schema and a partition spec of `identity(species)` and `month(intake_at)` (both defined a cell earlier in the notebook):

```python
pets = catalog.create_table_if_not_exists(
    PETS,
    schema=PETS_SCHEMA,
    partition_spec=PETS_SPEC,
    properties={"format-version": "2"},
)
```

No location, so Unity Catalog makes it managed, exactly like Spark's table. From there the notebook writes the 100-pet roster in two commits, adds a `microchipped` column, appends 20 new arrivals, and deletes the parrots that were adopted.

Remember the caveat about metadata tables from Spark? PyIceberg's `table.inspect` reads the same history without tripping over it. Here are the first three columns of the notebook's `pets.inspect.snapshots()` output (it also shows each snapshot's `summary`):

| committed_at              | snapshot_id         | operation |
| ------------------------- | ------------------- | --------- |
| 2026-10-14 07\:22\:22.437 | 1194964898556487963 | append    |
| 2026-10-14 07\:22\:22.734 | 3483335450453429780 | append    |
| 2026-10-14 07\:22\:23.270 | 3640474370469604660 | append    |
| 2026-10-14 07\:22\:23.441 | 2141833740979043504 | delete    |
| 2026-10-14 07\:22\:23.724 | 7536225247800810737 | overwrite |

Four write calls, five snapshots. Can you spot why? The `delete()` made two: one parrot file held nothing but adopted parrots, so PyIceberg dropped it whole (the `delete`), and five other files were rewritten without their adopted parrots (the `overwrite`). The schema change made no snapshot at all, because no data changed. Time travel is a keyword argument away:

```python
_snapshots = pets.inspect.snapshots().to_pylist()
for _label, _snap in (("first", _snapshots[0]), ("current", _snapshots[-1])):
    _rows = pets.scan(snapshot_id=_snap["snapshot_id"]).to_arrow().num_rows
    print(f"{_label:>8} snapshot {_snap['snapshot_id']} ({_snap['operation']}): {_rows} rows")
```

```text
   first snapshot 1194964898556487963 (append): 60 rows
 current snapshot 7536225247800810737 (overwrite): 110 rows
```

Sixty rows after the first commit, and 110 now: 100 roster pets plus 20 arrivals, minus the 10 adopted parrots. (We trimmed the cell's list of sample data files from the output.)

:::tip
If you run PyIceberg outside the playground, install `pyiceberg[pyarrow,pandas,pyiceberg-core]`. The `pyiceberg-core` extra is what lets PyIceberg write to tables partitioned by transforms like `month()` or `day()`. The playground's image already includes it.
:::

Two engines, one catalog. But do they agree about the _same_ table? The playground has a test for exactly that.

## Two Engines, One Table: The Smoke Test

A playground that only works on the day you write the blog post isn't much of a playground. So v0.2.0 adds a second smoke notebook, `iceberg/ci-smoke-iceberg.py`, that crosses engines on purpose: Spark creates a table and writes two rows, PyIceberg reads them and appends a third, and Spark has to see all three. Here's its core:

```python
# Spark -> UC Iceberg REST catalog: managed table create + write.
spark.sql(f"CREATE NAMESPACE IF NOT EXISTS {namespace}")
spark.sql(f"CREATE TABLE {table} (id BIGINT, value STRING) USING iceberg")
spark.sql(f"INSERT INTO {table} VALUES (1, 'hello'), (2, 'unity-catalog')")

# PyIceberg reads Spark's write, then appends through the same catalog.
pyiceberg_table = ic.load_pyiceberg_catalog(catalog).load_table((namespace, name))
read = pyiceberg_table.scan().to_arrow().num_rows
assert read == 2, f"PyIceberg expected 2 rows, found {read}"
pyiceberg_table.append(
    pa.Table.from_pylist(
        [{"id": 3, "value": "pyiceberg"}],
        schema=pyiceberg_table.schema().as_arrow(),
    )
)

# Spark sees PyIceberg's commit once its cached table is refreshed.
spark.sql(f"REFRESH TABLE {table}")
count = spark.table(table).count()
assert count == 3, f"Spark expected 3 rows, found {count}"
```

```text
CI_ICEBERG_SMOKE_OK rows=3
```

Notice the `REFRESH TABLE`. Spark caches the table it loaded, so it only picks up another engine's commit after a refresh. That's ordinary Iceberg behavior, and it's exactly the kind of detail a test like this keeps us honest about.

The playground's GitHub Actions workflow builds both notebook images, starts the full local stack, and runs this notebook next to the original Delta smoke test on every pull request and every push to `main`:

```yaml
- name: Run native Iceberg smoke notebook
  run: |
    docker compose --profile local-uc exec -T marimo-iceberg \
      marimo export html \
      /opt/workspace/marimo-playground/notebooks/iceberg/ci-smoke-iceberg.py \
      --output /tmp/ci-smoke-iceberg.html
    docker compose --profile local-uc exec -T marimo-iceberg \
      grep -q CI_ICEBERG_SMOKE_OK /tmp/ci-smoke-iceberg.html
```

If a dependency bump ever breaks Spark-to-PyIceberg round trips through Unity Catalog, the build goes red before a reader finds out.

## Governance: The Same Rules for Every Engine

Everything so far ran with authorization turned off, which is the right setting for a laptop and the wrong one for anything shared. A front desk that hands every visitor a master key isn't a front desk, it's a key rack. The playground can turn authorization on and seed a few demo personas in one step (its token scripts call `openssl` and `uuidgen`, so have both installed):

```bash
just uc=local demo-auth
```

It restarts Unity Catalog with authorization enabled, creates a `demo` catalog with a `workshop` schema, and applies a small privilege matrix. The end of its output (trimmed) reads like a cast list:

```text
Personas (mint a token with:  just uc=local token-for <email>):
  power-user@uc-demos.dev  owns catalog 'demo' + schema 'workshop'; can create catalogs
  scott@uc-demos.dev       author     on demo.workshop (create tables, read, write)
  jules@uc-demos.dev       read-write on demo.workshop
  lisa@uc-demos.dev        read-only  on demo.workshop
  robert@uc-demos.dev      no grants  (expect 403 until you grant him access)
```

We followed Robert, our newest volunteer. After Scott (the author) created an Iceberg table, `demo.workshop.adoptions`, Robert asked for it over Iceberg REST:

```bash
ROBERT=$(just uc=local token-for robert@uc-demos.dev)
curl -s -H "Authorization: Bearer $ROBERT" \
  http://localhost:8080/api/2.1/unity-catalog/iceberg/v1/catalogs/demo/namespaces/workshop/tables/adoptions
```

```text
{"error":{"message":"Access denied.","type":"ForbiddenException","code":403}}
```

That refusal is Unity Catalog doing its job, and the fix is the same set of grants the native UC API uses. Robert needs to _reach_ the table (`USE CATALOG` on `demo`, `USE SCHEMA` on `workshop`) and to be allowed to read it (`SELECT`):

```bash
just uc=local grant grant -t catalog -n demo -p robert@uc-demos.dev -P USE_CATALOG
just uc=local grant grant -t schema -n demo.workshop -p robert@uc-demos.dev -P USE_SCHEMA
just uc=local grant grant -t schema -n demo.workshop -p robert@uc-demos.dev -P SELECT
```

With the first two grants alone, the same request still answered `403`. After the third, the same token, with no restart, got a `200` and the table's metadata. It doesn't matter whether the caller is Spark, PyIceberg, or `curl`: `USE SCHEMA`, `SELECT`, and `MODIFY` mean the same thing, and the same rules decide whether the storage credentials Unity Catalog hands out are read-write or read-only. (Against real cloud storage, that is. The playground hands Unity Catalog one static RustFS token, which it passes through as is, so on the laptop everyone gets the same credential.) When you're done exploring, `just uc=local auth=disable set-auth` turns authorization back off.

:::note
`just uc=local token-for` signs a token with the server's own key, which is a shortcut for demos only. In a real deployment, users get Unity Catalog tokens by exchanging an identity-provider token.
:::

## Wrapping Things Up

During our time together in this post, we learned that the unitycatalog-playground now covers native Apache Iceberg from end to end:

- **The stack:** one `just uc=local start` brings up the official v0.7.0 image with a storage root, an S3-compatible bucket, and a second notebook service on Spark 4.1.3, Iceberg 1.11, and PyIceberg 0.12.
- **The protocol:** Unity Catalog's Iceberg REST catalog now creates, commits to, renames, and drops native Iceberg tables, and we watched it write a table's first `metadata.json` itself.
- **The engines:** Spark and PyIceberg wrote the sanctuary's tables through the same catalog, time traveled them, and evolved them, and a CI notebook checks that a commit from one engine is visible to the other on every pull request. Support isn't limited to these engines: any Iceberg engine can read/write to an Iceberg table governed by Unity Catalog.
- **The governance:** the same `USE CATALOG`, `USE SCHEMA`, and `SELECT` grants decide what every engine can do, and the `demo-auth` personas let us watch that happen.

If there's one mental model to keep, it's this: a catalog is only as useful as the number of engines that will check in at its desk, and the rules should follow the table, not the engine. And two honest limits, at the time of writing: Spark can't query Iceberg metadata tables like `.snapshots` by name against Unity Catalog yet, and there's no Iceberg runtime for Spark 4.2.

As always, start small. One namespace, one table, one engine. Then open the second notebook and watch another engine see exactly the same table.

### Try It Yourself

```bash
git clone https://github.com/open-lakehouse/unitycatalog-playground.git
cd unitycatalog-playground
git checkout v0.2.0
just uc=local start
```

Open the `:2719` URL it prints (`just url-iceberg` prints it again), then run, in order:

1. `iceberg/unitycatalog-iceberg-spark.py`: Spark SQL against the Iceberg REST catalog, from the first table to evolution, rename, an external table, and drop
2. `iceberg/unitycatalog-pyiceberg.py`: the same catalog from Python, no JVM required
3. `iceberg/ci-smoke-iceberg.py`: the round trip that keeps it all honest

- Playground release: [unitycatalog-playground v0.2.0](https://github.com/open-lakehouse/unitycatalog-playground/releases/tag/v0.2.0)
- Release notes: [Unity Catalog 0.7.0](https://github.com/unitycatalog/unitycatalog/releases/tag/v0.7.0)
- Come say hi in the [Unity Catalog community Slack](https://go.unitycatalog.io/slack), and tell us which engine you connected first.
