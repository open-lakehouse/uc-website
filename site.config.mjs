// @ts-check
// Site settings shared by the app, vite.config.ts, and
// scripts/check-links.mjs.

/**
 * @typedef {object} MenuItem
 * @property {string} label
 * @property {string} href
 */

/**
 * @typedef {MenuItem & {
 *   color: "primary" | "secondary" | "white" | "outline" | "ghost";
 * }} CtaItem
 */

/**
 * @typedef {object} Menus
 * @property {MenuItem[]} header Header menu.
 * @property {CtaItem[]} headerCtas Header call-to-action buttons.
 * @property {MenuItem[]} footer Footer menu.
 */

/** Canonical origin. Page URLs end in a slash. */
export const site = "https://unitycatalog.io/";

export const siteTitle = "Unity Catalog";

/** Shown on pages that don't set their own `image`. */
export const defaultImage = "/images/default-image.jpg";

/**
 * Permanent (301) redirects, source path to destination path, both in
 * lowercase: sources match in any letter case, and page URLs are lowercase.
 * @type {Record<string, string>}
 */
export const redirects = {
  "/blog": "/blogs",
  // Webflow-era post URLs that other sites still link to.
  "/blogs/unity-catalog-oss": "/blogs/2024-unity-catalog-101",
  "/blogs/data-catalog": "/blogs/what-is-a-data-catalog-and-why-do-i-need-one",
  "/blogs/machine-learning-data-catalog":
    "/blogs/building-an-ml-and-ai-data-catalog-with-unity-catalog",
  "/blogs/unity-catalog-managed-vs-external-tables":
    "/blogs/managed-vs-external-tables",
};

/** @type {Menus} */
export const menus = {
  header: [
    { label: "Features", href: "/#features" },
    { label: "Ecosystem", href: "/#partner-ecosystem" },
    { label: "Docs", href: "https://go.unitycatalog.io/docs" },
    {
      label: "API",
      href: "https://docs.unitycatalog.io/reference/api/catalog",
    },
    { label: "Blog", href: "/blogs" },
    { label: "Events", href: "/events" },
  ],
  headerCtas: [
    {
      label: "GitHub",
      href: "https://github.com/unitycatalog/unitycatalog",
      color: "outline",
    },
    {
      label: "Slack",
      href: "https://go.unitycatalog.io/slack",
      color: "outline",
    },
    {
      label: "Luma",
      href: "https://luma.com/openlakehouseai?tag=unity+catalog",
      color: "outline",
    },
  ],
  footer: [
    { label: "Features", href: "/#features" },
    { label: "Partner Ecosystem", href: "/#partner-ecosystem" },
    {
      label: "API",
      href: "https://docs.unitycatalog.io/reference/api/catalog",
    },
    { label: "Documentation", href: "https://go.unitycatalog.io/docs" },
  ],
};
