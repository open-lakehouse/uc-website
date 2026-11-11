---
title: Configure PostgreSQL as the metadata database
summary: Store Unity Catalog's metadata in PostgreSQL instead of the default
  in-container H2 database, so catalogs survive restarts.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/configure-backend-db/
companions:
  - url: "https://unitycatalog.io/docs/how-to/configure-backend-db/snippets/backend_db.sh"
    kind: shell
    purpose: "Run the local server on PostgreSQL and check that its metadata survives."
    run: "bash backend_db.sh"
    services: ["unitycatalog"]
environment:
  title: "Unity Catalog 0.7.0 with simulated S3 and PostgreSQL"
  dir: "uc-docs-env/uc-aws"
  start: ["curl -fsSL https://unitycatalog.io/docs/env/uc-aws.tar.gz | tar -xz", "cd uc-docs-env/uc-aws && docker compose up -d --wait", "export AWS_ALLOW_HTTP=true", "export AWS_ENDPOINT_URL=http://localhost:9000", "export AWS_ENDPOINT_URL_S3=http://localhost:9000", "export AWS_REGION=us-east-1", "export UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog"]
  stop: "docker compose down"
  elements: ["envoy", "postgresql", "rustfs", "unityCatalogServer"]
  index: "https://unitycatalog.io/docs/env/environments.json"
---

## Companion files

CI-tested scripts that run this page's examples end to end. A script that exits 0 has passed its checks.

