// Small rehype steps that keep the MDX pipeline's output in line with
// Astro's, which runs Markdown and MDX through different plugin orders.
import { nodeTypes } from "@mdx-js/mdx";
import type { Root } from "hast";
import rehypeRaw from "rehype-raw";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

import { isMdxFile } from "./rehype-heading-ids.ts";

/**
 * Copies a code fence's meta string (`title="x.py"`) into a property, so it
 * survives rehype-raw re-parsing the tree (from @astrojs/mdx).
 */
export function rehypeMetaString() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      const meta = (node.data as { meta?: string } | undefined)?.meta;
      if (node.tagName === "code" && meta) {
        node.properties.metastring = meta;
      }
    });
  };
}

/**
 * Parses raw HTML, but only in `.md` or only in `.mdx` files. Astro parses it
 * first in MDX and last in Markdown, after the table, code, and heading
 * plugins have run, so raw HTML in a `.md` post isn't wrapped, highlighted,
 * or given an id. MDX nodes pass through untouched.
 */
export function rehypeRawIn(format: "md" | "mdx") {
  const parse = rehypeRaw({ passThrough: [...nodeTypes] });
  return () => (tree: Root, file: VFile) =>
    isMdxFile(file) === (format === "mdx") ? parse(tree, file) : undefined;
}
