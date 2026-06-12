# Testing And Verification

This document describes practical verification commands and testing conventions for Sapling.

## Root Commands

Run from repository root:

```bash
npm run type-check:backend
npm run type-check:frontend
npm run type-check
npm run test:backend
npm run test:frontend
npm run test
npm run verify
```

Meaning:

| Command | Purpose |
| --- | --- |
| `type-check:backend` | TypeScript check for NestJS/backend |
| `type-check:frontend` | Vue/TypeScript check through `vue-tsc` |
| `type-check` | Frontend and backend typechecks |
| `test:backend` | Backend Jest suite |
| `test:frontend` | Frontend Vitest suite |
| `test` | Backend and frontend tests |
| `verify` | Typechecks and tests |

## Backend Tests

Backend test runner:

```bash
npm test --prefix backend -- --runInBand
```

Target one or more spec files:

```bash
npm test --prefix backend -- generic-filter.service.spec.ts --runInBand
npm test --prefix backend -- sapling-mcp.service.spec.ts ai.service.spec.ts --runInBand
```

Backend test files live near the implementation:

```text
backend/src/**/*.spec.ts
```

Common backend test areas:

```text
backend/src/api/generic/*.spec.ts
backend/src/api/current/*.spec.ts
backend/src/api/ai/*.spec.ts
backend/src/api/mail/*.spec.ts
backend/src/api/teams/*.spec.ts
backend/src/api/webhook/*.spec.ts
backend/src/calendar/*.spec.ts
backend/src/auth/guard/*.spec.ts
backend/src/entity/global/*.spec.ts
```

Backend Jest config:

```text
backend/jest.config.cjs
```

Test support mocks:

```text
backend/test-support/
```

## Frontend Tests

Frontend test runner:

```bash
npm run test:unit --prefix frontend -- --run
```

Target one spec:

```bash
npm run test:unit --prefix frontend -- src/utils/__tests__/eventRecurrence.test.ts --run
```

Frontend test files live under:

```text
frontend/src/**/__tests__/*.test.ts
frontend/src/**/*.test.ts
```

Frontend Vitest config:

```text
frontend/vitest.config.ts
```

## Typechecks

Backend:

```bash
npm run type-check:backend
```

Uses:

```text
backend/tsconfig.typecheck.json
```

Frontend:

```bash
npm run type-check:frontend
```

Uses:

```text
vue-tsc --build
```

Run typechecks after most TypeScript, Vue, entity, DTO, or service changes.

## Formatting

Root commands:

```bash
npm run format:backend
npm run format:frontend
npm run format
```

For focused edits, use the local Prettier binaries:

```bash
./backend/node_modules/.bin/prettier --write <files>
./frontend/node_modules/.bin/prettier --write <files>
```

On Windows PowerShell:

```powershell
.\backend\node_modules\.bin\prettier.cmd --write <files>
.\frontend\node_modules\.bin\prettier.cmd --write <files>
```

Avoid formatting huge seed files unless needed; it can create noisy diffs.

## Verification By Change Type

### Entity Metadata Or Decorator Changes

Run:

```bash
npm run type-check:backend
npm run type-check:frontend
npm test --prefix backend -- entity.decorator.spec.ts --runInBand
```

Also inspect frontend dynamic field rendering if a new Sapling option was added.

### Generic API Changes

Run:

```bash
npm run type-check:backend
npm test --prefix backend -- generic-filter.service.spec.ts generic-query.service.spec.ts generic-payload.service.spec.ts generic-mutation.service.spec.ts generic-read.service.spec.ts --runInBand
```

Choose the relevant subset if the change is narrower.

### Frontend Dynamic UI Changes

Run:

```bash
npm run type-check:frontend
npm run test:unit --prefix frontend -- --run
```

For focused utility/composable changes, run the matching spec first.

### AI, MCP, Or Vectorization Changes

Run:

```bash
npm run type-check:backend
npm test --prefix backend -- sapling-mcp.service.spec.ts ai.service.spec.ts --runInBand
```

If vectorization logic changes, add/target specific vector tests when available. Also verify prompt/tool definitions remain aligned with supported entity handles.

### Seeder Or Migration Changes

Run:

```bash
npm run type-check:backend
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('<seed-file>','utf8'));"
```

When possible, verify on a disposable database:

```bash
npm run orm:migrate --prefix backend
npm run orm:seed --prefix backend
```

### Delivery Integration Changes

Run targeted backend tests for the integration:

```bash
npm test --prefix backend -- mail.service.spec.ts --runInBand
npm test --prefix backend -- teams.service.spec.ts --runInBand
npm test --prefix backend -- webhook.service.spec.ts webhook.processor.spec.ts --runInBand
npm test --prefix backend -- calendar.processor.spec.ts calendar-delivery.executor.spec.ts --runInBand
```

Pick the relevant set for the changed integration.

## Snapshot Of Useful Spec Areas

```text
backend/src/api/domain-endpoints.spec.ts
backend/src/api/integration-endpoints.spec.ts
backend/src/swagger/generic-entity-swagger.spec.ts
backend/src/session/*.spec.ts
backend/src/security/*.spec.ts
frontend/src/stores/__tests__/
frontend/src/services/__tests__/
frontend/src/utils/__tests__/
frontend/src/components/**/__tests__/
frontend/src/composables/**/__tests__/
```

## AI Agent Verification Guidance

- Prefer targeted tests first.
- Always run relevant typechecks after TypeScript/Vue/entity changes.
- For pure Markdown docs, tests are usually unnecessary.
- For JSON seed edits, parse the changed JSON files.
- For schema changes, mention if migrations were not executed locally.
- If a broad test suite is too expensive, state exactly which subset was run.
- For authenticated frontend behavior, prefer the already-open Codex in-app
  browser. If login is required, ask the user to open the target route there and
  sign in before treating browser verification as complete.

## Common Mistakes

- Running only frontend typecheck after changing backend DTOs used by frontend generation.
- Formatting entire translation seed files and creating noisy diffs.
- Forgetting `--runInBand` for backend Jest when isolation is important.
- Treating docs-only changes as needing full build verification.
- Not validating JSON after manual seed edits.
