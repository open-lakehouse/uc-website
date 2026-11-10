import clsx from "clsx";
import type { AriaAttributes, MouseEventHandler, ReactNode } from "react";

import styles from "./Button.module.css";
import { SiteLink } from "./SiteLink";

type DataAttributes = { [key: `data-${string}`]: string | undefined };

export interface ButtonProps extends AriaAttributes, DataAttributes {
  href?: string | undefined;
  color?:
    | "primary"
    | "secondary"
    | "accent"
    | "neutral"
    | "white"
    | "outline"
    | "ghost"
    | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  type?: "button" | "submit" | undefined;
  isFullWidth?: boolean | undefined;
  className?: string | undefined;
  target?: string | undefined;
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  children?: ReactNode;
}

/**
 * Site button. Outline-first treatment (matches header GitHub/Slack), with
 * optional tinted accents via a soft fill wash + masked gradient edge.
 * With `href` it renders a link (src/components/Button.astro).
 */
export function Button({
  href,
  color = "outline",
  size = "md",
  type,
  isFullWidth,
  className,
  target,
  children,
  ...rest
}: ButtonProps) {
  const cx = clsx(
    styles.btn,
    styles[color],
    styles[size],
    isFullWidth && styles.full,
    className,
  );

  if (href) {
    return (
      <SiteLink
        href={href}
        className={cx}
        {...(target ? { target } : {})}
        rel={href.startsWith("http") ? "noopener" : undefined}
        {...rest}
      >
        {children}
      </SiteLink>
    );
  }
  return (
    <button type={type} className={cx} {...rest}>
      {children}
    </button>
  );
}
