// Expressive Code options for Markdown/MDX code fences (plugins/mdx.ts and
// plugins/expressive-code.ts).
//
// Elevated surface + visible border so blocks read as terminals on --uc-bg.
export const expressiveCodeOptions = {
  themes: ["github-dark"],
  styleOverrides: {
    borderRadius: "0.75rem",
    borderWidth: "1px",
    borderColor: "rgb(154 178 201 / 0.32)",
    codeBackground: "#152a40",
    frames: {
      frameBoxShadowCssValue: "0 18px 48px rgb(0 0 0 / 0.55)",
      editorActiveTabIndicatorTopColor: "#ffbc00",
      editorTabBarBackground: "#0c1828",
      editorActiveTabBackground: "#152a40",
      terminalTitlebarBackground: "#0a1a2c",
      terminalTitlebarForeground: "#9ab2c9",
      terminalTitlebarDotsForeground: "#7a92ab",
      terminalTitlebarDotsOpacity: "1",
      terminalBackground: "#152a40",
      inlineButtonBorder: "transparent",
    },
  },
};
