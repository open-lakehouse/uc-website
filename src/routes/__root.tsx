import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { useEffect, type ReactNode } from "react";

import { Favicons } from "../components/Favicons";
import { Footer } from "../components/pages/Footer";
import { Header } from "../components/pages/Header";
import { NotFound } from "../components/pages/NotFound";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { getBuildInfo } from "../lib/build-info";
import { canonicalUrl, pageHead } from "../lib/seo";
import appCss from "../styles/app.css?url";

export const Route = createRootRoute({
  loader: () => getBuildInfo(),
  // Loaded once, at prerender time; client-side navigation reuses it.
  staleTime: Infinity,
  shouldReload: false,
  head: ({ matches }) => {
    // Every unknown path is served the one prerendered 404.html, so its head
    // can't depend on the path.
    const notFound = matches.some((match) => match._notFound);
    const { meta } = pageHead(notFound ? { title: "Not Found" } : {});
    const pathname = notFound ? "/404" : (matches.at(-1)?.pathname ?? "/");
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        ...meta,
      ],
      links: [
        { rel: "canonical", href: canonicalUrl(pathname) },
        { rel: "stylesheet", href: appCss },
      ],
    };
  },
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <link rel="sitemap" href="/sitemap-index.xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <Favicons />
        <script
          defer
          data-domain="unitycatalog.io"
          src="https://plausible.io/js/script.js"
        ></script>
      </head>
      <body className="bg-neutral-950 text-neutral-0">
        {children}
        {/* Vercel Web Analytics: injects /_vercel/insights/script.js in the
            browser and tracks client-side navigation. Renders nothing. */}
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const { githubStars, year } = Route.useLoaderData();
  useRevealOnScroll();
  useEffect(() => {
    // Code block copy buttons, for this page and any page navigated to.
    void import("virtual:expressive-code.js");
  }, []);
  return (
    <main>
      <Header githubStars={githubStars} />
      <Outlet />
      <Footer year={year} />
    </main>
  );
}
