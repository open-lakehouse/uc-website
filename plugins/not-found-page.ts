// Prerenders the not-found page to 404.html at the root of the static output
// (.output/public, or .vercel/output/static with the Vercel preset), which
// is the file static hosts serve for unknown paths.
//
// TanStack Start's prerenderer fails on any non-2xx response, and Nitro's
// skips writing them, so this asks Nitro's prerenderer for a path no route
// matches and keeps its 404 response. The path ends in a slash: the router
// redirects any other path to the slashed form.
import type { Plugin } from "vite";

const ROUTE = "/404/";

export function notFoundPage(): Plugin {
  return {
    name: "uc:not-found-page",
    nitro: {
      name: "uc:not-found-page",
      setup(nitro) {
        (nitro.options.prerender.routes ??= []).push(ROUTE);
        nitro.hooks.hook("prerender:generate", (route) => {
          if (route.route !== ROUTE) return;
          if (route.error?.status === 404) delete route.error;
          route.fileName = "/404.html";
        });
      },
    },
  };
}
