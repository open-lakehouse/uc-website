import { createIsomorphicFn } from "@tanstack/react-start";

import { fetchGithubStars } from "./github";

export interface BuildInfo {
  /** Star count at build time; the header refreshes it in the browser. */
  githubStars: number | null;
  /** The footer's copyright year. */
  year: number;
}

/**
 * Values fixed when a page is prerendered. The root route loads them, so
 * they're serialized into the page and never fetched from the browser.
 */
export const getBuildInfo = createIsomorphicFn()
  .server(async (): Promise<BuildInfo> => ({
    githubStars: await fetchGithubStars(),
    year: new Date().getFullYear(),
  }))
  .client((): BuildInfo => ({
    githubStars: null,
    year: new Date().getFullYear(),
  }));
