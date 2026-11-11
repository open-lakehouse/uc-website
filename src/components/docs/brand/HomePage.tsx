import { Blocks, Database, Server } from "lucide-react";
import { Link } from "../lib/router";
import {
  DuckDBIcon,
  PandasIcon,
  PolarsIcon,
  PythonIcon,
  SparkIcon,
} from "../EngineIcons";
import Shell from "../layout/Shell";
import {
  Community,
  Engines,
  environmentCommands,
  Hero,
  type Kind,
  Kinds,
  type Path,
  Paths,
  QuickStart,
  resolve,
} from "../home";
import Logo from "./Logo";

// The getting-started tutorial's own environment commands, so the two can't
// drift; a build that didn't publish that page drops the block.
const START_ROUTE = "/docs/tutorials/getting-started/";
const startEnv = environmentCommands(START_ROUTE);
const QUICKSTART = startEnv.length
  ? [...startEnv, "docker exec unitycatalog bin/uc catalog list"]
  : [];

const PATHS: Path[] = [
  {
    title: "Use Unity Catalog",
    blurb:
      "Create catalogs, tables, and volumes, and query them from your engine.",
    Icon: Database,
    links: [
      { route: "/docs/tutorials/python-client/" },
      { route: "/docs/how-to/manage-catalogs-and-schemas/" },
      { route: "/docs/tutorials/managed-delta-table/" },
    ],
  },
  {
    title: "Operate a server",
    blurb:
      "Persist metadata in PostgreSQL and connect the catalog to cloud storage.",
    Icon: Server,
    links: [
      { route: "/docs/how-to/configure-backend-db/" },
      { route: "/docs/how-to/configure-aws-storage/" },
      { route: "/docs/how-to/managed-storage-s3/" },
    ],
  },
  {
    title: "Build an integration",
    blurb:
      "Talk to the catalog from your own code through the clients and REST APIs.",
    Icon: Blocks,
    links: [
      { route: "/docs/tutorials/python-client/", label: "Python client" },
      { route: "/docs/api/catalog/" },
      { route: "/docs/api/delta/" },
    ],
  },
];

const ENGINES = [
  {
    route: "/docs/how-to/configure-spark/",
    label: "Apache Spark",
    icons: [SparkIcon],
  },
  { route: "/docs/how-to/duckdb/", label: "DuckDB", icons: [DuckDBIcon] },
  {
    route: "/docs/how-to/python-dataframes/",
    label: "Polars & pandas",
    icons: [PolarsIcon, PandasIcon],
  },
  {
    route: "/docs/tutorials/python-client/",
    label: "Python client",
    icons: [PythonIcon],
  },
];

const KINDS: Kind[] = [
  {
    route: "/docs/tutorials/getting-started/",
    label: "Tutorials",
    blurb: "Learn by building, step by step.",
  },
  {
    route: "/docs/how-to/run-local-server/",
    label: "How-to guides",
    blurb: "Recipes for one task each.",
  },
  {
    route: "/docs/explanation/uc-basics/",
    label: "Concepts",
    blurb: "How the catalog works and why.",
  },
  {
    route: "/docs/reference/features-and-limitations/",
    label: "Reference",
    blurb: "Supported features and known issues.",
  },
  {
    route: "/docs/api/",
    label: "REST API",
    blurb: "Every endpoint, with request samples.",
  },
];

export default function HomePage() {
  const [start] = resolve([{ route: START_ROUTE }]);
  const actions = resolve([
    { route: START_ROUTE, label: "Create your first catalog" },
    {
      route: "/docs/explanation/what-is-unity-catalog/",
      label: "What is Unity Catalog?",
    },
  ]);
  return (
    <Shell>
      <Hero
        Logo={Logo}
        lead="The open catalog for your tables, volumes, functions, and models. Govern data once and query it from Spark, DuckDB, Python, and more."
        actions={actions}
      />
      <QuickStart
        title="Run it locally in a minute"
        intro={
          <>
            Needs only Docker. This starts a server on{" "}
            <code>localhost:8080</code> with two sample catalogs and lists them.
          </>
        }
        commands={QUICKSTART}
        next={
          start && (
            <>
              Next: <Link to={start.route}>{start.label}</Link> walks through
              these steps and builds a table of your own.
            </>
          )
        }
      />
      <Paths paths={PATHS} />
      <Engines title="Connect your engine" engines={ENGINES} />
      <Kinds kinds={KINDS} />
      <Community />
    </Shell>
  );
}
