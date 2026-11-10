---
title: Introducing Unity Catalog 0.3.1 Release
category: guide
description: A blog for the Unity Catalog 0.3.1 release explaining the key features and enhancements
authors:
  - michelle-leon
  - tathagata-das
  - robert-pack
thumbnail: ./thumbnail.jpg
date: December 12, 2025
---

We’re excited to announce the [release of Unity Catalog 0.3.1](https://github.com/unitycatalog/unitycatalog/releases/tag/v0.3.1). This release brings important new capabilities that position Unity Catalog as a production-ready, open-source catalog for all of your data and AI assets.

Version 0.3.1 focuses on three major areas:

- **Improved Java client API with OAuth support**: designed for reliability and extensibility in production environments.
- **Improved credential renewal**: to make authentication and long-running workloads more robust across cloud platforms.
- **UC managed Delta tables**: this enables Unity Catalog to coordinate table storage and commits centrally.

This release is the result of contributions from our growing open-source community. A big thank-you to everyone who reported issues, submitted pull requests, reviewed code, and shared feedback!

Let’s take a look at the new features in more detail. We will also share the roadmap for Unity Catalog as we make steady progress towards v0.4.

## Unified Client API

🔥 **You can now build production-grade integrations on top of Unity Catalog using a single, consistent client with built-in reliability, retries, and flexible authentication.**

Unity Catalog 0.3.1 introduces a new Unity Catalog client that is designed to be reliable, extensible, and ready for production use.

The new `unitycatalog-client` module provides a shared abstraction layer for building Unity Catalog integrations across different tools and environments. Instead of each integration handling configuration, authentication, and error handling on its own, these concerns are now standardized in a single client library.

This brings several important improvements:

- **Fluent ApiClientBuilder API**  
  A new builder pattern makes it easy to construct fully configured clients. You can define the server URI, authentication method, retry behavior, and request interceptors in a consistent and explicit way.
- **Resilient Retries and Failure Recovery**  
  The client includes standardized retry handling with jittered backoff to recover automatically from transient failures. This makes integrations more robust in real-world production environments.

The Unity Catalog client now also supports **OAuth authentication** through a new `OAuthTokenProvider`. When OAuth is enabled, the client automatically requests short-lived tokens using standard OAuth flows, detects token expiration, and refreshes tokens transparently. Robust retry logic ensures that token acquisition failures do not interrupt user workloads, allowing them to continue uninterrupted.

These credentials and authentication improvements increase the stability of production-grade workloads and reduce authentication-related failures across all major cloud platforms.

Note that this release maintains backward compatibility. If you’re already using Unity Catalog with a static token configuration, your setup will continue to work as-is. Under the hood, those configurations now default to the new client with `auth.type=static`.

## Improved Credentials and Authentication Support

**🔥 Long-running jobs and cloud workloads can securely authenticate automated credential rotation, reducing failures and operational overhead across AWS, Azure, and GCP.**

This release significantly improves how credentials and authentication are handled in Unity Catalog, especially for long-running and production workloads.

**Automatic credential renewal** is now supported across all major cloud providers. In previous versions, long-running jobs could fail when temporary credentials expired (~1 hour). With the new automatic credential renewal feature enabled, Unity Catalog transparently refreshes temporary credentials as they expire, so jobs can continue running without interruption:

- AWS: temporary credentials issued by the Unity Catalog server are automatically renewed.
- Azure (ABFS): access tokens are refreshed during job execution.
- GCP (GCS): access tokens used by the Spark connector are renewed as needed.

A **new credential cache** also reduces redundant token requests by reusing table-level and path-level credentials. This reduces API traffic and improves performance while maintaining the least-privileged access.

You can enable automatic credential renewal using

```
spark.sql.catalog.<catalogName>.renewCredential.enabled=true
```

## Catalog-managed Delta tables

**🔥 Unity Catalog can now centrally coordinate table storage and commits, making it safe and predictable for multiple engines to read and write the same datasets.**

**⚠️ Catalog-managed tables are experimental in 0.3.1, expect further enhancement and features in future releases.**

In previous versions, table commits were coordinated by individual compute engines. Each engine was responsible for validating writes, handling concurrency, and managing commit semantics independently. This works well in single-engine setups, but can become fragile in multi-engine environments.

With catalog-managed Delta tables, Unity Catalog takes on that responsibility. Storage locations are allocated by the Unity Catalog server, and table commits are coordinated centrally through new server-side APIs. This creates a single, authoritative place where commits are validated, tracked, and ordered, no matter which engine you are writing from.

This unlocks several important benefits:

- **Centralized commit tracking**: Every read and write is recorded at the catalog level, making it easier to audit changes and reason about table history.
- **Cross-engine coordination**: Multiple engines, such as Spark, DuckDB, and Polars, can safely read from and write to the same table without creating conflicts with commits.

Here’s how to create a Delta table with the catalog-managed commits feature enabled:

```sql
CREATE TABLE my_table
  USING DELTA
  TBLPROPERTIES ('delta.feature.catalogManaged' = 'supported');
```

Catalog-managed tables are currently marked as experimental and must be explicitly enabled on the server by the server property `server.managed-table.enabled`. Delta 4.0.0 requires the system property `spark.testing` or `env SPARK_TESTING` to be set.

We’re actively iterating on this feature and encourage the community to try it out and share feedback.

## What’s next for Unity Catalog v0.4

Unity Catalog 0.3.1 is an important step towards making Unity Catalog the industry-standard open-source control plane for managing data and AI assets together. The next major milestone v0.4 is scheduled for February 2026, which will focus on:

- Support for Managed locations support for Managed tables
- integrated with external locations and credentials
- Stabilising and productionizing experimental features
- Spark 4.1 and Delta 4.1 support

All of this work is driven by the open-source community. The roadmap reflects real-world needs from teams building data platforms, ML systems, and AI applications in production. If you’re interested in where open data and AI management is heading, now is a great time to get involved and help shape what Unity Catalog becomes next.

### Join the Unity Catalog Community

If you’d like to join the Unity Catalog project, here are some ideas to get you started:

- Build integrations with your favorite engines and tools
- Contribute documentation pages to help other developers use Unity Catalog
- Write a blog about your Unity Catalog use case and share it with fellow developers and industry experts

‍[Join our Slack community](https://go.unitycatalog.io/slack) to get started. See you there!
