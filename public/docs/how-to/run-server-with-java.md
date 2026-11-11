---
title: Run the Unity Catalog server with Java
summary: Start the Unity Catalog server from its published Maven artifact with
  JBang, without Docker, and keep its metadata in an H2 file between restarts.
diataxis: how-to
project: unitycatalog
canonical: https://unitycatalog.io/docs/how-to/run-server-with-java/
companions:
  - url: "https://unitycatalog.io/docs/how-to/run-server-with-java/snippets/run_server.sh"
    kind: shell
    purpose: "Run the Unity Catalog server from its Maven artifact with JBang, keep its metadata in an H2 file, and query it. Each region is one step of the page."
    run: "bash run_server.sh"
---

## Companion files

CI-tested scripts that run this page's examples end to end. A script that exits 0 has passed its checks.

- [`run_server.sh`](https://unitycatalog.io/docs/how-to/run-server-with-java/snippets/run_server.sh) (Shell): Run the Unity Catalog server from its Maven artifact with JBang, keep its metadata in an H2 file, and query it. Each region is one step of the page.
  - run: `bash run_server.sh`

The [Unity Catalog](https://unitycatalog.io/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") server is published to Maven Central as a runnable jar, `io.unitycatalog:unitycatalog-server:0.7.0`. [JBang](https://www.jbang.dev) downloads it with its dependencies and starts it, so you can run the server on any machine with a JDK, without Docker or a source checkout. To run it in a container instead, see [Run a local Unity Catalog server](https://unitycatalog.io/docs/how-to/run-local-server/).

> **Prerequisites**
>
> - A JDK, version 17 or later.
> - [JBang](https://www.jbang.dev/download/).
> - `curl`, to call the server.

## Start the server

Make a folder for the server and start it from there:

`run_server.sh`

```bash
mkdir -p uc-server && cd uc-server
jbang io.unitycatalog:unitycatalog-server:0.7.0 --port 8080
```

The first start downloads the server's dependencies. The server then runs in the foreground on `http://localhost:8080`, and prints its banner. Stop it with Ctrl+C. To use another port, change `--port`.

The server reads its configuration from `etc/conf/` under the folder it starts in, so always start it from the same folder. On first start it creates the folder and writes:

- `private_key.der`, `public_key.der`, and `key_id.txt`: the key pair the server signs its tokens with.
- `token.txt`: a token for the `admin` user, written again on every start. Clients use it when authorization is enabled. See [Core concepts](https://unitycatalog.io/docs/explanation/uc-basics/).
- `certs.json`: the public key, for verifying the server's tokens.

## Check that it's running

In another terminal, list the catalogs:

`run_server.sh`

```bash
curl -s http://localhost:8080/api/2.1/unity-catalog/catalogs
```

A new server has no catalogs: `{"catalogs":[],"next_page_token":null}`. Unlike the container image, it doesn't load the sample catalog `unity`. Create one:

`run_server.sh`

```bash
curl -s -X POST http://localhost:8080/api/2.1/unity-catalog/catalogs \
  -H 'Content-Type: application/json' -d '{"name": "retail"}'
```

## Keep the metadata between restarts

Without configuration, the server keeps its metadata in an in-memory H2 database, so a restart discards every catalog. To keep it in an H2 file instead, stop the server and write `etc/conf/hibernate.properties` from the folder you started it in:

`run_server.sh`

```bash
cd uc-server
cat > etc/conf/hibernate.properties <<'EOF'
hibernate.connection.driver_class=org.h2.Driver
hibernate.connection.url=jdbc:h2:file:./etc/db/h2db;DB_CLOSE_DELAY=-1
hibernate.hbm2ddl.auto=update
EOF
```

Start the server again. It creates its tables in `etc/db/` and keeps them across restarts.

For a database other people or servers share, use PostgreSQL. The server artifact doesn't depend on the PostgreSQL JDBC driver, so add `org.postgresql:postgresql` to the server's classpath, then follow [Configure PostgreSQL as the metadata database](https://unitycatalog.io/docs/how-to/configure-backend-db/).

## Configure the server

The server reads two more optional files from `etc/conf/`:

- `server.properties`: server settings, such as `server.authorization` (`disable` by default) and the storage credentials described in [Configure AWS storage credentials and external locations](https://unitycatalog.io/docs/how-to/configure-aws-storage/). Without the file, every setting takes its default.
- `server.log4j2.properties`: the [Log4j 2](https://logging.apache.org/log4j/2.x/manual/configuration.html) configuration. Without it, the server logs nothing beyond its banner and errors.

Restart the server after you change a file.

## Next steps

- Connect an application: [Use the Java client in an application](https://unitycatalog.io/docs/how-to/java-client/).
