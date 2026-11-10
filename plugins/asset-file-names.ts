// Output names for emitted assets (Rolldown's `output.assetFileNames`).
//
// Identical files, such as one image in two post folders, are written once,
// named after whichever copy the build loaded first. The client and server
// builds load them in different orders, and the prerendered HTML comes from
// the server build, so a page could name a file the client build never wrote.
// Each copy is named after the first of its identical copies in sort order
// instead, which both builds agree on.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

interface AssetInfo {
  names: string[];
  /** Relative to the Vite root; vite-imagetools percent-encodes them. */
  originalFileNames: string[];
}

export function assetFileNames({
  root,
  contentDir,
  sanitize,
}: {
  /** The Vite root, which `originalFileNames` are relative to. */
  root: string;
  /** Scanned for identical files. */
  contentDir: string;
  sanitize: (name: string) => string;
}): (asset: AssetInfo) => string {
  const copies = new Map<string, string[]>();
  for (const entry of readdirSync(contentDir, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !/\.(png|jpe?g|gif|webp|avif)$/i.test(entry.name)) {
      continue;
    }
    const file = path.join(entry.parentPath, entry.name);
    const digest = createHash("sha256")
      .update(readFileSync(file))
      .digest("hex");
    copies.set(digest, [...(copies.get(digest) ?? []), file]);
  }
  const nameOf = new Map<string, string>();
  for (const files of copies.values()) {
    if (files.length < 2) continue;
    const first = path.parse(files.toSorted()[0]!).name;
    for (const file of files) nameOf.set(file, first);
  }

  return ({ names, originalFileNames }) => {
    const { name, ext } = path.parse(names[0] ?? "asset");
    const original = originalFileNames[0];
    const shared =
      original && nameOf.get(path.resolve(root, decodeURI(original)));
    return `assets/${sanitize(shared || name)}-[hash]${ext}`;
  };
}
