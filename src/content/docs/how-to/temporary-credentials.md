---
title: Request temporary storage credentials
summary: Ask Unity Catalog for storage credentials scoped to one table, volume,
  model version, or path, open storage with them, and renew them before they
  expire.
diataxis: how-to
---

A client that reads or writes data under [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.")
asks the server for storage credentials, then talks to
object storage itself. Each request names one
table, volume, model version, or path, and one operation. The server answers
with a short-lived credential for the object's storage that reaches only that
object's location and allows only that operation. Engines
such as Spark make these requests for you. Make them yourself when you build a
client, or open storage from an application. For how the server decides and
mints a credential, see
[Credential vending](/docs/explanation/credential-vending/).

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0 with simulated S3 and PostgreSQL, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/#start-the-server-with-simulated-s3).
- A storage credential and an external location over the data:
  [Configure AWS storage credentials and external locations](/docs/how-to/configure-aws-storage/).
- [uv](https://docs.astral.sh/uv/getting-started/installation/), for the Python
  examples, or [jq](https://jqlang.org/download/), for the REST examples.
:::

The examples use a catalog `analytics` with an S3 storage root under the
external location `lake` on `s3://amzn-s3-demo-bucket/lake`. Its schema `ops`
holds an external table `trips`, a managed volume `files`, and a registered
model `churn` with a finalized version 1.

## Set up the client

:::tab[Python SDK]
Start Python with the SDK and obstore:

```bash
uv run --with unitycatalog-client==0.7.0 --with obstore==0.11.1 python -m asyncio
```

```python title="temporary_credentials.py" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.py"
from datetime import UTC, datetime

import obstore
from obstore.store import S3Store, from_url
from unitycatalog.client import (
    ApiClient,
    Configuration,
    GenerateTemporaryModelVersionCredential,
    GenerateTemporaryPathCredential,
    GenerateTemporaryTableCredential,
    GenerateTemporaryVolumeCredential,
    ModelVersionOperation,
    PathOperation,
    TableOperation,
    TablesApi,
    TemporaryCredentialsApi,
    VolumeOperation,
    VolumesApi,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
```

Inside `async with ApiClient(config) as api:`, create the API object:

```python title="temporary_credentials.py" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.py"
temp = TemporaryCredentialsApi(api)
```
:::

:::tab[REST API]
The `uc` CLI has no command for temporary credentials, so call the REST API:

```bash title="temporary_credentials.sh" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.sh"
UC=http://localhost:8080/api/2.1/unity-catalog
```
:::

Every response has the same shape: `url`, the location the credential covers;
`expiration_time`, in epoch milliseconds; and one credential for the storage
behind `url`. For S3 that is `aws_temp_credentials`, with `access_key_id`,
`secret_access_key`, and `session_token`. Azure storage gets
`azure_user_delegation_sas`, with a `sas_token`, and Google Cloud Storage
gets `gcp_oauth_token`, with an `oauth_token`.

## Get credentials for a table

Look up the table's ID, then ask for `READ` or `READ_WRITE`:

:::tab[Python SDK]
```python title="temporary_credentials.py" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.py"
table = await TablesApi(api).get_table(full_name="analytics.ops.trips")
creds = await temp.generate_temporary_table_credentials(
    GenerateTemporaryTableCredential(
        table_id=table.table_id, operation=TableOperation.READ
    )
)
print(creds.url, creds.expiration_time)
```
:::

:::tab[REST API]
```bash title="temporary_credentials.sh" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.sh"
TABLE_ID=$(curl -s "$UC/tables/analytics.ops.trips" | jq -r .table_id)
curl -s -X POST "$UC/temporary-table-credentials" \
  -H 'Content-Type: application/json' \
  -d "{\"table_id\": \"$TABLE_ID\", \"operation\": \"READ\"}"
```
:::

The `url` is the table's storage location. A `READ` credential lists and reads
the table's files, and S3 rejects its writes.

**Required privileges:** `USE CATALOG` and `USE SCHEMA` on the parents, plus
`SELECT` on the table to read, or `SELECT` and `MODIFY` to write. Ownership
covers each of them
([source](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/auth/AuthorizeExpressions.java#L205-L213)).

## Get credentials for a volume

Look up the volume's ID, then ask for `READ_VOLUME` or `WRITE_VOLUME`:

:::tab[Python SDK]
```python title="temporary_credentials.py" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.py"
volume = await VolumesApi(api).get_volume(name="analytics.ops.files")
creds = await temp.generate_temporary_volume_credentials(
    GenerateTemporaryVolumeCredential(
        volume_id=volume.volume_id, operation=VolumeOperation.WRITE_VOLUME
    )
)
print(creds.url)
```
:::

:::tab[REST API]
```bash title="temporary_credentials.sh" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.sh"
VOLUME_ID=$(curl -s "$UC/volumes/analytics.ops.files" | jq -r .volume_id)
curl -s -X POST "$UC/temporary-volume-credentials" \
  -H 'Content-Type: application/json' \
  -d "{\"volume_id\": \"$VOLUME_ID\", \"operation\": \"WRITE_VOLUME\"}"
```
:::

The `url` is the volume's storage location. For a managed volume, the server
chose it under the schema's or catalog's storage root.

**Required privileges:** `USE CATALOG` and `USE SCHEMA` on the parents, plus
`READ VOLUME` to read. Writing needs ownership of the volume
([source](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/service/TemporaryVolumeCredentialsService.java#L36-L43)).

## Get credentials for a model version

A model version is named by its model's three-part name and its version
number. Ask for `READ_MODEL_VERSION` to load its files:

:::tab[Python SDK]
```python title="temporary_credentials.py" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.py"
creds = await temp.generate_temporary_model_version_credentials(
    GenerateTemporaryModelVersionCredential(
        catalog_name="analytics",
        schema_name="ops",
        model_name="churn",
        version=1,
        operation=ModelVersionOperation.READ_MODEL_VERSION,
    )
)
print(creds.url)
```
:::

:::tab[REST API]
```bash title="temporary_credentials.sh" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.sh"
curl -s -X POST "$UC/temporary-model-version-credentials" \
  -H 'Content-Type: application/json' \
  -d '{"catalog_name": "analytics", "schema_name": "ops", "model_name": "churn",
       "version": 1, "operation": "READ_MODEL_VERSION"}'
```
:::

`READ_WRITE_MODEL_VERSION` works only while the version is
`PENDING_REGISTRATION`, so a client can upload its files. Once the version is
finalized, the server refuses with `Cannot request read/write credentials on a
model version that has been finalized`. MLflow makes both requests for you when
it registers and loads a model (see
[Manage models](/docs/how-to/manage-models/)).

**Required privileges:** `USE CATALOG` and `USE SCHEMA` on the parents, plus
`EXECUTE` on the registered model to read. Writing needs ownership of the
model
([source](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/service/TemporaryModelVersionCredentialsService.java#L40-L47)).

## Get credentials for a path

Ask for a storage URL directly when no catalog object names it yet, for
example to stage files before you register a table:

:::tab[Python SDK]
```python title="temporary_credentials.py" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.py"
creds = await temp.generate_temporary_path_credentials(
    GenerateTemporaryPathCredential(
        url="s3://amzn-s3-demo-bucket/lake/landing",
        operation=PathOperation.PATH_READ_WRITE,
    )
)
print(creds.url)
```
:::

:::tab[REST API]
```bash title="temporary_credentials.sh" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.sh"
curl -s -X POST "$UC/temporary-path-credentials" \
  -H 'Content-Type: application/json' \
  -d '{"url": "s3://amzn-s3-demo-bucket/lake/landing", "operation": "PATH_READ_WRITE"}'
```
:::

The operation is `PATH_READ`, `PATH_READ_WRITE`, or `PATH_CREATE_TABLE`. The
credential covers the URL you asked for, not its external location, so ask for
the narrowest prefix you need. A URL outside every external location fails
with `FAILED_PRECONDITION` and `S3 bucket configuration not found.`

**Required privileges:** for a path inside a table, volume, or model, the
privileges on that object, as if you had asked for it by name. For a path no
object owns, `READ FILES` on the external location for `PATH_READ`, or `READ
FILES` and `WRITE FILES` for `PATH_READ_WRITE`. `PATH_CREATE_TABLE` needs
`CREATE EXTERNAL TABLE` on the external location, and the server refuses it
for a path that overlaps an existing table, volume, or model. Ownership of the
location covers each of them
([source](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/service/TemporaryPathCredentialsService.java#L58-L101)).

## Open storage with the credentials

Pass the three keys to your S3 client, with the `url` as its root. With
obstore:

:::tab[Python SDK]
```python title="temporary_credentials.py" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.py"
aws = creds.aws_temp_credentials
store = from_url(
    creds.url,
    access_key_id=aws.access_key_id,
    secret_access_key=aws.secret_access_key,
    session_token=aws.session_token,
    region="us-east-1",
)
await obstore.put_async(store, "events.json", b'{"event": "signup"}\n')
print([meta["path"] for meta in await obstore.list(store).collect_async()])
```
:::

Other S3 clients take the same three values. The AWS CLI and SDKs read them
from `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`.
S3 rejects any request outside the `url`, and any write made with a read
credential.

## Renew credentials before they expire

A long-running client caches a credential until shortly before
`expiration_time` and then asks again. The server checks the grants on every
request, so a revoked grant stops the renewal. With obstore, return the
credential from a provider function, and obstore calls it again only when the
cached one expires:

:::tab[Python SDK]
```python title="temporary_credentials.py" script="/docs/how-to/temporary-credentials/snippets/temporary_credentials.py"
async def volume_credentials():
    creds = await temp.generate_temporary_volume_credentials(
        GenerateTemporaryVolumeCredential(
            volume_id=volume.volume_id, operation=VolumeOperation.WRITE_VOLUME
        )
    )
    aws = creds.aws_temp_credentials
    return {
        "access_key_id": aws.access_key_id,
        "secret_access_key": aws.secret_access_key,
        "token": aws.session_token,
        "expires_at": datetime.fromtimestamp(
            creds.expiration_time / 1000, tz=UTC
        ),
    }

store = S3Store.from_url(
    volume.storage_location,
    region="us-east-1",
    credential_provider=volume_credentials,
)
for name in ("a.txt", "b.txt", "c.txt"):
    await obstore.put_async(store, name, b"refreshed as needed\n")
```
:::

The three writes share one credential. `expiration_time` is in milliseconds,
so divide it by 1000 before converting it to a time.

obstore calls an async provider only from its async methods. For a provider
that also serves sync calls, and how obstore times renewals, see
[Use Unity Catalog credentials with obstore](/docs/how-to/obstore-credentials/).

## Credentials for local storage

A table, volume, or path on `file://` storage needs no keys. The server still
checks the privileges, then returns only the `url`, with no
`aws_temp_credentials` and no `expiration_time`. A client that always expects
keys fails on local data, so check for them before you build an S3 client.

## Next steps

- [Read files from a volume](/docs/tutorials/read-volume-files/)
  requests a volume credential and reads the files with it.
- [Configure Spark to use Unity Catalog](/docs/how-to/configure-spark/): Spark
  requests table credentials itself and can renew them.
- [Set managed storage for catalogs and schemas on S3](/docs/how-to/managed-storage-s3/)
  to choose where managed volumes and model versions land.
