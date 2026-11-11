/**
 * remark-callouts — render `:::tldr` / `:::tip` / `:::note` / `:::info` /
 * `:::warning` / `:::caution` / `:::danger` container directives as styled
 * `<aside>` callout boxes, in plain Markdown AND MDX (no component import needed).
 *
 * This is the UnityCatalog site's counterpart to the docs-factory preview's
 * `remark-callouts` (which emits a React `<Callout>`). Blog drafts authored in
 * docs-factory stay portable CommonMark using the `:::` directive convention
 * (see blogs/CONVENTIONS.md §5); the emitter passes callouts through untouched,
 * and THIS plugin — in the MDX pipeline (plugins/mdx.ts) — styles
 * them. Because it operates on the directive's hast projection, it works for both
 * `.md` and `.mdx` posts.
 *
 *   :::warning[Heads up]
 *   Body text, **rich** markdown, code, etc.
 *   :::
 *
 * →  <aside class="callout" data-type="warning">
 *      <div class="callout-head"><svg …/><span>Heads up</span></div>
 *      <div class="callout-body"> …children… </div>
 *    </aside>
 *
 * The optional directive label (`:::warning[Heads up]`) overrides the default
 * per-type heading. Requires `remark-directive` to run first (it parses `:::`).
 */

const TYPES = new Set([
  "tldr",
  "tip",
  "note",
  "info",
  "warning",
  "caution",
  "danger",
]);

// Default heading per type. caution/danger keep their own word rather than
// sharing "Warning", mirroring the docs-factory Callout component. `tldr` is the
// canonical "key takeaways" summary box (blogs/CONVENTIONS.md §5); its default
// heading is "TL;DR", overridable via `:::tldr[Key takeaways]`.
const LABELS = {
  tldr: "TL;DR",
  tip: "Tip",
  note: "Note",
  info: "Info",
  warning: "Warning",
  caution: "Caution",
  danger: "Danger",
};

// Inline SVG icons (lucide, MIT) — no icon-font/runtime dep. tldr=list-checks,
// tip=lightbulb, note/info=info-circle, warning/caution=triangle-alert,
// danger=octagon-alert.
const ICONS = {
  tldr: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  tip: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  warning:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  caution:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  danger:
    '<path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86Z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
};

function iconSvg(type) {
  return (
    '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    (ICONS[type] ?? ICONS.note) +
    "</svg>"
  );
}

/** The directive label (`:::warning[Label]`) is a `directiveLabel` paragraph as
 * the node's first child; extract its text and remove it if present. */
function takeLabel(node) {
  const first = node.children?.[0];
  if (first && first.data?.directiveLabel) {
    node.children.shift();
    return first.children?.map((c) => c.value ?? "").join("") || undefined;
  }
  return undefined;
}

function transform(node) {
  if (node.type === "containerDirective" && TYPES.has(node.name)) {
    const title = takeLabel(node) ?? LABELS[node.name];

    // Render the directive as <aside class="callout" data-type="…">.
    node.data = node.data || {};
    node.data.hName = "aside";
    node.data.hProperties = { className: ["callout"], "data-type": node.name };

    // Prepend a raw-HTML head (icon + label). The body children stay as mdast so
    // their rich Markdown (prose, code, lists) renders normally after the head.
    const head = {
      type: "html",
      value:
        '<div class="callout-head">' +
        iconSvg(node.name) +
        `<span class="callout-title">${title}</span>` +
        "</div>",
    };
    node.children = [head, ...(node.children ?? [])];
  }
  // Recurse so callouts nested inside other containers (e.g. a journey step) are
  // transformed too.
  if (node.children) for (const child of node.children) transform(child);
}

export default function remarkCallouts() {
  return (tree) => {
    transform(tree);
  };
}
