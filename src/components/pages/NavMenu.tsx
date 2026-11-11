import { useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { SiteLink } from "../SiteLink";
import styles from "./NavMenu.module.css";

export interface NavMenuItem {
  href: string;
  label: string;
  hint?: string;
  /** Also current on this path (the section route that shows it). */
  alsoOn?: string;
}

/**
 * A header link with a dropdown of its section's pages. Hovering opens it
 * with a mouse; the chevron opens it from the keyboard or a touch.
 */
export function NavMenu({
  label,
  href,
  items,
  className,
}: {
  label: string;
  href: string;
  items: NavMenuItem[];
  /** The header link's own look, on the link and chevron together. */
  className: string;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  // The path it was opened on, so navigating anywhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenOn(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenOn(null);
        toggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hover = (next: boolean) => (event: PointerEvent) => {
    if (event.pointerType === "mouse") setOpenOn(next ? pathname : null);
  };
  const current = (item: NavMenuItem) =>
    pathname === item.href || pathname === item.alsoOn;

  return (
    <div
      className={clsx(className, styles.navMenu)}
      ref={root}
      onPointerEnter={hover(true)}
      onPointerLeave={hover(false)}
    >
      <SiteLink href={href} className={styles.trigger}>
        {label}
      </SiteLink>
      <button
        type="button"
        ref={toggle}
        className={styles.chevron}
        aria-label={`${label} pages`}
        aria-expanded={open}
        aria-controls={`nav-menu-${label}`}
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M2 3.5 5 6.5 8 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className={styles.panel} id={`nav-menu-${label}`} hidden={!open}>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.href}>
              <SiteLink
                href={item.href}
                className={styles.item}
                aria-current={current(item) ? "page" : undefined}
                onClick={() => setOpenOn(null)}
              >
                <span className={styles.itemLabel}>{item.label}</span>
                {item.hint && (
                  <span className={styles.itemHint}>{item.hint}</span>
                )}
              </SiteLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
