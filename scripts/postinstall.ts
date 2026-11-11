#!/usr/bin/env bun
/**
 * Runs after every `bun install`, `bun add`, `bun remove`, and `bun update`.
 *
 * 1. Strips registry proxy URLs from bun.lock right after Bun writes them, so
 *    the lockfile on disk is always the one that may be committed. See
 *    .agents/rules/bun-clean-lock-rule.mdc.
 * 2. Unsets a leftover `core.hooksPath=.githooks`. The repo used to install its
 *    own hooks there; that directory is gone, and the stale setting would
 *    make git skip every hook, the global ones included.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const stripper = resolve(root, "scripts/strip-bun-lock-proxy.ts");
if (existsSync(stripper)) {
  const strip = spawnSync(process.execPath, [stripper], {
    cwd: root,
    stdio: "inherit",
  });
  if (strip.status !== 0) process.exit(strip.status ?? 1);
}

// Vercel and CI installs may have no git checkout; nothing to unset there.
const hooksPath = spawnSync(
  "git",
  ["config", "--local", "--get", "core.hooksPath"],
  { cwd: root, encoding: "utf8" },
);
if (hooksPath.status === 0 && hooksPath.stdout.trim() === ".githooks") {
  spawnSync("git", ["config", "--local", "--unset", "core.hooksPath"], {
    cwd: root,
    stdio: "inherit",
  });
  console.log(
    "Unset core.hooksPath=.githooks; git runs your global hooks again.",
  );
}
