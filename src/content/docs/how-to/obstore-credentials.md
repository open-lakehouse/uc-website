---
title: Use Unity Catalog credentials with obstore
summary: Give obstore a credential provider that asks Unity Catalog for S3,
  Azure, or Google Cloud credentials, works from sync and async code, and renews
  them before they expire.
diataxis: how-to
---

obstore reads and writes object storage from Python. Instead
of fixed keys, you can give it a credential provider: a function obstore calls
for credentials, and calls again when they're about to expire. A provider that
asks [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") for temporary credentials gives
your code a store scoped to one volume, table, or path. It never handles a
long-lived key.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0 with simulated S3 and PostgreSQL, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/#start-the-server-with-simulated-s3).
- A storage credential and an external location over the data:
  [Configure AWS storage credentials and external locations](/docs/how-to/configure-aws-storage/).
- [uv](https://docs.astral.sh/uv/getting-started/installation/).
:::

The examples use a catalog `analytics` with an S3 storage root. Its schema
`ops` holds a managed volume `files` and an external table `trips`.

## Set up the client

Start Python with the SDK and obstore:

```bash
uv run --with unitycatalog-client==0.7.0 --with obstore==0.11.1 python -m asyncio
```

```python title="obstore_credentials.py" script="/docs/how-to/obstore-credentials/snippets/obstore_credentials.py"
import asyncio
import threading
from datetime import UTC, datetime

import obstore
from obstore.store import from_url
from unitycatalog.client import (
    ApiClient,
    Configuration,
    GenerateTemporaryPathCredential,
    GenerateTemporaryTableCredential,
    GenerateTemporaryVolumeCredential,
    PathOperation,
    TableOperation,
    TablesApi,
    TemporaryCredentialsApi,
    VolumeOperation,
    VolumesApi,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
```

## Write the credential provider

obstore accepts a sync or an async provider, but it can call an async one only
from its async methods. A sync method such as `obstore.list` or `obstore.put`
that needs credentials from an async provider fails with `no running event
loop` in a thread without an event loop, and hangs in a thread that runs
one. The Unity Catalog SDK is async, so a provider that serves both kinds
of call runs the SDK on an event loop of its own:

```python title="obstore_credentials.py" script="/docs/how-to/obstore-credentials/snippets/obstore_credentials.py"
class UnityCatalogCredentials:
    """An obstore credential provider that asks Unity Catalog for storage credentials.

    It returns whichever credential the server vends: S3 keys, an Azure SAS
    token, or a Google Cloud OAuth token. `request` is an async function that
    takes an `ApiClient` and returns the server's `TemporaryCredentials`. It
    runs on an event loop of its own, in a background thread, so obstore can
    call the provider from sync methods, async methods, and threads without a
    loop alike.
    """

    def __init__(self, config, request):
        self._request = request
        self._loop = asyncio.new_event_loop()
        threading.Thread(target=self._loop.run_forever, daemon=True).start()
        self._api = self._run(self._connect(config))
        # The first answer gives the store its URL, and a missing grant fails here.
        self._first = self._run(request(self._api))
        self.url = self._first.url

    @classmethod
    def for_volume(cls, config, name, operation=VolumeOperation.READ_VOLUME):
        async def request(api):
            volume = await VolumesApi(api).get_volume(name=name)
            return await TemporaryCredentialsApi(
                api
            ).generate_temporary_volume_credentials(
                GenerateTemporaryVolumeCredential(
                    volume_id=volume.volume_id, operation=operation
                )
            )

        return cls(config, request)

    @classmethod
    def for_table(cls, config, full_name, operation=TableOperation.READ):
        async def request(api):
            table = await TablesApi(api).get_table(full_name=full_name)
            return await TemporaryCredentialsApi(
                api
            ).generate_temporary_table_credentials(
                GenerateTemporaryTableCredential(
                    table_id=table.table_id, operation=operation
                )
            )

        return cls(config, request)

    @classmethod
    def for_path(cls, config, url, operation=PathOperation.PATH_READ):
        async def request(api):
            return await TemporaryCredentialsApi(
                api
            ).generate_temporary_path_credentials(
                GenerateTemporaryPathCredential(url=url, operation=operation)
            )

        return cls(config, request)

    @staticmethod
    async def _connect(config):
        return ApiClient(config)

    def _run(self, coroutine):
        return asyncio.run_coroutine_threadsafe(coroutine, self._loop).result()

    def __call__(self):
        creds = self._first or self._run(self._request(self._api))
        self._first = None
        # expiration_time is in epoch milliseconds.
        expires_at = datetime.fromtimestamp(creds.expiration_time / 1000, tz=UTC)
        if aws := creds.aws_temp_credentials:
            return {
                "access_key_id": aws.access_key_id,
                "secret_access_key": aws.secret_access_key,
                "token": aws.session_token,
                "expires_at": expires_at,
            }
        if azure := creds.azure_user_delegation_sas:
            return {"sas_token": azure.sas_token, "expires_at": expires_at}
        if gcp := creds.gcp_oauth_token:
            return {"token": gcp.oauth_token, "expires_at": expires_at}
        raise ValueError(f"the server vended no credential for {creds.url}")

    def close(self):
        self._run(self._api.close())
        self._loop.call_soon_threadsafe(self._loop.stop)


```

The provider returns the credential in the shape obstore expects for the
storage the server answers for: S3 keys, an Azure SAS token, or a Google
Cloud OAuth token. It asks the server once when you create it, which gives
the store its URL and fails early if you lack a grant. obstore's first call
gets that answer instead of a second request.

`for_volume`, `for_table`, and `for_path` build the request for you. For any
other request, pass the constructor an async function that takes the
`ApiClient` and returns the server's answer.

## Open a volume

Ask for `WRITE_VOLUME` on the volume, or `READ_VOLUME` to only read. Then
open a store at the URL the server returned. `from_url` picks the store from
the URL's scheme; `region` applies to S3 only:

```python title="obstore_credentials.py" script="/docs/how-to/obstore-credentials/snippets/obstore_credentials.py"
credentials = UnityCatalogCredentials.for_volume(
    config, "analytics.ops.files", VolumeOperation.WRITE_VOLUME
)
files = from_url(
    credentials.url, region="us-east-1", credential_provider=credentials
)
```

Sync calls work on the store:

```python title="obstore_credentials.py" script="/docs/how-to/obstore-credentials/snippets/obstore_credentials.py"
obstore.put(files, "reports/2026-10.csv", b"day,orders\n2026-10-01,42\n")
print([meta["path"] for meta in obstore.list(files, prefix="reports").collect()])
```

So do async calls:

```python title="obstore_credentials.py" script="/docs/how-to/obstore-credentials/snippets/obstore_credentials.py"
result = await obstore.get_async(files, "reports/2026-10.csv")
data = bytes(await result.bytes_async())
print(data.decode())
```

**Required privileges:** `USE CATALOG` and `USE SCHEMA` on the parents, plus
`READ VOLUME` to read. Writing needs ownership of the volume. For the other
objects, see
[Request temporary storage credentials](/docs/how-to/temporary-credentials/).

A volume or table on `file://` storage gets no keys from the server, so the
provider has nothing to return. Open its URL with obstore's `from_url` and no
credentials instead, as
[Read files from a volume](/docs/tutorials/read-volume-files/) does.

## Open a table's files

For a table, ask for `READ` or `READ_WRITE`. A `READ` credential lists and
reads the table's files, and storage rejects its writes:

```python title="obstore_credentials.py" script="/docs/how-to/obstore-credentials/snippets/obstore_credentials.py"
reader = UnityCatalogCredentials.for_table(config, "analytics.ops.trips")
trips = from_url(reader.url, region="us-east-1", credential_provider=reader)
```

To read the table as a table rather than as files, use an engine or a
DataFrame library: see
[Query Unity Catalog tables from Python DataFrame libraries](/docs/how-to/python-dataframes/).

## Open a path

For a storage path no table or volume owns, such as a landing prefix under
an external location, ask for `PATH_READ` or `PATH_READ_WRITE`:

```python title="obstore_credentials.py" script="/docs/how-to/obstore-credentials/snippets/obstore_credentials.py"
landing = UnityCatalogCredentials.for_path(
    config, f"{BUCKET}/lake/landing", PathOperation.PATH_READ_WRITE
)
staging = from_url(landing.url, region="us-east-1", credential_provider=landing)
```

## How obstore renews the credentials

obstore caches the credential and calls the provider again once less than five
minutes are left before `expires_at`. The server sets the lifetime, and
operations in between reuse the cached credential. Each renewal is a new
request, so the server checks your grants again then.

## Close the provider

When you're done, close the provider's connection to the server:

```python title="obstore_credentials.py" script="/docs/how-to/obstore-credentials/snippets/obstore_credentials.py"
credentials.close()
```

## Next steps

- [Use volumes as marimo remote storage](/docs/how-to/marimo-remote-storage/)
  to browse a volume through this provider in a notebook.
- [Request temporary storage credentials](/docs/how-to/temporary-credentials/)
  for every kind of object and operation, with their privileges.
- Learn how the server decides and mints a credential in
  [Credential vending](/docs/explanation/credential-vending/).
