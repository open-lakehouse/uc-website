import { createFileRoute, notFound } from "@tanstack/react-router";

import ApiPage from "../../components/docs/ApiPage";
import DocPage from "../../components/docs/DocPage";
import { docHead, docRouteHead } from "../../components/docs/heads";
import { apiFor, pageFor, preloadRoute } from "../../components/docs/site";

// Every docs page and API reference is one splat: the emitted site.json, not
// the route tree, knows which paths exist.
export const Route = createFileRoute("/docs/$")({
  loader: async ({ location }) => {
    const api = apiFor(location.pathname);
    if (api) {
      const route = location.pathname.endsWith("/")
        ? location.pathname
        : `${location.pathname}/`;
      return { route, api: api.slug, head: await docHead(route) };
    }
    const page = pageFor(location.pathname);
    if (!page) throw notFound();
    // The page's content module, so the prerender renders its body and a
    // client navigation doesn't flash an empty article.
    await preloadRoute(page.route);
    return { route: page.route, api: null, head: await docHead(page.route) };
  },
  head: ({ loaderData }) =>
    docRouteHead(
      loaderData
        ? (apiFor(loaderData.route)?.title ?? pageFor(loaderData.route)?.title)
        : undefined,
      loaderData?.head ?? null,
    ),
  component: DocRoute,
});

function DocRoute() {
  const { route } = Route.useLoaderData();
  const api = apiFor(route);
  if (api) return <ApiPage api={api} />;
  const page = pageFor(route);
  return page ? <DocPage page={page} /> : null;
}
