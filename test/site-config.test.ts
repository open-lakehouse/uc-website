import { describe, expect, test } from "bun:test";

import { redirects, site } from "../site.config.mjs";

import { listPostFiles } from "../plugins/post-files";
import { pagePaths } from "../src/lib/pages";

const entries = Object.entries(redirects);

describe("site.config.mjs", () => {
  test("site is the https origin with a trailing slash", () => {
    expect(new URL(site).href).toBe(site);
    expect(site).toMatch(/^https:\/\/[^/]+\/$/);
  });

  describe("redirects", () => {
    test("are site paths without a trailing slash", () => {
      expect(entries.length).toBeGreaterThan(0);
      for (const [from, to] of entries) {
        expect(from).toMatch(/^\/[^\s?#]*[^/\s]$/);
        expect(to).toMatch(/^\/[^\s?#]*[^/\s]$/);
      }
    });

    test("are lowercase", () => {
      for (const [from, to] of entries) {
        expect(from).toBe(from.toLowerCase());
        expect(to).toBe(to.toLowerCase());
      }
    });

    test("never point at another redirect", () => {
      for (const [, to] of entries) expect(redirects).not.toHaveProperty(to);
    });

    test("send old post URLs to posts that exist", () => {
      const ids = new Set(listPostFiles().map(({ id }) => id));
      for (const [from, to] of entries) {
        const id = to.match(/^\/blogs\/([^/]+)$/)?.[1];
        if (id) expect(ids.has(id), `${from} -> ${to}`).toBe(true);
      }
    });

    // Vercel matches redirect sources case-insensitively, as Netlify does.
    // Astro also writes a refresh page at each source, which would share a
    // folder with the page on a case-insensitive filesystem such as macOS's.
    test("never shadow a page in any letter case", () => {
      const pages = new Set(
        pagePaths(listPostFiles().map(({ id }) => id)).map((page) =>
          page.replace(/\/$/, "").toLowerCase(),
        ),
      );
      for (const [from] of entries) {
        expect(pages.has(from.toLowerCase()), from).toBe(false);
      }
    });
  });
});
