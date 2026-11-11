// /sitemap-index.xml and /sitemap-0.xml from web's pages and posts. They list
// what @astrojs/sitemap lists for the Astro build: every page except the 404
// page, and no redirect sources (Astro leaves out its redirect pages, and
// here Vercel answers those paths before any page).
import { site } from "../../site.config.mjs";

import { pagePaths } from "../lib/pages";
import { renderSitemap, renderSitemapIndex } from "../lib/sitemap";
import { posts } from "./posts";

export function sitemapIndex(): string {
  return renderSitemapIndex([
    new URL("/sitemap-0.xml", site).href,
    // The docs' own, with their pages' lastmod dates (docs-factory emits it).
    new URL("/docs/sitemap.xml", site).href,
  ]);
}

export function sitemap(): string {
  const paths = pagePaths(posts.map(({ id }) => id));
  return renderSitemap(paths.map((path) => new URL(path, site).href));
}
