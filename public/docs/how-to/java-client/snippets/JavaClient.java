///usr/bin/env jbang "$0" "$@" ; exit $?
//JAVA 11+
//DEPS io.unitycatalog:unitycatalog-client:0.7.0

// Manage Unity Catalog objects from Java with the unitycatalog-client SDK.
//
// It connects to the docs' local server on http://localhost:8080 (start it
// from uc-docs-env/unitycatalog with `docker compose up -d --wait`), creates
// the catalog `retail` with the schema `retail.sales`, registers an external
// Delta table, looks it up, and deletes the catalog again. Run it with
// `jbang JavaClient.java`; the checks at the end of `main` test the result.

import io.unitycatalog.client.ApiClient;
import io.unitycatalog.client.ApiClientBuilder;
import io.unitycatalog.client.ApiException;
import io.unitycatalog.client.api.CatalogsApi;
import io.unitycatalog.client.api.SchemasApi;
import io.unitycatalog.client.api.TablesApi;
import io.unitycatalog.client.auth.TokenProvider;
import io.unitycatalog.client.model.CatalogInfo;
import io.unitycatalog.client.model.ColumnInfo;
import io.unitycatalog.client.model.ColumnTypeName;
import io.unitycatalog.client.model.CreateCatalog;
import io.unitycatalog.client.model.CreateSchema;
import io.unitycatalog.client.model.CreateTable;
import io.unitycatalog.client.model.DataSourceFormat;
import io.unitycatalog.client.model.ListCatalogsResponse;
import io.unitycatalog.client.model.TableInfo;
import io.unitycatalog.client.model.TableType;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class JavaClient {
  public static void main(String[] args) throws ApiException {
    String token = System.getenv().getOrDefault("UC_TOKEN", "not-checked");
    ApiClient client = ApiClientBuilder.create()
        .uri("http://localhost:8080")
        .tokenProvider(TokenProvider.create(Map.of("type", "static", "token", token)))
        .addAppVersion("orders-app", "1.0.0")
        .build();

    CatalogsApi catalogs = new CatalogsApi(client);
    SchemasApi schemas = new SchemasApi(client);
    TablesApi tables = new TablesApi(client);
    reset(catalogs);

    CatalogInfo catalog = catalogs.createCatalog(new CreateCatalog()
        .name("retail")
        .comment("Order and customer data for the retail team")
        .properties(Map.of("owner_team", "retail-analytics")));
    schemas.createSchema(new CreateSchema().name("sales").catalogName("retail"));

    List<String> names = new ArrayList<>();
    String pageToken = null;
    do {
      ListCatalogsResponse page = catalogs.listCatalogs(pageToken, 1);
      page.getCatalogs().forEach(c -> names.add(c.getName()));
      pageToken = page.getNextPageToken();
    } while (pageToken != null && !pageToken.isEmpty());
    System.out.println(names);

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

    tables.listTables("retail", "sales", 50, null).getTables()
        .forEach(t -> System.out.println(t.getName() + " " + t.getTableType()));

    TableInfo found = tables.getTable("retail.sales.orders", false, false);
    System.out.println(found.getStorageLocation());
    found.getColumns().forEach(c -> System.out.println(c.getName() + " " + c.getTypeText()));
    List<String> columns = found.getColumns().stream().map(ColumnInfo::getName).toList();

    int status = 0;
    try {
      tables.getTable("retail.sales.returns", false, false);
    } catch (ApiException e) {
      status = e.getCode();
      System.out.println("HTTP " + status + ": " + e.getResponseBody());
    }

    int nonEmpty = 0;
    try {
      catalogs.deleteCatalog("retail", false);
    } catch (ApiException e) {
      nonEmpty = e.getCode();
    }

    catalogs.deleteCatalog("retail", true);
    int gone = 0;
    try {
      catalogs.getCatalog("retail");
    } catch (ApiException e) {
      gone = e.getCode();
    }

    check(catalog.getProperties().equals(Map.of("owner_team", "retail-analytics")), catalog);
    check(names.contains("retail") && names.contains("unity"), names);
    check(found.getTableType() == TableType.EXTERNAL, found.getTableType());
    check(found.getStorageLocation().startsWith("file:///tmp/uc-docs/retail/orders"), found);
    check(columns.equals(List.of("order_id", "amount")), columns);
    check(status == 404, status);
    check(nonEmpty == 400, nonEmpty);
    check(gone == 404, gone);
  }

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

  /** Start from an empty server, so a rerun doesn't trip over its own catalog. */
  static void reset(CatalogsApi catalogs) throws ApiException {
    try {
      catalogs.deleteCatalog("retail", true);
    } catch (ApiException e) {
      if (e.getCode() != 404) throw e;
    }
  }

  // Java's `assert` is off unless the JVM runs with -ea, so check explicitly.
  static void check(boolean ok, Object got) {
    if (!ok) throw new AssertionError("unexpected result: " + got);
  }
}
