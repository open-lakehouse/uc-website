---
title: Configure AWS storage credentials and external locations
summary: Run Unity Catalog on AWS under a master IAM role, register an S3
  storage role as a storage credential, bind an S3 prefix to it with an external
  location, and check that the server vends scoped credentials.
diataxis: how-to
---

A [Unity Catalog](/docs/explanation/what-is-unity-catalog/ "The open-source reference server implementing the Unity Catalog specification.") server governs access to Amazon S3
through storage credentials and external locations, and it never hands out
long-lived keys.
When an authorized client needs data, the server assumes an IAM role through
AWS STS and returns credentials that expire after an hour and are scoped to the
path the client asked for. For why this matters, see
[Credential vending](/docs/explanation/credential-vending/).

Three IAM principals and two catalog objects are involved:

| Name on this page                 | What it is                                                                     | Where it lives                     |
| --------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------- |
| Master role `uc-master`           | The identity the server runs as. It may only assume storage roles.             | IAM, attached to the server's host |
| Storage role `uc-storage-lake`    | Reads and writes one bucket or prefix. It trusts the master role.              | IAM                                |
| Storage credential `lake_storage` | Records the storage role's ARN, plus an external ID that the server generates. | Unity Catalog                      |
| External location `lake`          | Binds `s3://amzn-s3-demo-bucket/lake` to the storage credential.               | Unity Catalog                      |

When a client requests access to a path under `s3://amzn-s3-demo-bucket/lake`, the server
finds the matching external location, assumes its credential's storage role
as the master role with the credential's external ID, and attaches a session
policy that narrows access to the requested path and operation.

