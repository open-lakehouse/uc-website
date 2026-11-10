// Per-page <head> tags, matching src/layouts/Layout.astro. Each route's
// `head` returns pageHead(...); the root route's sets the defaults, and
// TanStack Router keeps the deepest route's title and each meta `name`.
import { defaultImage, site, siteTitle } from "../../site.config.mjs";

export interface PageHeadOptions {
  /** Page title; shown as "<title> | Unity Catalog". */
  title?: string | undefined;
  description?: string | undefined;
  /** og:image path or URL; defaults to /images/default-image.jpg. */
  image?: string | undefined;
}

export function pageHead({ title, description, image }: PageHeadOptions = {}) {
  return {
    meta: [
      { title: title ? `${title} | ${siteTitle}` : siteTitle },
      ...(description ? [{ name: "description", content: description }] : []),
      {
        name: "image",
        property: "og:image",
        content: new URL(image ?? defaultImage, site).href,
      },
    ],
  };
}

/** The canonical URL of a site path. Page URLs end in a slash. */
export function canonicalUrl(pathname: string): string {
  return new URL(pathname.endsWith("/") ? pathname : `${pathname}/`, site).href;
}
