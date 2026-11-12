import { describe, expect, test } from "bun:test";

import { evaluate } from "@mdx-js/mdx";
import type { Options } from "@mdx-js/rollup";
import { createElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { VFile } from "vfile";

import { docsMdxOptions } from "../plugins/docs-mdx.ts";
import { mdxOptions } from "../plugins/mdx.ts";

type PreProps = Record<string, unknown> & { children?: ReactNode };

/** Compiles `source` with a pipeline's plugins; returns the props `pre` gets. */
async function fences(
  { format, remarkPlugins, rehypePlugins }: Options,
  path: string,
  source: string,
): Promise<PreProps[]> {
  const { default: Content } = await evaluate(
    new VFile({ path, value: source }),
    { format, remarkPlugins, rehypePlugins, ...runtime },
  );
  const seen: PreProps[] = [];
  const pre = (props: PreProps) => {
    seen.push(props);
    return null;
  };
  renderToStaticMarkup(createElement(Content, { components: { pre } }));
  return seen;
}

const post = (ext: "md" | "mdx") =>
  `/site/src/content/blog/2026-01-01-test/index.${ext}`;
const doc = "/site/src/content/docs/how-to/test.md";

const fence = [
  '```python title="notebook.py" collapse',
  'print("hello")',
  "```",
].join("\n");

describe("code blocks", () => {
  for (const ext of ["md", "mdx"] as const) {
    test(`a .${ext} post's fence reaches <Pre> with its title, language, and collapse`, async () => {
      const [props] = await fences(mdxOptions, post(ext), fence);
      expect(props).toMatchObject({
        "data-filename": "notebook.py",
        "data-lang": "python",
        "data-collapse": "true",
      });
      expect(String(props?.className)).toContain("shiki");
    });
  }

  test("a post's fence highlights like the same fence in the docs", async () => {
    const html = async (options: Options, path: string) =>
      (await fences(options, path, fence)).map((props) =>
        renderToStaticMarkup(createElement("pre", props)),
      );
    const docsHtml = await html(docsMdxOptions, doc);
    expect(docsHtml).toHaveLength(1);
    expect(await html(mdxOptions, post("md"))).toEqual(docsHtml);
    expect(await html(mdxOptions, post("mdx"))).toEqual(docsHtml);
  });

  test("a post's fence without a language still reaches <Pre>", async () => {
    const [props] = await fences(mdxOptions, post("md"), "```\nok\n```");
    expect(props).toBeDefined();
    expect(props?.["data-lang"]).toBeUndefined();
  });
});
