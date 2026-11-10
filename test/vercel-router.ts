// A small model of how Vercel applies Build Output API routes, for the tests.
//
// Vercel's build moves `continue` routes ahead of the others in each phase
// (mergeRoutes in @vercel/routing-utils). In the first phase a `continue`
// route adds its headers and routing goes on; the first other match ends the
// phase, answering with its `status` or handing the path to the filesystem.
// After a filesystem miss, the routes following `handle: "filesystem"` run.
// `src` matches the path without its query string, and a redirect keeps the
// query: Vercel adds it to a Location that has none (confirm on the first
// preview deploy).

export type Route =
  | { handle: string }
  | {
      src: string;
      dest?: string;
      headers?: Record<string, string>;
      status?: number;
      continue?: boolean;
      caseSensitive?: boolean;
    };

type SourceRoute = Exclude<Route, { handle: string }>;

export interface RouterOptions {
  /** Files in .vercel/output/static, such as `blogs/some-post/index.html`. */
  files: ReadonlySet<string>;
  /** `overrides` from config.json. */
  overrides?: Record<string, { contentType?: string }>;
  /** Match every `src` case-insensitively, as if `caseSensitive` were ignored. */
  ignoreCaseSensitive?: boolean;
}

export interface Result {
  /** Set for redirects and status-only routes; files and functions leave it out. */
  status?: number;
  location?: string;
  /** The static file served. */
  file?: string;
  /** The function the request was routed to. */
  dest?: string;
  headers: Record<string, string>;
}

/** Routes a request for `url`: a path, with or without a query string. */
export function route(
  routes: readonly Route[],
  url: string,
  options: RouterOptions,
): Result {
  const [main = [], ...phases] = splitPhases(routes);
  const headers: Record<string, string> = {};
  const queryAt = url.indexOf("?");
  const path = queryAt === -1 ? url : url.slice(0, queryAt);
  const search = queryAt === -1 ? "" : url.slice(queryAt);

  for (const r of main) {
    const match = matches(r, path, options);
    if (!match) continue;
    addHeaders(headers, r, match);
    if (r.continue) continue;
    if (r.status) return result(r.status, headers, search);
    break;
  }

  const file = lookup(path, options.files);
  if (file) {
    const contentType = options.overrides?.[file]?.contentType;
    if (contentType) headers["content-type"] = contentType;
    return { file, headers };
  }

  for (const r of phases.flat()) {
    const match = matches(r, path, options);
    if (!match) continue;
    addHeaders(headers, r, match);
    if (r.continue) continue;
    if (r.dest) return { dest: substitute(r.dest, match), headers };
    if (r.status) return result(r.status, headers, search);
  }
  return { status: 404, headers };
}

function splitPhases(routes: readonly Route[]): SourceRoute[][] {
  const phases: SourceRoute[][] = [[]];
  for (const r of routes) {
    if ("handle" in r) phases.push([]);
    else phases.at(-1)!.push(r);
  }
  return phases.map((phase) => [
    ...phase.filter((r) => r.continue),
    ...phase.filter((r) => !r.continue),
  ]);
}

function matches(r: SourceRoute, path: string, options: RouterOptions) {
  const flags = r.caseSensitive && !options.ignoreCaseSensitive ? "" : "i";
  return new RegExp(r.src, flags).exec(path);
}

function addHeaders(
  headers: Record<string, string>,
  r: SourceRoute,
  match: RegExpExecArray,
) {
  for (const [key, value] of Object.entries(r.headers ?? {})) {
    headers[key.toLowerCase()] = substitute(value, match);
  }
}

// `$1` and `$name` refer to the match's groups, as in Vercel's routes.
function substitute(value: string, match: RegExpExecArray): string {
  return value.replace(
    /\$(\d+|[A-Za-z_]\w*)/g,
    (_, ref: string) =>
      (/^\d/.test(ref) ? match[+ref] : match.groups?.[ref]) ?? "",
  );
}

function result(
  status: number,
  headers: Record<string, string>,
  search: string,
): Result {
  const { location, ...rest } = headers;
  if (location === undefined) return { status, headers: rest };
  const keepQuery = search.length > 1 && !location.includes("?");
  return {
    status,
    location: keepQuery ? `${location}${search}` : location,
    headers: rest,
  };
}

// A path names a file, or a directory with an index.html.
function lookup(path: string, files: ReadonlySet<string>): string | undefined {
  const name = path.replace(/^\//, "");
  return [
    name,
    `${name}${name && !name.endsWith("/") ? "/" : ""}index.html`,
  ].find((candidate) => files.has(candidate));
}
