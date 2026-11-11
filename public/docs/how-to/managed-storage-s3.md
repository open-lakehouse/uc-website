---
title: Set managed storage for catalogs and schemas on S3
summary: Give Unity Catalog catalogs and schemas S3 storage roots under an
  external location, and see where the server places managed volumes and tables.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/managed-storage-s3/
companions:
  - url: "https://unitycatalog.io/docs/how-to/managed-storage-s3/snippets/managed_storage.py"
    kind: python
    purpose: "Give a catalog and a schema S3 storage roots and see where managed data lands."
    run: "AWS_ALLOW_HTTP=true AWS_ENDPOINT_URL=http://localhost:9000 AWS_ENDPOINT_URL_S3=http://localhost:9000 AWS_REGION=us-east-1 UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/managed-storage-s3/snippets/managed_storage.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/managed-storage-s3/snippets/managed_storage.sh"
    kind: shell
    purpose: "Give a catalog and a schema S3 storage roots with the uc CLI and see where managed data lands."
    run: "bash managed_storage.sh"
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

- [`managed_storage.py`](https://unitycatalog.io/docs/how-to/managed-storage-s3/snippets/managed_storage.py) (Python): Give a catalog and a schema S3 storage roots and see where managed data lands.
  - run: `AWS_ALLOW_HTTP=true AWS_ENDPOINT_URL=http://localhost:9000 AWS_ENDPOINT_URL_S3=http://localhost:9000 AWS_REGION=us-east-1 UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/managed-storage-s3/snippets/managed_storage.py`
- [`managed_storage.sh`](https://unitycatalog.io/docs/how-to/managed-storage-s3/snippets/managed_storage.sh) (Shell): Give a catalog and a schema S3 storage roots with the uc CLI and see where managed data lands.
  - run: `bash managed_storage.sh` from `uc-docs-env/uc-aws`

A storage root on a catalog or schema tells [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") where to put managed tables and volumes. When you create a managed object, you don't give it a location. The server allocates one under the schema's storage root or, if the schema has none, under the catalog's. On S3, that root must lie inside an [external location](https://unitycatalog.io/docs/how-to/configure-aws-storage/), because the external location's storage credential is what the server uses to vend access to the managed data. For the difference between managed and external objects, see [External tables and catalog-managed Delta tables](https://unitycatalog.io/docs/explanation/external-and-managed-tables/).

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0 with simulated S3 and PostgreSQL, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/#start-the-server-with-simulated-s3).
> - A storage credential and an external location: [Configure AWS storage credentials and external locations](https://unitycatalog.io/docs/how-to/configure-aws-storage/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/), for the Python examples.

## Set up the client

Set up the client for your interface:

**Python SDK**

Start Python with the SDK:

```bash
uv run --with unitycatalog-client==0.7.0 --with obstore==0.11.1 python -m asyncio
```

`managed_storage.py`

```python
from obstore.store import from_url
from unitycatalog.client import (
    ApiClient,
    AwsIamRoleRequest,
    CatalogsApi,
    Configuration,
    CreateCatalog,
    CreateCredentialRequest,
    CreateExternalLocation,
    CreateSchema,
    CreateVolumeRequestContent,
    CredentialPurpose,
    CredentialsApi,
    ExternalLocationsApi,
    GenerateTemporaryVolumeCredential,
    SchemasApi,
    TemporaryCredentialsApi,
    VolumeOperation,
    VolumesApi,
    VolumeType,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
```

**CLI**

`managed_storage.sh`

```bash
uc() { docker exec unitycatalog bin/uc "$@"; }
```

The examples use an external location `lake` on `s3://amzn-s3-demo-bucket/lake`:

**Python SDK**

`managed_storage.py`

```python
await CredentialsApi(api).create_credential(
    CreateCredentialRequest(
        name="lake_storage",
        purpose=CredentialPurpose.STORAGE,
        aws_iam_role=AwsIamRoleRequest(
            role_arn="arn:aws:iam::123456789012:role/uc-storage-lake"
        ),
    )
)
await ExternalLocationsApi(api).create_external_location(
    CreateExternalLocation(
        name="lake",
        url="s3://amzn-s3-demo-bucket/lake",
        credential_name="lake_storage",
    )
)
```

**CLI**

`managed_storage.sh`

```bash
uc credential create --name lake_storage \
  --aws_iam_role_arn arn:aws:iam::123456789012:role/uc-storage-lake
uc external_location create --name lake \
  --url s3://amzn-s3-demo-bucket/lake --credential_name lake_storage
```

## Create a catalog with a storage root

Pass `storage_root` when you create the catalog. The server appends its own prefix and the catalog's ID, and returns the result as `storage_location`:

**Python SDK**

`managed_storage.py`

```python
sales = await CatalogsApi(api).create_catalog(
    CreateCatalog(
        name="sales", storage_root="s3://amzn-s3-demo-bucket/lake/sales"
    )
)
print(sales.storage_location)
# s3://amzn-s3-demo-bucket/lake/sales/__unitystorage/catalogs/<catalog id>
```

**CLI**

`managed_storage.sh`

```bash
uc catalog create --name sales \
  --storage_root s3://amzn-s3-demo-bucket/lake/sales \
  --output jsonPretty
```

The root can be the external location's URL or any path below it. Several catalogs can share one root, since each gets its own ID-named directory.

The root is fixed when the catalog is created. The update API has no `storage_root` field. To move managed data, create a new catalog and copy it.

**Required privileges:** ownership of the metastore or `CREATE CATALOG` on it, plus ownership of the external location or `CREATE MANAGED STORAGE` on it.

## Give a schema its own storage root

A schema without a root uses its catalog's. Give a schema its own root when its data belongs in a different prefix, for example one with a different storage role or retention policy:

**Python SDK**

`managed_storage.py`

```python
schemas = SchemasApi(api)
await schemas.create_schema(CreateSchema(name="raw", catalog_name="sales"))
curated = await schemas.create_schema(
    CreateSchema(
        name="curated",
        catalog_name="sales",
        storage_root="s3://amzn-s3-demo-bucket/lake/curated",
    )
)
print(curated.storage_location)
# s3://amzn-s3-demo-bucket/lake/curated/__unitystorage/schemas/<schema id>
```

**CLI**

`managed_storage.sh`

```bash
uc schema create --catalog sales --name raw
uc schema create --catalog sales --name curated \
  --storage_root s3://amzn-s3-demo-bucket/lake/curated \
  --output jsonPretty
```

A schema's root doesn't have to be under its catalog's root. Here `curated` uses a sibling prefix inside the same external location.

**Required privileges:** ownership of the catalog, or `USE CATALOG` and `CREATE SCHEMA` on it. For a root, also ownership of the external location or `CREATE MANAGED STORAGE` on it.

## Create managed objects

Create a managed volume without a location, and the server picks the nearest root:

**Python SDK**

`managed_storage.py`

```python
volumes = VolumesApi(api)
drops = await volumes.create_volume(
    CreateVolumeRequestContent(
        catalog_name="sales",
        schema_name="raw",
        name="drops",
        volume_type=VolumeType.MANAGED,
    )
)
reports = await volumes.create_volume(
    CreateVolumeRequestContent(
        catalog_name="sales",
        schema_name="curated",
        name="reports",
        volume_type=VolumeType.MANAGED,
    )
)
print(drops.storage_location)  # under the catalog's root
print(reports.storage_location)  # under the schema's root
```

**CLI**

`managed_storage.sh`

```bash
uc volume create --full_name sales.raw.drops --volume_type MANAGED --output jsonPretty
uc volume create --full_name sales.curated.reports --volume_type MANAGED --output jsonPretty
```

Managed paths have these forms:

| Object's schema              | Managed volume path                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| Has no root (`sales.raw`)    | `<catalog root>/__unitystorage/catalogs/<catalog id>/volumes/<volume id>` |
| Has a root (`sales.curated`) | `<schema root>/__unitystorage/schemas/<schema id>/volumes/<volume id>`    |

Managed tables follow the same pattern with `tables/<table id>`. Engines create them through the catalog. See [Create and update a catalog-managed Delta table](https://unitycatalog.io/docs/tutorials/managed-delta-table/).

Clients reach managed data with vended credentials, the same way as for external data:

**Python SDK**

`managed_storage.py`

```python
vended = await TemporaryCredentialsApi(
    api
).generate_temporary_volume_credentials(
    GenerateTemporaryVolumeCredential(
        volume_id=reports.volume_id, operation=VolumeOperation.WRITE_VOLUME
    )
)
aws = vended.aws_temp_credentials
store = from_url(
    vended.url,
    access_key_id=aws.access_key_id,
    secret_access_key=aws.secret_access_key,
    session_token=aws.session_token,
    region="us-east-1",
)
await obstore.put_async(
    store, "2026-10/daily.csv", b"day,total\n2026-10-01,42\n"
)
```

**CLI**

The `uc` CLI can't vend credentials. Use the Python SDK or the REST API `POST /temporary-volume-credentials`.

The `__unitystorage` prefix belongs to the server. An external table or volume whose location contains it is rejected with `Input path '…' contains managed storage prefix __unitystorage.`:

**Python SDK**

The example script checks this rejection in `_check_reserved_prefix`.

**CLI**

`managed_storage.sh`

```bash
uc volume create --full_name sales.raw.sneaky --volume_type EXTERNAL \
  --storage_location s3://amzn-s3-demo-bucket/lake/sales/__unitystorage/sneaky
```

> **Warning**
>
> Check each root against `external_location list` before you use it. With authorization enabled, the server rejects a root outside every external location. With authorization disabled, as on the local server, it accepts the root, and credential requests for its objects fail later.

## Delete a catalog with managed storage

**Python SDK**

`managed_storage.py`

```python
await CatalogsApi(api).delete_catalog(name="sales", force=True)
```

**CLI**

`managed_storage.sh`

```bash
uc catalog delete --name sales --force true
```

`force` deletes the catalog's schemas and everything in them. Deleting the catalog doesn't delete the external location or the storage credential.

**Required privileges:** ownership of the catalog or of the metastore.

## Next steps

- [Configure Spark to use Unity Catalog](https://unitycatalog.io/docs/how-to/configure-spark/) and create managed Delta tables under these roots.
- [Manage volumes](https://unitycatalog.io/docs/how-to/manage-volumes/) for the full volume lifecycle.
