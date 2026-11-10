// @ts-check
// Redirects from other letter cases of the site's pages, shared by the Vercel
// routing (plugins/vercel-output.ts) and scripts/check-links.mjs. Keep this
// file free of package imports, since the link checker loads it directly.

/**
 * The paths that 301 to each page: its path in any letter case, with or
 * without the trailing slash, other than the page's own URL. Netlify does
 * this for every page it has; Vercel's filesystem is case-sensitive, so
 * config.json lists the pages.
 *
 * @param {Iterable<string>} pages Canonical page paths: lowercase, ending in
 *   a slash, such as `/blogs/`.
 * @returns {Map<string, string>} Each page by its path without the trailing
 *   slash, in lowercase. `/` has no other form, so it's left out.
 */
export function caseRedirects(pages) {
  /** @type {Map<string, string>} */
  const byPath = new Map();
  for (const page of pages) {
    if (!/^\/(?:[^/]+\/)*$/.test(page) || page !== page.toLowerCase()) {
      throw new Error(
        `${page} isn't a canonical page path (lowercase, ending in a slash)`,
      );
    }
    if (page !== "/") byPath.set(page.slice(0, -1), page);
  }
  return byPath;
}
