import { describe, expect, test } from "bun:test";

import { redirects } from "../site.config.mjs";
import { caseRedirects } from "../src/lib/case-redirects.mjs";

import { listPostFiles } from "../plugins/post-files";
import {
  noindexHeaders,
  securityHeaders,
  vercelOutputConfig,
} from "../plugins/vercel-output";
import { discoveryFiles } from "../src/lib/discovery-files";
import { pagePaths } from "../src/lib/pages";
import { config as vercelTs } from "../vercel";
import {
  route,
  type Result,
  type Route,
  type RouterOptions,
} from "./vercel-router";

const postIds = listPostFiles().map(({ id }) => id);
const pages = pagePaths(postIds);
const { routes, overrides } = vercelOutputConfig({ redirects, pages });

// Nitro's routes after ours end with the filesystem and the server function.
const output: Route[] = [
  ...routes,
  { handle: "filesystem" },
  { src: "^/(.*)$", dest: "/__server" },
];
const fileOf = (page: string) => `${page.slice(1)}index.html`;
const files = new Set([
  ...pages.map(fileOf),
  ...Object.keys(discoveryFiles).map((path) => path.slice(1)),
  "assets/main-a1b2c3.js",
]);

// Vercel matches `src` case-insensitively unless a route sets
// `caseSensitive`. Each routing test runs as if the flag were honored and as
// if it were ignored.
const modes = [
  { name: "with caseSensitive", ignoreCaseSensitive: false },
  { name: "ignoring caseSensitive", ignoreCaseSensitive: true },
];

/** A page's URL in other letter cases and without its trailing slash. */
function variants(page: string): string[] {
  const upper = page.toUpperCase();
  const title = page.replace(
    /(^|[/-])([a-z])/g,
    (_, sep: string, letter: string) => `${sep}${letter.toUpperCase()}`,
  );
  return [page.slice(0, -1), upper, upper.slice(0, -1), title];
}

/** Each response for `path`, following redirects. */
function follow(path: string, options: RouterOptions): Result[] {
  const hops = [route(output, path, options)];
  while (hops.at(-1)!.location !== undefined && hops.length < 5) {
    hops.push(route(output, hops.at(-1)!.location!, options));
  }
  return hops;
}

describe("caseRedirects", () => {
  test("keys each page by its path without the slash, leaving out /", () => {
    expect(caseRedirects(["/", "/blogs/", "/blogs/a-post/"])).toEqual(
      new Map([
        ["/blogs", "/blogs/"],
        ["/blogs/a-post", "/blogs/a-post/"],
      ]),
    );
  });

  test("rejects page paths that aren't lowercase or lack the slash", () => {
    for (const page of ["/blogs/unity-catalog-for-AI/", "/blogs", "blogs/"]) {
      expect(() => caseRedirects([page]), page).toThrow(
        "isn't a canonical page path",
      );
    }
  });
});

