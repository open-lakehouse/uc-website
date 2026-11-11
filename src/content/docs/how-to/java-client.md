---
title: Use the Java client in an application
summary: Add the unitycatalog-client artifact to a JVM application, connect with
  a token, create and look up catalogs, schemas, and tables, page through lists,
  and handle API errors.
diataxis: how-to
---

The [Unity Catalog Java SDK](https://central.sonatype.com/artifact/io.unitycatalog/unitycatalog-client "Generated synchronous Java client for Unity Catalog REST APIs.") is a synchronous
client generated from the [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") REST API.
It has one class per resource (`CatalogsApi`, `SchemasApi`, `TablesApi`,
`VolumesApi`, `FunctionsApi`, and others), each with one method per operation,
and model classes for the requests and responses. This page builds one
client in an application and uses it for the calls most applications make.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/).
- A JDK, version 11 or later.
- [JBang](https://www.jbang.dev/download/), to run the example as a single
  file. In a Maven or Gradle project, add the dependency below instead.
:::

## Add the dependency

The client is published to Maven Central as
`io.unitycatalog:unitycatalog-client:0.7.0`. Add it to your build's
dependencies, or declare it at the top of a JBang file:

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
//JAVA 11+
//DEPS io.unitycatalog:unitycatalog-client:0.7.0
```

Pin the version of the server you run. The client brings Jackson and SLF4J
and calls the server with the JDK's own HTTP client.

## Connect to the server

Build one `ApiClient` and create the API classes from it. Java has no
interactive shell, so put this and the following steps in your
application's `main` method or service setup:

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
String token = System.getenv().getOrDefault("UC_TOKEN", "not-checked");
ApiClient client = ApiClientBuilder.create()
    .uri("http://localhost:8080")
    .tokenProvider(TokenProvider.create(Map.of("type", "static", "token", token)))
    .addAppVersion("orders-app", "1.0.0")
    .build();

CatalogsApi catalogs = new CatalogsApi(client);
SchemasApi schemas = new SchemasApi(client);
TablesApi tables = new TablesApi(client);
```

- `uri` is the server's address only. The builder appends the API's base
  path, `/api/2.1/unity-catalog`.
- The builder requires a token provider. A server with authorization disabled,
  such as the docs' local one, doesn't check the token, so any value works
  there. For a server with authorization enabled, pass a token the server
  issued.
- For OAuth client credentials, call `TokenProvider.create` with `type` set
  to `oauth`, plus `oauth.uri`, `oauth.clientId`, and `oauth.clientSecret`.
  The provider gets the token and renews it 30 seconds before it expires. `oauth.scope` defaults
  to `all-apis`.
- `addAppVersion` adds your application's name and version to the
  `User-Agent` header the client sends.

The client retries a request up to three times in all, with exponential
backoff from 500 ms and random jitter, when the server returns HTTP 429 or the
connection fails or times out. It doesn't retry other errors. To change that,
pass `.retryPolicy(JitterDelayRetryPolicy.builder().maxAttempts(5).build())`
to the builder.

## Create a catalog and a schema

Each create method takes a request model built with chained setters, and
returns the created object:

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
CatalogInfo catalog = catalogs.createCatalog(new CreateCatalog()
    .name("retail")
    .comment("Order and customer data for the retail team")
    .properties(Map.of("owner_team", "retail-analytics")));
schemas.createSchema(new CreateSchema().name("sales").catalogName("retail"));
```

For updates, renames, and deletes, and the privileges each needs, see
[Manage catalogs and schemas](/docs/how-to/manage-catalogs-and-schemas/).

## Page through a list

List methods return one page of results and a `next_page_token`. Pass the
token to the next call until it comes back empty. The second argument of
`listCatalogs` is the page size, which is `1` here so that paging is visible:

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
List<String> names = new ArrayList<>();
String pageToken = null;
do {
  ListCatalogsResponse page = catalogs.listCatalogs(pageToken, 1);
  page.getCatalogs().forEach(c -> names.add(c.getName()));
  pageToken = page.getNextPageToken();
} while (pageToken != null && !pageToken.isEmpty());
System.out.println(names);
```

`listSchemas` and `listTables` page the same way, but take the page size
before the token, after their catalog and schema names.

## Register a table

`createTable` registers a table by name, format, location, and columns. Each
column needs a type name, a SQL type, and its JSON in Delta schema form. A
small helper builds them:

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
static ColumnInfo column(String name, ColumnTypeName type, String sql, String delta, int pos) {
  return new ColumnInfo()
      .name(name)
      .typeName(type)
      .typeText(sql)
      .typeJson("{\"name\":\"" + name + "\",\"type\":\"" + delta
          + "\",\"nullable\":true,\"metadata\":{}}")
      .position(pos)
      .nullable(true);
}
```

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
TableInfo orders = tables.createTable(new CreateTable()
    .name("orders")
    .catalogName("retail")
    .schemaName("sales")
    .tableType(TableType.EXTERNAL)
    .dataSourceFormat(DataSourceFormat.DELTA)
    .storageLocation("file:///tmp/uc-docs/retail/orders")
    .columns(List.of(
        column("order_id", ColumnTypeName.LONG, "bigint", "long", 0),
        column("amount", ColumnTypeName.DOUBLE, "double", "double", 1))));
System.out.println(orders.getTableId());
```

Registration is metadata only: point `storageLocation` at an existing Delta
table. The server doesn't check that the files are there. See
[Register external Delta table](/docs/how-to/register-external-table/).

## Look up objects by name

List the tables in a schema, or get one by its three-level name:

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
tables.listTables("retail", "sales", 50, null).getTables()
    .forEach(t -> System.out.println(t.getName() + " " + t.getTableType()));
```

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
TableInfo found = tables.getTable("retail.sales.orders", false, false);
System.out.println(found.getStorageLocation());
found.getColumns().forEach(c -> System.out.println(c.getName() + " " + c.getTypeText()));
```

The two `false` arguments of `getTable` are `readStreamingTableAsManaged` and
`readMaterializedViewAsManaged`. `getCatalog` and `getSchema` take a name
only.

## Handle errors

Every call throws `ApiException` when the server answers with an error.
`getCode()` returns the HTTP status, and `getResponseBody()` the JSON error,
whose `error_code` names the cause:

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
int status = 0;
try {
  tables.getTable("retail.sales.returns", false, false);
} catch (ApiException e) {
  status = e.getCode();
  System.out.println("HTTP " + status + ": " + e.getResponseBody());
}
```

A missing object returns 404, as here with `TABLE_NOT_FOUND`. Deleting a
catalog that still holds schemas returns 400 unless you force it.

## Clean up

Delete the catalog with everything in it:

```java title="JavaClient.java" script="/docs/how-to/java-client/snippets/JavaClient.java"
catalogs.deleteCatalog("retail", true);
```

## Next steps

- To query tables from the JVM, use Spark with the Unity Catalog connector:
  [Configure Spark for Unity Catalog](/docs/how-to/configure-spark/).
- For the same tasks from Python, see
  [Manage catalogs and schemas](/docs/how-to/manage-catalogs-and-schemas/).
