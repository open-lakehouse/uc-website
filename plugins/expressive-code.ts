// Expressive Code for post code fences, with the options the Astro app uses
// (src/lib/expressive-code.mjs).
//
// Like astro-expressive-code, code blocks are rendered without inline
// <style> or <script>. The styles and the copy-button module are served once
// as `virtual:expressive-code.css` and `virtual:expressive-code.js`. The
// module watches the DOM for new code blocks, so loading it once (from the
// root route) covers posts reached by client-side navigation too, which an
// inline <script> rendered by React would not.
import { createRenderer } from "rehype-expressive-code";
import type { RehypeExpressiveCodeOptions } from "rehype-expressive-code";
import type { Plugin } from "vite";

import { expressiveCodeOptions } from "../src/lib/expressive-code.mjs";

type Renderer = Awaited<ReturnType<typeof createRenderer>>;

// The shared file is plain JS, so its theme names are typed as strings.
const options = expressiveCodeOptions as RehypeExpressiveCodeOptions;

let renderer: Promise<Renderer> | undefined;
function getRenderer(): Promise<Renderer> {
  renderer ??= createRenderer({ ...options });
  return renderer;
}

export const rehypeExpressiveCodeOptions: RehypeExpressiveCodeOptions = {
  ...options,
  customCreateRenderer: async () => ({
    ...(await getRenderer()),
    baseStyles: "",
    themeStyles: "",
    jsModules: [],
  }),
};

const CSS_ID = "virtual:expressive-code.css";
const JS_ID = "virtual:expressive-code.js";

export function expressiveCodeAssets(): Plugin {
  return {
    name: "uc:expressive-code-assets",
    resolveId(id) {
      return id === CSS_ID || id === JS_ID ? `\0${id}` : null;
    },
    async load(id) {
      if (id === `\0${CSS_ID}`) {
        const { baseStyles, themeStyles } = await getRenderer();
        return baseStyles + themeStyles;
      }
      if (id === `\0${JS_ID}`) {
        const { jsModules } = await getRenderer();
        return [...new Set(jsModules)].join("\n");
      }
      return null;
    },
  };
}
