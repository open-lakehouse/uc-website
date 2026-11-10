import { fileURLToPath } from "node:url";

import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { imagetools } from "vite-imagetools";

import { redirects } from "./site.config.mjs";
import { caseRedirects } from "./src/lib/case-redirects.mjs";
import { assetFileNames } from "./plugins/asset-file-names.ts";
import { contentCollections } from "./plugins/content-collections.ts";
import { expressiveCodeAssets } from "./plugins/expressive-code.ts";
import { mdxOptions } from "./plugins/mdx.ts";
import { notFoundPage } from "./plugins/not-found-page.ts";
import { listPostFiles } from "./plugins/post-files.ts";
import { prerenderErrors } from "./plugins/prerender-errors.ts";
import { vercelOutputConfig } from "./plugins/vercel-output.ts";
import { discoveryFiles } from "./src/lib/discovery-files.ts";
import { pagePaths } from "./src/lib/pages.ts";

// Post chunks are named after their folder, and some folder names have spaces.
const sanitizeFileName = (name: string) => name.replace(/[^\w.-]+/g, "-");

const postIds = listPostFiles().map(({ id }) => id);
const pages = pagePaths(postIds);
const pageRedirects = caseRedirects(pages);
const redirectSources = new Set(
  Object.keys(redirects).flatMap((from) => [from, `${from}/`]),
);

// Pages the crawler should skip:
// - links with a query or hash, which would overwrite the page's own HTML;
// - redirect sources, which Vercel answers with a 301 (vercel-output.ts).
// Any other unknown path fails the build as a dead link. A page's URL in
// another letter case fails here instead: the prerenderer requests links
// from a preview server that serves the files written so far, so on a
// case-insensitive filesystem (macOS) it would answer with the page.
function isCrawlable(path: string): boolean {
  if (/[?#]/.test(path)) return false;
  const page = pageRedirects.get(path.replace(/\/$/, "").toLowerCase());
  if (page !== undefined && path.replace(/\/?$/, "/") !== page) {
    throw new Error(
      `A link to ${path} names ${page} in another letter case. Link ${page}.`,
    );
  }
  return !redirectSources.has(path);
}

export default defineConfig({
  css: {
    modules: {
      // `.post-header` in a module is `styles.postHeader` in TSX, and keeps
      // its name in the built class (`post-header_x1y2z`).
      localsConvention: "camelCaseOnly",
      generateScopedName: "[local]_[hash:base64:5]",
    },
  },
  build: {
    rolldownOptions: {
      output: {
        sanitizeFileName,
        assetFileNames: assetFileNames({
          root: fileURLToPath(new URL(".", import.meta.url)),
          contentDir: fileURLToPath(new URL("./src/content", import.meta.url)),
          sanitize: sanitizeFileName,
        }),
      },
    },
  },
  plugins: [
    contentCollections(),
    { enforce: "pre", ...mdx(mdxOptions) },
    expressiveCodeAssets(),
    notFoundPage(),
    tailwindcss(),
    imagetools(),
    tanstackStart({
      // Every post is listed, so posts build even if no page links to them.
      // Listing pages replaces the default start page, so "/" is listed too.
      // The crawler doesn't find server routes, and names a non-HTML file
      // after its page path, so the discovery files have no trailing slash.
      pages: [
        { path: "/" },
        ...postIds.map((id) => ({ path: `/blogs/${id}/` })),
        ...Object.keys(discoveryFiles).map((path) => ({ path })),
      ],
      prerender: {
        enabled: true,
        crawlLinks: true,
        filter: ({ path }) => isCrawlable(path),
      },
    }),
    prerenderErrors(),
    nitro({
      // Only the Vercel preset reads this.
      vercel: {
        config: {
          version: 3,
          ...vercelOutputConfig({
            redirects,
            pages,
            noindex: process.env.NOINDEX === "1",
          }),
        },
      },
    }),
    viteReact(),
  ],
});
