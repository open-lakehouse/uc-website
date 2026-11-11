import { useHydrated } from "@tanstack/react-router";
import clsx from "clsx";
import { Search } from "lucide-react";
import { lazy, Suspense, useEffect, useSyncExternalStore } from "react";

import { loadIndex, type SearchKind } from "./search-index";
import "./search.css";

// The palette and its index load on first use, not with every page.
const CommandPalette = lazy(() => import("./CommandPalette"));

// One palette for the whole site: any trigger opens it, the header renders it.
type State = { open: false } | { open: true; kind: SearchKind | null };
let state: State = { open: false };
const listeners = new Set<() => void>();
const set = (next: State) => {
  state = next;
  for (const l of listeners) l();
};

/** Open the site-wide palette, searching only `kind` if given. */
export function openSearch(kind: SearchKind | null = null): void {
  set({ open: true, kind });
}

function closeSearch(): void {
  set({ open: false });
}

function useSearchState(): State {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

const prefetch = () => void loadIndex().catch(() => {});

/** A button that opens the palette, showing its shortcut. */
export function SearchTrigger({
  label = "Search…",
  kind = null,
  className,
}: {
  label?: string;
  kind?: SearchKind | null;
  className?: string | undefined;
}) {
  // The platform is only known in the browser; the prerender shows a neutral key.
  const hydrated = useHydrated();
  const mod = hydrated
    ? /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘"
      : "Ctrl"
    : null;
  return (
    <button
      type="button"
      className={clsx("uc-console search-trigger", className)}
      onClick={() => openSearch(kind)}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      aria-label={kind === "blog" ? "Search the blog" : "Search Unity Catalog"}
      aria-keyshortcuts="Meta+K Control+K /"
    >
      <Search aria-hidden="true" />
      <span className="search-trigger-label">{label}</span>
      <kbd>{mod ? `${mod} K` : "K"}</kbd>
    </button>
  );
}

/** The ⌘K / Ctrl+K / `/` shortcuts and the palette; mount once (Header). */
export function SiteSearch() {
  const search = useSearchState();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const modK =
        e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey;
      const slash =
        e.key === "/" && !e.metaKey && !e.ctrlKey && !isEditable(e.target);
      if (!modK && !slash) return;
      e.preventDefault();
      // ⌘K toggles, like most palettes; `/` only opens.
      if (modK && state.open) closeSearch();
      else if (!state.open) openSearch();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return search.open ? (
    <Suspense>
      <CommandPalette onClose={closeSearch} kind={search.kind} />
    </Suspense>
  ) : null;
}
