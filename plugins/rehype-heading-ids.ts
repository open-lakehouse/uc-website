// Port of Astro's rehypeHeadingIds (@astrojs/markdown-remark 7.2.0), so
// heading ids, and every `#anchor` link to them, match the Astro site. It
// differs from rehype-slug in which text it slugs: raw HTML tags are skipped,
// and in `.md` files `{` becomes `${` before slugging. The headings it
// collects become the module's `headings` export (see rehype-exports.ts).
import Slugger from "github-slugger";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

export interface MarkdownHeading {
  depth: number;
  slug: string;
  text: string;
}

declare module "vfile" {
  interface DataMap {
    headings: MarkdownHeading[];
  }
}

const rawNodeTypes = new Set(["text", "raw", "mdxTextExpression"]);
const codeTagNames = new Set(["code", "pre"]);

export function isMdxFile(file: VFile): boolean {
  return Boolean(file.history[0]?.endsWith(".mdx"));
}

export default function rehypeHeadingIds() {
  return (tree: Root, file: VFile) => {
    const headings: MarkdownHeading[] = [];
    const slugger = new Slugger();
    const isMdx = isMdxFile(file);
    visit(tree, (node) => {
      if (node.type !== "element") return;
      const { tagName } = node;
      if (tagName[0] !== "h") return;
      const [, level] = /h([0-6])/.exec(tagName) ?? [];
      if (!level) return;
      const depth = Number.parseInt(level);

      let text = "";
      visit(node, (child, _, parent) => {
        if (child.type === "element" || parent == null) return;
        if (!("value" in child) || typeof child.value !== "string") return;
        if (child.type === "raw" && /^\n?<.*>\n?$/.test(child.value)) return;
        if (!rawNodeTypes.has(child.type)) return;
        if (isMdx || codeTagNames.has((parent as Element).tagName)) {
          text += child.value;
        } else {
          text += child.value.replace(/\{/g, "${");
        }
      });

      node.properties ??= {};
      if (typeof node.properties.id !== "string") {
        node.properties.id = slugger.slug(text);
      }
      headings.push({ depth, slug: node.properties.id as string, text });
    });
    file.data.headings = headings;
  };
}
