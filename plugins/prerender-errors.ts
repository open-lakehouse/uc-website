// Fails the build when a page fails to prerender, such as a link to a page
// that doesn't exist. TanStack Start's prerenderer throws for those from
// queue tasks nothing awaits, and Nitro's runtime, which the prerenderer's
// preview server loads into the build process, logs unhandled rejections
// instead of exiting. Without this, the build would log the error and pass.
import type { Plugin } from "vite";

export function prerenderErrors(): Plugin {
  const errors: unknown[] = [];
  const record = (error: unknown) => errors.push(error);
  return {
    name: "uc:prerender-errors",
    apply: "build",
    // After TanStack Start's own `buildApp` hook, which prerenders.
    enforce: "post",
    configResolved() {
      process.on("unhandledRejection", record);
    },
    buildApp: {
      order: "post",
      async handler() {
        // Rejections are reported once the tasks' promise jobs have run.
        await new Promise((resolve) => setTimeout(resolve));
        process.off("unhandledRejection", record);
        if (!errors.length) return;
        const messages = errors.map((error) =>
          error instanceof Error ? error.message : String(error),
        );
        throw new Error(
          `${errors.length} page(s) failed to prerender:\n- ${messages.join("\n- ")}`,
        );
      },
    },
  };
}
