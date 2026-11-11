import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

/**
 * Runs in <head> before first paint (__root.tsx), so a light-mode reader
 * never sees the prerendered dark page flash. It must stay self-contained:
 * it is inlined as a string. No stored value means "system".
 */
export const themeScript = `(()=>{try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

const listeners = new Set<() => void>();
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function readPreference(): ThemePreference {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    // Storage blocked: fall back to the system preference.
  }
  return "system";
}

let preference: ThemePreference | null = null;
const current = () => {
  preference ??= readPreference();
  return preference;
};

function apply() {
  const p = current();
  document.documentElement.classList.toggle(
    "dark",
    p === "dark" || (p === "system" && media().matches),
  );
  for (const l of listeners) l();
}

export function setTheme(next: ThemePreference): void {
  preference = next;
  try {
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
  } catch {
    // Unpersisted is fine; the choice still applies to this page.
  }
  apply();
}

/** Flip to the opposite of what is showing, as an explicit preference. */
export function toggleTheme(): void {
  setTheme(
    document.documentElement.classList.contains("dark") ? "light" : "dark",
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  // Follow OS switches live while the preference is "system".
  media().addEventListener("change", () => {
    if (current() === "system") apply();
  });
}

/** The stored preference, or `null` before hydration (localStorage is client-only). */
export function useThemePreference(): ThemePreference | null {
  return useSyncExternalStore(subscribe, current, () => null);
}

/**
 * Whether dark mode is on, or `null` before hydration: the pre-paint script
 * sets the class, so the prerendered markup can't know it.
 */
export function useDarkMode(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => null,
  );
}