They need Unity Catalog 0.7.0 with simulated S3 and PostgreSQL running. To start it (also `environment` in this file's frontmatter):

```bash
curl -fsSL https://unitycatalog.io/docs/env/uc-aws.tar.gz | tar -xz
cd uc-docs-env/uc-aws && docker compose up -d --wait
export AWS_ALLOW_HTTP=true
export AWS_ENDPOINT_URL=http://localhost:9000
export AWS_ENDPOINT_URL_S3=http://localhost:9000
export AWS_REGION=us-east-1
export UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog
```

- [`backend_db.sh`](https://unitycatalog.io/docs/how-to/configure-backend-db/snippets/backend_db.sh) (Shell): Run the local server on PostgreSQL and check that its metadata survives.
  - run: `bash backend_db.sh` from `uc-docs-env/uc-aws`

A [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") server stores catalogs, schemas, tables, volumes, functions, models, and credentials in a relational database. By default, this is an H2 file inside the server, so the metadata is lost with the container. To keep it in PostgreSQL, mount one `hibernate.properties` file into the server. The official image already includes the PostgreSQL JDBC driver, and the server creates its tables on first start.

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0 with simulated S3 and PostgreSQL, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/#start-the-server-with-simulated-s3).
> - A PostgreSQL database that the server can reach, and a role that owns it. This page uses PostgreSQL 16.

## Create the database

Create a role and a database it owns. The server needs to create and alter tables in the database, so the owner is the simplest role to use:

`create-database.sql`

```sql
-- Run as a PostgreSQL superuser or a role with CREATEROLE and CREATEDB.
CREATE ROLE unitycatalog LOGIN PASSWORD 'change-me';
CREATE DATABASE unitycatalog OWNER unitycatalog;
```

## Point the server at PostgreSQL

The server reads `etc/conf/hibernate.properties`, relative to its working directory. In the container that's `/home/unitycatalog/etc/conf/hibernate.properties`. Replace the file with one that names your database:

`hibernate.properties`

```properties
hibernate.connection.driver_class=org.postgresql.Driver
hibernate.connection.url=jdbc:postgresql://db.example.com:5432/unitycatalog?sslmode=require
hibernate.connection.username=unitycatalog
hibernate.connection.password=change-me
hibernate.hbm2ddl.auto=update
hibernate.archive.autodetection=class
hibernate.show_sql=false
```

| Key                                                              | What it sets                                                                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `hibernate.connection.driver_class`                              | The JDBC driver. `org.postgresql.Driver` ships in the image.                                                                       |
| `hibernate.connection.url`                                       | The JDBC URL. Add `sslmode` and other [pgJDBC options](https://jdbc.postgresql.org/documentation/use/) as query parameters.        |
| `hibernate.connection.username`, `hibernate.connection.password` | The role from the previous step.                                                                                                   |
| `hibernate.hbm2ddl.auto`                                         | `update` makes the server create missing tables and columns at startup. Keep it: the server has no separate schema migration tool. |
| `hibernate.archive.autodetection`, `hibernate.show_sql`          | The image's defaults.                                                                                                              |

The file replaces the image's own `hibernate.properties`, so write all of these keys, not only the ones you change. With Docker, bind-mount it read-only over the path above. On Kubernetes, mount it from a Secret, because it holds the password. Then restart the server.

If you run the server from a release tarball or a source build instead of the image, also put the PostgreSQL JDBC driver on the server's classpath, as the upstream [deployment guide](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/docs/server/deployment.md) describes.

A server that can't reach the database doesn't start. It exits with `Exception during creation of SessionFactory` and the database's reason, for example `FATAL: password authentication failed for user "unitycatalog"`.

> **Warning**
>
> A server whose `server.properties` sets `server.env=test` ignores `hibernate.properties` and keeps its metadata in memory. Use `dev` or leave it unset.

## Try it on the local server

The docs' environment with simulated S3 keeps its metadata in PostgreSQL. From the `uc-docs-env/uc-aws` folder, start it instead of the default server:

`backend_db.sh`

```bash
docker compose up -d --wait
```

It runs the server next to a `db` PostgreSQL service, with its data in the `postgres-data` volume. The server's `hibernate.properties` names that database:

`modules/unity-catalog/secrets/hibernate.properties`

```properties
# Generated by trestle. Unity Catalog keeps its metadata in PostgreSQL instead of the image's
# in-container H2 file, so catalogs survive a new container. This file replaces the image's own
# hibernate.properties, so it writes every key. The image bundles the PostgreSQL JDBC driver.
hibernate.connection.driver_class=org.postgresql.Driver
hibernate.connection.url=jdbc:postgresql://db:5432/unitycatalog
hibernate.connection.username=postgres
hibernate.connection.password=postgres
# The server has no separate migration tool: `update` creates missing tables and columns at
# startup.
hibernate.hbm2ddl.auto=update
hibernate.archive.autodetection=class
hibernate.show_sql=false
```

The server starts with an empty metastore. The sample catalog `unity` lives in the image's H2 file, so it isn't there.

## Check that metadata survives a new container

Define the `uc` alias from [Run the `uc` CLI](https://unitycatalog.io/docs/how-to/run-local-server/#run-the-uc-cli) and create a catalog:

`backend_db.sh`

```bash
uc catalog create --name persisted --comment "Survives a new server container"
```

Replace the server container with a new one, then read the catalog back:

`backend_db.sh`

```bash
docker compose up -d --wait --force-recreate unitycatalog
uc catalog get --name persisted --output jsonPretty
```

The catalog is still there. On the default H2 server, the new container would start from the image's H2 file, without it. `docker compose down` followed by `up` keeps the metadata too, because it removes the containers but not the `postgres-data` volume.

The metadata is ordinary PostgreSQL tables, one per object type, named `uc_catalogs`, `uc_schemas`, `uc_tables`, and so on:

`backend_db.sh`

```bash
docker compose exec db \
  psql -U postgres -d unitycatalog -c 'SELECT name, comment FROM uc_catalogs'
```

Read these tables to inspect or back up the metastore, but change objects only through the server's API. The server keeps related rows consistent, and direct writes bypass that.

## Back up and upgrade

Back up the database with the usual PostgreSQL tools. On the local stack:

`backend_db.sh`

```bash
docker compose exec db \
  pg_dump -U postgres unitycatalog > uc-metadata.sql
```

Take a backup before you upgrade the server. On its first start, a new release adds the tables and columns it needs to the database, and nothing reverses that change. To roll back, restore the backup and start the old release.

The backup holds metadata only. Table and volume data stays in its storage locations.

To move from the default H2 database, recreate your catalogs and their contents through the API, or register existing external tables again. There's no export from H2.

## Reset the local metadata

To start over on the local stack, remove the containers and the `postgres-data` volume:

`backend_db.sh`

```bash
docker compose down -v
```

> **Danger**
>
> `down -v` deletes every catalog, schema, table, volume, and credential that the server stored, and the simulated S3 bucket's files. Files the tables point to elsewhere stay where they are, but the server no longer knows about them.

## Next steps

- [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/) covers the other variants of the local environment.
- [Manage catalogs and schemas](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/) to fill the new metastore.
