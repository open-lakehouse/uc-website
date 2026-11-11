# /// script
# requires-python = ">=3.11"
# dependencies = ["unitycatalog-client==0.7.0"]
# ///
"""Create a catalog, schema, and table with the Unity Catalog Python client.

The regions are what a reader types into `python -m asyncio`, step by step.

Start the docs' local server from `uc-docs-env/unitycatalog`:

    docker compose up -d --wait

Then run this script:

    uv run catalog_flow.py
"""

import asyncio
import os

from unitycatalog.client.exceptions import NotFoundException

async def main() -> None:
    from unitycatalog.client import (
        ApiClient,
        CatalogsApi,
        Configuration,
        SchemasApi,
        TablesApi,
    )

    config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
    api = ApiClient(config)
    catalogs = CatalogsApi(api)
    schemas = SchemasApi(api)
    tables = TablesApi(api)
    if url := os.environ.get("UC_BASE_URL"):
        config.host = url
    try:
        await _reset(catalogs)

        from unitycatalog.client import CreateCatalog

        catalog = await catalogs.create_catalog(
            CreateCatalog(name="quickstart", comment="Created from Python")
        )
        print(catalog.name, catalog.id)
        assert catalog.name == "quickstart"

        listed = await catalogs.list_catalogs()
        print([c.name for c in listed.catalogs])
        assert "quickstart" in [c.name for c in listed.catalogs]

        from unitycatalog.client import CreateSchema

        schema = await schemas.create_schema(
            CreateSchema(name="sales", catalog_name="quickstart")
        )
        print(schema.full_name)  # quickstart.sales
        assert schema.full_name == "quickstart.sales"

        from unitycatalog.client import CreateTable
        from unitycatalog.client.models import (
            ColumnInfo,
            ColumnTypeName,
            DataSourceFormat,
            TableType,
        )

        table = await tables.create_table(
            CreateTable(
                name="orders",
                catalog_name="quickstart",
                schema_name="sales",
                table_type=TableType.EXTERNAL,
                data_source_format=DataSourceFormat.DELTA,
                storage_location="file:///tmp/uc-docs/quickstart/orders",
                columns=[
                    ColumnInfo(
                        name="order_id",
                        type_name=ColumnTypeName.LONG,
                        type_text="bigint",
                        type_json='{"name":"order_id","type":"long","nullable":false,"metadata":{}}',
                        position=0,
                        nullable=False,
                    )
                ],
            )
        )
        print(table.catalog_name, table.schema_name, table.name, table.table_type)
        assert table.table_type == TableType.EXTERNAL

        from unitycatalog.client.exceptions import NotFoundException

        try:
            await tables.get_table(full_name="quickstart.sales.returns")
        except NotFoundException as exc:
            print("not found:", exc.status)  # not found: 404
        else:
            raise AssertionError("a missing table should raise NotFoundException")

        await tables.delete_table(full_name="quickstart.sales.orders")
        await schemas.delete_schema(full_name="quickstart.sales")
        await catalogs.delete_catalog(name="quickstart")
        await api.close()
    finally:
        await api.close()

async def _reset(catalogs) -> None:
    try:
        await catalogs.delete_catalog(name="quickstart", force=True)
    except NotFoundException:
        pass

if __name__ == "__main__":
    asyncio.run(main())
