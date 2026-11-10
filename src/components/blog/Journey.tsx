import type { ReactNode } from "react";

/**
 * A Step 1 → Step 2 → … vertical timeline (a thin rail with numbered
 * bubbles), rendering a docs-factory `::::journey`. Step numbers come from a
 * CSS counter (.jr / .jr-step in blog-rich.css).
 */
export function Journey({ children }: { children?: ReactNode }) {
  return <ol className="jr">{children}</ol>;
}

/**
 * One step in a <Journey>. `step` is the step title. The spaces between the
 * parts match JourneyStep.astro's output, so text extraction (Pagefind)
 * keeps the title and body apart.
 */
export function JourneyStep({
  step,
  children,
}: {
  step?: string;
  children?: ReactNode;
}) {
  return (
    <li className="jr-step">
      {" "}
      <span className="jr-bubble" aria-hidden="true"></span>{" "}
      {step && <div className="jr-title">{step}</div>}{" "}
      <div className="jr-body">{children}</div>{" "}
    </li>
  );
}
