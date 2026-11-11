# /// script
# requires-python = ">=3.11"
# dependencies = ["pyiceberg[pyarrow]==0.12.0"]
# ///
"""Create, change, and drop an Iceberg table in Unity Catalog from PyIceberg, through Iceberg REST.

Start the docs' local server from `uc-docs-env/uc-aws`:

    docker compose up -d --wait

Then run this script, with `_setup.py` from the same page beside it:

    AWS_ENDPOINT_URL=http://localhost:9000 AWS_ALLOW_HTTP=true uv run pyiceberg_tables.py
"""

import os
import sys

import _setup  # before pyiceberg, which reads its settings on import

import pyarrow as pa
from pyiceberg.catalog import load_catalog

_setup.setup_retail()

catalog = load_catalog(
    "retail",
    type="rest",
    uri="http://localhost:8080/api/2.1/unity-catalog/iceberg",
    warehouse="retail",
    token="not-used",
)

catalog.create_namespace("staging")
print(catalog.list_namespaces())
assert set(catalog.list_namespaces()) == {("sales",), ("staging",)}

orders_schema = pa.schema(
    [("order_id", pa.int64()), ("customer", pa.string()), ("amount", pa.float64())]
)
orders = catalog.create_table("sales.orders", schema=orders_schema)
info = _setup.table_info("retail.sales.orders")
assert (info["data_source_format"], info["table_type"]) == ("ICEBERG", "MANAGED"), info

orders.append(
    pa.table(
        {
            "order_id": [1, 2, 3],
            "customer": ["ada", "grace", "linus"],
            "amount": [9.5, 20.0, 3.25],
        },
        schema=orders_schema,
    )
)

print(orders.scan(row_filter="amount > 5").to_arrow().sort_by("order_id"))
assert orders.scan().to_arrow().num_rows == 3

orders.delete(delete_filter="customer = 'linus'")
orders.overwrite(
    pa.table(
        {"order_id": [2], "customer": ["grace"], "amount": [21.0]},
        schema=orders_schema,
    ),
    overwrite_filter="order_id = 2",
)
rows = catalog.load_table("sales.orders").scan().to_arrow().sort_by("order_id")
assert rows.to_pylist() == [
    {"order_id": 1, "customer": "ada", "amount": 9.5},
    {"order_id": 2, "customer": "grace", "amount": 21.0},
], rows

catalog.rename_table("sales.orders", "sales.order_history")
assert catalog.list_tables("sales") == [("sales", "order_history")]

catalog.drop_table("sales.order_history")
catalog.drop_namespace("staging")
assert catalog.list_tables("sales") == []

# pyarrow's thread pool can deadlock in interpreter shutdown on macOS; every
# assert has passed by now, so skip the native teardown.
sys.stdout.flush()
os._exit(0)
