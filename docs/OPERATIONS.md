# SIDPRO Operations

Target awal: VPS dan Docker Compose.

Service utama: web, api, worker, database, cache, storage, reverse proxy.

Command development: install, dev, lint, typecheck, test, build.

Pipeline: install, lint, typecheck, test, build, validate database schema, build container.

Release steps: pull code, check config, install dependencies, run validation, build, migrate, start services, check health.

Backup: database and uploaded files.

Rollback: previous commit, previous image, migration note, backup location, restore step, healthcheck.
