# CRM database baseline and migration recovery

## Why this exists

The two July 2026 migrations create the original single-tenant tables but never introduce the multi-tenant schema. The November 2 onboarding migration assumes `tenants` exists, so replaying the legacy chain on an empty database fails with P3018/MySQL 1146. The failure is recorded in Actions runs 45396967984, 45397332836 and 45414000705. Historical SQL and checksums are deliberately untouched.

The frozen pre-contact schema is the exact schema from commit a189ccdbcafdbdd230073cfece0f78acee97f1e9 (blob 935253a953aa8ae45526e6cfd3d05e704c1170f7). Earlier onboarding data backfills operate on existing rows; a truly empty database has no rows to backfill.

## New local/dev installations only

Create a new empty MySQL database using your normal DBA tooling. Set DATABASE_URL in the backend environment to that database on a loopback host. Configure the matching DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD and DATABASE_NAME for the app. Use a dedicated local instance, not a tunnel or proxy to a remote database. The bootstrap uses a TLS-enabled local MySQL connection (including local self-signed certificates, as supported by the existing application adapter). Enable TLS on the local server. No remote TLS settings are changed. Do not allow concurrent migrations or access during bootstrap.

From backend:

```sh
npm ci
npx prisma generate
npm run db:bootstrap:local -- --database crm_dev --confirm-empty
```

Replace crm_dev with the exact newly created database name. The command rejects remote URLs, mismatched names, system databases, and any existing schema objects (including a migration history table). It generates the historical baseline DDL, checks schema equivalence, records only the eight historical migrations as represented by that baseline, then runs ordinary Prisma migrate deploy for the three contact migrations, upstream email-template schema migration, and any later migrations. It checks migration status and schema diff afterward. It does not seed any business data, drop tables or reset the database.

A failed or interrupted bootstrap may leave a partially initialized database. Do not rerun it or manually mark migrations applied. Inspect the error; for a disposable newly created database, create another empty database and retry. This is not a recovery procedure for existing data.

## Existing databases and deployment

Never run the bootstrap against an existing installation. Obtain a backup and a staging clone, inspect the real migration ledger and compare the live schema to the frozen pre-contact schema. Confirm historical migration records and prerequisites; then use ordinary migrate deploy only after a reviewed upgrade plan. Any missing historical ledger entries or schema drift need a separately approved reconciliation. Do not mark migrations applied merely to suppress errors. Production migration authorization remains outside this contact-page PR.

CI exercises the empty-database baseline, verifies the migration ledger and schema, verifies a second bootstrap is refused, and runs the backend HTTP and regression suites. The earlier isolated upgrade test independently proved the three new migration SQL files match the current schema. The unsupported raw historical replay remains a documented known issue, not a passing test.

Upstream email templates were introduced without SQL migration history. The added migration creates the table when absent; if already present, compare its exact columns, constraints and indexes against Prisma before deployment. Never assume an existing table is compatible merely because its name exists.
