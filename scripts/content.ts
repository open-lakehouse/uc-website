// Generates the Content Collections output (.content-collections/generated)
// without a Vite build, for `tsc` and `bun test`. Fails on any document that
// doesn't load, as `vite build` does.
//   bun scripts/content.ts
import { fileURLToPath } from "node:url";

import { createBuilder } from "@content-collections/core";

export async function buildContent(): Promise<void> {
  const builder = await createBuilder(
    fileURLToPath(new URL("../content-collections.ts", import.meta.url)),
  );
  const errors: string[] = [];
  builder.on("_error", ({ _event, error }) => {
    errors.push(`${_event}: ${error.message}`);
  });
  await builder.build();
  if (errors.length > 0) {
    throw new Error(`Content Collections failed:\n${errors.join("\n")}`);
  }
}

if (import.meta.main) await buildContent();
