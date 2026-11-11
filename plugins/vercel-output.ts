// Vercel routing for the site, written into .vercel/output/config.json through
// Nitro's `vercel.config`. Nitro puts these routes ahead of its own: immutable
// caching for Vite's /assets/*, the filesystem, then the server function that
// renders the 404 page. Vercel also merges routing set in vercel.ts into
// config.json, so vercel.ts sets none.
import { caseRedirects } from "../src/lib/case-redirects.mjs";
import { discoveryFiles } from "../src/lib/discovery-files.ts";

/** A Build Output API route: vercel.com/docs/build-output-api/configuration#routes */
export interface VercelRoute {
  src: string;
  headers?: Record<string, string>;
  status?: number;
  continue?: boolean;
  caseSensitive?: boolean;
}

export interface VercelOutputConfig {
  routes: VercelRoute[];
  overrides: Record<string, { contentType: string }>;
}

/** The headers public/_headers gives every path on Netlify. */
export const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/** Keeps a staging deployment out of search results (NOINDEX=1). */
export const noindexHeaders: Record<string, string> = {
  "X-Robots-Tag": "noindex",
};

export function vercelOutputConfig({
  redirects,
  patterns = [],
  pages,
  noindex = false,
}: {
  /** Source path to destination path, as in site.config.mjs. */
  redirects: Record<string, string>;
  /** 301s whose source is a regex, such as a legacy docs section. */
  patterns?: ReadonlyArray<{ source: string; destination: string }>;
  /** Every page's canonical path (src/lib/pages.ts). */
  pages: readonly string[];
  /**
   * Adds `X-Robots-Tag: noindex` to every response, for a staging copy of
   * the production site. Pages, robots.txt, and canonical tags are unchanged.
   */
  noindex?: boolean;
}): VercelOutputConfig {
  const pageRedirects = caseRedirects(pages);
  for (const from of Object.keys(redirects)) {
    if (pageRedirects.has(from.toLowerCase())) {
      throw new Error(`${from} is a redirect source and a page`);
    }
  }
  return {
    routes: [
      {
        src: "^/.*$",
        headers: noindex
          ? { ...securityHeaders, ...noindexHeaders }
          : securityHeaders,
        continue: true,
      },
      // Vercel matches `src` case-insensitively unless `caseSensitive` is set.
      // Routing stops here for each page's own URL, which then reaches the
      // page's file instead of the redirects below. If the flag were ignored,
      // the URL in any letter case would stop here: other cases would miss
      // the filesystem and reach the server function, and nothing would loop.
      ...[...pageRedirects.values()].map((page): VercelRoute => ({
        src: `^${escapeRegExp(page)}$`,
        caseSensitive: true,
      })),
      ...Object.entries(redirects).map(([from, to]) => redirect(from, to)),
      ...patterns.map(({ source, destination }): VercelRoute => ({
        src: source,
        headers: { Location: destination },
        status: 301,
      })),
      // Any other letter case or slash form of a page, in one 301, as Netlify
      // does.
      ...[...pageRedirects].map(([from, page]) => redirect(from, page)),
      // `trailingSlash: true` for page paths, as @vercel/routing-utils writes
      // it, with Netlify's 301 instead of Vercel's 308. Its other rule, which
      // drops the slash from file paths such as /llms.txt/, is left out: the
      // server function's router adds a slash to every path, so the two would
      // bounce a missing /x.png back and forth.
      { src: "^/\\.well-known(?:/.*)?$" },
      {
        src: "^/((?:[^/]+/)*[^/.]+)$",
        headers: { Location: "/$1/" },
        status: 301,
      },
    ],
    overrides: Object.fromEntries(
      Object.entries(discoveryFiles).map(([path, contentType]) => [
        path.slice(1),
        { contentType },
      ]),
    ),
  };
}

// Either slash form of `from` goes straight to the canonical URL of `to`:
// with a trailing slash unless its last segment has a dot, like /llms.txt.
// A `#heading` stays after the path's slash.
function redirect(from: string, to: string): VercelRoute {
  const [path = "", hash] = to.split("#");
  const canonical = /\/[^/.]+$/.test(path) ? `${path}/` : path;
  return {
    src: `^${escapeRegExp(from)}/?$`,
    headers: { Location: hash ? `${canonical}#${hash}` : canonical },
    status: 301,
  };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
