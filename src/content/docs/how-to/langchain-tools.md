---
title: Use catalog functions as LangChain tools
summary: UCFunctionToolkit turns Unity Catalog functions into LangChain tools.
  Each call fetches the function from the catalog and runs it on the agent's
  machine.
diataxis: how-to
---

Register Python functions in [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification."), build
LangChain tools from them with `UCFunctionToolkit` from the
`unitycatalog-langchain` package, hand the tools to an agent, and trace its
calls with MLflow. The catalog stores each
function's signature, descriptions, and
source code. The agent's machine runs the code, not the server. For where
functions sit among the other catalog objects, see
[Core concepts](/docs/explanation/uc-basics/).

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0 with MLflow, simulated S3, and PostgreSQL, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/).
- [uv](https://docs.astral.sh/uv/getting-started/installation/).
- With authorization enabled, the privileges for each task:
  [Control who can call a function](#control-who-can-call-a-function).
:::

## Set up the client

Start Python with the LangChain integration, LangGraph, MLflow, and the
MLflow chat model for LangChain:

```bash
EXECUTOR_MAX_MEMORY_LIMIT=4096 uv run --python 3.12 --with unitycatalog-langchain==0.4.0 --with langgraph-prebuilt==1.0.8 --with mlflow==3.17.0 --with langchain-community==0.4.1 python -m asyncio
```

Use Python 3.12, or 3.13.3 or later. On 3.13.0 to 3.13.2, a function that
raises loses its traceback: the tool returns the generic "no output was
produced" notice under `error` instead.

The function sandbox caps each call's virtual memory at
`EXECUTOR_MAX_MEMORY_LIMIT` megabytes (100 by default), a limit that applies
only on Linux. The command sets it to 4096, the value this page's scripts run
with.

Create the function client:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
from unitycatalog.ai.core.client import (
    UnitycatalogClient,
    UnitycatalogFunctionClient,
)
from unitycatalog.client import ApiClient, CatalogsApi, Configuration

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
api = ApiClient(config)
client = UnitycatalogFunctionClient(api_client=api)
```

:::tip
Always pass this client to the toolkit as `client=`. Without it, the toolkit
uses the default client set with `set_uc_function_client`. If none is set, it
[tries a Databricks client](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/ai/core/src/unitycatalog/ai/core/base.py)
when Databricks Connect with serverless support is installed. Otherwise it
raises `ValueError: No client provided, either set the client when creating a
toolkit or set the default client using
unitycatalog.ai.core.client.set_uc_function_client(client).`
:::

## Register the functions the agent may call

The agent decides when to call a function from its description. The
docstring's summary becomes the tool's description, and each `Args:` line
becomes that argument's description.

Create a catalog and a schema for the functions:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
uc = UnitycatalogClient(api_client=api)
await uc.create_catalog_async(name="tools", comment="Functions for apps and agents")
await uc.create_schema_async(name="pricing", catalog_name="tools")
```

Save two functions as `pricing.py`, in the folder where the session runs:

```python title="pricing.py"
def order_total(quantity: int, unit_price: float, discount_pct: float = 0.0) -> float:
    """
    Calculate the total price of an order line after a percentage discount.

    Args:
        quantity: Number of units ordered.
        unit_price: Price of one unit.
        discount_pct: Discount in percent, from 0 to 100.

    Returns:
        The discounted total, rounded to two decimals.
    """
    return round(quantity * unit_price * (1 - discount_pct / 100), 2)


```

```python title="pricing.py"
def shipping_cost(weight_kg: float, express: bool) -> float:
    """
    Calculate the shipping cost of a parcel.

    Args:
        weight_kg: Weight of the parcel in kilograms, greater than zero.
        express: Whether to ship with next-day delivery.

    Returns:
        The shipping cost, rounded to two decimals.
    """
    if weight_kg <= 0:
        raise ValueError("weight_kg must be greater than zero")
    rate = 4.5 if express else 2.0
    return round(5.0 + rate * weight_kg, 2)


```

Then register them:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
from pricing import order_total, shipping_cost

for func in (order_total, shipping_cost):
    await client.create_python_function_async(
        func=func, catalog="tools", schema="pricing"
    )
```

:::note
A model sends its arguments as JSON. On the agent path this page uses (see
[Give the tools to an agent](#give-the-tools-to-an-agent)), each parameter type
reaches the function like this:

| Type                                 | What the function gets                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STRING`, `INT`, `BIGINT`, `BOOLEAN` | The value.                                                                                                                                       |
| `DOUBLE`                             | The value. An integer is converted.                                                                                                              |
| `DECIMAL`                            | A `Decimal` when the model sends a string such as `"1.25"`. A JSON number fails.                                                                 |
| `TIMESTAMP`                          | The string the model sent, not a `datetime`.                                                                                                     |
| `BINARY`                             | The bytes of the text, without base64 decoding.                                                                                                  |
| `DATE`, `INTERVAL`, `STRUCT`         | Nothing: the call fails with `ValueError: Parameter <name> should be of type ColumnTypeName.DATE …` (or the type in question).                   |
| `ARRAY`, `MAP`                       | The value on the first call. Every later call on the same client returns `TypeError: unhashable type: 'list'` (or `'dict'`) as the tool's error. |

A `BOOLEAN` parameter with a default registers the default as text, `"False"`
or `"True"`, so a tool call that leaves the argument out fails: the tool
passes the text default to the client's type check. Give `BOOLEAN` parameters
no default.

Return values of type `ARRAY`, `MAP`, `STRUCT`, `BOOLEAN`, and `DOUBLE` work.
For a `DATE`, `TIMESTAMP`, `DECIMAL`, or `BINARY` return value, the tool call
raises `TypeError: Object of type date is not JSON serializable` (or
`datetime`, `Decimal`, `bytes`).
:::

## Choose which functions become tools

List the functions by full name to build the toolkit:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
from unitycatalog.ai.langchain.toolkit import UCFunctionToolkit

toolkit = UCFunctionToolkit(
    function_names=[
        "tools.pricing.order_total",
        "tools.pricing.shipping_cost",
    ],
    client=client,
)
tools = toolkit.tools
```

Each tool's name is the function's full name with `__` in place of the dots:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
print([tool.name for tool in tools])
# ['tools__pricing__order_total', 'tools__pricing__shipping_cost']
```

A name longer than 64 characters is
[cut to its last 64](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/ai/core/src/unitycatalog/ai/core/utils/function_processing_utils.py).

To include every function in a schema, use `catalog.schema.*`:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
toolkit = UCFunctionToolkit(function_names=["tools.pricing.*"], client=client)
```

:::warning
A wildcard also picks up functions that someone registers in the schema later:
the next toolkit you build from it gives the agent those functions too. List
the functions by name to keep an explicit allowlist of what the agent may call.
:::

## Check what the model sees

Print a tool's description and its arguments:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
order_tool = tools[0]
print(order_tool.description)
print(order_tool.args)
```

The description is the docstring's summary, `Calculate the total price of an
order line after a percentage discount.` Each argument has a JSON Schema type
(`integer` for `quantity`, `number` for `unit_price`) and the description from
its `Args:` line. A default is added to the description, as in `Discount in
percent, from 0 to 100. (Default: 0.0)`.

## Call a tool directly

Call a tool before you hand it to an agent, to check the function and its
arguments. A call returns a JSON string:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
output = order_tool.invoke(
    {"quantity": 3, "unit_price": 19.99, "discount_pct": 10.0}
)
print(output)  # {"format": "SCALAR", "value": 53.97}
print(json.loads(output)["value"])  # 53.97
```

The tool's schema converts an integer for a `DOUBLE` parameter, so the tool
accepts `20` for `unit_price`, which a direct client call rejects. A direct
`invoke` also turns every argument into JSON text (`default=str`) before the
client checks its type. So `DATE`, `DECIMAL`, `BINARY`, `INTERVAL`, and
`STRUCT` arguments fail here, even the ones the agent path accepts.

When the function raises, the call doesn't. It returns the traceback under
`error`, which is what the agent sees:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
shipping_tool = tools[1]
output = shipping_tool.invoke({"weight_kg": -1.0, "express": False})
print(json.loads(output)["error"])
# Traceback (most recent call last): ... ValueError: weight_kg must be greater than zero
```

Arguments the schema can't accept raise pydantic's `ValidationError` before the
function runs. So do arguments the function doesn't declare (`Extra inputs are
not permitted`):

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
from pydantic import ValidationError

try:
    order_tool.invoke({"quantity": "three", "unit_price": 19.99})
except ValidationError as exc:
    print(exc)  # quantity: Input should be a valid integer ...
```

A function that returns a falsy value, such as `0`, `False`, `""`, `None`, `[]`,
or `{}`, returns a notice instead of the value:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
output = order_tool.invoke({"quantity": 0, "unit_price": 19.99})
print(json.loads(output)["value"])
# The function execution has completed, but no output was produced. ...
```

When the model needs to see a zero or an empty result, return a value that
isn't falsy, such as a string or a non-empty map.

## Give the tools to an agent

LangChain's `create_agent` accepts the tools, but with the Unity Catalog
function client they need an async adapter first.

### Workaround: run the tools on the session's event loop

As built, `toolkit.tools` fail inside an agent. Running the agent with `invoke`
fails with `RuntimeError: … attached to a different loop`, and with `ainvoke`
it fails with `RuntimeError: Timeout context manager should be used inside a
task`. LangGraph runs the tools' synchronous functions in worker threads, and
the client's connection belongs to the session's event loop.

As a workaround, give each tool an asynchronous function that calls the client
on the session's loop:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
def run_on_this_loop(tool):
    async def run(**arguments):
        result = await client.execute_function_async(
            tool.uc_function_name, parameters=arguments
        )
        return result.to_json()

    tool.coroutine = run
    return tool

agent_tools = [run_on_this_loop(tool) for tool in tools]
```

### Run the agent

The agent needs a chat model in `model`. Set it first: point it at a gateway
endpoint as in
[Route the model through the MLflow AI Gateway](#route-the-model-through-the-mlflow-ai-gateway),
or assign any LangChain chat model that supports tool calling. Then create the
agent with the adapted tools and ask it a question:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
from langchain.agents import create_agent

agent = create_agent(model, tools=agent_tools)
result = await agent.ainvoke(
    {
        "messages": [
            {
                "role": "user",
                "content": "Price 3 units at 19.99 with 10% off, shipped express at 2 kg.",
            }
        ]
    }
)
for message in result["messages"]:
    print(message.type, message.content)
```

The messages are your question, each tool call the model made, a `tool` message
with each function's JSON result, and the model's answer.

## Trace the agent's tool calls with MLflow

MLflow's LangChain autologging records each agent run as a trace and sends it
to the environment's MLflow tracking server, in the `langchain-tools`
experiment. The `MLFLOW_ENABLE_PROXY_MULTIPART_*` settings keep trace data
going through the tracking server, whose download links name an address only
the environment can reach. Turn it on, then run the agent again:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
import os

import mlflow

os.environ["MLFLOW_ENABLE_PROXY_MULTIPART_DOWNLOAD"] = "false"
os.environ["MLFLOW_ENABLE_PROXY_MULTIPART_UPLOAD"] = "false"
mlflow.set_tracking_uri("http://localhost:8080")
mlflow.set_experiment("langchain-tools")
mlflow.langchain.autolog()
```

MLflow writes traces in the background, so flush them before you read them
back. Print the spans of the latest trace:

```python title="tools.py" script="/docs/how-to/langchain-tools/snippets/tools.py"
mlflow.flush_trace_async_logging()
trace = mlflow.search_traces(max_results=1, return_type="list")[0]
for span in trace.data.spans:
    print(span.span_type, span.name)
# CHAIN LangGraph
# CHAIN model
# CHAT_MODEL ...
# CHAIN tools
# TOOL tools__pricing__order_total
# ...
```

The trace has one span for the agent's graph, one for each model turn, and one
`TOOL` span for each function call. A tool span records the arguments the model
sent and the tool message it got back. To browse the same traces, open the
`langchain-tools` experiment in the MLflow UI at
<http://localhost:8080/mlflow/>.

## Route the model through the MLflow AI Gateway

The MLflow AI Gateway holds the provider key, so the agent's process needs only
the gateway's URL and an endpoint name.

:::warning
This section needs a real provider key, so CI doesn't test it. These steps were
checked locally against a fake OpenAI-compatible server standing in for the
provider.
:::

Save the endpoint as `gateway.yaml`, with your provider, model, and base URL:

```yaml title="gateway.yaml"
endpoints:
  - name: chat
    endpoint_type: llm/v1/chat
    model:
      provider: openai
      name: gpt-4o-mini
      config:
        # The gateway reads the key from this environment variable.
        openai_api_key: $OPENAI_API_KEY
        # Any OpenAI-compatible server works here, including a local one.
        openai_api_base: https://api.openai.com/v1
```

In the same folder, with your provider's key in `OPENAI_API_KEY`, start the
gateway:

```bash title="start_gateway.sh"
uv run --python 3.12 --with "mlflow[gateway]==3.17.0" \
  mlflow gateway start --config-path gateway.yaml --port 5050
```

In the Python session, point `model` at the gateway's `chat` endpoint, then
run the agent:

```python title="gateway_agent.py"
from langchain_community.chat_models import ChatMlflow

model = ChatMlflow(target_uri="http://localhost:5050", endpoint="chat")
```

## Control who can call a function

The toolkit fetches each function from the server when you build a tool, and
the client fetches it again on every call
([toolkit](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/ai/integrations/langchain/src/unitycatalog/ai/langchain/toolkit.py),
[client](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/ai/core/src/unitycatalog/ai/core/client.py)).
With authorization enabled, the server returns a function to a caller who
([`FunctionService.java`](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/server/src/main/java/io/unitycatalog/server/service/FunctionService.java)):

- owns the metastore or the function's catalog,
- owns the function's schema and has `USE CATALOG` on its catalog, or
- has `USE CATALOG` on the catalog, `USE SCHEMA` on the schema, and `EXECUTE`
  on the function or owns it.

Registering a function needs `USE CATALOG` on the catalog (or its ownership),
plus `USE SCHEMA` and `CREATE FUNCTION` on the schema (or its ownership).
Creating the catalog needs `CREATE CATALOG` on the metastore (or its
ownership), and creating the schema needs `USE CATALOG` and `CREATE SCHEMA` on
the catalog (or its ownership). For how these
grants inherit, see [Core concepts](/docs/explanation/uc-basics/).

The function then runs on the agent's machine. By default the client runs it
in a sandboxed subprocess, which restricts imports and file access and caps
CPU time and memory. It runs inside the agent's own process only if you create
the client with `execution_mode="local"`.

:::note
These rules come from the server's source. These docs haven't run them
against a server with authorization enabled.
:::

## Next steps

- Register, inspect, and run functions step by step in
  [Working with Python functions](/docs/tutorials/first-python-function/).
- Learn how functions, schemas, and the `EXECUTE` privilege fit together in
  [Core concepts](/docs/explanation/uc-basics/).
