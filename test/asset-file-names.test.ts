import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { assetFileNames } from "../plugins/asset-file-names";

describe("assetFileNames", () => {
  const root = mkdtempSync(path.join(tmpdir(), "asset-file-names-"));
  const contentDir = path.join(root, "content");
  for (const [file, bytes] of [
    ["b-post/uc.png", "same"],
    ["a post/datasilos.png", "same"],
    ["b-post/diagram.png", "unique"],
  ] as const) {
    mkdirSync(path.dirname(path.join(contentDir, file)), { recursive: true });
    writeFileSync(path.join(contentDir, file), bytes);
  }
  const name = assetFileNames({
    root: path.join(root, "web"),
    contentDir,
    sanitize: (n) => n.replace(/[^\w.-]+/g, "-"),
  });
  const asset = (original: string, emitted: string) =>
    name({ names: [emitted], originalFileNames: [original] });

  test("names identical copies after the first in sort order", () => {
    expect(asset("../content/b-post/uc.png", "uc.webp")).toBe(
      "assets/datasilos-[hash].webp",
    );
    expect(asset("../content/a%20post/datasilos.png", "datasilos.webp")).toBe(
      "assets/datasilos-[hash].webp",
    );
  });

  test("keeps the emitted name of any other asset", () => {
    expect(asset("../content/b-post/diagram.png", "diagram.webp")).toBe(
      "assets/diagram-[hash].webp",
    );
    expect(name({ names: ["app name.css"], originalFileNames: [] })).toBe(
      "assets/app-name-[hash].css",
    );
  });
});
