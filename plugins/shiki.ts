// Shiki for every code fence on the site: the docs (docs-mdx.ts), blog posts
// and the home page's examples (mdx.ts). Highlighting is build-time; both
// themes are written into the HTML, and <html class="dark"> picks one
// (tokens.css). In the docs and the posts, <Pre>
// (src/components/docs/code-block.tsx) draws the chrome around the output.
import type { RehypeShikiOptions } from "@shikijs/rehype";
import type { ShikiTransformer } from "shiki";

// Shiki rebuilds <pre>, dropping upstream data-*. The fence meta reaches it
// as the <code>'s `metastring` (remark-fence-meta in the docs,
// rehypeMetaString in posts), so this transformer can restore the attributes
// <Pre> reads.
const TITLE_RE = /\btitle="([^"]*)"/;
const COLLAPSE_RE = /(?:^|\s)collapse(?=\s|$)/;
const SCRIPT_RE = /\bscript="([^"]*)"/;
const codeChromeTransformer: ShikiTransformer = {
  name: "uc:code-chrome",
  pre(node) {
    const raw = (this.options.meta?.__raw as string | undefined) ?? "";
    const title = TITLE_RE.exec(raw)?.[1];
    if (title) node.properties["data-filename"] = title;
    if (this.options.lang) node.properties["data-lang"] = this.options.lang;
    if (COLLAPSE_RE.test(raw)) node.properties["data-collapse"] = "true";
    const script = SCRIPT_RE.exec(raw)?.[1];
    if (script) node.properties["data-script"] = script;
  },
};

export const rehypeShikiOptions: RehypeShikiOptions = {
  themes: { light: "github-light", dark: "github-dark-default" },
  transformers: [codeChromeTransformer],
};
