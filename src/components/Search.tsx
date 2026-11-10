import "@pagefind/default-ui/css/ui.css";
import "./Search.global.css";

import clsx from "clsx";
import { useEffect, useRef } from "react";

import styles from "./Search.module.css";

/**
 * Pagefind's search box (src/components/Search.astro). The index only
 * exists in a production build, so dev shows how to get one instead.
 */
export function Search({ className }: { className?: string | undefined }) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = element.current;
    if (import.meta.env.DEV || !target) return;
    let ui: { destroy(): void } | undefined;
    let unmounted = false;
    const onIdle =
      window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
    onIdle(async () => {
      try {
        const { PagefindUI } = await import("@pagefind/default-ui");
        if (unmounted) return;
        ui = new PagefindUI({
          element: target,
          baseUrl: "/",
          bundlePath: "/pagefind/",
          showImages: false,
          processResult: (result) => {
            if (result.url && result.url.includes("/blogs/")) {
              let cleanUrl = result.url;
              cleanUrl = cleanUrl.replace(/\.html$/, "");
              cleanUrl = cleanUrl.replace(/\s+/g, "%20");
              if (!cleanUrl.endsWith("/")) {
                cleanUrl = cleanUrl + "/";
              }
              result.url = cleanUrl;
              return result;
            }
            return null;
          },
        });
      } catch (error) {
        console.warn("Pagefind UI could not be loaded:", error);
      }
    });
    return () => {
      unmounted = true;
      ui?.destroy();
    };
  }, []);

  return (
    <div className={clsx(styles.searchRoot, className)}>
      <div className={styles.searchContainer}>
        {import.meta.env.DEV ? (
          <div className={styles.searchDev}>
            <p>To view search results, run a production build:</p>
            <p>
              <code>$ bun run build && bun run preview</code>
            </p>
          </div>
        ) : (
          <div id="pagefind-ui" ref={element} />
        )}
      </div>
    </div>
  );
}
