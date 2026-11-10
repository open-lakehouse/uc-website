import clsx from "clsx";
import { useEffect, useState } from "react";

import styles from "./TableOfContents.module.css";

interface TocChild {
  label: string;
  href: string;
}
export interface TocItem {
  label: string;
  href: string;
  children?: TocChild[];
}

/**
 * Highlights the last heading scrolled past the top quarter of the window,
 * or the first one. Headings are looked up on every scroll, so this keeps
 * working after the post body hydrates or the post changes.
 */
function useActiveIndex(items: TocItem[]): number {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const ids = items.map((item) => decodeURIComponent(item.href.slice(1)));
    const onScroll = () => {
      let activeIndex = 0;
      ids.forEach((id, i) => {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        if (rect && rect.top < window.innerHeight / 4) activeIndex = i;
      });
      setActive(activeIndex);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  return active;
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  const active = useActiveIndex(items);
  return (
    <nav className={styles.toc} aria-label="On this page">
      <h3 className={styles.tocTitle}>On this page</h3>
      <ul className={styles.tocList}>
        {items.map((item, i) => (
          <li key={item.href}>
            <a
              href={item.href}
              className={clsx(styles.tocLink, i === active && styles.active)}
            >
              {item.label}
            </a>
            {item.children && (
              <ul className={styles.tocChildren}>
                {item.children.map((child) => (
                  <li key={child.href}>
                    <a href={child.href} className={styles.tocLink}>
                      {child.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
