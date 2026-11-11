---
title: Manage volumes
summary: Create external and managed Unity Catalog volumes, inspect, rename, and
  delete them, and see what happens to their files.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/manage-volumes/
companions:
  - url: "https://unitycatalog.io/docs/how-to/manage-volumes/snippets/volumes.py"
    kind: python
    purpose: "Create, inspect, update, and delete external and managed volumes."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/manage-volumes/snippets/volumes.py"
    requires-python: ">=3.11"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/manage-volumes/snippets/volumes.sh"
    kind: shell
    purpose: "Create, inspect, update, and delete external and managed volumes with the uc CLI."
    run: "bash volumes.sh"
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

- [`volumes.py`](https://unitycatalog.io/docs/how-to/manage-volumes/snippets/volumes.py) (Python): Create, inspect, update, and delete external and managed volumes.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/manage-volumes/snippets/volumes.py`
- [`volumes.sh`](https://unitycatalog.io/docs/how-to/manage-volumes/snippets/volumes.sh) (Shell): Create, inspect, update, and delete external and managed volumes with the uc CLI.
  - run: `bash volumes.sh` from `uc-docs-env/unitycatalog`

A [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") volume governs a directory of files that aren't a table: CSV drops, documents, images, model inputs. Like a table, a volume lives in a schema and has a three-level name, such as `retail.files.landing`.

Volumes come in two types:

- An **external** volume points at a directory you already have. Unity Catalog records the location and never deletes the files.
- A **managed** volume gets a directory that Unity Catalog allocates under the schema's or catalog's storage root. Deleting the volume deletes that directory.

For how volumes fit into the namespace, see [Core concepts](https://unitycatalog.io/docs/explanation/uc-basics/).

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - For managed volumes, a storage root on the schema or its catalog.
> - [uv](https://docs.astral.sh/uv/getting-started/installation/), for the Python examples.

## Set up the client

Set up the client for your interface:

**Python SDK**

Start Python with the SDK:

```bash
uv run --with unitycatalog-client==0.7.0 python -m asyncio
```

`volumes.py`

```python
from unitycatalog.client import (
    ApiClient,
    CatalogsApi,
    Configuration,
    CreateCatalog,
    CreateSchema,
    CreateVolumeRequestContent,
    SchemasApi,
    UpdateVolumeRequestContent,
    VolumesApi,
    VolumeType,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
```

**CLI**

`volumes.sh`

```bash
uc() { docker exec unitycatalog bin/uc "$@"; }
ROOT="${UC_DOCS_ROOT:-/tmp/uc-docs}"
```

The examples use a catalog `retail` with a schema `files` whose storage root is `$UC_DOCS_ROOT/managed`:

**Python SDK**

`volumes.py`

```python
await CatalogsApi(api).create_catalog(CreateCatalog(name="retail"))
await SchemasApi(api).create_schema(
    CreateSchema(
        name="files",
        catalog_name="retail",
        storage_root=f"file://{ROOT}/managed",
    )
)
```

**CLI**

`volumes.sh`

```bash
uc catalog create --name retail
uc schema create --catalog retail --name files --storage_root "file://$ROOT/managed"
```

## Create an external volume

Point the volume at an existing directory. This example assumes `$UC_DOCS_ROOT/landing` holds a few files.

**Python SDK**

`volumes.py`

```python
landing = await volumes.create_volume(
    CreateVolumeRequestContent(
        catalog_name="retail",
        schema_name="files",
        name="landing",
        volume_type=VolumeType.EXTERNAL,
        storage_location=f"file://{ROOT}/landing",
        comment="Order exports dropped by the partner SFTP job",
    )
)
print(landing.full_name, landing.storage_location)
```

**CLI**

`volumes.sh`

```bash
uc volume create --full_name retail.files.landing \
  --volume_type EXTERNAL \
  --storage_location "file://$ROOT/landing" \
  --comment "Order exports dropped by the partner SFTP job"
```

The location must be a directory below a bucket or container root, not the root itself. It must not overlap another table or volume, and it must not contain `__unitystorage`, the prefix the server uses for managed storage.

**Required privileges:** `USE_CATALOG` on the catalog (or ownership of it), plus ownership of the schema or `USE_SCHEMA` and `CREATE_VOLUME` on it. If the location falls inside an external location, you also need `CREATE_EXTERNAL_VOLUME` on that external location, or ownership of it.

## Create a managed volume

Leave out the location. The server allocates one below the schema's storage root or, if the schema has none, the catalog's.

**Python SDK**

`volumes.py`

```python
reports = await volumes.create_volume(
    CreateVolumeRequestContent(
        catalog_name="retail",
        schema_name="files",
        name="reports",
        volume_type=VolumeType.MANAGED,
    )
)
print(reports.storage_location)  # allocated under the schema's storage root
```

**CLI**

`volumes.sh`

```bash
uc volume create --full_name retail.files.reports --volume_type MANAGED
```

The allocated path has the form `<storage root>/__unitystorage/schemas/<schema id>/volumes/<volume id>`. The server records the path but doesn't create the directory; it appears when the first file is written there. If neither the schema nor the catalog has a storage root, the request fails with `None of catalog, schema or storage-root.tables server property has managed location configured.`

**Required privileges:** the same as for an external volume, without the external-location check.

## View volumes

**Python SDK**

`volumes.py`

```python
listed = await volumes.list_volumes(catalog_name="retail", schema_name="files")
print([(v.name, v.volume_type) for v in listed.volumes or []])

info = await volumes.get_volume(name="retail.files.landing")
print(info.storage_location, info.comment)
```

**CLI**

`volumes.sh`

```bash
uc volume list --catalog retail --schema files --output jsonPretty
uc volume get --full_name retail.files.landing --output jsonPretty
```

**Required privileges:** `READ_VOLUME` or ownership on the volume, plus `USE_SCHEMA` and `USE_CATALOG`. Owners of the schema (with `USE_CATALOG`), the catalog, or the metastore can also view it. A list returns only the volumes you could get.

## Work with the files

A volume's metadata tells a client where its files are. The client then reads and writes them with ordinary storage tools.

**Python SDK**

With local `file://` storage, the location is a directory you can use directly:

`volumes.py`

```python
path = Path(info.storage_location.removeprefix("file://"))
print(sorted(p.relative_to(path).as_posix() for p in path.rglob("*")))
```

**CLI**

`volume read` lists a directory in the volume, or prints a file when `--path` names one. It runs in the server container.

`volumes.sh`

```bash
uc volume read --full_name retail.files.landing
uc volume read --full_name retail.files.landing --path README.txt
```

On cloud storage, a client needs credentials for the location. A client with the right privileges can request temporary credentials scoped to a volume from the server; see [Credential vending](https://unitycatalog.io/docs/explanation/credential-vending/). Open source Unity Catalog doesn't provide the `/Volumes/<catalog>/<schema>/<volume>` paths that Databricks compute mounts. Clients work with the volume's `storage_location`.

## Rename or update a volume

Change the comment, or rename the volume with `new_name`. Renaming changes only the volume's name. Its files and location stay the same.

**Python SDK**

`volumes.py`

```python
renamed = await volumes.update_volume(
    name="retail.files.landing",
    update_volume_request_content=UpdateVolumeRequestContent(
        new_name="partner_landing",
        comment="Partner order exports, retained 30 days",
    ),
)
print(renamed.full_name)  # retail.files.partner_landing
```

**CLI**

`volumes.sh`

```bash
uc volume update --full_name retail.files.landing \
  --new_name partner_landing \
  --comment "Partner order exports, retained 30 days"
```

**Required privileges:** ownership of the volume, plus `USE_CATALOG` (or ownership) on the catalog and `USE_SCHEMA` (or ownership) on the schema.

## Delete a volume

**Python SDK**

`volumes.py`

```python
await volumes.delete_volume(name="retail.files.partner_landing")
await volumes.delete_volume(name="retail.files.reports")
```

**CLI**

`volumes.sh`

```bash
uc volume delete --full_name retail.files.partner_landing
uc volume delete --full_name retail.files.reports
```

What happens to the files depends on the volume type:

| Volume type | Catalog entry | Files                                                                                                      |
| ----------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| External    | Deleted       | Left in place. Delete them with your storage tools if you no longer need them.                             |
| Managed     | Deleted       | The server deletes the volume's directory after `server.storage-cleanup.initial-delay`, 7 days by default. |

> **Warning**
>
> The delay isn't a recovery window: the volume can't be restored, and when the delay passes the files are deleted for good. Copy anything you still need out of the directory first. If a deletion fails, the server retries it after `server.storage-cleanup.retry-backoff`, an hour by default.

**Required privileges:** ownership of the catalog; or ownership of the schema plus `USE_CATALOG`; or ownership of the volume plus `USE_CATALOG` and `USE_SCHEMA`.

## Next steps

- [Register an existing external table](https://unitycatalog.io/docs/how-to/register-external-table/) for tabular data in the same schema.
- [Credential vending](https://unitycatalog.io/docs/explanation/credential-vending/) explains how clients get access to cloud storage.
