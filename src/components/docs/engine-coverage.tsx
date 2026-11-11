// `@/components/engine-coverage` is the import path the vendored
// remark-engine-coverage emits. The emitter writes the reports, counted against
// what the site publishes, to src/generated/coverage.json.
import {
  EngineCoverageView,
  type EngineReport,
  EngineSupportView,
} from "./engine-coverage-view";

const data = import.meta.glob<{ engines: EngineReport[] }>(
  "/src/generated/docs/coverage.json",
  {
    eager: true,
    import: "default",
  },
);
const reports: EngineReport[] =
  data["/src/generated/docs/coverage.json"]?.engines ?? [];

export function EngineCoverage({
  engine,
}: {
  project?: string;
  engine: string;
}) {
  const report = reports.find((r) => r.id === engine);
  return report ? <EngineCoverageView report={report} /> : null;
}

// The directive passes `project`; this site has one, so it isn't read.
export function EngineSupport(props: { project?: string }) {
  void props;
  return <EngineSupportView reports={reports} />;
}
