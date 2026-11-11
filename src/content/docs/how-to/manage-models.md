---
title: Manage registered models
summary: Register MLflow models as Unity Catalog model versions, load a version
  by number, and update, rename, and delete models and versions.
diataxis: how-to
---

A [registered model](/docs/explanation/models-and-mlflow/ "A governed ML model.") in
[Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") lives in a schema and has a
three-level name, such as `unity.manage_models.linear`. It holds numbered
versions, and each version has its own copy of the model's files in the
catalog's managed storage. MLflow's tracking server keeps the runs and the
logged models. Unity Catalog keeps the registered models and their versions
([how the two services divide the work](/docs/explanation/models-and-mlflow/)).

On this page, MLflow uploads a version's files and loads them. MLflow, the
Python SDK, and the CLI all view, update, and delete models and versions, and
only the SDK and the CLI rename them.

Each task lists the privileges that the server's
[authorization rules for models](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/service/ModelService.java)
require when authorization is enabled.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0 with MLflow, simulated S3, and PostgreSQL, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/).
- [uv](https://docs.astral.sh/uv/getting-started/installation/).
- A catalog with managed storage, such as `unity`, and a schema in it, such as
  `unity.manage_models`:
  [Manage catalogs and schemas](/docs/how-to/manage-catalogs-and-schemas/).
- For the Python SDK and CLI examples, the model `unity.manage_models.linear`
  with versions 1 and 2, registered with MLflow as in
  [Register a model version](#register-a-model-version).
:::

## Set up the client

Set up the client for your interface:

:::tab[MLflow]
Start Python with MLflow, boto3 for the version's files in S3, and scikit-learn,
the library the example model uses:

```bash
uv run --python 3.12 --with mlflow==3.17.0 --with boto3==1.43.114 --with scikit-learn==1.9.1 python
```

Point MLflow at the tracking server and at Unity Catalog's registry. The `uc:`
prefix on the registry URI selects MLflow's Unity Catalog registry, and
`AWS_ENDPOINT_URL_S3` points MLflow at the environment's S3-compatible store.
The `MLFLOW_ENABLE_PROXY_MULTIPART_*` settings keep the logged model's files
going through the tracking server, whose download links name an address only
the environment can reach:

```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
import os

import mlflow
from mlflow import MlflowClient

os.environ["AWS_ENDPOINT_URL_S3"] = "http://localhost:9000"
os.environ["MLFLOW_ENABLE_PROXY_MULTIPART_DOWNLOAD"] = "false"
os.environ["MLFLOW_ENABLE_PROXY_MULTIPART_UPLOAD"] = "false"
mlflow.set_tracking_uri("http://localhost:8080")
mlflow.set_registry_uri("uc:http://localhost:8080")
client = MlflowClient()
```
:::

:::tab[Python SDK]
Start Python with the SDK:

```bash
uv run --with unitycatalog-client==0.7.0 python -m asyncio
```

```python title="models_sdk.py" script="/docs/how-to/manage-models/snippets/models_sdk.py"
from unitycatalog.client import (
    ApiClient,
    Configuration,
    ModelVersionsApi,
    RegisteredModelsApi,
    UpdateModelVersion,
    UpdateRegisteredModel,
)

api = ApiClient(Configuration(host="http://localhost:8080/api/2.1/unity-catalog"))
models = RegisteredModelsApi(api)
versions = ModelVersionsApi(api)
```
:::

:::tab[CLI]
```bash title="models.sh" script="/docs/how-to/manage-models/snippets/models.sh"
uc() { docker exec unitycatalog bin/uc "$@"; }
```
:::

The examples use one model, `unity.manage_models.linear`. The next section
registers it with versions 1 and 2, and every section after it starts from
there.

## Register a model version

Registering needs a model logged in MLflow. To follow along, train two small
linear models, y = 2x + 1 and y = 3x + 1, and log each in its own run:

```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
import pandas as pd
from mlflow.models import infer_signature
from sklearn.linear_model import LinearRegression

X = pd.DataFrame({"x": [0.0, 1.0, 2.0, 3.0, 4.0]})
mlflow.set_experiment("manage-models")
model_uris = []
for slope in (2, 3):
    fitted = LinearRegression().fit(X, slope * X["x"] + 1)
    with mlflow.start_run():
        info = mlflow.sklearn.log_model(
            fitted,
            name="linear",
            signature=infer_signature(X, fitted.predict(X)),
            pip_requirements=["mlflow==3.17.0", "scikit-learn==1.9.1"],
        )
    model_uris.append(info.model_uri)

print(model_uris)
```

The session prints the two logged models' URIs, each of the form
`models:/m-<id>`.

Register the first one under the model's name. If the model doesn't exist,
MLflow creates it with version 1:

```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
version = mlflow.register_model(model_uris[0], "unity.manage_models.linear")
print(version.version, version.status)
```

MLflow reports:

```text
Successfully registered model 'unity.manage_models.linear'.
Created version '1' of model 'unity.manage_models.linear'.
1 READY
```

Register the second one under the same name. MLflow adds the next version:

```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
version = mlflow.register_model(model_uris[1], "unity.manage_models.linear")
print(version.version, version.status)
```

```text
Registered model 'unity.manage_models.linear' already exists. Creating a new version of this model...
Created version '2' of model 'unity.manage_models.linear'.
2 READY
```

Both calls also print a line about waiting for the version and progress bars.
One call creates the version, copies the logged model's files into the
catalog's managed storage, and marks the version `READY`. MLflow writes the
files with temporary credentials that Unity Catalog issues for that one
version. See [Credential vending](/docs/explanation/credential-vending/).

:::note
Version numbers aren't reused. If you delete version 2, the next registration
creates version 3.
:::

MLflow doesn't pass `tags` to Unity Catalog. Tags given to `register_model` or
`create_registered_model` are dropped without an error.

**Required privileges:** `mlflow.register_model`
[tries to create the model first](https://github.com/mlflow/mlflow/blob/v3.17.0/mlflow/tracking/_model_registry/fluent.py#L177-L188) and continues only
if it already exists, so every call needs all of these:

- To create the model, even when it exists: `USE_CATALOG` or ownership on the
  catalog, and on the schema either ownership, or `USE_SCHEMA` plus
  `CREATE_MODEL` (or `CREATE_FUNCTION`). Whoever creates the model owns it.
- To add and finalize the version: ownership of the catalog; or `USE_CATALOG`
  and ownership of the schema; or `USE_CATALOG`, `USE_SCHEMA`, and ownership of
  the model.
- To [write the version's files](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/service/TemporaryModelVersionCredentialsService.java#L40-L47): ownership of the
  model, plus `USE_SCHEMA` or ownership on the schema and `USE_CATALOG` or
  ownership on the catalog. Owning the catalog doesn't replace owning the
  model.

## View models and versions

:::tab[MLflow]
```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
for model in client.search_registered_models():
    print(model.name, model.description)

for v in client.search_model_versions("name='unity.manage_models.linear'"):
    print(v.version, v.status, v.source)

```

Search takes no `filter_string` or `order_by` for models, and no `order_by`
for versions. Either one raises
`Argument '…' is unsupported for models in the Unity Catalog.`
:::

:::tab[Python SDK]
```python title="models_sdk.py" script="/docs/how-to/manage-models/snippets/models_sdk.py"
listed = await models.list_registered_models(
    catalog_name="unity", schema_name="manage_models"
)
for model in listed.registered_models:
    print(model.full_name, model.storage_location)

listed = await versions.list_model_versions(
    full_name="unity.manage_models.linear"
)
for v in listed.model_versions:
    print(v.version, v.status.value, v.source)

v = await versions.get_model_version(
    full_name="unity.manage_models.linear", version=1
)
print(v.status.value, v.storage_location)
```
:::

:::tab[CLI]
```bash title="models.sh" script="/docs/how-to/manage-models/snippets/models.sh"
uc registered_model list --catalog unity --schema manage_models --output jsonPretty
uc model_version list --full_name unity.manage_models.linear --output jsonPretty
uc model_version get --full_name unity.manage_models.linear --version 1 --output jsonPretty
```
:::

A version's `status` is `READY` once registration finishes. Its `source` is
the logged model it was copied from, `models:/m-<id>`. Its `run_id` is set only
when you register from a `runs:/<run-id>/<path>` URI. A model's
`storage_location` is a directory in the catalog's managed storage, and each
version's files sit below it, under `versions/`.

**Required privileges:** one of ownership of the metastore; ownership of the
catalog; `USE_CATALOG` and ownership of the schema; or `EXECUTE` or ownership
on the model, plus `USE_SCHEMA` and `USE_CATALOG`. A list of models returns
only the models you could get.

## Load a model version

Load a version by its number, and get the location of its files:

```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
model = mlflow.pyfunc.load_model("models:/unity.manage_models.linear/1")
print(model.metadata.signature)
print(model.predict(pd.DataFrame({"x": [10.0]})))
print(client.get_model_version_download_uri("unity.manage_models.linear", "1"))
```

The session prints the version's signature, with the input column `x` as a
`double`, then the prediction `[21.]`, since version 1 fits y = 2x + 1. The
signature comes from the version's files, not from Unity Catalog's record of
the version. The location has the form
`s3://amzn-s3-demo-bucket/unity/__unitystorage/catalogs/<id>/models/<id>/versions/<id>`.
MLflow reads the files with read-only credentials from Unity Catalog.

Load by number only. Unity Catalog's registry has no aliases and no stages, so
`models:/<name>@<alias>` and `models:/<name>/latest` raise
`NotImplementedError: Method not implemented`. So do setting an alias,
`get_latest_versions`, and `transition_model_version_stage`.

**Required privileges:** the privileges to view the version, and to
[read its files](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/service/TemporaryModelVersionCredentialsService.java#L40-L47), `EXECUTE` or ownership on the
model, plus `USE_SCHEMA` or ownership on the schema and `USE_CATALOG` or
ownership on the catalog. Owning the catalog or the metastore doesn't replace
these.

## Update comments

Besides the model's name, a comment is the only metadata you can change on a
model or a version. Set one on the model and one on version 2:

:::tab[MLflow]
MLflow calls the comment `description`:

```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
client.update_registered_model(
    "unity.manage_models.linear",
    description="Predicts y from x with a linear fit",
)
client.update_model_version(
    "unity.manage_models.linear", "2", description="Retrained on the new slope"
)
```
:::

:::tab[Python SDK]
```python title="models_sdk.py" script="/docs/how-to/manage-models/snippets/models_sdk.py"
await models.update_registered_model(
    full_name="unity.manage_models.linear",
    update_registered_model=UpdateRegisteredModel(
        comment="Predicts y from x with a linear fit"
    ),
)
await versions.update_model_version(
    full_name="unity.manage_models.linear",
    version=2,
    update_model_version=UpdateModelVersion(
        comment="Retrained on the new slope"
    ),
)
```
:::

:::tab[CLI]
```bash title="models.sh" script="/docs/how-to/manage-models/snippets/models.sh"
uc registered_model update --full_name unity.manage_models.linear \
  --comment "Predicts y from x with a linear fit"
uc model_version update --full_name unity.manage_models.linear --version 2 \
  --comment "Retrained on the new slope"
```
:::

The Python sessions echo the updated model and version. Other versions keep
their comments. Models and versions have no tags: `set_registered_model_tag`
and `set_model_version_tag` raise `NotImplementedError`. A version's signature
and input example live in its files, not in Unity Catalog.

**Required privileges:** one of ownership of the catalog; `USE_CATALOG` and
ownership of the schema; or `USE_CATALOG`, `USE_SCHEMA`, and ownership of the
model. The same holds for a model's comment and a version's.

## Rename a model

Rename a model with the Python SDK or the CLI. `new_name` is the model's name
within its schema. MLflow's `rename_registered_model` raises
`NotImplementedError`.

The example renames the model to `linear_regression` and prints the result,
then renames it back, so the examples below still find it as `linear`:

:::tab[Python SDK]
```python title="models_sdk.py" script="/docs/how-to/manage-models/snippets/models_sdk.py"
renamed = await models.update_registered_model(
    full_name="unity.manage_models.linear",
    update_registered_model=UpdateRegisteredModel(new_name="linear_regression"),
)
print(renamed.full_name)

# Rename it back, so the steps below find it by its first name.
await models.update_registered_model(
    full_name="unity.manage_models.linear_regression",
    update_registered_model=UpdateRegisteredModel(new_name="linear"),
)
```
:::

:::tab[CLI]
```bash title="models.sh" script="/docs/how-to/manage-models/snippets/models.sh"
uc registered_model update --full_name unity.manage_models.linear \
  --new_name linear_regression --output jsonPretty
# Rename it back, so the steps below find it by its first name.
uc registered_model update --full_name unity.manage_models.linear_regression \
  --new_name linear
```
:::

The model keeps its id, storage location, comment, and versions. Only its name
changes.

**Required privileges:** the same as for updating a comment.

## Delete versions and models

**Required privileges:** to delete a version, or a model with or without
`force`, the same as for updating a comment.

### Delete a version

:::tab[MLflow]
```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
client.delete_model_version("unity.manage_models.linear", "2")
```
:::

:::tab[Python SDK]
```python title="models_sdk.py" script="/docs/how-to/manage-models/snippets/models_sdk.py"
await versions.delete_model_version(
    full_name="unity.manage_models.linear", version=2
)
```
:::

:::tab[CLI]
```bash title="models.sh" script="/docs/how-to/manage-models/snippets/models.sh"
uc model_version delete --full_name unity.manage_models.linear --version 2
```
:::

### Delete a model

A model that still has versions is deleted only with `force`. Without it, the
server refuses with
`Unable to delete a registered model with existing model versions`. The Python
SDK and the CLI pass `force`. MLflow can't, so its example deletes the versions
first, a page of search results at a time, until none are left:

:::tab[MLflow]
```python title="models_mlflow.py" script="/docs/how-to/manage-models/snippets/models_mlflow.py"
name = "unity.manage_models.linear"
while versions := client.search_model_versions(f"name='{name}'"):
    for v in versions:
        client.delete_model_version(name, v.version)

client.delete_registered_model(name)
```
:::

:::tab[Python SDK]
```python title="models_sdk.py" script="/docs/how-to/manage-models/snippets/models_sdk.py"
await models.delete_registered_model(
    full_name="unity.manage_models.linear", force=True
)
```

When you're done, close the client:

```python title="models_sdk.py" script="/docs/how-to/manage-models/snippets/models_sdk.py"
await api.close()
```
:::

:::tab[CLI]
```bash title="models.sh" script="/docs/how-to/manage-models/snippets/models.sh"
uc registered_model delete --full_name unity.manage_models.linear --force true
```
:::

### What happens to the files

The catalog entry goes at once. A background worker in the server deletes the
version's or the model's directory in managed storage no sooner than
[`server.storage-cleanup.initial-delay`](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/etc/conf/server.properties#L67-L76)
after the delete, 7 days by default, and retries a deletion that fails. The run
and the logged model on the MLflow tracking server, with their files, stay.

:::warning
The delay isn't a recovery window: a deleted model or version can't be
restored, and once the worker runs its files are gone for good. Load or copy
anything you still need first.
:::

## Next steps

- [Register and reload a model with MLflow](/docs/tutorials/register-model-mlflow/)
  to walk through logging and registering a model from the start.
- [Learn how credential vending works](/docs/explanation/credential-vending/),
  the mechanism that lets MLflow read and write a version's files.
- [Learn the core concepts](/docs/explanation/uc-basics/) to see where
  registered models sit in the namespace.
