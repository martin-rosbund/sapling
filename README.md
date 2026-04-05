# Sapling

Sapling is a full-stack CRM and operations platform for freelancers, small teams, and growing businesses. The repository is organized as a JavaScript/TypeScript monorepo with a NestJS backend and a Vue 3 frontend, making it suitable for both self-hosted and managed deployments.

## Overview

Sapling combines customer-facing workflows and internal operations in a single application:

- CRM and account management
- Ticketing and service workflows
- KPI dashboards and operational reporting
- Calendar-based planning and scheduling
- Local, Microsoft, and Google authentication
- Internationalized frontend experience
- AI-ready backend integrations
- Optional Redis-backed webhook and job processing

## Architecture

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | Vue 3, Vite, Vuetify, Pinia, Vue Router | Responsive application UI |
| Backend | NestJS, TypeScript, Passport.js | API, authentication, business logic |
| Database | PostgreSQL via MikroORM | Persistent application data |
| Queue / Events | BullMQ, Redis (optional) | Background jobs and webhook processing |
| AI Integrations | OpenAI, Gemini | AI-assisted features |
| Logging | Morgan, Log4js | Request and server logging |

## Key Features

- Modular backend API with a clear domain-oriented structure
- Modern frontend built with Vue 3 and Vuetify
- Multiple sign-in methods: local credentials, Microsoft, and Google
- KPI dashboards with operational metrics and reporting
- Ticketing, account, and scheduling capabilities
- Environment-based configuration for local and deployed setups
- Self-hosting friendly deployment model with PM2 and reverse proxy support

## Repository Structure

```text
sapling/
|-- backend/          NestJS API, auth, ORM, logging, integrations
|-- frontend/         Vue 3 application and UI assets
|-- log/              Runtime log output
|-- package.json      Root scripts for local orchestration
|-- LICENSE
`-- README.md
```

## Getting Started

### Prerequisites

Before running Sapling locally, make sure the following are available:

- Node.js 20.19+ or 22.12+
- npm
- PostgreSQL
- Redis (optional, only if enabled in backend configuration)

### Installation

Install dependencies for the root workspace and both applications:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Environment Setup

Create local environment files from the provided templates:

```bash
cd backend
cp .env.default .env

cd ../frontend
cp .env.default .env
```

Update the values to match your local environment, especially:

- Database connection settings in `backend/.env`
- `SAPLING_FRONTEND_URL` in `backend/.env`
- `VITE_BACKEND_URL` in `frontend/.env`
- OAuth credentials for Microsoft and Google if external login is enabled
- AI provider API keys if AI features are used

### Run the Project

From the repository root:

```bash
# Start backend and frontend in development/debug mode
npm run debug

# Start backend and frontend with production-style commands
npm run release
```

Default local endpoints:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## Available Scripts

### Root

| Command | Description |
| --- | --- |
| `npm run debug` | Starts backend and frontend together for development |
| `npm run release` | Starts backend and frontend together using production entry scripts |

### Backend

| Command | Description |
| --- | --- |
| `npm run start:dev --prefix backend` | Start backend in watch mode |
| `npm run build --prefix backend` | Build backend output |
| `npm run lint --prefix backend` | Lint backend sources |
| `npm run test --prefix backend` | Run backend unit tests |

### Frontend

| Command | Description |
| --- | --- |
| `npm run start:dev --prefix frontend` | Start Vite dev server |
| `npm run build --prefix frontend` | Build frontend assets |
| `npm run lint --prefix frontend` | Lint frontend sources |
| `npm run test:unit --prefix frontend` | Run frontend unit tests |
| `npm run type-check --prefix frontend` | Run Vue/TypeScript type checking |

## Configuration Notes

### Backend

The backend environment template includes settings for:

- PostgreSQL connectivity
- Redis and BullMQ
- webhook retries and timeouts
- JWT/session security
- request and server logging
- Microsoft and Google OAuth
- OpenAI and Gemini integration
- GitHub API integration

### Frontend

The frontend environment template includes settings for:

- backend API base URL
- frontend port and allowed hosts
- responsive layout defaults
- debug credentials for local development
- login provider toggles
- navigation and external service URLs

## Deployment

Sapling is structured to support straightforward self-hosted deployments:

- Build and serve the frontend as static assets
- Build and run the backend as a Node.js service
- Use PM2 or a similar process manager for backend uptime
- Place Nginx or another reverse proxy in front of the frontend and API

The repository also contains a GitHub Actions workflow at `.github/workflows/ionos_deploy.yml` for deployment automation to an IONOS-hosted environment.

## Logging

Application logs are written to the root `log/` directory. Log file names, retention, output targets, and log level are controlled through backend environment variables.

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE) for details.

