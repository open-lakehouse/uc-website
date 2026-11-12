// Compiles the docs (src/content/docs/**/*.md, emitted by docs-factory) with
// the remark plugins the emitter vendors into src/vendor/docs-plugins/, in the
// order docs-factory's own preview applies them, so a page renders the same
// in both. The plugins turn directives into imports of `@/components/<name>`,
// which vite.config.ts resolves to src/components/docs/.
import type { Options } from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";

import remarkCallouts from "../src/vendor/docs-plugins/remark-callouts.mjs";
import remarkDirectiveProseGuard from "../src/vendor/docs-plugins/remark-directive-prose-guard.mjs";
import remarkEngineCoverage from "../src/vendor/docs-plugins/remark-engine-coverage.mjs";
import remarkFenceMeta from "../src/vendor/docs-plugins/remark-fence-meta.mjs";
import remarkJourney from "../src/vendor/docs-plugins/remark-journey.mjs";
import remarkLikeC4Views from "../src/vendor/docs-plugins/remark-likec4-views.mjs";
import remarkPrerequisites from "../src/vendor/docs-plugins/remark-prerequisites.mjs";
import remarkTabs from "../src/vendor/docs-plugins/remark-tabs.mjs";
import remarkTldr from "../src/vendor/docs-plugins/remark-tldr.mjs";
import remarkTrestleViews from "../src/vendor/docs-plugins/remark-trestle-views.mjs";
import { rehypeShikiOptions } from "./shiki.ts";

/** The docs' content files; the blog pipeline (mdx.ts) leaves them alone. */
export const DOCS_CONTENT = /\/src\/content\/docs\/.*\.md$/;

export const docsMdxOptions: Options = {
  include: DOCS_CONTENT,
  providerImportSource: "@mdx-js/react",
  remarkPlugins: [
    remarkGfm,
    remarkDirective,
    remarkDirectiveProseGuard,
    remarkFrontmatter,
    remarkPrerequisites,
    remarkTldr,
    remarkCallouts,
    remarkTabs,
    remarkJourney,
    remarkFenceMeta,
    remarkLikeC4Views,
    remarkTrestleViews,
    remarkEngineCoverage,
  ],
  rehypePlugins: [
    rehypeSlug,
    [rehypeAutolinkHeadings, { behavior: "wrap" }],
    [rehypeShiki, rehypeShikiOptions],
  ],
};
