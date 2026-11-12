import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Plugin } from "vite";

import {
  assetFileNames,
  dedupeImages,
  identicalImages,
} from "../plugins/asset-file-names";

const contentDir = mkdtempSync(path.join(tmpdir(), "asset-file-names-"));
for (const [file, bytes] of [
  ["b-post/uc.png", "same"],
  ["a post/datasilos.png", "same"],
  ["c-post/datasilos-copy.webp", "same"],
  ["b-post/diagram.png", "unique"],
  ["b-post/notes.md", "same"],
] as const) {
  mkdirSync(path.dirname(path.join(contentDir, file)), { recursive: true });
  writeFileSync(path.join(contentDir, file), bytes);
}
const at = (file: string) => path.join(contentDir, file);
const canonical = at("a post/datasilos.png");

// Vite's resolver, for relative and absolute paths.
type Resolve = (
  source: string,
  importer?: string,
) => Promise<{ id: string; external?: boolean } | null>;
const resolveFile: Resolve = async (source, importer) => ({
  id: path.resolve(importer ? path.dirname(importer) : "/", source),
});

async function resolveWith(
  plugin: Plugin,
  source: string,
  importer: string | undefined,
  resolve: Resolve = resolveFile,
) {
  const hook = plugin.resolveId as (
    this: { resolve: Resolve },
    source: string,
    importer: string | undefined,
    options: object,
  ) => Promise<string | null>;
  return hook.call({ resolve }, source, importer, {});
}

describe("identicalImages", () => {
  test("maps each image with identical copies to the first in sort order", () => {
    expect(identicalImages(contentDir)).toEqual(
      new Map([
        [at("b-post/uc.png"), canonical],
        [at("a post/datasilos.png"), canonical],
        [at("c-post/datasilos-copy.webp"), canonical],
      ]),
    );
  });
});

describe("dedupeImages", () => {
  const plugin = dedupeImages({ contentDir });
  const post = at("b-post/index.md");

  test("runs before vite-imagetools loads the image", () => {
    expect(plugin.enforce).toBe("pre");
  });

  test("resolves a copy to the first copy, keeping the imagetools query", async () => {
    const query = "?format=webp&as=metadata:src;width;height";
    expect(await resolveWith(plugin, `./uc.png${query}`, post)).toBe(
      `${canonical}${query}`,
    );
    expect(await resolveWith(plugin, "./uc.png", post)).toBe(canonical);
    expect(
      await resolveWith(
        plugin,
        at("c-post/datasilos-copy.webp"),
        at("c-post/index.md"),
      ),
    ).toBe(canonical);
  });

  test("leaves the first copy, unique images, and other files to Vite", async () => {
    let calls = 0;
    const counting: Resolve = (source, importer) => {
      calls++;
      return resolveFile(source, importer);
    };
    const firstPost = at("a post/index.md");
    expect(
      await resolveWith(plugin, "./datasilos.png", firstPost, counting),
    ).toBeNull();
    expect(
      await resolveWith(plugin, "./diagram.png?format=webp", post, counting),
    ).toBeNull();
    expect(calls).toBe(2);
    // Not an image: never resolved, even though its bytes match.
    expect(await resolveWith(plugin, "./notes.md", post, counting)).toBeNull();
    expect(calls).toBe(2);
  });

  test("leaves unresolved and external imports to Vite", async () => {
    expect(
      await resolveWith(plugin, "./uc.png", post, async () => null),
    ).toBeNull();
    expect(
      await resolveWith(plugin, "./uc.png", post, async () => ({
        id: at("b-post/uc.png"),
        external: true,
      })),
    ).toBeNull();
  });
});

describe("assetFileNames", () => {
  const name = assetFileNames((n) => n.replace(/[^\w.-]+/g, "-"));

  test("names an asset after its source, sanitized, with a content hash", () => {
    expect(name({ names: ["datasilos.webp"] })).toBe(
      "assets/datasilos-[hash].webp",
    );
    expect(name({ names: ["app name.css"] })).toBe(
      "assets/app-name-[hash].css",
    );
    expect(name({ names: [] })).toBe("assets/asset-[hash]");
  });
});
