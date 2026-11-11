// Expressive Code options for Markdown/MDX code fences (plugins/mdx.ts and
// plugins/expressive-code.ts).
//
// Elevated surface + visible border so blocks read as terminals on --uc-bg.
// Both themes are emitted and <html class="dark"> picks one; the chrome
// colors are theme tokens (tokens.css), so they switch with the page.
export const expressiveCodeOptions = {
  themes: ["github-dark", "github-light"],
  useDarkModeMediaQuery: false,
  themeCssSelector: (theme) =>
    theme.type === "dark" ? ".dark" : ":root:not(.dark)",
  styleOverrides: {
    borderRadius: "0.75rem",
    borderWidth: "1px",
    borderColor: "rgb(var(--uc-line-rgb) / 0.32)",
    codeBackground: "var(--uc-code-bg)",
    frames: {
      frameBoxShadowCssValue:
        "0 18px 48px rgb(var(--uc-shadow-rgb) / calc(0.55 * var(--uc-shadow-k)))",
      editorActiveTabIndicatorTopColor: "#ffbc00",
      editorTabBarBackground: "var(--uc-surface-2)",
      editorActiveTabBackground: "var(--uc-code-bg)",
      terminalTitlebarBackground: "var(--uc-code-titlebar)",
      terminalTitlebarForeground: "var(--uc-code-titlebar-text)",
      terminalTitlebarDotsForeground: "#7a92ab",
      terminalTitlebarDotsOpacity: "1",
      terminalBackground: "var(--uc-code-bg)",
      inlineButtonBorder: "transparent",
    },
  },
};
