/**
 * The Unity Catalog wordmark. Both variants are in the markup and CSS shows
 * the one for the active theme (tokens.css `.uc-only-*`), so the prerendered
 * page needn't know the reader's theme.
 */
export function Logo({
  width,
  height,
  loading,
}: {
  width: number;
  height: number;
  loading?: "lazy";
}) {
  return (
    <>
      <img
        className="uc-only-dark"
        src="/uc-logo.svg"
        alt="Unity Catalog"
        width={width}
        height={height}
        loading={loading}
      />
      <img
        className="uc-only-light"
        src="/uc-logo-light.svg"
        alt="Unity Catalog"
        width={width}
        height={height}
        loading={loading}
      />
    </>
  );
}
