---
title: Run catalog functions in applications and notebooks
summary: unitycatalog-ai runs a catalog function on the caller's machine, in a
  sandboxed child process by default. Call it sync or async, set limits, and
  read errors.
diataxis: how-to
---

When you call a registered function with
[`unitycatalog-ai`](https://github.com/unitycatalog/unitycatalog/tree/main/ai "Python client library for registering and executing functions through Unity Catalog."), the client fetches the function's
stored definition from [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") and rebuilds
it as Python. Unity Catalog stores the definition, and your application runs
it.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/).
- [uv](https://docs.astral.sh/uv/getting-started/installation/).
- The functions in `pricing.py`, registered in `tools.pricing`:
  [Manage Python functions](/docs/how-to/manage-python-functions/).
- With authorization enabled, the privileges to view and run each function:
  [View a function](/docs/how-to/manage-python-functions/#view-a-function-and-get-its-source-back).
:::

The page shows each function from `pricing.py` where an example first calls
it. Most examples call `order_total`:

```python title="pricing.py"
def order_total(quantity: int, unit_price: float, discount_pct: float = 0.0) -> float:
    """Calculate an order's total after a percentage discount.

    Args:
        quantity: Number of units ordered.
        unit_price: Price of one unit.
        discount_pct: Discount in percent, from 0 to 100.
    """
    return round(quantity * unit_price * (1 - discount_pct / 100), 2)


```

## Set up the client

Start Python with `unitycatalog-ai`:

```bash
EXECUTOR_MAX_MEMORY_LIMIT=4096 uv run --python 3.12 --with unitycatalog-ai==0.4.0 python -m asyncio
```

Use Python 3.12, the version this page's scripts run on. The command sets the
sandbox's memory cap to 4096 MB, the value the scripts use. See
[Set time and memory limits](#set-time-and-memory-limits).

Create the function client:

```python title="run_async.py" script="/docs/how-to/run-functions/snippets/run_async.py"
from unitycatalog.ai.core.client import UnitycatalogFunctionClient
from unitycatalog.client import ApiClient, Configuration

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
api = ApiClient(config)
client = UnitycatalogFunctionClient(api_client=api)
```

The async examples on this page run in this session. The synchronous example
and the notebook run on their own.

## Call a function from synchronous code

In a script with no event loop, create the client inside `asyncio.run`, then
call `execute_function`:

```python title="app.py" script="/docs/how-to/run-functions/snippets/run_sync.py"
import asyncio

from unitycatalog.ai.core.client import UnitycatalogFunctionClient
from unitycatalog.client import ApiClient, Configuration

async def connect():
    config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
    return UnitycatalogFunctionClient(api_client=ApiClient(config))

client = asyncio.run(connect())
result = client.execute_function(
    "tools.pricing.order_total",
    parameters={"quantity": 3, "unit_price": 19.99, "discount_pct": 10.0},
)
print(result.value)  # 53.97
```

Run the script with
`EXECUTOR_MAX_MEMORY_LIMIT=4096 uv run --python 3.12 --with unitycatalog-ai==0.4.0 app.py`.

The client needs a running event loop when you create it. Outside one,
`ApiClient(config)` raises `RuntimeError: no running event loop`, which is why
the script creates it in a coroutine. After that, call `execute_function` on
the same client as often as you need.

When the script is done with the client, close its connection:

```python title="run_sync.py" script="/docs/how-to/run-functions/snippets/run_sync.py"
asyncio.run(client.close_async())
```

:::warning
`client.close()`, a `with` block around the client, and the exit hook the
client registers leave the connection open. Call `close_async()` as shown,
before any of them.
:::

## Call a function from async code

In async code, await `execute_function_async`:

```python title="run_async.py" script="/docs/how-to/run-functions/snippets/run_async.py"
result = await client.execute_function_async(
    "tools.pricing.order_total",
    parameters={"quantity": 3, "unit_price": 19.99, "discount_pct": 10.0},
)
print(result.value)  # 53.97
```

Read the result's `value` and `error` fields: `value` holds what the function
returned, and `error` holds what went wrong while it ran. See
[Handle errors](#handle-errors).

Register synchronous functions only. An `async def` function registers with an
empty body, and every call to it raises `IndentationError`, in either execution
mode.

### Run calls concurrently

A client can't run two calls at once: two concurrent calls on one client, such
as through `asyncio.gather`, deadlock. `slow_quote` stands in for a slow call:

```python title="pricing.py"
def slow_quote(seconds: float) -> float:
    """Wait, as a call to a slow pricing service would, then return a quote.

    Args:
        seconds: How long to wait.
    """
    import time

    time.sleep(seconds)
    return round(seconds * 10, 2)


```

To run calls concurrently, give each call its own
`UnitycatalogFunctionClient`. The clients can share one `ApiClient`:

```python title="run_async.py" script="/docs/how-to/run-functions/snippets/run_async.py"
quotes = [UnitycatalogFunctionClient(api_client=api) for _ in range(3)]
results = await asyncio.gather(
    *(
        quote.execute_function_async(
            "tools.pricing.slow_quote", parameters={"seconds": 2.0}
        )
        for quote in quotes
    )
)
print([r.value for r in results])  # [20.0, 20.0, 20.0]
```

The three 2-second calls run at the same time and finish together, in under
4.5 seconds.

### Call from worker threads

A client belongs to the event loop it was created in. Used from another thread
or another event loop, it fails with
`RuntimeError: … attached to a different loop`. A sync call from another
thread can also fail with
`Timeout context manager should be used inside a task`. In a
`ThreadPoolExecutor` or any other worker thread, create the client inside that
worker's own event loop:

```python title="run_async.py" script="/docs/how-to/run-functions/snippets/run_async.py"
import asyncio
from concurrent.futures import ThreadPoolExecutor

def call_in_worker(parameters):
    async def call():
        config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
        api = ApiClient(config)
        try:
            worker_client = UnitycatalogFunctionClient(api_client=api)
            return await worker_client.execute_function_async(
                "tools.pricing.order_total", parameters=parameters
            )
        finally:
            await api.close()

    return asyncio.run(call())

orders = [
    {"quantity": 3, "unit_price": 19.99, "discount_pct": 10.0},
    {"quantity": 3, "unit_price": 19.99, "discount_pct": 10.0},
]
with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(call_in_worker, orders))
print([r.value for r in results])  # [53.97, 53.97]
```

### Run on asyncio's default event loop

Importing the client breaks uvloop. Inside a running uvloop loop, the import
raises `ValueError: Can't patch loop of type <class 'uvloop.Loop'>`. After the
import, `uvloop.run` raises
`TypeError: … got an unexpected keyword argument 'loop_factory'`. Run the
application on asyncio's default event loop.

## Call a function in a marimo notebook

Open a notebook with `unitycatalog-ai` and marimo:
`EXECUTOR_MAX_MEMORY_LIMIT=4096 uv run --python 3.12 --with unitycatalog-ai==0.4.0 --with marimo==0.25.1 marimo edit notebook.py`.

marimo's kernel runs the cells, and in it both a top-level `await` and the
synchronous call work. Create the client directly in a cell, without
`asyncio.run`:

```python title="notebook.py" script="/docs/how-to/run-functions/snippets/notebook.py"
from unitycatalog.ai.core.client import UnitycatalogFunctionClient
from unitycatalog.client import ApiClient, Configuration

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
client = UnitycatalogFunctionClient(api_client=ApiClient(config))
```

In another cell, await the call:

```python title="notebook.py" script="/docs/how-to/run-functions/snippets/notebook.py"
result = await client.execute_function_async(
    "tools.pricing.order_total",
    parameters={"quantity": 3, "unit_price": 19.99, "discount_pct": 10.0},
)
print(result.value)  # 53.97
```

The synchronous call works in a cell too:

```python title="notebook.py" script="/docs/how-to/run-functions/snippets/notebook.py"
sync_result = client.execute_function(
    "tools.pricing.order_total",
    parameters={"quantity": 3, "unit_price": 19.99, "discount_pct": 10.0},
)
print(sync_result.value)  # 53.97
```

When you're done, close the connection in a cell:

```python title="notebook.py" script="/docs/how-to/run-functions/snippets/notebook.py"
await client.close_async()
```

## Choose an execution mode

A client runs functions in `sandbox` mode unless you create it with
`execution_mode="local"`:

```python title="modes.py" script="/docs/how-to/run-functions/snippets/modes.py"
sandboxed = UnitycatalogFunctionClient(
    api_client=api
)  # execution_mode="sandbox"
local = UnitycatalogFunctionClient(api_client=api, execution_mode="local")
```

Any other value raises a `ValueError`. The two modes differ in where the
function runs and what it may do:

|                                         | `sandbox` (default) | `local`                                                                          |
| --------------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| Where the function runs                 | A child process     | Your process: a sync call on the calling thread, an async call on another thread |
| `open` and blocked modules              | Refused             | Allowed                                                                          |
| Time and CPU limits                     | Applied             | Ignored                                                                          |
| `result.error` when the function raises | The full traceback  | The exception's message only                                                     |

The sandbox blocks imports of `sys`, `subprocess`, `ctypes`, `socket`,
`importlib`, `pickle`, `marshal`, and `shutil`
([`executor_env_vars.py`](https://github.com/unitycatalog/unitycatalog/blob/ai-v0.4.0/ai/core/src/unitycatalog/ai/core/envs/executor_env_vars.py)).
Local mode runs the body in your process with nothing blocked, so use it only
for functions you trust.

To see the difference in error text, take a function that raises:

```python title="pricing.py"
def checked_total(quantity: int, unit_price: float) -> float:
    """Calculate an order's total, rejecting empty orders.

    Args:
        quantity: Number of units ordered, at least 1.
        unit_price: Price of one unit.
    """
    if quantity < 1:
        raise ValueError("quantity must be at least 1")
    return round(quantity * unit_price, 2)


```

Call it in each mode:

```python title="modes.py" script="/docs/how-to/run-functions/snippets/modes.py"
params = {"quantity": 0, "unit_price": 19.99}
in_sandbox = await sandboxed.execute_function_async(
    "tools.pricing.checked_total", parameters=params
)
in_process = await local.execute_function_async(
    "tools.pricing.checked_total", parameters=params
)
print(in_sandbox.error)  # Traceback (most recent call last): ... ValueError: ...
print(in_process.error)  # quantity must be at least 1
```

The sandboxed result ends in `ValueError: quantity must be at least 1`. The
local result holds only `quantity must be at least 1`.

:::warning
In local mode, from the third call with the same arguments on, the client
returns the stored result without running the function. A function with side
effects or a time-dependent result returns a stale value. Call
`client.clear_function_cache()`, or create a new client, and the function runs
again until the cache fills again.
:::

## Make dependencies available

In the sandbox, a function can't import a blocked module, and neither can the
packages it imports. `statistics` imports `sys`, and `cloudpickle` imports
`pickle`, so a function that imports either fails with
`The import of module 'sys' is restricted.` (or `'pickle'`). Import the package
in your own code before the call, and the sandboxed function can use it.
`payload_size` imports `cloudpickle` in its body:

```python title="pricing.py"
def payload_size(quantity: int) -> int:
    """Serialize a value with cloudpickle and return its size in bytes.

    Args:
        quantity: The value to serialize.
    """
    import cloudpickle

    return len(cloudpickle.dumps(quantity))


```

Import `cloudpickle` first, then call it:

```python title="modes.py" script="/docs/how-to/run-functions/snippets/modes.py"
import cloudpickle  # noqa: F401  # loaded here, the sandboxed call can use it

result = await client.execute_function_async(
    "tools.pricing.payload_size", parameters={"quantity": 3}
)
print(result.value)
```

A function that imports a blocked module itself, such as `import sys` in its
body, still fails.

:::warning
Don't set `EXECUTOR_DISALLOWED_MODULES`. The client reads any value as a list
of single characters, so while the variable is set, the sandbox blocks no
module by name.
:::

## Set time and memory limits

The sandbox stops a call that runs past its limits. You set them with
environment variables, which the client reads on every call:

| Variable                      | Limits                               | Default |
| ----------------------------- | ------------------------------------ | ------- |
| `EXECUTOR_TIMEOUT`            | Wall-clock time, in seconds          | 20      |
| `EXECUTOR_MAX_CPU_TIME_LIMIT` | CPU time, in seconds                 | 10      |
| `EXECUTOR_MAX_MEMORY_LIMIT`   | Virtual memory, in MB, on Linux only | 100     |

The defaults come from
[`executor_env_vars.py`](https://github.com/unitycatalog/unitycatalog/blob/ai-v0.4.0/ai/core/src/unitycatalog/ai/core/envs/executor_env_vars.py).
Local mode ignores the time and CPU limits.

To cap a call's wall-clock time, set `EXECUTOR_TIMEOUT` before the call:

```python title="limits.py" script="/docs/how-to/run-functions/snippets/limits.py"
import os

os.environ["EXECUTOR_TIMEOUT"] = "3"  # seconds of wall-clock time
result = await client.execute_function_async(
    "tools.pricing.slow_quote", parameters={"seconds": 8.0}
)
print(
    result.error
)  # The function execution has timed out and has been canceled ...
```

The call stops after 3 seconds. `result.value` is `None`, and `result.error`
starts with `The function execution has timed out and has been canceled`.
Because the client reads the variable on every call, raising it again lets the
same 8-second wait finish.

The CPU limit counts seconds of CPU time, not waiting, so a function that
sleeps isn't stopped by it. A busy loop is:

```python title="pricing.py"
def busy_total(iterations: int) -> int:
    """Run a CPU-bound loop, as a heavy pricing model would.

    Args:
        iterations: How many loop iterations to run.
    """
    total = 1
    for i in range(iterations):
        total = (total * 31 + i) % 1_000_003
    return total


```

Set the limit to 1 CPU second and call it:

```python title="limits.py" script="/docs/how-to/run-functions/snippets/limits.py"
os.environ["EXECUTOR_MAX_CPU_TIME_LIMIT"] = "1"  # CPU seconds
result = await client.execute_function_async(
    "tools.pricing.busy_total", parameters={"iterations": 100_000_000}
)
print(
    result.error
)  # The function execution has been terminated with a signal ...
```

`result.error` starts with
`The function execution has been terminated with a signal`: signal 9 on Linux,
24 on macOS.

The memory limit applies on Linux only. macOS ignores it. On Linux, the 100 MB
default is too low for even a small call to succeed, so raise it, as the
session command does with `EXECUTOR_MAX_MEMORY_LIMIT=4096`.

The `timeout` argument of `execute_function_async` isn't an execution limit.
It's the HTTP timeout for fetching the function, so this 2-second call
finishes with `timeout=0.5`:

```python title="limits.py" script="/docs/how-to/run-functions/snippets/limits.py"
result = await client.execute_function_async(
    "tools.pricing.slow_quote", parameters={"seconds": 2.0}, timeout=0.5
)
```

## Handle errors

A call fails in one of two ways: the client raises before the function runs,
or the function runs and the result carries an error.

The client checks your arguments against the function's registered parameters
and raises a `ValueError` for a wrong type, a missing parameter, or an extra
one:

```python title="errors.py" script="/docs/how-to/run-functions/snippets/errors.py"
try:
    await client.execute_function_async(
        "tools.pricing.order_total",
        parameters={"quantity": "3", "unit_price": 19.99},
    )
except ValueError as exc:
    print(
        exc
    )  # Invalid parameters provided: {'quantity': "Parameter quantity should be of type ..."}
```

A function that doesn't exist, because it was never registered or was deleted,
raises `AttributeError: 'NoneType' object has no attribute 'input_params'`.

Anything that goes wrong while the function runs comes back in
`result.error`, with `result.value` set to `None`. Check `error` before you
use `value`. In sandbox mode, its last line is the exception, here from
`checked_total`:

```python title="errors.py" script="/docs/how-to/run-functions/snippets/errors.py"
result = await client.execute_function_async(
    "tools.pricing.checked_total",
    parameters={"quantity": 0, "unit_price": 19.99},
)
if result.error:
    print(
        result.error.splitlines()[-1]
    )  # ValueError: quantity must be at least 1
else:
    print(result.value)
```

Two results need care:

- A function that returns a falsy value, such as `0`, comes back with no
  error and a notice in `value` that starts with
  `The function execution has completed, but no output was produced`.
- A function with a `list` parameter works on the first call. The next call
  with the same list returns `TypeError: unhashable type: 'list'` in `error`.
  Call `client.clear_function_cache()` before every call that passes a list.

## Next steps

- Hand catalog functions to an agent in
  [Use catalog functions as LangChain tools](/docs/how-to/langchain-tools/).
- Register, replace, and delete functions in
  [Manage Python functions](/docs/how-to/manage-python-functions/).
- Build and run a first function step by step in
  [Working with Python functions](/docs/tutorials/first-python-function/).
