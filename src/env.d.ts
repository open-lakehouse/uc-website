/// <reference types="mdx" />

// Served by plugins/expressive-code.ts.
declare module "virtual:expressive-code.css";
declare module "virtual:expressive-code.js";

// @pagefind/default-ui ships no types; these cover what Search.tsx uses.
declare module "@pagefind/default-ui" {
  export interface PagefindResult {
    url: string;
  }

  export interface PagefindUIOptions {
    element: string | HTMLElement;
    baseUrl?: string;
    bundlePath?: string;
    showImages?: boolean;
    /** A null result is shown unchanged. */
    processResult?: (result: PagefindResult) => PagefindResult | null;
  }

  export class PagefindUI {
    constructor(options: PagefindUIOptions);
    destroy(): void;
  }
}
