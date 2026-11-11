import { Check, ChevronDown, Menu, Search, X } from "lucide-react";
import { useHydrated } from "@tanstack/react-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "../lib/router";
import { useMenu } from "../lib/menu";
import { loadIndex } from "../lib/search";
import { brand } from "../brand/brand";
import { apiFor, DOCS_HOME, defaultApi, pageFor, site } from "../site";
import CommandPalette from "../CommandPalette";
import "../docs.css";
import Sidebar from "./Sidebar";

type Section = "docs" | "api";

const SECTIONS = [
  { value: "docs", label: "Docs", hint: "Guides, tutorials, and concepts" },
  { value: "api", label: "API", hint: "REST API reference" },
] as const;

// Switching returns to the last page read in that section. Module state rather
// than storage: it only needs to survive client navigations, and the prerender
// (which never navigates) renders the defaults the first client render matches.
const lastRoute: Record<Section, string> = {
  docs: DOCS_HOME,
  api: defaultApi?.route ?? DOCS_HOME,
};

/** The current section, and where each section's switcher entry leads. */
function useSection() {
  const { pathname } = useLocation();
  const current: Section = apiFor(pathname) ? "api" : "docs";
  useEffect(() => {
    // A 404 is not a place to come back to.
    if (current === "api" || pathname === DOCS_HOME || pageFor(pathname))
      lastRoute[current] = pathname;
  }, [current, pathname]);
  // Re-selecting the current section goes to its start.
  const target = (section: Section) =>
    section !== current
      ? lastRoute[section]
      : section === "docs"
        ? DOCS_HOME
        : (defaultApi?.route ?? DOCS_HOME);
  return { current, target };
}

function SectionTabs() {
  const { current, target } = useSection();
  return (
    <nav className="section-tabs" aria-label="Sections">
      {SECTIONS.map(({ value, label }) => (
        <Link
          key={value}
          to={target(value)}
          className="section-tab"
          aria-current={value === current ? "true" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

interface CrumbItem {
  key: string;
  to: string;
  label: string;
  hint: string;
  current: boolean;
}

/** A breadcrumb segment (`/ docs ▾`) that opens a menu of its siblings. */
function CrumbMenu({
  label,
  name,
  items,
}: {
  label: string;
  name: string;
  items: CrumbItem[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useMenu(open, close, root, toggle);
  return (
    <div className="crumb-menu" ref={root}>
      <button
        type="button"
        className="brand-path"
        ref={toggle}
        onClick={() => setOpen((o) => !o)}
        aria-label={`${name}: ${label}. Switch ${name.toLowerCase()}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden="true">/</span> {label}
        <ChevronDown className="crumb-menu-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="pa-menu" role="menu" aria-label={name}>
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              role="menuitemradio"
              aria-checked={item.current}
              onClick={close}
            >
              <span>
                {item.label}
                <small>{item.hint}</small>
              </span>
              {item.current && (
                <Check className="theme-check" aria-hidden="true" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** `/ docs ▾` and, inside the API section, `/ <api> ▾`. */
function Breadcrumbs() {
  const { current, target } = useSection();
  const { pathname } = useLocation();
  const api = apiFor(pathname);
  return (
    <>
      <CrumbMenu
        name="Section"
        label={current}
        items={SECTIONS.map(({ value, label, hint }) => ({
          key: value,
          to: target(value),
          label,
          hint,
          current: value === current,
        }))}
      />
      {api && site.apis.length > 1 && (
        <CrumbMenu
          name="API"
          label={api.slug}
          items={site.apis.map((a) => ({
            key: a.route,
            to: a.route,
            label: a.title,
            hint: a.hint,
            current: a === api,
          }))}
        />
      )}
    </>
  );
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  // The platform is only known in the browser; the prerender shows a neutral key.
  const hydrated = useHydrated();
  const mod = hydrated
    ? /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘"
      : "Ctrl"
    : null;
  const prefetch = () => void loadIndex().catch(() => {});
  return (
    <button
      type="button"
      className="search-trigger"
      onClick={onOpen}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      aria-label="Search documentation"
      aria-keyshortcuts="Meta+K Control+K /"
    >
      <Search aria-hidden="true" />
      <span className="search-trigger-label">Search docs…</span>
      <kbd>{mod ? `${mod} K` : "K"}</kbd>
    </button>
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

  const openPalette = useCallback(() => setPaletteOpen(true), []);
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
      <header className="topbar">
        {sidebar && (
          <button
            type="button"
            className="icon-button nav-toggle"
            onClick={() => setNavOpenOn(navOpen ? null : pathname)}
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={navOpen}
          >
            {navOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        )}
        {/* The site header carries the logo; this bar is the docs' own path. */}
        <Link to={DOCS_HOME} className="brand">
          <span>{brand.wordmark}</span>
          {!site.apis.length && <span className="brand-path">/ docs</span>}
        </Link>
        {site.apis.length > 0 && <Breadcrumbs />}
        {site.apis.length > 0 && <SectionTabs />}
        <nav className="topbar-links">
          <SearchTrigger onOpen={openPalette} />
        </nav>
      </header>
      <div className="layout" data-aside={aside ? "true" : undefined}>
        {sidebar && <Sidebar />}
        <main className="main">{children}</main>
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
