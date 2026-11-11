import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  setTheme,
  useThemePreference,
  type ThemePreference,
} from "../lib/theme";
import styles from "./ThemeMenu.module.css";

const icon = (children: ReactNode) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const THEMES: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  icon: ReactNode;
}> = [
  {
    value: "system",
    label: "System",
    icon: icon(
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>,
    ),
  },
  {
    value: "light",
    label: "Light",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </>,
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: icon(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />),
  },
];

export function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  // Prerendered markup can't see the stored choice; it renders the default.
  const preference = useThemePreference() ?? "system";
  const current = THEMES.find((t) => t.value === preference) ?? THEMES[0]!;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
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

  return (
    <div className={styles.themeMenu} ref={root}>
      <button
        type="button"
        className={styles.toggle}
        ref={toggle}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {current.icon}
      </button>
      {open && (
        <div className={styles.menu} role="menu" aria-label="Theme">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme.value === current.value}
              className={styles.item}
              onClick={() => {
                setTheme(theme.value);
                setOpen(false);
                toggle.current?.focus();
              }}
            >
              {theme.icon}
              {theme.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
