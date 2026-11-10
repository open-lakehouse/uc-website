// Generates the Content Collections output before the tests import it, so
// `bun test` works without a Vite build.
import { buildContent } from "../scripts/content";

await buildContent();
