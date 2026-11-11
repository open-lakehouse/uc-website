# /// script
# # 3.14 fails at exit; see asyncio_py314.py beside this script.
# requires-python = "==3.12.*"
# dependencies = ["unitycatalog-ai==0.4.0"]
# ///
"""Register a Python function in Unity Catalog, inspect it, run it, and remove it.

The regions are what a reader types into `python -m asyncio`, step by step.

Start the docs' local server from `uc-docs-env/unitycatalog`:

    docker compose up -d --wait

Then run this script:

    uv run first_function.py
"""

import asyncio
import os

from unitycatalog.client.exceptions import NotFoundException

async def main() -> None:
    from unitycatalog.ai.core.client import (
        UnitycatalogClient,
        UnitycatalogFunctionClient,
    )
    from unitycatalog.client import ApiClient, CatalogsApi, Configuration

    config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
    api = ApiClient(config)
    client = UnitycatalogFunctionClient(api_client=api)
    if url := os.environ.get("UC_BASE_URL"):
        config.host = url
    try:
        await _reset(api)

        uc = UnitycatalogClient(api_client=api)
        await uc.create_catalog_async(
            name="tools", comment="Functions for apps and agents"
        )
        await uc.create_schema_async(name="pricing", catalog_name="tools")

        from pricing import order_total

        info = await client.create_python_function_async(
            func=order_total,
            catalog="tools",
            schema="pricing",
        )
        print(info.full_name)  # tools.pricing.order_total
        assert info.full_name == "tools.pricing.order_total"

        fn = await client.get_function_async("tools.pricing.order_total")
        print(fn.comment)
        for param in fn.input_params.parameters:
            print(f"{param.name}: {param.type_text} - {param.comment}")
        print("returns:", fn.full_data_type)
        print(fn.routine_definition)
        params = fn.input_params.parameters
        assert [(p.name, p.type_text) for p in params] == [
            ("quantity", "LONG"),
            ("unit_price", "DOUBLE"),
            ("discount_pct", "DOUBLE"),
        ], params
        assert params[2].parameter_default == "0.0"
        assert fn.full_data_type == "DOUBLE"
        assert fn.external_language == "PYTHON"
        assert fn.routine_definition == (
            "return round(quantity * unit_price * (1 - discount_pct / 100), 2)"
        )

        result = await client.execute_function_async(
            "tools.pricing.order_total",
            parameters={"quantity": 3, "unit_price": 19.99, "discount_pct": 10.0},
        )
        print(result.value)  # 53.97
        assert result.error is None and result.value == 53.97, result

        result = await client.execute_function_async(
            "tools.pricing.order_total",
            parameters={"quantity": 3, "unit_price": 19.99},
        )
        print(result.value)  # 59.97
        assert result.value == 59.97, result

        try:
            await client.execute_function_async(
                "tools.pricing.order_total",
                parameters={"quantity": 3, "unit_price": 20},
            )
        except ValueError as exc:
            print(exc)  # ... unit_price should be of type ... DOUBLE ...
        else:
            raise AssertionError("an int for a DOUBLE parameter should be rejected")

        # unitycatalog-ai 0.4.0 replaces any falsy return value with a notice
        # string; the page's note depends on it.
        zero = await client.execute_function_async(
            "tools.pricing.order_total", parameters={"quantity": 0, "unit_price": 1.0}
        )
        assert isinstance(zero.value, str) and "no output was produced" in zero.value

        functions = await client.list_functions_async(catalog="tools", schema="pricing")
        print([f.full_name for f in functions])
        assert [f.full_name for f in functions] == ["tools.pricing.order_total"]

        await client.delete_function_async("tools.pricing.order_total")
        await CatalogsApi(api).delete_catalog(name="tools", force=True)
        await api.close()
    finally:
        await api.close()

async def _reset(api) -> None:
    from unitycatalog.client import CatalogsApi

    try:
        await CatalogsApi(api).delete_catalog(name="tools", force=True)
    except NotFoundException:
        pass

if __name__ == "__main__":
    asyncio.run(main())
