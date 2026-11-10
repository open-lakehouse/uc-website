import { expect, test } from "bun:test";

test("bun.lock leaves tarball URLs to the default registry", async () => {
  const lock = await Bun.file(new URL("../bun.lock", import.meta.url)).text();
  const pinned =
    lock.match(
      /"https?:\/\/(?!registry\.npmjs\.org\/)[^"]+\/-\/[^"]+\.tgz"/g,
    ) ?? [];
  expect(
    pinned,
    "Vercel can't reach a private registry. Run `bun run strip-lock-proxy`.",
  ).toEqual([]);
});
