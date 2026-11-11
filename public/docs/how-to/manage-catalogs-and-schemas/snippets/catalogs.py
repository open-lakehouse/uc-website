# /// script
# requires-python = ">=3.11"
# dependencies = ["unitycatalog-client==0.7.0"]
# ///
"""Create, inspect, update, and delete a catalog and a schema with the Python SDK.

Start the docs' local server from `uc-docs-env/unitycatalog`:

    docker compose up -d --wait

Then run this script:

    uv run catalogs.py
"""

import asyncio
import os

from unitycatalog.client import (
    ApiClient,
    CatalogsApi,
    Configuration,
    CreateCatalog,
    CreateSchema,
    SchemasApi,
    UpdateCatalog,
    UpdateSchema,
)
from unitycatalog.client.exceptions import BadRequestException, NotFoundException

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")

async def main() -> None:
    async with ApiClient(config) as api:
        catalogs = CatalogsApi(api)
        schemas = SchemasApi(api)
        await _reset(catalogs)

        catalog = await catalogs.create_catalog(
            CreateCatalog(
                name="retail",
                comment="Order and customer data for the retail team",
                properties={"owner_team": "retail-analytics"},
            )
        )
        print(catalog.name, catalog.properties)
        assert catalog.properties == {"owner_team": "retail-analytics"}

        listed = await catalogs.list_catalogs()
        print([c.name for c in listed.catalogs or []])

        retail = await catalogs.get_catalog(name="retail")
        print(retail.comment, retail.created_at)
        assert "retail" in [c.name for c in listed.catalogs or []]

        updated = await catalogs.update_catalog(
            name="retail",
            update_catalog=UpdateCatalog(
                comment="Curated retail data",
                properties={"owner_team": "retail-analytics", "tier": "gold"},
            ),
        )
        print(updated.comment, updated.properties)
        assert updated.properties == {"owner_team": "retail-analytics", "tier": "gold"}

        schema = await schemas.create_schema(
            CreateSchema(
                name="staging",
                catalog_name="retail",
                comment="Raw order extracts",
            )
        )
        print(schema.full_name)  # retail.staging

        listed_schemas = await schemas.list_schemas(catalog_name="retail")
        print([s.full_name for s in listed_schemas.schemas or []])

        staging = await schemas.get_schema(full_name="retail.staging")
        print(staging.comment)

        renamed = await schemas.update_schema(
            full_name="retail.staging",
            update_schema=UpdateSchema(new_name="sales", comment="Cleaned order data"),
        )
        print(renamed.full_name)  # retail.sales
        assert renamed.full_name == "retail.sales"

        try:
            await catalogs.delete_catalog(name="retail")
        except BadRequestException as exc:
            print(f"HTTP {exc.status}: catalog still contains schemas")
        assert (await catalogs.get_catalog(name="retail")).name == "retail"

        await schemas.delete_schema(full_name="retail.sales")
        await catalogs.delete_catalog(name="retail")

        try:
            await catalogs.get_catalog(name="retail")
            raise AssertionError("catalog should be gone")
        except NotFoundException:
            pass

        await _check_force_delete(catalogs, schemas)

async def _check_force_delete(catalogs: CatalogsApi, schemas: SchemasApi) -> None:
    """The page states force=True removes a catalog with its contents."""
    await catalogs.create_catalog(CreateCatalog(name="retail"))
    await schemas.create_schema(CreateSchema(name="sales", catalog_name="retail"))
    await catalogs.delete_catalog(name="retail", force=True)
    names = [c.name for c in (await catalogs.list_catalogs()).catalogs or []]
    assert "retail" not in names, names

async def _reset(catalogs: CatalogsApi) -> None:
    try:
        await catalogs.delete_catalog(name="retail", force=True)
    except NotFoundException:
        pass

if __name__ == "__main__":
    if url := os.environ.get("UC_BASE_URL"):
        config.host = url
    asyncio.run(main())
