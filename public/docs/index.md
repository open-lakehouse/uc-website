---
title: "Unity Catalog"
description: "Documentation for Unity Catalog OSS: the open catalog for tables, volumes, functions, and models across engines."
canonical: https://unitycatalog.io/docs/
---

# Unity Catalog

Documentation for Unity Catalog OSS: the open catalog for tables, volumes, functions, and models across engines.

## Run it locally

These commands need only Docker. [Create your first catalog](https://unitycatalog.io/docs/tutorials/getting-started.md) walks through them.

```bash
curl -fsSL https://unitycatalog.io/docs/env/unitycatalog.tar.gz | tar -xz
cd uc-docs-env/unitycatalog && docker compose up -d --wait
export UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog
```

## Start here

- [What is Unity Catalog OSS?](https://unitycatalog.io/docs/explanation/what-is-unity-catalog.md): The open catalog for all your Data and AI assets in the open lakehouse.
- [Create your first catalog](https://unitycatalog.io/docs/tutorials/getting-started.md): Start a local Unity Catalog server, browse its sample data, then create a catalog, a schema, and a Delta table of your own with the uc CLI.
- [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server.md): Start one of the docs' Docker Compose environments, a single-user Unity Catalog server on localhost:8080 on its own or with a local stand-in for Amazon S3 and a PostgreSQL metastore, and know what each one runs.

## Use Unity Catalog

### Tutorials

- [Use the Python client](https://unitycatalog.io/docs/tutorials/python-client.md): Use the official Python SDK to write, read, and organize data.
- [Create and update a catalog-managed Delta table](https://unitycatalog.io/docs/tutorials/managed-delta-table.md): Give a catalog managed storage, then use Spark to create a Delta table that Unity Catalog manages, write and change its rows, read an earlier version, and drop it.
- [Working with volumes and files](https://unitycatalog.io/docs/tutorials/read-volume-files.md): Register a folder of documents as a Unity Catalog volume, then find it by name, ask the catalog for access, and read the files with obstore.
- [Working with Python functions](https://unitycatalog.io/docs/tutorials/first-python-function.md): Register a typed Python function in Unity Catalog, inspect what the catalog stores, run it through the catalog, and remove it.
- [Working with metric views](https://unitycatalog.io/docs/tutorials/first-metric-view.md): Use Spark to define order KPIs once as a metric view in Unity Catalog, then query them by month, by status, and in total.
- [Register and reload a model with MLflow](https://unitycatalog.io/docs/tutorials/register-model-mlflow.md): Train a model, log it to an MLflow tracking server, register it as a version in Unity Catalog, and load it back by name to predict.

### Catalogs and schemas

- [Manage catalogs and schemas](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas.md): Create, inspect, update, rename, and delete Unity Catalog catalogs and schemas with the Python SDK or the CLI.

### Tables

- [Register external Delta table](https://unitycatalog.io/docs/how-to/register-external-table.md): Register a Delta table that already exists in storage as an external table in Unity Catalog, inspect and read it, and drop it without losing data.
- [Register external files as tables](https://unitycatalog.io/docs/how-to/table-storage-formats.md): Register Parquet, CSV, JSON, and other file-based data as external tables in Unity Catalog, and read them from PyArrow, Polars, or DuckDB.
- [Read and write catalog-managed Delta tables](https://unitycatalog.io/docs/how-to/managed-delta-tables.md): Create catalog-managed Delta tables in Unity Catalog, and read and write them through Spark or DuckDB.
- [Manage schemas and properties](https://unitycatalog.io/docs/how-to/change-table-schema.md): Change a Unity Catalog managed table's columns and properties through Spark; change an external table with Spark or deltalake, then sync the catalog's record.
- [Replace or overwrite tables](https://unitycatalog.io/docs/how-to/replace-and-overwrite-tables.md): Replace a managed Delta table's definition and rows, all of its rows, or some of them with CREATE OR REPLACE, INSERT OVERWRITE, and REPLACE WHERE in Spark SQL.
- [Seed TPC-H data into Unity Catalog](https://unitycatalog.io/docs/how-to/seed-tpch-data.md): Generate the eight-table TPC-H benchmark dataset with DuckDB, write it as Delta tables, and register them in Unity Catalog as samples.tpch.

### Views and metric views

- [Manage SQL views](https://unitycatalog.io/docs/how-to/sql-views.md): Create, query, and inspect SQL views in Unity Catalog, and drop and recreate a view to change it.
- [Manage metric views](https://unitycatalog.io/docs/how-to/metric-views.md): Keep metric-view definitions in YAML files, create them with Spark over tables or queries, register them through the REST API, and change or drop them.

### Volumes and files

- [Manage volumes](https://unitycatalog.io/docs/how-to/manage-volumes.md): Create external and managed Unity Catalog volumes, inspect, rename, and delete them, and see what happens to their files.
- [Request temporary credentials](https://unitycatalog.io/docs/how-to/temporary-credentials.md): Ask Unity Catalog for storage credentials scoped to one table, volume, model version, or path, open storage with them, and renew them before they expire.
- [Use Unity Catalog credentials with obstore](https://unitycatalog.io/docs/how-to/obstore-credentials.md): Give obstore a credential provider that asks Unity Catalog for S3, Azure, or Google Cloud credentials, works from sync and async code, and renews them before they expire.
- [Use volumes as marimo remote storage](https://unitycatalog.io/docs/how-to/marimo-remote-storage.md): Open a Unity Catalog volume as an obstore store in a marimo notebook, so its files show in the Remote Storage panel and cells read them with vended credentials.

### Functions and AI

- [Manage Python functions](https://unitycatalog.io/docs/how-to/manage-python-functions.md): Unity Catalog stores a Python function's signature, docstring, and body, and the caller runs it. Register, view, replace, and delete one with unitycatalog-ai.
- [Run functions in apps and notebooks](https://unitycatalog.io/docs/how-to/run-functions.md): unitycatalog-ai runs a catalog function on the caller's machine, in a sandboxed child process by default. Call it sync or async, set limits, and read errors.
- [Use catalog functions as LangChain tools](https://unitycatalog.io/docs/how-to/langchain-tools.md): UCFunctionToolkit turns Unity Catalog functions into LangChain tools. Each call fetches the function from the catalog and runs it on the agent's machine.

### Models

- [Manage registered models](https://unitycatalog.io/docs/how-to/manage-models.md): Register MLflow models as Unity Catalog model versions, load a version by number, and update, rename, and delete models and versions.

## Connect engines and clients

- [Use Spark with Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark.md): Pick matching Spark, Delta, and Unity Catalog connector versions, register a Unity Catalog catalog in a SparkSession, and choose how Spark authenticates to the server.
- [Use DuckDB with Unity Catalog](https://unitycatalog.io/docs/how-to/duckdb.md): Attach a Unity Catalog catalog in DuckDB, query its Delta tables with SQL, append rows, and create tables.
- [Query Unity Catalog tables from Python DataFrame libraries](https://unitycatalog.io/docs/how-to/python-dataframes.md): Find, read, and append to external Delta tables in Unity Catalog from Polars, Daft, and pandas, with storage credentials vended by the server.
- [Use Iceberg REST clients with Unity Catalog](https://unitycatalog.io/docs/how-to/iceberg-rest.md): Connect Spark, DuckDB, PyIceberg, and DataFusion to Unity Catalog's Iceberg REST API, then create, write, change, rename, and drop managed Iceberg tables with vended S3 credentials.
- [Use the Java client in an application](https://unitycatalog.io/docs/how-to/java-client.md): Add the unitycatalog-client artifact to a JVM application, connect with a token, create and look up catalogs, schemas, and tables, page through lists, and handle API errors.

## Operate Unity Catalog

### Plan and deploy

- [Run the Unity Catalog server with Java](https://unitycatalog.io/docs/how-to/run-server-with-java.md): Start the Unity Catalog server from its published Maven artifact with JBang, without Docker, and keep its metadata in an H2 file between restarts.
- [Configure PostgreSQL as the metadata database](https://unitycatalog.io/docs/how-to/configure-backend-db.md): Store Unity Catalog's metadata in PostgreSQL instead of the default in-container H2 database, so catalogs survive restarts.

### Storage

- [Configure AWS storage credentials and external locations](https://unitycatalog.io/docs/how-to/configure-aws-storage.md): Run Unity Catalog on AWS under a master IAM role, register an S3 storage role as a storage credential, bind an S3 prefix to it with an external location, and check that the server vends scoped credentials.
- [Set managed storage for catalogs and schemas on S3](https://unitycatalog.io/docs/how-to/managed-storage-s3.md): Give Unity Catalog catalogs and schemas S3 storage roots under an external location, and see where the server places managed volumes and tables.

## Build integrations

- [Use the Python client](https://unitycatalog.io/docs/tutorials/python-client.md): Use the official Python SDK to write, read, and organize data.

## Concepts

### Architecture

- [What is Unity Catalog OSS?](https://unitycatalog.io/docs/explanation/what-is-unity-catalog.md): The open catalog for all your Data and AI assets in the open lakehouse.
- [The Unity Catalog Delta API](https://unitycatalog.io/docs/explanation/delta-api.md): Unity Catalog's Delta API applies requirements and updates all or nothing, and carries Delta's own schema and table features on the wire.

### Data and governance

- [Core concepts](https://unitycatalog.io/docs/explanation/uc-basics.md): How Unity Catalog organizes data and AI assets into a three-level namespace, how catalogs reach storage, which privileges the open source server enforces on each object, and how it manages users.
- [External tables and catalog-managed Delta tables](https://unitycatalog.io/docs/explanation/external-and-managed-tables.md): Who owns a table's files and who decides its latest version, how a catalog-managed Delta table is created and committed through the Delta API, and why path-based access isn't a substitute.
- [Credential vending](https://unitycatalog.io/docs/explanation/credential-vending.md): How Unity Catalog issues short-lived storage credentials scoped to one table, volume, or path, and why that makes the catalog the gatekeeper for data access.

### AI and semantics

- [Unity Catalog and MLflow](https://unitycatalog.io/docs/explanation/models-and-mlflow.md): MLflow tracks experiments, runs, and logged models. Unity Catalog registers the model, numbers its versions, stores their files, and governs access.
- [SQL views and metric views as catalog objects](https://unitycatalog.io/docs/explanation/views-and-metric-views.md): Unity Catalog stores a view's definition, columns, and dependencies, and the engine runs it. A metric view's definition is YAML with measures and dimensions.

## API reference

- [Unity Catalog REST API](https://unitycatalog.io/docs/api/catalog.md): Catalogs, schemas, tables, volumes, functions, registered models, temporary credentials, and permissions.
- [Unity Control API](https://unitycatalog.io/docs/api/control.md): SCIM user management, token exchange, and logout on the Unity Catalog server.
- [UC Delta API](https://unitycatalog.io/docs/api/delta.md): The Delta-native REST catalog for Delta clients: configuration, tables and commits, and temporary credentials.
- [Iceberg REST Catalog API](https://unitycatalog.io/docs/api/iceberg.md): The Apache Iceberg REST Catalog spec, which Unity Catalog implements at /api/2.1/unity-catalog/iceberg.
