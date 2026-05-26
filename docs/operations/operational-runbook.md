# Operational Runbook

This runbook collects the day-to-day commands and checks for running Sapling locally or in a small self-hosted deployment. The root `README.md` remains the broad setup guide; this file is the shorter "what do I do now?" reference for operators and AI agents.

## System Shape

Sapling consists of:

- NestJS backend in `backend`
- Vue/Vite frontend in `frontend`
- PostgreSQL database, ideally with pgvector
- optional Redis for BullMQ queues
- local file storage under `backend/storage`
- backend logs under `backend/log` or the configured `LOG_OUTPUT_PATH`
- seed data under `backend/src/database/seeder/json-${DB_DATA_SEEDER}`

## Core Commands

From the repository root:

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend

npm run debug
npm run build
npm run verify
npm run orm:deploy
```

Backend-only:

```bash
npm run start:dev --prefix backend
npm run build --prefix backend
npm run test --prefix backend -- --runInBand
npm run orm:migrate --prefix backend
npm run orm:seed --prefix backend
npm run orm:deploy --prefix backend
```

Frontend-only:

```bash
npm run start:dev --prefix frontend
npm run build --prefix frontend
npm run test:unit --prefix frontend -- --run
npm run type-check --prefix frontend
```

## Environment Files

Create local environment files from defaults:

```bash
cp backend/.env.default backend/.env
cp frontend/.env.default frontend/.env
```

Minimum backend values to verify:

- `SAPLING_SECRET`
- `SAPLING_FRONTEND_URL`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_DATA_SEEDER`
- `SESSION_COOKIE_SECURE`
- `SESSION_TRUST_PROXY`
- `REDIS_ENABLED`
- `LOG_*`

Minimum frontend values to verify:

- `VITE_BACKEND_URL`
- `VITE_PORT`
- login visibility flags for Azure/Google if relevant

Never place secrets in `frontend/.env`; Vite exposes `VITE_*` values to the browser bundle.

## First Start

1. Install dependencies.
2. Start PostgreSQL.
3. Optionally start Redis.
4. Configure `backend/.env` and `frontend/.env`.
5. Run `npm run orm:deploy --prefix backend`.
6. Start the app with `npm run debug`.
7. Open frontend, backend API, and Swagger:

```text
http://localhost:5173
http://localhost:3000
http://localhost:3000/api/swagger
```

## Database Operations

Use migrations before seeders:

```bash
npm run orm:migrate --prefix backend
npm run orm:seed --prefix backend
```

For a fresh or updated environment, use:

```bash
npm run orm:deploy --prefix backend
```

Seeder behavior:

- Seed files are selected from `json-${DB_DATA_SEEDER}`.
- Successful files are recorded in `seed_script_item`.
- Already successful files are skipped later.
- New reference data should be delivered in newly numbered JSON files.
- Translation seeding can update existing translations by handle/property semantics where the seeder supports it.

If a seed file must be rerun intentionally, inspect `seed_script_item` first and decide whether to remove only the matching script marker. Do not broadly truncate seed tracking in an environment with real data.

## Queue And Redis Operations

Redis is optional but recommended for asynchronous deliveries and retries.

When `REDIS_ENABLED=false`, some delivery flows execute directly or run without queue behavior.

When `REDIS_ENABLED=true`, verify:

- Redis host and port are reachable.
- Credentials match `REDIS_USERNAME` and `REDIS_PASSWORD`.
- retry settings are reasonable: `REDIS_ATTEMPTS`, `REDIS_BACKOFF_*`
- cleanup settings match operational needs: `REDIS_REMOVE_ON_FAIL`, `REDIS_REMOVE_ON_COMPLETE`

Queue-backed areas include mail, Teams, calendar/event delivery, webhooks, and AI/vectorization-style background processing depending on the feature path.

## Storage Operations

Uploaded documents are stored below:

```text
backend/storage/<entityHandle>/<uuid>
```

