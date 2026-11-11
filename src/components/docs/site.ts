// Typed access to what docs-factory's emitter writes into src/generated/docs/
// and src/content/docs/ (routes under /docs/, ending in a slash). The globs
// tolerate a checkout with no emitted docs, so the site still builds.
import type { MDXContent } from "mdx/types";
import { use } from "react";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface PageLink {
  route: string;
  title: string;
}

export interface PageScript {
  /** Served path of the runnable file. */
  url: string;
  file: string;
  kind: "python" | "shell" | "sql";
  summary: string | null;
}

/** The stack a page's scripts need, from envs/environments.yml. */
export interface PageEnvironment {
  title: string;
  /** Served path of the env bundle (.tar.gz). */
  bundle: string;
  /** Download, start, and export lines, as the Prerequisites box shows them. */
  commands: string[];
}

export interface PageMeta {
  route: string;
  /** Path under src/content/, e.g. `how-to/duckdb.md`. */
  file: string;
  title: string;
  summary: string | null;
  diataxis: string;
  /** Nav section labels from the root down to the page's section. */
  section: string[];
  headings: Heading[];
  prev: PageLink | null;
  next: PageLink | null;
  /** The page's Markdown twin (route + `.md`). */
  twin: string;
  environment: PageEnvironment | null;
  scripts: PageScript[];
}

/** A REST API reference: the shell renders `specUrl` in the browser. */
export interface ApiSpec {
  route: string;
  slug: string;
  title: string;
  summary: string;
  /** A few words for the API switcher; `summary` is the full description. */
  hint: string;
  /** The git ref the spec is pinned to, e.g. `v0.6.0`. */
  ref: string;
  specUrl: string;
  sourceUrl: string;
  /** Overrides the spec's own `servers` in the code samples. */
  serverUrl: string | null;
  /** The one API the section opens on. */
  default: boolean;
}

export type NavItem =
  | { kind: "page"; route: string; label: string }
  | { kind: "section"; label: string; items: NavItem[] };

export interface SiteData {
  title: string;
  tagline: string;
  nav: NavItem[];
  pages: PageMeta[];
  apis: ApiSpec[];
  /** The API section's own route; it shows the default API. */
  apiIndex: string | null;
}

const EMPTY: SiteData = {
  title: "",
  tagline: "",
  nav: [],
  pages: [],
  apis: [],
  apiIndex: null,
};

const data = import.meta.glob<SiteData>("/src/generated/docs/site.json", {
  eager: true,
  import: "default",
});
export const site: SiteData = data["/src/generated/docs/site.json"] ?? EMPTY;

/** The docs home: /docs/. */
export const DOCS_HOME = "/docs/";

/** The page a pathname shows, if any. */
export function pageFor(pathname: string): PageMeta | undefined {
  return site.pages.find((p) => p.route === withSlash(pathname));
}

function withSlash(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export const defaultApi: ApiSpec | undefined =
  site.apis.find((a) => a.default) ?? site.apis[0];

/** The API a route shows: its own, or the default for the section route. */
export function apiFor(pathname: string): ApiSpec | undefined {
  const route = withSlash(pathname);
  if (route === site.apiIndex) return defaultApi;
  return site.apis.find((a) => a.route === route);
}

// One chunk per page. The route loader loads it before a client navigation
// renders; while the prerendered page hydrates it hasn't loaded yet, so
// usePageContent suspends and React keeps the server HTML until it has.
export interface PageModule {
  default: MDXContent;
}

const loaders = import.meta.glob<PageModule>("/src/content/docs/**/*.md");

type Tracked<T> = Promise<T> & { status?: string; value?: T };
// A page whose module is missing renders an empty body.
const EMPTY_PAGE: PageModule = { default: () => null };
const modules = new Map<string, Tracked<PageModule>>();

function load(file: string): Promise<PageModule> {
  let module = modules.get(file);
  if (!module) {
    const loader = loaders[`/src/content/docs/${file}`];
    const promise: Tracked<PageModule> = (
      loader ? loader() : Promise.resolve(EMPTY_PAGE)
    ).then((content) => {
      // Lets React's `use` read a loaded module without suspending.
      promise.status = "fulfilled";
      promise.value = content;
      return content;
    });
    module = promise;
    modules.set(file, module);
  }
  return module;
}

/** Load the content module for `route` (if it is a page) before rendering it. */
export async function preloadRoute(route: string): Promise<void> {
  const page = pageFor(route);
  if (page) await load(page.file);
}

/** The page's compiled module. Suspends until it has loaded; render it
 * inside a <Suspense>. */
export function usePageModule(page: PageMeta): PageModule {
  return use(load(page.file));
}
