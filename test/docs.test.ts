// The contract with docs-factory's emitter: what it writes into
// src/generated/docs/ and src/content/docs/, and what /docs/ serves from it.
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const site = JSON.parse(read("src/generated/docs/site.json")) as {
  pages: { route: string; file: string; twin: string }[];
  apis: { route: string }[];
  apiIndex: string | null;
};

describe("emitted docs", () => {
  test("every route is under /docs/ and ends in a slash", () => {
    const routes = [
      ...site.pages.map((p) => p.route),
      ...site.apis.map((a) => a.route),
      ...(site.apiIndex ? [site.apiIndex] : []),
    ];
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(route).toMatch(/^\/docs\/.+\/$/);
  });

  test("every page has its content module and its Markdown twin", () => {
    for (const page of site.pages) {
      expect(existsSync(new URL(`src/content/docs/${page.file}`, root))).toBe(
        true,
      );
      expect(existsSync(new URL(`public${page.twin}`, root))).toBe(true);
    }
  });

  test("every route has a head", () => {
    const heads = JSON.parse(read("src/generated/docs/heads.json")) as Record<
      string,
      unknown
    >;
    for (const page of site.pages) expect(heads[page.route]).toBeDefined();
    expect(heads["/docs/"]).toBeDefined();
  });

  test("the docs pipeline loads every plugin the emitter vendors", () => {
    const pipeline = read("plugins/docs-mdx.ts");
    for (const name of [
      "remark-callouts",
      "remark-directive-prose-guard",
      "remark-engine-coverage",
      "remark-fence-meta",
      "remark-journey",
      "remark-likec4-views",
      "remark-prerequisites",
      "remark-tabs",
      "remark-tldr",
      "remark-trestle-views",
    ]) {
      expect(pipeline).toContain(`docs-plugins/${name}.mjs`);
      expect(
        existsSync(new URL(`src/vendor/docs-plugins/${name}.mjs`, root)),
      ).toBe(true);
    }
  });
});
