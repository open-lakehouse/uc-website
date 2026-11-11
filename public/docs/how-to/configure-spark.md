---
title: Use Spark with Unity Catalog
summary: Pick matching Spark, Delta, and Unity Catalog connector versions,
  register a Unity Catalog catalog in a SparkSession, and choose how Spark
  authenticates to the server.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/configure-spark/
companions:
  - url: "https://unitycatalog.io/docs/how-to/configure-spark/snippets/spark_session.py"
    kind: python
    purpose: "Connect Spark to Unity Catalog and list what the catalog holds."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/configure-spark/snippets/spark_session.py"
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

- [`spark_session.py`](https://unitycatalog.io/docs/how-to/configure-spark/snippets/spark_session.py) (Python): Connect Spark to Unity Catalog and list what the catalog holds.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/configure-spark/snippets/spark_session.py`

Apache Spark connects to a [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") server through the Unity Catalog Spark connector, so that Spark SQL can name `catalog.schema.table` and read and write the tables it holds. The connector registers one Unity Catalog catalog as a Spark catalog. Delta Spark handles the table format, and from Delta 4.3.0 it reads and commits catalog-managed tables through the server's Delta API.

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/).
> - [Java 17](https://adoptium.net/temurin/releases/?version=17).

## Choose matching versions

The connector is built per Spark minor version. Its artifact name carries the Spark version, and it needs a Delta Spark build for the same Spark version:

| Spark                                                                                                                       | Unity Catalog connector                             | Delta Spark                           |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------- |
| 4.1 (tested here: PySpark 4.1.0)                                                                                            | `io.unitycatalog:unitycatalog-spark_4.1_2.13:0.7.0` | `io.delta:delta-spark_4.1_2.13:4.3.1` |
| 4.0                                                                                                                         | `io.unitycatalog:unitycatalog-spark_4.0_2.13:0.7.0` | `io.delta:delta-spark_4.0_2.13:4.3.1` |
| 4.2 (tested here: PySpark 4.2.0, in [Working with metric views](https://unitycatalog.io/docs/tutorials/first-metric-view/)) | `io.unitycatalog:unitycatalog-spark_4.2_2.13:0.7.0` | `io.delta:delta-spark_4.2_2.13:4.4.1` |

With a Delta Spark release older than 4.3.0, the connector quietly skips the Delta API, and catalog-managed tables don't work.

### Connector versions by release

Each Unity Catalog release publishes one connector artifact per Spark minor version, named `unitycatalog-spark_<spark>_2.13`. All of them are built for Scala 2.13. The release notes name a Delta Spark release that the connector works with. The connector's own tests build against the version in the last column, so where the two differ, the release notes name the newer release.

| Unity Catalog                                                             | Spark 4.0 | Spark 4.1 | Spark 4.2 | Delta Spark in the release notes | Delta Spark the connector tests with |
| ------------------------------------------------------------------------- | --------- | --------- | --------- | -------------------------------- | ------------------------------------ |
| [0.7.0](https://github.com/unitycatalog/unitycatalog/releases/tag/v0.7.0) | ✓         | ✓         | ✓         | Not named                        | 4.3.1                                |
| [0.6.0](https://github.com/unitycatalog/unitycatalog/releases/tag/v0.6.0) | ✓         | ✓         | ✓         | 4.4.0                            | 4.3.1                                |
| [0.5.1](https://github.com/unitycatalog/unitycatalog/releases/tag/v0.5.1) | ✓         | ✓         | —         | Not named                        | 4.2.0                                |
| [0.5.0](https://github.com/unitycatalog/unitycatalog/releases/tag/v0.5.0) | ✓         | ✓         | —         | 4.3.0                            | 4.2.0                                |

Releases before 0.5.0 shipped a single `unitycatalog-spark_2.13` artifact.

## Configure the session

Register the catalog under a Spark catalog name and point it at the server. The Spark name is your choice. Using the Unity Catalog catalog's own name, here `unity`, keeps three-part names the same in Spark and in the catalog:

`spark_session.py`

```python
from pyspark.sql import SparkSession

UC_SPARK = "io.unitycatalog:unitycatalog-spark_4.1_2.13:0.7.0"
DELTA_SPARK = "io.delta:delta-spark_4.1_2.13:4.3.1"

spark = (
    SparkSession.builder.appName("uc-spark")
    .config("spark.jars.packages", f"{UC_SPARK},{DELTA_SPARK}")
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
    .config(
        "spark.sql.catalog.spark_catalog",
        "org.apache.spark.sql.delta.catalog.DeltaCatalog",
    )
    .config("spark.sql.catalog.unity", "io.unitycatalog.spark.UCSingleCatalog")
    .config("spark.sql.catalog.unity.uri", "http://localhost:8080")
    .config("spark.sql.catalog.unity.auth.type", "static")
    .config("spark.sql.catalog.unity.auth.token", "not-used")
    .config("spark.sql.defaultCatalog", "unity")
    .getOrCreate()
)
```

Each setting has a job:

| Setting                                                   | Purpose                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `spark.jars.packages`                                     | Downloads the connector and Delta Spark.                                                             |
| `spark.sql.extensions`, `spark.sql.catalog.spark_catalog` | Enable Delta's SQL support in the session.                                                           |
| `spark.sql.catalog.<name>`                                | Registers the Unity Catalog catalog `<name>` with Spark. Repeat this block for each catalog you use. |
| `spark.sql.catalog.<name>.uri`                            | The server's base URL, without `/api/2.1/unity-catalog`.                                             |
| `spark.sql.catalog.<name>.auth.*`                         | How Spark authenticates. See the next section.                                                       |
| `spark.sql.defaultCatalog`                                | Lets queries leave out the catalog name.                                                             |

The same keys work as `--conf` options for `spark-submit`, `spark-sql`, and `pyspark`, with `--packages` in place of `spark.jars.packages`.

> **Tip**
>
> If you reach Maven through a mirror, add `.config("spark.jars.repositories", "https://<your-mirror>")` to the builder.

## Authenticate to the server

The connector always needs an authentication type, even when the server has authorization disabled. Without one, the first query fails with `Required configuration key 'type' is missing or empty`.

- **Static token.** Set `auth.type` to `static` and `auth.token` to a Unity Catalog access token. The local server above accepts any value. Older configurations set `token` instead, which still works. Set only one of the two.
- **OAuth client credentials.** Set `auth.type` to `oauth`, plus `auth.oauth.uri`, `auth.oauth.clientId`, and `auth.oauth.clientSecret`. `auth.oauth.scope` defaults to `all-apis`. The connector fetches and renews the token itself. This page doesn't test the OAuth flow.

Keep secrets out of source code. Read the token or client secret from the environment or a secret store when you build the session.

## Check the connection

List the catalog's schemas and the tables in one of them:

`spark_session.py`

```python
spark.sql("SHOW SCHEMAS").show()
spark.sql("SHOW TABLES IN default").show()
```

The sample catalog's `default` schema lists tables such as `numbers` and `marksheet`. These sample tables live inside the server's container, so this local Spark can list them but can't read their files. Create your own tables under a storage root that both sides can reach, as in [Create and update a catalog-managed Delta table](https://unitycatalog.io/docs/tutorials/managed-delta-table/).

## Tune storage credentials

When Spark reads or writes a table, the connector asks the server for short-lived storage credentials for that table's location. It applies them per table. Three catalog options control this, and the defaults suit most setups:

| Option                    | Default | Effect                                                                                                      |
| ------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `renewCredential.enabled` | `true`  | Fetches new credentials before vended ones expire, so long jobs keep running.                               |
| `credScopedFs.enabled`    | `true`  | Caches file-system clients per credential, not per bucket, so tables in the same bucket don't share access. |
| `deltaRestApi.enabled`    | `true`  | Uses the Delta API for Delta tables. Catalog-managed tables need it.                                        |

Set them like the others, for example `spark.sql.catalog.unity.renewCredential.enabled`. For how the server decides what each credential may access, see [Credential vending](https://unitycatalog.io/docs/explanation/credential-vending/).

Option names and defaults come from the connector source, [`OptionsUtil.java`](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/connectors/spark/src/main/java/io/unitycatalog/spark/utils/OptionsUtil.java) and [`AuthConfigs.java`](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/clients/java/src/main/java/io/unitycatalog/client/auth/AuthConfigs.java).

## Next steps

- [Create and update a catalog-managed Delta table](https://unitycatalog.io/docs/tutorials/managed-delta-table/) puts this session to work.
- [Use DuckDB with Unity Catalog](https://unitycatalog.io/docs/how-to/duckdb/) and [Query Unity Catalog tables from Python DataFrame libraries](https://unitycatalog.io/docs/how-to/python-dataframes/) cover other engines.
