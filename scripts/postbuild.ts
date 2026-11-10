// Indexes the prerendered site for search, like the Astro app's searchPlugin.
// Nitro writes static files to .vercel/output/static with its Vercel preset
// (picked automatically on Vercel, or with NITRO_PRESET=vercel) and to
// .output/public otherwise. Whichever one this build just wrote is indexed.
import path from "node:path";

import { $ } from "bun";

const root = path.resolve(import.meta.dir, "..");
const candidates = [".vercel/output/static", ".output/public"];

const builds = [];
for (const dir of candidates) {
  const index = Bun.file(path.join(root, dir, "index.html"));
  if (await index.exists()) builds.push({ dir, builtAt: index.lastModified });
}
const site = builds.sort((a, b) => b.builtAt - a.builtAt)[0]?.dir;

if (!site) {
  console.error(
    `postbuild: no prerendered index.html in ${candidates.join(" or ")}. Run \`bun run build\`.`,
  );
  process.exit(1);
}

console.log(`postbuild: indexing ${site} with Pagefind`);
await $`bun x pagefind --site ${site} --exclude-selectors ${"[data-pagefind-ignore]"}`.cwd(
  root,
);
