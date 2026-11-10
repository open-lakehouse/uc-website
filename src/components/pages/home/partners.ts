export interface Partner {
  name: string;
  logo: string;
}

export interface PartnerGroup {
  title: string;
  description: string;
  partners: Partner[];
}

export const partnerGroups: PartnerGroup[] = [
  {
    title: "Compute engines",
    description: "Query the same governed tables from any engine.",
    partners: [
      { name: "DuckDB", logo: "/logos/duckdb.svg" },
      { name: "StarRocks", logo: "/logos/starrocks.svg" },
      { name: "Daft", logo: "/logos/dataframe.svg" },
      { name: "PuppyGraph", logo: "/logos/puppygraph.svg" },
      { name: "Apache XTable", logo: "/logos/apache.svg" },
      { name: "LanceDB", logo: "/logos/lancedb.svg" },
    ],
  },
  {
    title: "Cloud & data platforms",
    description: "Run anywhere, from your laptop to every major cloud.",
    partners: [
      { name: "AWS", logo: "/logos/aws.svg" },
      { name: "Microsoft Azure", logo: "/logos/azure.svg" },
      { name: "Google Cloud", logo: "/logos/google.svg" },
      { name: "Databricks", logo: "/logos/databricks.svg" },
      { name: "Salesforce", logo: "/logos/salesforce.svg" },
      { name: "NVIDIA", logo: "/logos/nvidia.svg" },
    ],
  },
  {
    title: "AI frameworks",
    description: "Use catalog functions as tools in your agents.",
    partners: [
      { name: "LangChain", logo: "/logos/langchain.svg" },
      { name: "LlamaIndex", logo: "/logos/llama-index-logo.svg" },
      { name: "Unstructured", logo: "/logos/unstructured.svg" },
      { name: "Tecton", logo: "/logos/tecton.svg" },
    ],
  },
  {
    title: "Ingestion & governance",
    description: "Plug into the pipelines and policies you already run.",
    partners: [
      { name: "Fivetran", logo: "/logos/fivetran.svg" },
      { name: "dbt Labs", logo: "/logos/dbt-labs.svg" },
      { name: "Confluent", logo: "/logos/confluence.svg" },
      { name: "Informatica", logo: "/logos/Informatica.svg" },
      { name: "Immuta", logo: "/logos/immuta.svg" },
      { name: "Granica", logo: "/logos/granica.svg" },
    ],
  },
];

export const allPartners: Partner[] = partnerGroups.flatMap((g) => g.partners);
