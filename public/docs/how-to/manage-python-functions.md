---
title: Manage Python functions
summary: Unity Catalog stores a Python function's signature, docstring, and
  body, and the caller runs it. Register, view, replace, and delete one with
  unitycatalog-ai.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/manage-python-functions/
companions:
  - url: "https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/caching.py"
    kind: python
    purpose: "How a client's function cache behaves across a replace."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/caching.py"
    requires-python: "==3.12.*"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/functions.py"
    kind: python
    purpose: "Register, view, replace, and delete Python functions in Unity Catalog."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run functions.py"
    helpers: ["https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/pricing.py"]
    requires-python: "==3.12.*"
    services: ["unitycatalog"]
  - url: "https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/signatures.py"
    kind: python
    purpose: "Which Python signatures and docstrings the catalog can store."
    run: "UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/signatures.py"
    requires-python: "==3.12.*"
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

- [`caching.py`](https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/caching.py) (Python): How a client's function cache behaves across a replace.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/caching.py`
- [`functions.py`](https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/functions.py) (Python): Register, view, replace, and delete Python functions in Unity Catalog.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run functions.py`
  - save [`pricing.py`](https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/pricing.py) beside it first; the script imports it
- [`signatures.py`](https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/signatures.py) (Python): Which Python signatures and docstrings the catalog can store.
  - run: `UNITY_CATALOG_URL=http://localhost:8080/api/2.1/unity-catalog uv run https://unitycatalog.io/docs/how-to/manage-python-functions/snippets/signatures.py`

