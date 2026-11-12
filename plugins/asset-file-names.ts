// Identical images, and the output names of emitted assets.
//
// One image can sit in two post folders under different names. Imported as
// two modules, the copies become two assets with one name and one content
// hash, and Rolldown gives one of them a numeric suffix (`-B_E_ky0x2.webp`)
// in whatever order the build happens to emit them. The client and server
// builds pick independently, and the prerendered HTML comes from the server
// build, so a page could name a file the client build never wrote: a dead
// image, and an intermittent `links:dist` failure in CI. `dedupeImages`
// resolves every copy to the first of its identical copies in sort order, so
// each image is one module, and one asset, in both builds.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

const IMAGE = /\.(png|jpe?g|gif|webp|avif)$/i;

/** Each image in `contentDir` that has identical copies, to the first copy. */
export function identicalImages(contentDir: string): Map<string, string> {
  const copies = new Map<string, string[]>();
  for (const entry of readdirSync(contentDir, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !IMAGE.test(entry.name)) continue;
    const file = path.join(entry.parentPath, entry.name);
    const digest = createHash("sha256")
      .update(readFileSync(file))
      .digest("hex");
    copies.set(digest, [...(copies.get(digest) ?? []), file]);
  }
  const first = new Map<string, string>();
  for (const files of copies.values()) {
    if (files.length < 2) continue;
    const [canonical] = files.toSorted();
    for (const file of files) first.set(file, canonical!);
  }
  return first;
}

/** Resolves an import of any copy of an image, query and all, to the first copy. */
export function dedupeImages({
  contentDir,
}: {
  /** Scanned for identical images. */
  contentDir: string;
}): Plugin {
  const first = identicalImages(contentDir);
  return {
    name: "uc:dedupe-images",
    enforce: "pre",
    async resolveId(source, importer, options) {
      const queryAt = source.indexOf("?");
      const file = queryAt === -1 ? source : source.slice(0, queryAt);
      if (first.size === 0 || !IMAGE.test(file)) return null;
      const resolved = await this.resolve(file, importer, {
        ...options,
        skipSelf: true,
      });
      const canonical =
        resolved && !resolved.external && first.get(resolved.id);
      if (!canonical || canonical === resolved.id) return null;
      return queryAt === -1 ? canonical : canonical + source.slice(queryAt);
    },
  };
}

/** Output names for emitted assets (Rolldown's `output.assetFileNames`). */
export function assetFileNames(
  sanitize: (name: string) => string,
): (asset: { names: string[] }) => string {
  return ({ names }) => {
    const { name, ext } = path.parse(names[0] ?? "asset");
    return `assets/${sanitize(name)}-[hash]${ext}`;
  };
}
