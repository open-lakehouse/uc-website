// Blanks private-registry tarball URLs in bun.lock. Bun records the full URL
// for any registry other than npmjs.org, and Vercel can't reach a private
// mirror. An empty URL means "the default registry", so local installs still
// go through whatever registry .npmrc or bunfig.toml configures.
//
// Run after `bun add`, `bun update`, or `bun install` changes the lockfile:
//   bun scripts/public-lockfile.ts
const file = Bun.file(new URL("../bun.lock", import.meta.url));
const text = await file.text();
let count = 0;
const fixed = text.replace(
  /"(https?:\/\/(?!registry\.npmjs\.org\/)[^"]+\/-\/[^"]+\.tgz)"/g,
  () => {
    count++;
    return '""';
  },
);
if (count) await Bun.write(file, fixed);
console.log(`bun.lock: blanked ${count} private registry URL(s).`);