The database stores metadata in `DocumentItem`, including original filename, MIME type, file length, entity handle, and record reference.

Operational checks:

- Back up `backend/storage` together with the database.
- Keep storage and database snapshots aligned.
- Watch disk usage if uploads are heavily used.
- Configure reverse proxy upload limits consistently with frontend/backend limits.

## Logs

Backend logging is controlled by `LOG_*` in `backend/.env`.

Check:

- request logs for HTTP errors and authentication issues
- server logs for backend exceptions
- queue/delivery logs for failed retries
- webhook delivery records for provider responses
- email/Teams/event delivery records for integration responses

Typical local paths:

```text
backend/log
backend/storage
```

## Health Checks

After deployment or an update:

1. Backend starts without migration errors.
2. Frontend loads and can call `/api/current/person`.
3. Login works for the intended providers.
4. Swagger opens.
5. Generic list for a common entity loads.
6. A table row can open its dialog.
7. Inbox/open task counters update after a relevant change.
8. File upload/download works for one test record.
9. Optional Redis-backed deliveries can enqueue and complete.
10. Semantic search works if AI/vectorization is enabled.

## Deployment Order

For a self-hosted update:

```bash
git pull
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run build
npm run orm:deploy --prefix backend
```

Then restart the backend process and refresh the frontend deployment.

For PM2-style backend hosting:

```bash
pm2 restart sapling-backend
pm2 logs sapling-backend
```

For Nginx changes:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Common Incidents

### Frontend Cannot Reach Backend

Check:

- `VITE_BACKEND_URL`
- backend process status
- browser network tab
- CORS origin via `SAPLING_FRONTEND_URL`
- reverse proxy `/api/` routing

### Login Fails

Check:

- local user is active
- password hash settings match existing hashes
- session cookie secure/sameSite settings match HTTP vs HTTPS
- Azure/Google callback URLs match provider app settings
- `SESSION_TRUST_PROXY` behind reverse proxies

### Migrations Fail

Check:

- database credentials
- database user privileges
- pgvector availability for vector columns
- whether a previous migration partially applied
- generated migration order

Do not manually edit production schema unless the migration path is understood and backed up.

### Seeders Skip Expected Data

Check:

- `DB_DATA_SEEDER`
- JSON path under `json-production` or `json-demonstration`
- `seed_script_item`
- whether the new data was placed in an already executed file

Prefer adding a new numbered seed file over editing a previously executed one.

### Upload Or Preview Fails

Check:

- `DocumentItem` exists
- referenced entity and record still exist
- file exists under `backend/storage`
- backend process can read the file
- MIME type is previewable; inline preview is PDF-focused
- proxy `client_max_body_size` and frontend upload limit

### Queue Jobs Do Not Run

Check:

- Redis container/process
- `REDIS_ENABLED`
- Redis credentials
- backend logs for BullMQ connection errors
- delivery records for pending/failed status

### Semantic Search Is Empty

Check:

- pgvector extension/database image
- active AI provider model for embeddings
- vectorization run status
- `AiVectorDocumentItem` rows for the entity
- current user's read permission on source records
- whether the target entity is included in vectorization config

### Webhooks Fail

Check:

- subscription is active
- target URL and method
- auth mode and credentials
- custom headers
- endpoint timeout
- delivery response payload and status
- HMAC signature verification on receiver side
- retry state and `nextRetryAt`

## Backup Notes

Back up these together:

- PostgreSQL database
- `backend/storage`
- production `.env` files through a secure secret-management process

Do not rely on seeders as a backup for live business records. Seeders restore reference/configuration data, not current operational state.

## Change Safety Checklist

Before applying a risky change:

- database backup exists
- storage backup exists if documents are affected
- migration has been reviewed
- seed files are newly numbered when needed
- rollback strategy is clear
- verification commands are known
- affected integrations can be retried

After applying it:

- run smoke checks
- inspect backend logs
- inspect failed delivery records
- verify user-facing flows
- record any manual intervention

