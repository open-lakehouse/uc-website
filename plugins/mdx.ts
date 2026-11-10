// Compiles blog posts with @mdx-js/rollup, using the plugins and the plugin
// order the Astro app applies (astro.config.mjs, @astrojs/markdown-remark,
// and @astrojs/mdx). `.md` posts stay plain Markdown (format "detect").
import type { Options } from "@mdx-js/rollup";
import rehypeExpressiveCode from "rehype-expressive-code";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";

import rehypeTableScroll from "../src/lib/rehype-table-scroll.mjs";
import remarkCallouts from "../src/lib/remark-callouts.mjs";
import { rehypeMetaString, rehypeRawIn } from "./rehype-astro-compat.ts";
import { rehypeExpressiveCodeOptions } from "./expressive-code.ts";
import rehypeHeadingIds from "./rehype-heading-ids.ts";
import { rehypeLocalImages, remarkLocalImages } from "./local-images.ts";
import {
  rehypePostExports,
  remarkRawBody,
  remarkStripAstroImports,
} from "./post-module.ts";

export const mdxOptions: Options = {
  format: "detect",
  remarkPlugins: [
    remarkFrontmatter,
    remarkRawBody,
    remarkStripAstroImports,
    // Astro enables GFM and SmartyPants by default, before the configured
    // plugins.
    remarkGfm,
    [remarkSmartypants, {}],
    remarkDirective,
    remarkCallouts,
    remarkLocalImages,
  ],
  rehypePlugins: [
    rehypeMetaString,
    rehypeRawIn("mdx"),
    rehypeTableScroll,
    [rehypeExpressiveCode, rehypeExpressiveCodeOptions],
    rehypeLocalImages,
    rehypeHeadingIds,
    rehypeRawIn("md"),
    rehypePostExports,
  ],
};