:::prerequisites
- [Docker](https://docs.docker.com/get-started/get-docker/) with Compose v2, for the local environment.
- Unity Catalog 0.7.0 with simulated S3 and PostgreSQL, running: [Run a local Unity Catalog server](/docs/how-to/run-local-server/#start-the-server-with-simulated-s3).
- In AWS, permission to create IAM roles and policies, and to edit the bucket's
  policy if it has one.
- [uv](https://docs.astral.sh/uv/getting-started/installation/), for the Python
  examples.
:::

To try the steps without an AWS account, use the local environment above with
simulated S3. It runs the server's real AWS code path, but it doesn't check
trust policies or external IDs, so do the IAM steps for real on AWS.

## Set up the client

Set up the client for your interface:

:::tab[Python SDK]
Start Python with the SDK:

```bash
uv run --with unitycatalog-client==0.7.0 --with obstore==0.11.1 python -m asyncio
```

```python title="aws_storage.py" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.py"
from obstore.store import from_url
from unitycatalog.client import (
    ApiClient,
    AwsIamRoleRequest,
    Configuration,
    CreateCredentialRequest,
    CreateExternalLocation,
    CredentialPurpose,
    CredentialsApi,
    ExternalLocationsApi,
    GenerateTemporaryPathCredential,
    PathOperation,
    TemporaryCredentialsApi,
    UpdateCredentialRequest,
    UpdateExternalLocation,
)

config = Configuration(host="http://localhost:8080/api/2.1/unity-catalog")
```

Create the API objects from an open client:
`async with ApiClient(config) as api: credentials = CredentialsApi(api)`.
:::

:::tab[CLI]
```bash title="aws_storage.sh" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.sh"
uc() { docker exec unitycatalog bin/uc "$@"; }
UC=http://localhost:8080/api/2.1/unity-catalog
```

The CLI connects to `http://localhost:8080` by default. Pass `--server` and
`--auth_token` to reach a different server.
:::

## Run the server as a master role

Create an IAM role for the server, for example `uc-master`, with a permission
policy that allows only `sts:AssumeRole` on your storage roles. A name prefix
keeps the policy stable as you add storage roles:

```json title="uc-master permission policy"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AssumeUnityCatalogStorageRoles",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::123456789012:role/uc-storage-*"
    }
  ]
}
```

Attach the role to wherever the server runs: an EC2 instance profile, an ECS
task role, or an EKS service account through IRSA or EKS Pod Identity. Then set
the role's ARN and region in `server.properties`:

```properties title="server.properties (on AWS)"
# Unity Catalog running on AWS as the master role.
aws.masterRoleArn=arn:aws:iam::123456789012:role/uc-master
aws.region=us-east-1
```

Leave `aws.accessKey` and `aws.secretKey` unset. The server then signs its STS
calls through the AWS SDK's default credential chain, which picks up the
attached role. `aws.masterRoleArn` doesn't select an identity. The server
reports it to whoever creates a storage credential, as the principal that the
storage role must trust, so it must match the role the server actually runs as.

The server reads each key from a JVM system property first, then from an
environment variable with the same name (for example `aws.region`), then from
`server.properties`. If `aws.region` is unset, the server uses the AWS SDK's
region chain, then the global STS endpoint.

:::note
Use exactly these key names. The `aws.s3.masterRoleArn`-style spellings in the
upstream `docs/server/aws.md` are silently ignored by the server.
:::

### Run outside AWS

On premises, prefer
[IAM Roles Anywhere](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/introduction.html):
it gives the host temporary credentials for the master role through the same
default credential chain, so the configuration above doesn't change. If that
isn't possible, use an IAM user as the master identity. Grant it the same
policy, set `aws.masterRoleArn` to the user's ARN, and pass its keys in
`aws.accessKey` and `aws.secretKey` (or the standard `AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY` variables). The local stack does this, with its simulated
S3 keys.

## Create a storage credential

First create the storage role in IAM, for example `uc-storage-lake`. Give it a
permission policy on the bucket and prefix it serves. A temporary trust policy
is enough for now; you replace it once the server has generated the external
ID.

```json title="uc-storage-lake permission policy"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadWriteObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": "arn:aws:s3:::amzn-s3-demo-bucket/lake/*"
    },
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::amzn-s3-demo-bucket"
    }
  ]
}
```

The server narrows each vended credential to object reads (`s3:GetO*`) and
prefix-scoped `s3:ListBucket`, or for writes, also `s3:PutO*`, `s3:DeleteO*`,
and the multipart actions. Actions the storage role lacks stay denied, so grant
everything your engines need. Engines such as Spark may also call
`s3:GetBucketLocation`.

Then register the role with Unity Catalog:

:::tab[Python SDK]
```python title="aws_storage.py" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.py"
cred = await credentials.create_credential(
    CreateCredentialRequest(
        name="lake_storage",
        purpose=CredentialPurpose.STORAGE,
        aws_iam_role=AwsIamRoleRequest(
            role_arn="arn:aws:iam::123456789012:role/uc-storage-lake"
        ),
        comment="Read/write on s3://amzn-s3-demo-bucket/lake",
    )
)
# Put both values in the storage role's trust policy.
print(cred.aws_iam_role.unity_catalog_iam_arn)
print(cred.aws_iam_role.external_id)
```
:::

:::tab[CLI]
```bash title="aws_storage.sh" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.sh"
uc credential create --name lake_storage \
  --aws_iam_role_arn arn:aws:iam::123456789012:role/uc-storage-lake \
  --comment "Read/write on s3://amzn-s3-demo-bucket/lake" \
  --output jsonPretty
```
:::

The response's `aws_iam_role` holds three values: `role_arn` (the storage
role), `unity_catalog_iam_arn` (the server's `aws.masterRoleArn`), and
`external_id`, a UUID the server generated for this credential.

**Required privileges:** ownership of the metastore, or `CREATE STORAGE
CREDENTIAL` on it.

## Update the storage role's trust policy

Replace the storage role's trust policy so that only the master role can assume
it, and only with this credential's external ID. The external ID stops another
tenant of the same server from pointing their own credential at your role.

```json title="uc-storage-lake trust policy"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/uc-master"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "EXTERNAL_ID_FROM_THE_CREDENTIAL"
        }
      }
    }
  ]
}
```

Substitute `unity_catalog_iam_arn` for the principal and `external_id` for
`EXTERNAL_ID_FROM_THE_CREDENTIAL`. If the master identity is an IAM user, use
the user's ARN as the principal.

## Create an external location

An external location makes the server use the credential for every path under
its URL:

:::tab[Python SDK]
```python title="aws_storage.py" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.py"
location = await locations.create_external_location(
    CreateExternalLocation(
        name="lake",
        url="s3://amzn-s3-demo-bucket/lake",
        credential_name="lake_storage",
    )
)
print(location.url, location.credential_name)
```
:::

:::tab[CLI]
```bash title="aws_storage.sh" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.sh"
uc external_location create --name lake \
  --url s3://amzn-s3-demo-bucket/lake \
  --credential_name lake_storage \
  --output jsonPretty
```
:::

External locations can't overlap. The server rejects a URL that equals, contains,
or falls inside another external location's URL, with
`Cannot accept an external location that duplicates or overlaps with existing external location`.
Use one location per prefix that has its own storage role.

**Required privileges:** ownership of the metastore; or `CREATE EXTERNAL
LOCATION` on the metastore plus ownership of, or `CREATE EXTERNAL LOCATION` on,
the storage credential.

## Check that the server vends credentials

Ask for temporary credentials on a path under the location. A successful
response proves the whole chain: the server's identity, the trust policy, the
external ID, and the storage role's access.

:::tab[Python SDK]
The example writes and lists a file with the vended keys:

```python title="aws_storage.py" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.py"
vended = await TemporaryCredentialsApi(api).generate_temporary_path_credentials(
    GenerateTemporaryPathCredential(
        url="s3://amzn-s3-demo-bucket/lake/landing",
        operation=PathOperation.PATH_READ_WRITE,
    )
)
aws = vended.aws_temp_credentials
store = from_url(
    vended.url,
    access_key_id=aws.access_key_id,
    secret_access_key=aws.secret_access_key,
    session_token=aws.session_token,
    region="us-east-1",
)
await obstore.put_async(store, "hello.txt", b"vended by Unity Catalog\n")
print([meta["path"] for meta in await obstore.list(store).collect_async()])
```
:::

:::tab[CLI]
The `uc` CLI has no command for this, so call the REST API:

```bash title="aws_storage.sh" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.sh"
curl -s -X POST "$UC/temporary-path-credentials" \
  -H 'Content-Type: application/json' \
  -d '{"url": "s3://amzn-s3-demo-bucket/lake/landing", "operation": "PATH_READ"}'
```

To use the keys with the AWS CLI, export `access_key_id`, `secret_access_key`,
and `session_token` as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and
`AWS_SESSION_TOKEN`.
:::

The credentials reach only the requested path. A write to
`s3://amzn-s3-demo-bucket/lake/curated` with keys vended for `s3://amzn-s3-demo-bucket/lake/landing` is
denied. If the request fails with `AccessDenied` from STS, check the trust policy
and the external ID first. Tables and volumes use the same mechanism. Their
credential endpoints resolve the object's storage location to its external
location.

**Required privileges:** for a path that no table, volume, or registered model
owns, ownership of the metastore or of the external location, or `READ FILES`
on the location (`PATH_READ`) or both `READ FILES` and `WRITE FILES`
(`PATH_READ_WRITE`). For a path inside a table or volume, the usual privileges
on that object apply instead, such as `SELECT` on a table or `READ VOLUME` on a
volume.

## View storage credentials and external locations

:::tab[Python SDK]
```python title="aws_storage.py" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.py"
info = await credentials.get_credential(name="lake_storage")
print(info.aws_iam_role.role_arn)
listed = await locations.list_external_locations()
print([(loc.name, loc.url) for loc in listed.external_locations or []])
```
:::

:::tab[CLI]
```bash title="aws_storage.sh" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.sh"
uc credential get --name lake_storage --output jsonPretty
uc external_location list --output jsonPretty
```
:::

The CLI's `credential` and `external_location` commands take the flags
`--name`, `--aws_iam_role_arn`, `--url`, `--credential_name`, `--comment`,
`--new_name`, and `--force`. Their `--help` pages crash.

**Required privileges:** ownership of the metastore, or ownership of (or
`CREATE EXTERNAL LOCATION` on) the credential. For an external location:
ownership, or any of `READ FILES`, `WRITE FILES`, `CREATE EXTERNAL TABLE`,
`CREATE EXTERNAL VOLUME`, and `CREATE MANAGED STORAGE` on it.

## Update a credential or external location

To move a credential to a different storage role, update its role ARN:

:::tab[Python SDK]
```python title="aws_storage.py" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.py"
updated = await credentials.update_credential(
    name="lake_storage",
    update_credential_request=UpdateCredentialRequest(
        aws_iam_role=AwsIamRoleRequest(
            role_arn="arn:aws:iam::123456789012:role/uc-storage-lake-v2"
        ),
    ),
)
print(updated.aws_iam_role.external_id)  # a new ID: update the trust policy
```
:::

:::tab[CLI]
```bash title="aws_storage.sh" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.sh"
uc credential update --name lake_storage \
  --aws_iam_role_arn arn:aws:iam::123456789012:role/uc-storage-lake-v2 \
  --output jsonPretty
```
:::

:::warning
Changing the role ARN generates a new `external_id`. Vending fails until the
new storage role's trust policy names the new ID. Update the trust policy right
after the credential. A comment or name change keeps the ID.
:::

Update an external location's comment, name, credential, or URL the same way:

:::tab[Python SDK]
```python title="aws_storage.py" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.py"
await locations.update_external_location(
    name="lake",
    update_external_location=UpdateExternalLocation(
        comment="Landing and curated data"
    ),
)
```
:::

:::tab[CLI]
```bash title="aws_storage.sh" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.sh"
uc external_location update --name lake \
  --comment "Landing and curated data" \
  --output jsonPretty
```
:::

:::warning
The server doesn't check what lives under a location before it accepts
a new URL. Tables, volumes, and managed storage roots under the old URL lose
their credential, and vending for them fails with `FAILED_PRECONDITION`. Before
you change a URL, create the new location alongside the old one if the
prefixes don't overlap, and move the data first.
:::

**Required privileges:** for a credential, ownership of it or of the metastore.
For an external location, ownership of the metastore, or ownership of the
location plus ownership of (or `CREATE EXTERNAL LOCATION` on) any new
credential.

## Delete an external location and credential

Delete the location first, then the credential:

:::tab[Python SDK]
```python title="aws_storage.py" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.py"
await locations.delete_external_location(name="lake")
await credentials.delete_credential(name="lake_storage")
```
:::

:::tab[CLI]
```bash title="aws_storage.sh" script="/docs/how-to/configure-aws-storage/snippets/aws_storage.sh"
uc external_location delete --name lake
uc credential delete --name lake_storage
```
:::

An external location can't be deleted while a table, volume, or registered
model is stored under it. Catalog and schema storage roots don't count. A
credential can't be deleted while an external location uses it. `force` skips
these checks. Deleting either object removes only the catalog entry. The data
in S3 and the IAM roles stay.

:::danger
Always delete the location before its credential. Force-deleting a credential
that a location still uses breaks every list of external locations. To
recover, force-delete the location by name:
`uc external_location delete --name <name> --force true`.
:::

**Required privileges:** ownership of the object or of the metastore.

## Next steps

- [Set managed storage for catalogs and schemas on S3](/docs/how-to/managed-storage-s3/)
  to put managed tables and volumes under this external location.
- [Configure Spark to use Unity Catalog](/docs/how-to/configure-spark/): Spark
  needs `hadoop-aws` on the classpath to use vended S3 credentials.
- [Manage volumes](/docs/how-to/manage-volumes/) with `s3://` locations
  under the external location.
