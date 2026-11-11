import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    ".output/",
    ".vercel/",
    ".nitro/",
    ".tanstack/",
    ".content-collections/",
    "src/routeTree.gen.ts",
    // Generated web-component bundles copied in by docs-factory.
    "public/",
    // The docs docs-factory's emitter writes (see AGENTS.md).
    "src/content/docs/",
    "src/generated/docs/",
    "src/vendor/docs-plugins/",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  prettier,
);
