#!/usr/bin/env bun
/**
 * Strips registry proxy URLs out of bun.lock.
 *
 * Local installs may route through a private npm proxy/registry (.npmrc or
 * bunfig.toml), and Bun records the full tarball URL for any registry other
 * than npmjs.org. That host-specific URL must never land in a commit: Vercel
 * runs `bun install` (vercel.ts) and can't reach the proxy, nor can CI.
 *
 * The resolution (second) field of each package entry is reset to "", the
 * value Bun uses for the default registry, so local installs still go through
 * whatever registry is configured.
 *
 * Host-agnostic: matches any http(s) registry tarball URL
 * (".../-/<name>-<version>.tgz"). Git, GitHub, file, and already-clean
 * resolutions are left untouched. Names, versions, dependency maps, and
 * integrity hashes are never modified.
 *
 * Usage:
 *   bun run strip-lock-proxy          # rewrite bun.lock in place
 *   bun run strip-lock-proxy:check    # exit 1 if proxy URLs exist (no write)
 *
 *   # Check lockfile text from stdin instead (implies --check). The pre-push
 *   # hook uses this to check bun.lock as committed in each pushed commit:
 *   git show HEAD:bun.lock | bun scripts/strip-bun-lock-proxy.ts --stdin
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Group 1 is the entry head: ["<name>@<version>", . The proxied resolution URL
// after it is dropped (the whole match is replaced with group 1 + "").
const BUN_PROXY_RESOLUTION =
  /(\["[^"]+@[^"]+", )"https?:\/\/[^"]*\/-\/[^"]*\.tgz"/g;

const fromStdin = process.argv.includes("--stdin");
const checkOnly = fromStdin || process.argv.includes("--check");
const file = fromStdin ? "bun.lock (stdin)" : "bun.lock";
const path = resolve(import.meta.dirname, "..", "bun.lock");

if (!fromStdin && !existsSync(path)) {
  console.log(`${file} not found; nothing to strip.`);
  process.exit(0);
}

const text = readFileSync(fromStdin ? 0 : path, "utf8");
const count = text.match(BUN_PROXY_RESOLUTION)?.length ?? 0;

if (count === 0) {
  console.log(`${file} is clean: no proxy URLs found.`);
} else if (checkOnly) {
  console.error(
    `${file} contains ${count} proxied resolution URL(s). Run: bun run strip-lock-proxy`,
  );
  process.exit(1);
} else {
  writeFileSync(path, text.replace(BUN_PROXY_RESOLUTION, '$1""'));
  console.log(`Stripped ${count} proxy URL(s) from ${file}.`);
}
