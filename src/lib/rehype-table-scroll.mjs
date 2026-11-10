/**
 * rehype-table-scroll — wrap every Markdown table in
 * `<div class="table-scroll">` so a table wider than the article scrolls
 * sideways on its own instead of widening the whole page on small screens.
 * Applied to `.md` and `.mdx` posts in plugins/mdx.ts.
 */
export default function rehypeTableScroll() {
  const wrap = (node) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      wrap(child);
      if (child.type !== "element" || child.tagName !== "table") return child;
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"] },
        children: [child],
      };
    });
  };
  return wrap;
}
