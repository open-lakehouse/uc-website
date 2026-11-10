// Shapes each post's compiled module for the blog post page:
// - drops the `.astro` component imports docs-factory writes into MDX posts
//   (the page passes Journey, LikeC4View, and the rest as MDX components);
// - exports `headings`, for the table of contents;
// - exports `raw`, the post body as written, which the page puts in a hidden
//   block for Pagefind exactly as src/pages/blogs/[id].astro does.
import type { Program } from "estree";
import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import type { VFile } from "vfile";

import { exportConst } from "./mdx-esm.ts";

declare module "vfile" {
  interface DataMap {
    rawBody: string;
  }
}

/** Removes `import X from "….astro"` statements from MDX ESM blocks. */
export function remarkStripAstroImports() {
  return (tree: MdastRoot) => {
    tree.children = tree.children.filter((node) => {
      if (node.type !== "mdxjsEsm") return true;
      const program = node.data?.estree as Program | undefined;
      if (!program) return true;
      program.body = program.body.filter(
        (statement) =>
          statement.type !== "ImportDeclaration" ||
          !String(statement.source.value).endsWith(".astro"),
      );
      return program.body.length > 0;
    });
  };
}

/**
 * Records the body after the frontmatter, trimmed: Astro's `post.body`.
 * Needs remark-frontmatter to have parsed the frontmatter into a `yaml` node.
 */
export function remarkRawBody() {
  return (tree: MdastRoot, file: VFile) => {
    const source = String(file.value);
    const frontmatter = tree.children.find((node) => node.type === "yaml");
    const start = frontmatter?.position?.end.offset ?? 0;
    file.data.rawBody = source.slice(start).trim();
  };
}

export function rehypePostExports() {
  return (tree: HastRoot, file: VFile) => {
    tree.children.unshift(
      exportConst("headings", file.data.headings ?? []),
      exportConst("raw", file.data.rawBody ?? ""),
    );
  };
}
