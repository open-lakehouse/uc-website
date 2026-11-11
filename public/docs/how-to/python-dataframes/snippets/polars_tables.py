# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "polars==1.44.2",
#   "deltalake==1.6.6",
#   "pyarrow>=18",
#   "unitycatalog-client==0.7.0",
# ]
# ///
"""List, read, and append to a Unity Catalog table on S3 from Polars.

Start the docs' local server from `uc-docs-env/uc-aws`:

    docker compose up -d --wait

Then run this script, with `_seed.py` from the same page beside it:

    AWS_ENDPOINT_URL=http://localhost:9000 AWS_ALLOW_HTTP=true uv run polars_tables.py
"""

import asyncio
import os
import sys

import polars as pl

catalog = pl.Catalog("http://localhost:8080", require_https=False)

from _seed import S3_ROOT_KEYS, seed_orders  # noqa: E402

def main() -> None:
    for table in catalog.list_tables("retail", "sales"):
        print(table.name, table.table_type, table.storage_location)
    assert [t.name for t in catalog.list_tables("retail", "sales")] == ["orders"]

    orders = catalog.scan_table("retail", "sales", "orders")
    print(orders.filter(pl.col("amount") > 5).collect())
    assert orders.collect().height == 3

    new_orders = pl.DataFrame(
        {"order_id": [4], "customer": ["margaret"], "amount": [12.0]}
    )
    catalog.write_table(new_orders, "retail", "sales", "orders", delta_mode="append")
    assert catalog.scan_table("retail", "sales", "orders").collect().height == 4

if __name__ == "__main__":
    asyncio.run(seed_orders("s3://amzn-s3-demo-bucket/retail/orders", S3_ROOT_KEYS))
    main()
    # pyarrow's thread pool can deadlock in interpreter shutdown on macOS; every
    # assert has passed by now, so skip the native teardown.
    sys.stdout.flush()
    os._exit(0)
