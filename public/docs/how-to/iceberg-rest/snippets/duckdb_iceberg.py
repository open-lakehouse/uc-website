# /// script
# requires-python = ">=3.11"
# dependencies = ["duckdb==2.0.0"]
# ///
"""Create, change, and drop an Iceberg table in Unity Catalog from DuckDB, through Iceberg REST.

Start the docs' local server from `uc-docs-env/uc-aws`:

    docker compose up -d --wait

Then run this script, with `_setup.py` from the same page beside it:

    AWS_ENDPOINT_URL=http://localhost:9000 AWS_ALLOW_HTTP=true uv run duckdb_iceberg.py
"""

import duckdb

con = duckdb.connect()
con.execute("INSTALL iceberg")
con.execute("LOAD iceberg")
con.execute("SET iceberg_use_metadata_log = false")

from _setup import setup_retail, table_info  # noqa: E402

setup_retail()

con.execute("CREATE SECRET uc (TYPE iceberg, TOKEN 'not-used')")
con.execute("""
    ATTACH 'retail' AS retail (
        TYPE iceberg,
        SECRET uc,
        ENDPOINT 'http://localhost:8080/api/2.1/unity-catalog/iceberg'
    )
""")

# The local environment's simulated S3, which DuckDB doesn't find on its own.
con.execute("SET s3_endpoint = 'localhost:9000'")
con.execute("SET s3_use_ssl = false")
con.execute("SET s3_url_style = 'path'")

con.execute("CREATE SCHEMA retail.staging")
con.sql(
    "SELECT schema_name FROM duckdb_schemas() WHERE database_name = 'retail'"
).show()
schemas = con.sql(
    "SELECT schema_name FROM duckdb_schemas() WHERE database_name = 'retail'"
).fetchall()
assert {"sales", "staging"} <= {s for (s,) in schemas}, schemas

con.execute("""
    CREATE TABLE retail.sales.orders (
        order_id BIGINT,
        customer VARCHAR,
        amount DOUBLE
    )
""")
info = table_info("retail.sales.orders")
assert (info["data_source_format"], info["table_type"]) == ("ICEBERG", "MANAGED"), info

con.execute("""
    INSERT INTO retail.sales.orders VALUES
        (1, 'ada', 9.5),
        (2, 'grace', 20.0),
        (3, 'linus', 3.25)
""")

con.sql("SELECT * FROM retail.sales.orders WHERE amount > 5 ORDER BY order_id").show()
assert con.sql("SELECT count(*) FROM retail.sales.orders").fetchall() == [(3,)]

con.execute("UPDATE retail.sales.orders SET amount = 21.0 WHERE order_id = 2")
con.execute("DELETE FROM retail.sales.orders WHERE customer = 'linus'")
rows = con.sql("SELECT * FROM retail.sales.orders ORDER BY order_id").fetchall()
assert rows == [(1, "ada", 9.5), (2, "grace", 21.0)], rows

con.execute("ALTER TABLE retail.sales.orders RENAME TO order_history")
tables = con.sql(
    "SELECT name FROM (SHOW ALL TABLES) WHERE database = 'retail' AND schema = 'sales'"
).fetchall()
assert tables == [("order_history",)], tables

con.execute("DROP TABLE retail.sales.order_history")
con.execute("DROP SCHEMA retail.staging")
assert con.sql("SELECT count(*) FROM (SHOW ALL TABLES)").fetchall() == [(0,)]
