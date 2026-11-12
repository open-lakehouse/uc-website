// Components available to MDX posts, by the names docs-factory posts use.
// The posts' `import X from "@/components/blog/X.astro"` lines are dropped at
// compile time (plugins/post-module.ts), so these fill in for them. Code
// fences get the docs' chrome (filename header, collapse, copy button).
import type { MDXComponents } from "mdx/types";

import { Pre } from "../docs/code-block";
import { LikeC4View, TrestleView } from "./diagrams";
import { Journey, JourneyStep } from "./Journey";

export const mdxComponents: MDXComponents = {
  pre: Pre,
  Journey,
  JourneyStep,
  LikeC4View,
  TrestleView,
};