describe("vercelOutputConfig", () => {
  test("sets the Netlify site's security headers on every response, first", () => {
    // The `/*` block of the Astro site's public/_headers.
    expect(securityHeaders).toEqual({
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    expect(routes[0]).toEqual({
      src: "^/.*$",
      headers: securityHeaders,
      continue: true,
    });
    for (const { ignoreCaseSensitive } of modes) {
      for (const path of [
        "/",
        "/blog",
        "/BLOGS/",
        "/nope/",
        "/assets/main-a1b2c3.js",
      ]) {
        expect(
          route(output, path, { files, ignoreCaseSensitive }).headers,
        ).toMatchObject({
          "x-frame-options": "DENY",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
        });
      }
    }
  });

  test("adds X-Robots-Tag: noindex to every response only when asked", () => {
    expect(routes[0]!.headers).not.toHaveProperty("X-Robots-Tag");
    const staging = vercelOutputConfig({ redirects, pages, noindex: true });
    expect(staging.routes[0]).toEqual({
      src: "^/.*$",
      headers: { ...securityHeaders, ...noindexHeaders },
      continue: true,
    });
    expect(staging.routes.slice(1)).toEqual(routes.slice(1));
  });

  for (const { name, ignoreCaseSensitive } of modes) {
    const options = { files, ignoreCaseSensitive };

    test(`answers each site.config.mjs redirect with one 301, ${name}`, () => {
      for (const [from, to] of Object.entries(redirects)) {
        for (const path of [from, `${from}/`, from.toUpperCase()]) {
          expect(route(output, path, options), path).toMatchObject({
            status: 301,
            location: `${to}/`,
          });
        }
        expect(route(output, `${to}/`, options).file).toBeString();
      }
    });

    test(`serves every page at its lowercase URL, ${name}`, () => {
      expect(pages.length).toBe(postIds.length + 3);
      for (const page of pages) {
        expect(route(output, page, options), page).toEqual({
          file: fileOf(page),
          headers: expect.any(Object),
        });
      }
    });

    test(`answers a page path without its trailing slash with one 301, ${name}`, () => {
      for (const page of pages.filter((page) => page !== "/")) {
        expect(route(output, page.slice(0, -1), options)).toMatchObject({
          status: 301,
          location: page,
        });
      }
      expect(route(output, "/nope", options)).toMatchObject({
        status: 301,
        location: "/nope/",
      });
    });

    test(`never loops on a page in another letter case, ${name}`, () => {
      for (const page of pages.filter((page) => page !== "/")) {
        for (const path of variants(page)) {
          const hops = follow(path, options);
          expect(hops.length, path).toBeLessThanOrEqual(2);
          const last = hops.at(-1)!;
          if (ignoreCaseSensitive && last.dest) continue;
          expect(last.file, path).toBe(fileOf(page));
        }
      }
    });

    // The function's router redirects /x.png to /x.png/ and renders the 404
    // page there; a rule sending /x.png/ back to /x.png would loop.
    test(`leaves file paths to the server function, ${name}`, () => {
      for (const path of ["/missing.png", "/missing.png/", "/llms.txt/"]) {
        expect(route(output, path, options), path).toEqual({
          dest: "/__server",
          headers: expect.any(Object),
        });
      }
    });

    test(`serves files and assets without redirecting, ${name}`, () => {
      expect(route(output, "/assets/main-a1b2c3.js", options).file).toBe(
        "assets/main-a1b2c3.js",
      );
      for (const path of Object.keys(discoveryFiles)) {
        expect(route(output, path, options).file).toBe(path.slice(1));
      }
      expect(route(output, "/.well-known/traffic-advice", options).dest).toBe(
        "/__server",
      );
      expect(route(output, "/nope/", options).dest).toBe("/__server");
    });

    test(`keeps the query string on redirects, ${name}`, () => {
      for (const [path, location] of [
        ["/blog?topic=releases", "/blogs/?topic=releases"],
        ["/Blogs?topic=ai", "/blogs/?topic=ai"],
        ["/events?ref=x", "/events/?ref=x"],
      ] as const) {
        expect(route(output, path, options), path).toMatchObject({
          status: 301,
          location,
        });
      }
    });

    test(`leaves unknown paths in other letter cases to the server function, ${name}`, () => {
      expect(route(output, "/BLOGS/MISSING-POST/", options).dest).toBe(
        "/__server",
      );
      expect(route(output, "/Blogs/Missing-Post", options)).toMatchObject({
        status: 301,
        location: "/Blogs/Missing-Post/",
      });
    });
  }

  test("sends any other letter case or slash form of a page to it in one 301 when caseSensitive is honored", () => {
    const options = { files, ignoreCaseSensitive: false };
    for (const page of pages.filter((page) => page !== "/")) {
      for (const path of [...variants(page), `${page.toUpperCase()}?x=1`]) {
        const query = path.match(/\?.*$/)?.[0] ?? "";
        expect(route(output, path, options), path).toMatchObject({
          status: 301,
          location: `${page}${query}`,
        });
      }
    }
    // URLs the sitemap named before post ids were lowercase.
    for (const path of [
      "/blogs/unity-catalog-for-AI/",
      "/blogs/what-is-a-data-catalog-and-why-do-I-need-one",
    ]) {
      expect(route(output, path, options), path).toMatchObject({
        status: 301,
        location: path.replace(/\/?$/, "/").toLowerCase(),
      });
    }
  });

  test("lets other letter cases of a page's slash form reach the server function when caseSensitive is ignored", () => {
    const options = { files, ignoreCaseSensitive: true };
    expect(route(output, "/BLOGS/", options).dest).toBe("/__server");
    expect(route(output, "/blogs/", options).file).toBe("blogs/index.html");
  });

  test("rejects a redirect source that is a page in any letter case", () => {
    expect(() =>
      vercelOutputConfig({
        redirects: { "/Blogs/Some-Post": "/blogs" },
        pages: ["/blogs/some-post/"],
      }),
    ).toThrow("/Blogs/Some-Post is a redirect source and a page");
  });

  test("rejects a page path that isn't lowercase", () => {
    expect(() =>
      vercelOutputConfig({
        redirects: {},
        pages: ["/blogs/unity-catalog-for-AI/"],
      }),
    ).toThrow("isn't a canonical page path");
  });

  test("redirects a file path to the file, without a trailing slash", () => {
    const { routes } = vercelOutputConfig({
      redirects: { "/sitemap.xml": "/sitemap-index.xml" },
      pages: [],
    });
    expect(route(routes, "/sitemap.xml/", { files: new Set() })).toMatchObject({
      status: 301,
      location: "/sitemap-index.xml",
    });
  });

  test("leaves a Location's own query string alone", () => {
    const routes: Route[] = [
      { src: "^/a$", headers: { Location: "/b?c=1" }, status: 301 },
    ];
    expect(route(routes, "/a?d=2", { files: new Set() }).location).toBe(
      "/b?c=1",
    );
  });

  test("serves the discovery files with Netlify's Content-Type", () => {
    expect(overrides).toEqual({
      "llms.txt": { contentType: "text/plain; charset=utf-8" },
      "llms-full.txt": { contentType: "text/plain; charset=utf-8" },
      "robots.txt": { contentType: "text/plain; charset=utf-8" },
      "sitemap-index.xml": { contentType: "application/xml" },
      "sitemap-0.xml": { contentType: "application/xml" },
      "search-index.json": { contentType: "application/json; charset=utf-8" },
    });
    expect(
      route(output, "/llms.txt", { files, overrides }).headers["content-type"],
    ).toBe("text/plain; charset=utf-8");
  });
});

describe("vercel.ts", () => {
  test("leaves routing to config.json, so none applies twice", () => {
    for (const key of [
      "cleanUrls",
      "headers",
      "redirects",
      "rewrites",
      "routes",
      "trailingSlash",
    ]) {
      expect(vercelTs).not.toHaveProperty(key);
    }
  });
});
