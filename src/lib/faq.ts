// Rendered on the homepage (Faq.astro) and mirrored into /llms-full.txt, so
// the answers LLMs cite are the ones visitors read.
export const faqs = [
  {
    q: "Is Unity Catalog really open source?",
    a: "Yes. Unity Catalog is licensed under Apache 2.0, including the server, the OpenAPI specification, and the clients. It is hosted by the LF AI & Data Foundation and developed in the open on GitHub.",
  },
  {
    q: "How does it relate to Databricks Unity Catalog?",
    a: "Databricks open-sourced Unity Catalog in 2024 and contributed it to the LF AI & Data Foundation. The open-source project is now built by a community of contributors from many companies, with open APIs that any vendor or engine can implement.",
  },
  {
    q: "Which table formats are supported?",
    a: "Delta Lake and native Apache Iceberg™ tables (as of 0.7), plus Parquet, CSV, JSON, and more. Delta UniForm tables are readable by Iceberg clients, and the Iceberg REST Catalog API lets Iceberg engines connect directly.",
  },
  {
    q: "Which engines and tools can I use?",
    a: "Apache Spark, DuckDB, Daft, StarRocks, PuppyGraph, and any Iceberg REST client such as PyIceberg. Functions registered in the catalog can be used as tools in LangChain, LlamaIndex, and OpenAI agents.",
  },
  {
    q: "Can it govern AI assets, not just tables?",
    a: "Yes. Volumes govern unstructured files like documents and images, functions can be exposed as AI tools, and Unity Catalog can act as an MLflow model registry, all under the same permissions model.",
  },
  {
    q: "How do I get started?",
    a: "Clone the GitHub repository and run bin/start-uc-server (Java 17+), or pull the official unitycatalog/unitycatalog Docker image. The quickstart walks you through creating and querying your first tables.",
  },
];
