import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./Section.module.css";

/** astro-orbit's Section padding. */
const paddingClass = {
  sm: "py-8",
  md: "py-8 sm:py-16",
  lg: "py-8 sm:py-24",
  xl: "py-8 sm:py-40",
  none: undefined,
};

/**
 * A page section (src/components/Section.astro, around astro-orbit's Section
 * and Container), with an optional centered title and subtitle.
 */
export function Section({
  padding = "md",
  isFirst,
  variant,
  id,
  className,
  title,
  subtitle,
  children,
}: {
  padding?: keyof typeof paddingClass | undefined;
  /** Adds space at the top for the floating header nav. */
  isFirst?: boolean | undefined;
  variant?:
    "hero" | "hero-home" | "glow-top" | "grid-bottom" | "white" | undefined;
  id?: string | undefined;
  className?: string | undefined;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  const isHero = variant === "hero" || variant === "hero-home";
  const hasContent = children != null && children !== false;

  return (
    <section
      id={id}
      className={clsx(
        paddingClass[padding],
        {
          "bg-white text-accent-1000": variant === "white",
          "relative isolate overflow-hidden":
            variant !== "white" && variant !== undefined,
        },
        className,
      )}
    >
      <div className="mx-auto px-4 sm:w-[var(--breakpoint-sm)] md:w-[var(--breakpoint-md)] lg:w-[var(--breakpoint-lg)] xl:w-[var(--breakpoint-xl)]">
        {isFirst && <div className="h-[64px]" />}
        {(title || subtitle) && (
          <div
            className={clsx(styles.sectionHeading, {
              "mb-16": hasContent && isHero,
              "mb-12": hasContent && !isHero,
            })}
          >
            {title && (
              <div
                className={clsx(isHero ? "uc-h1" : "uc-h2", {
                  "mb-6": !!subtitle,
                })}
              >
                {title}
              </div>
            )}
            {subtitle && <div className="uc-lede">{subtitle}</div>}
          </div>
        )}
        {children}
        {isHero && (
          <>
            <div className="uc-aurora" />
            <div className="uc-grid-bg" />
          </>
        )}
        {variant === "glow-top" && (
          <div className={clsx("uc-aurora", styles.glowSoft)} />
        )}
        {variant === "grid-bottom" && (
          <div className={clsx("uc-grid-bg", styles.gridSoft)} />
        )}
      </div>
    </section>
  );
}
