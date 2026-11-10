// Components available to MDX posts, by the names docs-factory posts use.
// The posts' `import X from "@/components/blog/X.astro"` lines are dropped at
// compile time (plugins/post-module.ts), so these fill in for them.
import type { MDXComponents } from "mdx/types";

import { LikeC4View, TrestleView } from "./diagrams";
import { Journey, JourneyStep } from "./Journey";

export const mdxComponents: MDXComponents = {
  Journey,
  JourneyStep,
  LikeC4View,
  TrestleView,
};
