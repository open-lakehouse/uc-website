// Turns images in post bodies that point at files next to the post into
// WebP at their original size, like Astro does for Markdown images. Remote
// images (and absolute /public paths) are left as they are.
//
// The remark step collects the local paths from Markdown image syntax, as
// Astro's remarkCollectImages does, so raw <img> HTML is left alone. The
// rehype step imports each file through vite-imagetools and points the <img>
// at the result.
import type { Element, ElementContent, Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import type {
  MdxJsxAttribute,
  MdxJsxTextElementHast,
} from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

import { importDefault } from "./mdx-esm.ts";

declare module "vfile" {
  interface DataMap {
    localImages: Set<string>;
  }
}

const QUERY = "?format=webp&as=metadata:src;width;height";

export function remarkLocalImages() {
  return (tree: MdastRoot, file: VFile) => {
    const definitions = new Map<string, string>();
    visit(tree, "definition", (node) => {
      definitions.set(node.identifier, node.url);
    });
    const local = new Set<string>();
    visit(tree, (node) => {
      let url: string | undefined;
      if (node.type === "image") url = node.url;
      else if (node.type === "imageReference") {
        url = definitions.get(node.identifier);
      }
      if (url === undefined) return;
      url = decodeURI(url);
      if (!URL.canParse(url) && !url.startsWith("/")) local.add(url);
    });
    file.data.localImages = local;
  };
}

function attribute(name: string, value: string): MdxJsxAttribute {
  return { type: "mdxJsxAttribute", name, value };
}

/** `name={id.field}` */
function memberAttribute(
  name: string,
  id: string,
  field: string,
): MdxJsxAttribute {
  return {
    type: "mdxJsxAttribute",
    name,
    value: {
      type: "mdxJsxAttributeValueExpression",
      value: `${id}.${field}`,
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ExpressionStatement",
              expression: {
                type: "MemberExpression",
                object: { type: "Identifier", name: id },
                property: { type: "Identifier", name: field },
                computed: false,
                optional: false,
              },
            },
          ],
        },
      },
    },
  };
}

export function rehypeLocalImages() {
  return (tree: HastRoot, file: VFile) => {
    const local = file.data.localImages;
    if (!local?.size) return;
    const imports = new Map<string, string>();

    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "img" || !parent || index === undefined) return;
      const { src, alt, title } = node.properties;
      if (typeof src !== "string") return;
      const path = decodeURI(src);
      if (!local.has(path)) return;

      // Bare names (`diagram.png`) are relative to the post, not packages.
      const specifier = /^\.{1,2}\//.test(path) ? path : `./${path}`;
      let id = imports.get(specifier);
      if (!id) {
        id = `__ucImage${imports.size}`;
        imports.set(specifier, id);
      }

      const attributes: MdxJsxAttribute[] = [];
      if (alt != null) attributes.push(attribute("alt", String(alt)));
      if (title != null) attributes.push(attribute("title", String(title)));
      attributes.push(
        attribute("loading", "lazy"),
        attribute("decoding", "async"),
        memberAttribute("width", id, "width"),
        memberAttribute("height", id, "height"),
        memberAttribute("src", id, "src"),
      );
      const image: MdxJsxTextElementHast = {
        type: "mdxJsxTextElement",
        name: "img",
        attributes,
        children: [],
      };
      parent.children[index] = image as unknown as ElementContent;
    });

    for (const [specifier, id] of imports) {
      tree.children.unshift(importDefault(id, specifier + QUERY));
    }
  };
}
