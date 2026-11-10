// Builds the MDX ESM nodes (`import`, `export const`) the plugins inject.
// MDX compiles these from their estree, so `value` is only for debugging.
import type { Program } from "estree";
import { valueToEstree } from "estree-util-value-to-estree";
import type { MdxjsEsmHast } from "mdast-util-mdxjs-esm";

function esm(value: string, program: Program["body"]): MdxjsEsmHast {
  return {
    type: "mdxjsEsm",
    value,
    data: { estree: { type: "Program", sourceType: "module", body: program } },
  };
}

/** `import name from "source"` */
export function importDefault(name: string, source: string): MdxjsEsmHast {
  return esm(`import ${name} from ${JSON.stringify(source)}`, [
    {
      type: "ImportDeclaration",
      specifiers: [
        { type: "ImportDefaultSpecifier", local: { type: "Identifier", name } },
      ],
      source: { type: "Literal", value: source },
      attributes: [],
    },
  ]);
}

/** `export const name = <value>` for any JSON-like value. */
export function exportConst(name: string, value: unknown): MdxjsEsmHast {
  return esm(`export const ${name} = ${JSON.stringify(value)}`, [
    {
      type: "ExportNamedDeclaration",
      declaration: {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [
          {
            type: "VariableDeclarator",
            id: { type: "Identifier", name },
            init: valueToEstree(value),
          },
        ],
      },
      specifiers: [],
      source: null,
      attributes: [],
    },
  ]);
}
