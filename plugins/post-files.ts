// Lists the blog posts on disk with their ids, for build config that runs
// before Content Collections does (the prerender page list).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { postId } from "../src/content/ids.ts";

export const blogDir = fileURLToPath(
  new URL("../src/content/blog", import.meta.url),
);

export interface PostFile {
  /** Path relative to src/content/blog, such as `<folder>/index.md`. */
  entry: string;
  id: string;
}

export function listPostFiles(dir = blogDir): PostFile[] {
  const files: PostFile[] = [];
  const entries = new Map<string, string>();
  for (const folder of readdirSync(dir, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    for (const name of ["index.md", "index.mdx"]) {
      const file = path.join(dir, folder.name, name);
      if (!existsSync(file)) continue;
      const source = readFileSync(file, "utf8");
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
      const data = (frontmatter ? parse(frontmatter) : {}) as {
        slug?: unknown;
      };
      const entry = `${folder.name}/${name}`;
      const id = postId(entry, data?.slug);
      // Ids are lowercase, so folders that differ only in case collide.
      const other = entries.get(id);
      if (other !== undefined) {
        throw new Error(`Posts ${other} and ${entry} have the same id "${id}"`);
      }
      entries.set(id, entry);
      files.push({ entry, id });
    }
  }
  return files;
}
