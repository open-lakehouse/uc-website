import { useHydrated } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import Shell from "./layout/Shell";
import { Link } from "./lib/router";
import { type ApiSpec, site } from "./site";

// Scalar renders client-side only, and its chunk (JS + CSS) should load only here.
const ApiReference = lazy(() => import("./ApiReference"));

interface Operations {
  server: string | null;
  groups: {
    tag: string;
    operations: { method: string; path: string; summary: string }[];
  }[];
}

const generated = import.meta.glob<Record<string, Operations>>(
  "/src/generated/docs/api-operations.json",
  { eager: true, import: "default" },
);
const operations = generated["/src/generated/docs/api-operations.json"] ?? {};

/**
 * What the prerendered HTML carries in place of the explorer, so crawlers and
 * agents that don't run JS still get the API's title, summary, spec, and every
 * operation. Scalar shows all of it once it mounts, so it isn't kept on screen
 * alongside.
 */
function Placeholder({ api }: { api: ApiSpec }) {
  const ops = operations[api.slug];
  const server = api.serverUrl ?? ops?.server;
  return (
    <article className="api-placeholder prose">
      <h1>{api.title}</h1>
      <p className="lead">{api.summary}</p>
      <p>
        <a href={api.specUrl}>OpenAPI document</a> (
        <a href={api.sourceUrl}>{api.ref}</a>)
        {server && (
          <>
            . Paths are relative to <code>{server}</code>.
          </>
        )}
      </p>
      {ops?.groups.map((g) => (
        <section key={g.tag}>
          <h2>{g.tag}</h2>
          <ul className="api-operations">
            {g.operations.map((op) => (
              <li key={`${op.method} ${op.path}`}>
                <code>
                  {op.method} {op.path}
                </code>
                : {op.summary}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

export default function ApiPage({ api }: { api: ApiSpec }) {
  // The prerender and the first client render must match, so the explorer
  // mounts only after hydration.
  const mounted = useHydrated();
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset scroll per API.
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [api.route]);

  const placeholder = <Placeholder api={api} />;
  return (
    <Shell sidebar={false}>
      {site.apis.length > 1 && (
        <nav className="api-switch" aria-label="REST APIs">
          {site.apis.map((a) => (
            <Link
              key={a.route}
              to={a.route}
              title={a.hint}
              aria-current={a.slug === api.slug ? "page" : undefined}
            >
              {a.slug}
            </Link>
          ))}
        </nav>
      )}
      <div className="api-reference">
        {mounted ? (
          <Suspense fallback={placeholder}>
            <ApiReference key={api.specUrl} api={api} />
          </Suspense>
        ) : (
          placeholder
        )}
      </div>
    </Shell>
  );
}
