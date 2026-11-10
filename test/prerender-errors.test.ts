import { describe, expect, test } from "bun:test";

import { prerenderErrors } from "../plugins/prerender-errors";

function hooks() {
  const plugin = prerenderErrors();
  return {
    start: plugin.configResolved as () => void,
    finish: (plugin.buildApp as { handler: () => Promise<void> }).handler,
  };
}

describe("prerenderErrors", () => {
  test("fails the build after a page's error was only logged", async () => {
    const { start, finish } = hooks();
    start();
    process.emit(
      "unhandledRejection",
      new Error("Failed to fetch /blogs/no-such-post: Not Found"),
      Promise.resolve(),
    );
    await expect(finish()).rejects.toThrow(
      "1 page(s) failed to prerender:\n- Failed to fetch /blogs/no-such-post: Not Found",
    );
  });

  test("passes when every page prerendered", async () => {
    const { start, finish } = hooks();
    start();
    await expect(finish()).resolves.toBeUndefined();
  });

  test("stops listening when the build ends", async () => {
    const before = process.listenerCount("unhandledRejection");
    const { start, finish } = hooks();
    start();
    await finish();
    expect(process.listenerCount("unhandledRejection")).toBe(before);
  });
});
