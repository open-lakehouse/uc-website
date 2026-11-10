/**
 * The icon and web-app tags astro-favicons writes on the Astro site, for the
 * icon set it generated (copied into web/public). Rendered straight into
 * <head> because route `head` meta is de-duplicated by name, and the two
 * theme-color tags share one.
 */
export function Favicons() {
  return (
    <>
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: light)"
        content="#fff"
      />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: dark)"
        content="#000"
      />
      <meta name="application-name" content="Unity Catalog" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon-precomposed.png"
      />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#fff" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta name="apple-mobile-web-app-title" content="Unity Catalog" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="48x48"
        href="/favicon-48x48.png"
      />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <meta name="msapplication-TileColor" content="#fff" />
      <meta name="msapplication-TileImage" content="/mstile-144x144.png" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <link rel="yandex-tableau-widget" href="/yandex-browser-manifest.json" />
    </>
  );
}
