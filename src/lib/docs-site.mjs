// @ts-check
// The docs docs-factory emits into src/generated/docs/: their routes, each
// page's heading ids, and their legacy redirects. vite.config.ts prerenders
// and redirects from this, and scripts/check-links.mjs checks links against
// it, so the two agree.
import { existsSync, readFileSync } from "node:fs";

/**
 * @typedef {object} DocsSite
 * @property {string[]} pages Every docs route, with its trailing slash:
 *   `/docs/`, each page, each REST API page, and the API index.
 * @property {Map<string, Set<string>>} headings Each page's route to the ids
 *   of its headings.
 * @property {Map<string, string>} files Each page's Markdown file, relative
 *   to src/content/docs/, to its route.
 * @property {Record<string, string>} redirects Legacy docs.unitycatalog.io
 *   paths, under /docs/, to their pages.
 * @property {{ source: string; destination: string }[]} patterns Whole legacy
 *   sections: a regex source to one destination.
 */

/**
 * Reads the emitted docs, or none if docs-factory hasn't emitted them.
 * @param {URL} dir src/generated/docs/, with its trailing slash.
 * @returns {DocsSite}
 */
export function readDocsSite(dir) {
  /** @type {DocsSite} */
  const docs = {
    pages: [],
    headings: new Map(),
    files: new Map(),
    redirects: {},
    patterns: [],
  };
  const siteFile = new URL("site.json", dir);
  if (existsSync(siteFile)) {
    /** @type {{
     *   pages: { route: string; file: string; headings?: { id: string }[] }[];
     *   apis: { route: string }[];
     *   apiIndex: string | null;
     * }} */
    const site = JSON.parse(readFileSync(siteFile, "utf8"));
    docs.pages.push(
      "/docs/",
      ...site.pages.map((p) => p.route),
      ...site.apis.map((a) => a.route),
      ...(site.apiIndex ? [site.apiIndex] : []),
    );
    for (const page of site.pages) {
      docs.headings.set(
        page.route,
        new Set((page.headings ?? []).map((h) => h.id)),
      );
      docs.files.set(page.file, page.route);
    }
  }
  const redirectsFile = new URL("redirects.json", dir);
  if (existsSync(redirectsFile)) {
    const { redirects, patterns } = JSON.parse(
      readFileSync(redirectsFile, "utf8"),
    );
    docs.redirects = redirects;
    docs.patterns = patterns;
  }
  return docs;
}
