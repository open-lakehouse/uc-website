import type { VercelConfig } from "@vercel/config/v1";

// Routing (headers, redirects, trailing slashes) is in the Build Output API
// config.json that Nitro writes from plugins/vercel-output.ts. Vercel merges
// routing set here into that file, so it would apply twice.
export const config: VercelConfig = {
  // Runs any function Nitro emits on Bun. Prerendered pages are static files
  // either way. Stay off "1.4.x" until it is tested separately.
  bunVersion: "1.x",
  installCommand: "bun install",
  buildCommand: "bun run build",
};
