import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./SectionHeader.module.css";

export function SectionHeader({
  index,
  label,
  align = "left",
  className,
  lede,
  children,
}: {
  index: string;
  label: string;
  align?: "left" | "center" | undefined;
  className?: string | undefined;
  /** The paragraph under the heading. */
  lede?: ReactNode;
  /** The heading. */
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        styles.sectionHeader,
        "reveal",
        align === "center" && styles.isCenter,
        className,
      )}
    >
      <span className="uc-eyebrow">
        <span className="uc-eyebrow-index">{index}</span>
        <span>{label}</span>
      </span>
      <h2 className="uc-h2">{children}</h2>
      {lede && <p className="uc-lede">{lede}</p>}
    </div>
  );
}
