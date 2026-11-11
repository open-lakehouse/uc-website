import { describe, expect, test } from "bun:test";

import { site } from "../site.config.mjs";
import { renderRobotsTxt } from "../src/lib/robots";

import { posts } from "../src/content/posts";
import { sitemap, sitemapIndex } from "../src/content/sitemap";
import { discoveryFiles } from "../src/lib/discovery-files";
import { staticPages } from "../src/lib/pages";
import { renderSitemap } from "../src/lib/sitemap";

const locs = (xml: string) =>
  [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

describe("renderSitemap", () => {
  test("writes @astrojs/sitemap's envelope on one line", () => {
    expect(renderSitemap(["https://example.com/"])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://example.com/</loc></url></urlset>',
    );
  });

  test("dedupes and sorts like @astrojs/sitemap: by locale, numbers by value", () => {
    const xml = renderSitemap([
      "https://example.com/post-10/",
      "https://example.com/Post-9/",
      "https://example.com/post-9/",
      "https://example.com/",
      "https://example.com/post-9/",
    ]);
    expect(locs(xml)).toEqual([
      "https://example.com/",
      "https://example.com/post-9/",
      "https://example.com/Post-9/",
      "https://example.com/post-10/",
    ]);
  });

  test("escapes &, <, and >", () => {
    expect(locs(renderSitemap(["https://example.com/?a=1&b=<2>"]))).toEqual([
      "https://example.com/?a=1&amp;b=&lt;2&gt;",
    ]);
  });
});

describe("sitemap pages", () => {
  // routeTree.gen.ts lists every route, so a new page route fails this test
  // until it is added to staticPages (or to the pages left out below).
  test("are every page route, with the canonical trailing slash", async () => {
    const tree = await Bun.file(
      new URL("../src/routeTree.gen.ts", import.meta.url),
    ).text();
    const byFullPath =
      tree.match(/export interface FileRoutesByFullPath \{([^}]*)\}/)?.[1] ??
      "";
    const fullPaths = [...byFullPath.matchAll(/'([^']+)':/g)].map(
      (match) => match[1]!,
    );
    // Posts are listed from the collection. @astrojs/sitemap leaves out
    // status pages. The docs list in docs-factory's own /docs/sitemap.xml.
    const notPages = new Set([
      "/blogs/$id",
      "/404",
      "/500",
      "/docs/",
      "/docs/$",
    ]);
    const pages = fullPaths
      .filter((route) => !notPages.has(route) && !(route in discoveryFiles))
      .map((route) => (route.endsWith("/") ? route : `${route}/`));
    expect(pages.sort()).toEqual([...staticPages].sort());
  });
});

describe("discovery files", () => {
  const url = (path: string) => new URL(path, site).href;

  test("/robots.txt allows every crawler and names the sitemap", () => {
    const robots = renderRobotsTxt(new URL(site));
    expect(robots).toStartWith("User-agent: *\nAllow: /\n");
    expect(robots).toContain(`Sitemap: ${url("/sitemap-index.xml")}\n`);
  });

  test("/sitemap-index.xml lists /sitemap-0.xml", () => {
    expect(locs(sitemapIndex())).toEqual([url("/sitemap-0.xml")]);
  });

  test("/sitemap-0.xml lists every page and post once", () => {
    const expected = [
      ...staticPages,
      ...posts.map(({ id }) => `/blogs/${id}/`),
    ];
    expect(locs(sitemap()).sort()).toEqual(expected.map(url).sort());
  });
});