A registered function in [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") is metadata plus source text: a three-part name, typed parameters, a return type, comments from the docstring, and the function's body. The server doesn't run it. A caller fetches the function by name and runs the body on its own machine. This page uses [`unitycatalog-ai`](https://github.com/unitycatalog/unitycatalog/tree/main/ai "Python client library for registering and executing functions through Unity Catalog."), the client library for catalog functions, to register, view, replace, and delete them.

> **Prerequisites**
>
> - [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
> - Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).
> - [uv](https://docs.astral.sh/uv/getting-started/installation/).
> - A catalog and schema to hold the functions, such as `tools.pricing`: [Manage catalogs and schemas](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/).

## Set up the client

In the folder that holds your functions, start Python with `unitycatalog-ai`:

```bash
EXECUTOR_MAX_MEMORY_LIMIT=4096 uv run --python 3.12 --with unitycatalog-ai==0.4.0 python -m asyncio
```

Use Python 3.12, the version this page's scripts run on. The command raises the function sandbox's memory cap (`EXECUTOR_MAX_MEMORY_LIMIT`, in megabytes) to 4096, the value the scripts use.

Create the function client:

`functions.py`

```python
from unitycatalog.ai.core.client import UnitycatalogFunctionClient
from unitycatalog.client import ApiClient, Configuration

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
api = ApiClient(config)
client = UnitycatalogFunctionClient(api_client=api)
```

## Write a function the catalog can store

The client builds the stored record from the function's source code, its type hints, and its docstring. Save the function in a module, such as `pricing.py` in the session's folder:

`pricing.py`

```python
def shipping_cost(weight_kg: float, express: bool = False) -> float:
    """Calculate the shipping cost of a parcel.

    Args:
        weight_kg: Parcel weight in kilograms, billed per started kilogram.
        express: Ship with next-day delivery.
    """
    import math

    rate = 9.0 if express else 4.5
    return rate * math.ceil(weight_kg)


```

Then import the module into the session:

`functions.py`

```python
import pricing
```

The client reads the source from the module's file. A function with no source file to read, such as one created with `exec`, fails with `OSError: could not get source code`.

### Type hints

Every parameter and the return value need a type hint. The catalog stores each one as SQL type text:

| Python type hint           | Stored type text    |
| -------------------------- | ------------------- |
| `int`                      | `LONG`              |
| `float`                    | `DOUBLE`            |
| `str`                      | `STRING`            |
| `bool`                     | `BOOLEAN`           |
| `datetime.date`            | `DATE`              |
| `datetime.datetime`        | `TIMESTAMP`         |
| `bytes`                    | `BINARY`            |
| `list[int]`                | `ARRAY<LONG>`       |
| `dict[str, int]`           | `MAP<STRING, LONG>` |
| `list`                     | `ARRAY`             |
| `dict`                     | `MAP`               |
| `list[str]` (return value) | `ARRAY<STRING>`     |
| `Optional[int]`            | `LONG`              |

A plain `list` or `dict` is accepted, but `typing.List` with no element type isn't. A parameter gets a stored default only from a Python default: `= None` is stored as `NULL`, and `= 7` as `7`.

The client rejects these hints with a `ValueError` before it sends a request:

- `Union[...]`, `Any`, and `typing.List` with no element type.
- `int | None`. Write `Optional[int]` instead.
- `*args` and `**kwargs`.
- A parameter with no hint (`Missing type hint for parameter: x.`) or a return value with no hint.

A `decimal.Decimal` hint fails too, with a pydantic `ValidationError`.

### Docstrings

Write the docstring in Google style. Its description, every paragraph before `Args:` joined into one line, becomes the function's comment, and each entry under `Args:` becomes that parameter's comment. A function with no docstring, or with a docstring that has only an `Args:` section, is rejected with a `ValueError`. When the `Args:` entries don't match the signature, the client only issues a `UserWarning` and registers the function, without comments for the parameters it couldn't match.

### Imports

The catalog stores only the function's body, not the module around it. Import what the body needs inside the body, as `shipping_cost` does with `math`. A function that uses a module imported at the top of its file registers, but a call returns `NameError: name 'math' is not defined` as its error.

## Register a function

Pass the function, the catalog, and the schema:

`functions.py`

```python
info = await client.create_python_function_async(
    func=pricing.shipping_cost,
    catalog="tools",
    schema="pricing",
)
print(info.full_name)  # tools.pricing.shipping_cost
```

The function's name in the catalog is its Python name, `shipping_cost`, under the schema you pass.

**Required privileges:** `USE CATALOG` on the catalog, or ownership of it. Also `USE SCHEMA` and `CREATE FUNCTION` on the schema, or ownership of it.

> **Note**
>
> The privileges on this page come from the server's source ([`FunctionService.java`](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/service/FunctionService.java)) and haven't been tested against a server with authorization enabled ([#282](https://github.com/open-lakehouse/docs-factory/issues/282)).

## Register a function that calls helpers

A plain registration stores only the body of the function you pass, so helpers it calls aren't stored. `order_total` calls `apply_discount`:

`pricing.py`

```python
def apply_discount(amount, discount_pct):
    return amount * (1 - discount_pct / 100)


def order_total(quantity: int, unit_price: float, discount_pct: float = 0.0) -> float:
    """Calculate an order's total after a percentage discount.

    Args:
        quantity: Number of units ordered.
        unit_price: Price of one unit.
        discount_pct: Discount in percent, from 0 to 100.
    """
    return round(apply_discount(quantity * unit_price, discount_pct), 2)


```

If you register it with `create_python_function_async`, a call to `order_total` returns a traceback ending in `NameError: name 'apply_discount' is not defined` as its error. To store the helpers too, register the function with `create_wrapped_function_async` and list the helpers in `functions`:

`functions.py`

```python
info = await client.create_wrapped_function_async(
    primary_func=pricing.order_total,
    functions=[pricing.apply_discount],
    catalog="tools",
    schema="pricing",
)
print(info.routine_definition)
```

The stored body starts with each helper's source, followed by the body of `order_total`. The name, signature, and comments come from `order_total`.

**Required privileges:** the same as for [registering a function](#register-a-function).

## View a function and get its source back

Fetch a function by its full name to see what the catalog stores:

`functions.py`

```python
fn = await client.get_function_async("tools.pricing.shipping_cost")
print(fn.comment)
for param in fn.input_params.parameters:
    print(param.name, param.type_text, param.parameter_default, param.comment)
print("returns:", fn.full_data_type)
```

List the functions in a schema:

`functions.py`

```python
functions = await client.list_functions_async(catalog="tools", schema="pricing")
print(sorted(f.name for f in functions))
```

Print the function as Python source:

`functions.py`

```python
print(client.get_function_source("tools.pricing.shipping_cost"))
```

Or get it back as a Python function you can call in the session:

`functions.py`

```python
shipping_cost = client.get_function_as_callable("tools.pricing.shipping_cost")
print(shipping_cost(2.5, express=True))  # 27.0
```

The client rebuilds both from the stored record. The docstring is regenerated, with a `Returns:` section added, and the parameter defaults are left out. So `shipping_cost(2.5)`, without `express`, raises a `TypeError`.

**Required privileges:** one of the following. A call to the function looks it up first, so running it needs the same.

- Ownership of the metastore or of the function's catalog.
- Ownership of the function's schema, plus `USE CATALOG` on its catalog.
- `USE CATALOG` on the catalog, `USE SCHEMA` on the schema, and `EXECUTE` on the function or ownership of it.

Listing returns only the functions you could view this way.

## Replace a function

Functions have no update call, so changing a function's body or its comment means replacing it. Registering a name that already exists fails:

`functions.py`

```python
try:
    await client.create_python_function_async(
        func=pricing.shipping_cost, catalog="tools", schema="pricing"
    )
except ValueError as exc:
    print(exc)  # Function tools.pricing.shipping_cost already exists. ...
```

The message is `Function tools.pricing.shipping_cost already exists. Set replace=True to overwrite it.` Edit the function in `pricing.py`:

`pricing.py`

```python
def shipping_cost(weight_kg: float, express: bool = False) -> float:
    """Calculate the shipping cost of a parcel, including a handling fee.

    Args:
        weight_kg: Parcel weight in kilograms, billed per started kilogram.
        express: Ship with next-day delivery.
    """
    import math

    rate = 9.0 if express else 4.5
    return 2.0 + rate * math.ceil(weight_kg)


```

Then reload the module and register the function again with `replace=True`:

`functions.py`

```python
import importlib

importlib.reload(pricing)
info = await client.create_python_function_async(
    func=pricing.shipping_cost,
    catalog="tools",
    schema="pricing",
    replace=True,
)
print(info.comment)
```

A replace deletes the function and creates it again. The new function has a new `function_id`, and the client that replaced it runs the new body.

> **Warning**
>
> A replace isn't atomic. If the create fails after the delete, no function is left under the name. For example, the server stores a comment of at most 65,535 characters ([`FunctionInfoDAO.java`](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/persist/dao/FunctionInfoDAO.java#L35)), so a replace with a 70,000-character docstring fails with HTTP 500 and the original is gone. Register the function again to restore it.

> **Warning**
>
> Other clients keep running the old body. A client caches each function the first time it runs it, and a replace from another client doesn't clear that cache. In each application that already ran the function, clear the cache:
>
> `caching.py`
>
> ```python
> client.clear_function_cache()
> ```

**Required privileges:** those for viewing, deleting, and registering a function. The client gets, deletes, then creates the function ([`client.py`](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/ai/core/src/unitycatalog/ai/core/client.py)), so a replace needs all three.

## Delete a function

Delete a function by its full name:

`functions.py`

```python
await client.delete_function_async("tools.pricing.shipping_cost")
```

After the delete, `get_function_async` returns `None`.

**Required privileges:** one of the following.

- Ownership of the function's catalog.
- Ownership of the function's schema, plus `USE CATALOG` on its catalog.
- `USE CATALOG` on the catalog, `USE SCHEMA` on the schema, and ownership of the function.

## Next steps

- Register, inspect, and run a function step by step in [Working with Python functions](https://unitycatalog.io/docs/tutorials/first-python-function/).
- Learn how functions, schemas, and privileges fit together in [Core concepts](https://unitycatalog.io/docs/explanation/uc-basics/).
- [Manage catalogs and schemas](https://unitycatalog.io/docs/how-to/manage-catalogs-and-schemas/) to organize your functions.
