// Runs Content Collections inside Vite, like @content-collections/vite, but
// fails `vite build` when a document doesn't load. Content Collections only
// logs transform errors and drops the document, so an unknown author or a
// missing image would otherwise ship a site with the post missing. Astro's
// build fails in both cases.
import path from "node:path";

import { createBuilder } from "@content-collections/core";
import type { Plugin } from "vite";

type Builder = Awaited<ReturnType<typeof createBuilder>>;

export function contentCollections(
  configPath = "content-collections.ts",
): Plugin {
  let builder: Builder | undefined;
  let built: Promise<void> | undefined;
  let isBuild = false;
  let unsubscribe: (() => Promise<void>) | undefined;
  const errors: string[] = [];

  return {
    name: "uc:content-collections",
    config(config) {
      const root = config.root ?? process.cwd();
      const generated = path.resolve(
        root,
        path.dirname(configPath),
        ".content-collections/generated",
      );
      return {
        optimizeDeps: { exclude: ["content-collections"] },
        resolve: { alias: { "content-collections": generated } },
      };
    },
    async configResolved(config) {
      isBuild = config.command === "build";
      builder = await createBuilder(path.resolve(config.root, configPath));
      builder.on("_error", ({ _event, error }) => {
        const message = `${_event}: ${error.message}`;
        errors.push(message);
        console.error(`[content-collections] ${message}`);
      });
      builder.on("builder:end", ({ startedAt, endedAt, stats }) => {
        console.log(
          `[content-collections] ${stats.documents} documents in ${stats.collections} collections (${endedAt - startedAt}ms)`,
        );
      });
    },
    async buildStart() {
      if (!builder) return;
      // Every Vite environment calls buildStart; one build serves them all.
      built ??= builder.build();
      await built;
      if (isBuild && errors.length > 0) {
        this.error(
          `Content Collections failed to load ${errors.length} document(s):\n${errors.join("\n")}`,
        );
      }
    },
    async configureServer() {
      if (!builder) return;
      const subscription = await builder.watch();
      unsubscribe = subscription.unsubscribe;
    },
    async closeBundle() {
      await unsubscribe?.();
      unsubscribe = undefined;
    },
  };
}
