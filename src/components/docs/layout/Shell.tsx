import { Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useLocation } from "../lib/router";
import { brand } from "../brand/brand";
import "../docs.css";
import Sidebar from "./Sidebar";

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
  const { pathname } = useLocation();
  // The path the drawer was opened on, so navigating anywhere closes it.
  const [navOpenOn, setNavOpenOn] = useState<string | null>(null);
  const navOpen = navOpenOn === pathname;

  return (
    <div
      className="uc-console docs-root shell"
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
    </div>
  );
}
