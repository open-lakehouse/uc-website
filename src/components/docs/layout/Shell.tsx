import { Menu, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useLocation } from "../lib/router";
import { brand } from "../brand/brand";
import CommandPalette from "../CommandPalette";
import "../docs.css";
import Sidebar from "./Sidebar";

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

export default function Shell({
  children,
  aside,
  sidebar = true,
}: {
  children: ReactNode;
  aside?: ReactNode;
  /** Without it, main spans the full width and there is no drawer to toggle. */
  sidebar?: boolean;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  // The path the drawer was opened on, so navigating anywhere closes it.
  const [navOpenOn, setNavOpenOn] = useState<string | null>(null);
  const navOpen = navOpenOn === pathname;

  const closePalette = useCallback(() => setPaletteOpen(false), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const modK =
        e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey;
      const slash =
        e.key === "/" && !e.metaKey && !e.ctrlKey && !isEditable(e.target);
      if (!modK && !slash) return;
      e.preventDefault();
      // ⌘K toggles, like most palettes; `/` only opens.
      setPaletteOpen((open) => (modK ? !open : true));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="docs-root shell"
      data-nav-open={navOpen || undefined}
      data-no-sidebar={sidebar ? undefined : "true"}
    >
      <div className="layout" data-aside={aside ? "true" : undefined}>
        {sidebar && <Sidebar />}
        <main className="main">
          {/* The site header switches Docs and API; on narrow screens the
              sidebar is a drawer, and this opens it. */}
          {sidebar && (
            <button
              type="button"
              className="icon-button nav-toggle"
              onClick={() => setNavOpenOn(navOpen ? null : pathname)}
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={navOpen}
            >
              {navOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              <span>{navOpen ? "Close" : "Menu"}</span>
            </button>
          )}
          {children}
        </main>
        {aside && <aside className="aside">{aside}</aside>}
        <footer className="statusbar">
          <span className="statusbar-item">
            <span className="statusbar-dot" aria-hidden="true" />
            {brand.statusLabel}
          </span>
          <a className="statusbar-legal" href={brand.foundation.href}>
            © {new Date().getFullYear()} {brand.foundation.label}
          </a>
          <span className="statusbar-links">
            <a href={brand.github}>github</a>
          </span>
        </footer>
      </div>
      {paletteOpen && <CommandPalette onClose={closePalette} />}
    </div>
  );
}
