# Sapling

Sapling ist eine Full-Stack-Plattform für CRM, Service, operative Abläufe und teaminterne Zusammenarbeit. Die Anwendung bündelt Stammdaten, Tickets, Termine, Dateien, Kennzahlen und KI-gestützte Assistenz in einer gemeinsamen Oberfläche, damit Fachprozesse nicht auf mehrere Einzellösungen verteilt werden müssen.

Das Repository ist als JavaScript/TypeScript-Monorepo aufgebaut und kombiniert ein NestJS-Backend mit einem Vue-3-Frontend. Dadurch eignet sich Sapling sowohl für lokale Entwicklung als auch für selbst betriebene Ubuntu-Deployments mit PostgreSQL, optional Redis und einer klassischen Reverse-Proxy-Architektur.

## Overview

- **CRM und Stammdatenverwaltung:** Sapling verwaltet Unternehmen, Personen, Verträge, Produkte, Rollen und Beziehungen in einem generischen Datenmodell. Die Anwendung ist darauf ausgelegt, operative Kernobjekte konsistent zu erfassen, zu durchsuchen, zu filtern und in Tabellen-, Detail- und Timeline-Ansichten weiterzuverarbeiten.
- **Service, Tickets und operative Vorgänge:** Support- und Serviceprozesse lassen sich über Tickets, Notizen, Statusmodelle, Prioritäten und zugehörige Aktionen abbilden. So entsteht ein Arbeitsbereich, in dem Anfragebearbeitung, Zuständigkeiten und Nachverfolgung an einem Ort zusammenlaufen.
- **Kalender und Terminplanung:** Ereignisse, Planungsansichten und Zustell-/Synchronisationslogik für Kalender sind direkt in die Plattform integriert. Neben der Oberfläche für Termine gibt es auch Anbindungen an Microsoft- und Google-Kalender, damit operative Planung und externe Kalender nicht getrennt gepflegt werden müssen.
- **Dashboards und KPI-Auswertung:** Sapling enthält ein KPI-System mit Aggregationen, Zeiträumen, Trends, Sparklines und Drilldowns. Damit lassen sich operative Kennzahlen nicht nur anzeigen, sondern auch entlang der zugrunde liegenden Entitäten und Filterlogiken nachvollziehen.
- **Dokumente, Dateien und Kommunikation:** Die Plattform bringt Dateiverwaltung, Dateivorschauen, Mail-Funktionen und Dokumenttypen als eigene Fachbausteine mit. Dadurch können Informationen, Anhänge und Kommunikationsartefakte direkt an Geschäftsobjekten organisiert werden.
- **Rechte, Rollen und Anmeldung:** Authentifizierung per lokaler Anmeldung sowie Microsoft- und Google-Login ist bereits angelegt. In Kombination mit Rollen, Berechtigungen und Session-/Token-Schutz entsteht eine Anwendung, die unterschiedliche Nutzergruppen und Zugriffsebenen sauber voneinander trennt.
- **AI Integration:** Mit dem integrierten Assistenten "Songbird" verfügt Sapling über einen modernen AI-Chat mit Sitzungen, Modellwahl, Streaming-Antworten und Seitenkontext. Die KI kann damit nicht nur allgemeine Antworten liefern, sondern innerhalb der Anwendung mit aktuellem Kontext arbeiten und sich an aktiven Datensätzen orientieren.
- **MCP Server:** Einer der wichtigsten neueren Ausbauschritte ist die MCP-Unterstützung. Sapling bringt einen internen MCP-Server für sichere, berechtigungsabhängige Datenzugriffe mit und kann zusätzlich externe MCP-Server über HTTP oder `stdio` anbinden, um die KI um weitere Werkzeuge zu erweitern.
- **Integrationen und Automatisierung:** Webhooks, GitHub-Anbindung, Scripts, Systeminformationen und optionale Queue-Verarbeitung mit Redis/BullMQ erweitern die Plattform über klassische CRUD-Funktionen hinaus. Das macht Sapling nicht nur zu einer Datenbankoberfläche, sondern zu einer operativen Integrationsschicht für tägliche Arbeitsabläufe.

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

- Generisches Entity-Modell für CRM-, Service- und Betriebsdaten
- Tabellen-, Datei-, Partner- und Timeline-Ansichten für unterschiedliche Nutzungskontexte
- KPI-Dashboard mit Trends, Sparklines, Drilldowns und Favoriten
- Ticket-, Notiz-, Termin- und Dokumentenverwaltung in einer gemeinsamen Oberfläche
- Lokale Anmeldung sowie Microsoft- und Google-OAuth
- Rollen- und Berechtigungssystem pro Entität
- Integrierter AI-Chat mit Sitzungen, Modellumschaltung und Streaming
- Unterstützung für OpenAI- und Gemini-Modelle über konfigurierbare Provider
- Interner Sapling-MCP-Server für sichere Datenwerkzeuge im Benutzerkontext
- Externe MCP-Server-Konfiguration über HTTP- oder `stdio`-Transporte
- Webhooks, Mail-, GitHub-, Script- und Kalender-Integrationen
- Swagger-Dokumentation für das Backend unter `/api/swagger`
- Self-hosted Deployment auf Ubuntu mit PostgreSQL, PM2 und Reverse Proxy
- Optionales Redis/BullMQ für Queue-basierte Hintergrundverarbeitung

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

Für eine lokale Installation auf Ubuntu sollten die folgenden Bausteine vorhanden sein:

- Ubuntu 22.04 LTS oder neuer
- Node.js 22.x oder 20.19+
- npm
- PostgreSQL
- Redis optional, wenn Queue-/Webhook-Verarbeitung aktiviert werden soll

### Installation on Ubuntu

Die folgenden Schritte richten eine saubere lokale Entwicklungsumgebung auf Ubuntu ein:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg build-essential postgresql postgresql-contrib

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Optional für BullMQ/Webhooks
sudo apt install -y redis-server
```

Danach das Repository klonen und alle Abhängigkeiten installieren:

```bash
git clone <REPOSITORY_URL>
cd sapling

npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

### Database Setup

Lege für die lokale Entwicklung eine PostgreSQL-Datenbank und einen passenden Benutzer an:

```bash
sudo -u postgres createuser --pwprompt sapling
sudo -u postgres createdb --owner=sapling sapling
```

Wenn du stattdessen den vorhandenen `postgres`-Benutzer verwenden willst, passe einfach die Werte in `backend/.env` entsprechend an.

### Environment Setup

Erzeuge zunächst beide lokalen Umgebungsdateien aus den vorhandenen Defaults:

```bash
cp backend/.env.default backend/.env
cp frontend/.env.default frontend/.env
```

Danach sollten mindestens die folgenden Werte geprüft und angepasst werden.

#### Backend

| Variable | Bedeutung |
| --- | --- |
| `PORT` | Port des NestJS-Backends, standardmäßig `3000` |
| `SAPLING_FRONTEND_URL` | Exakte Frontend-URL für CORS und Session-Zugriffe |
| `SAPLING_SECRET` | Pflichtwert für Session- und Sicherheitslogik |
| `DB_DRIVER` | Datenbanktreiber, aktuell `postgresql` |
| `DB_HOST` / `DB_PORT` | PostgreSQL-Host und Port |
| `DB_USER` / `DB_PASSWORD` | Datenbankzugang |
| `DB_NAME` | Name der Sapling-Datenbank |
| `DB_DATA_SEEDER` | Seed-Datensatz, typischerweise `demonstration` oder `production` |
| `DB_LOGGING` | Aktiviert SQL-Debug-Logging |
| `SESSION_COOKIE_*` / `SESSION_TRUST_PROXY` | Session-Cookies und Reverse-Proxy-Verhalten |
| `LOG_*` | Dateinamen, Log-Level, Backup-Anzahl und Zielpfad |
| `REDIS_ENABLED` und `REDIS_*` | Nur nötig, wenn BullMQ/Queues aktiv sind |
| `WEBHOOK_*` | Timeouts und Redirect-Verhalten für Webhook-Zustellung |
| `AZURE_AD_*` | Microsoft-Login und Microsoft-Kalender |
| `GOOGLE_*` | Google-Login und Google-Kalender |
| `GITHUB_*` | GitHub-Integration |

#### Frontend

| Variable | Bedeutung |
| --- | --- |
| `VITE_BACKEND_URL` | Backend-Basis inklusive `/api/`, z. B. `http://localhost:3000/api/` |
| `VITE_PORT` | Port des Vite-Dev-Servers |
| `VITE_ALLOWED_HOSTS` | Erlaubte Hosts für lokale Vite-Zugriffe |
| `VITE_DEBUG_USERNAME` / `VITE_DEBUG_PASSWORD` | Komfortwerte für lokale Entwicklung |
| `VITE_IS_LOGIN_WITH_AZURE_ENABLED` | Schaltet Microsoft-Login im Frontend ein oder aus |
| `VITE_IS_LOGIN_WITH_GOOGLE_ENABLED` | Schaltet Google-Login im Frontend ein oder aus |
| `VITE_NAVIGATION_URL` | Externe Ziel-URL für Navigation/Maps |
| `VITE_DEFAULT_*` | Standardwerte für Fensterbreiten, Seitengrößen und Listenverhalten |

#### AI and MCP Setup

Die aktuellen AI-Provider und Modelle werden als Datenobjekte in der Datenbank geführt und durch die Seeder angelegt. Für den produktiven Einsatz sollten nach dem ersten Seed die Provider-Datensätze gepflegt werden, insbesondere die Sicherheitsfelder der `aiProviderType`-Einträge für OpenAI und/oder Gemini.

Die `backend/.env.default` enthält weiterhin Platzhalter für AI-Keys, der aktuelle Runtime-Pfad der AI-Services liest die Provider-Credentials jedoch aus den Datenbankeinträgen. Entscheidend sind deshalb im laufenden System die gepflegten `aiProviderType`-Datensätze und nicht nur die Werte in der `.env`.

MCP-Server werden ebenfalls datengetrieben über `mcpServerConfig` verwaltet. Es gibt einen eingebauten Sapling-MCP-Endpunkt unter `/api/ai/mcp`; zusätzliche externe MCP-Server können danach per HTTP- oder `stdio`-Transport in der Anwendung hinterlegt werden.

### Migrations and Seeders

Die Datenbankpflege läuft im Backend über drei klar getrennte Commands:

```bash
npm run orm:migrate --prefix backend
npm run orm:seed --prefix backend
npm run orm:deploy --prefix backend
```

- `orm:migrate` baut das Backend und führt ausschließlich ausstehende MikroORM-Migrationen aus.
- `orm:seed` baut das Backend und startet ausschließlich die Seeder.
- `orm:deploy` kombiniert beide Schritte und ist der sinnvollste Einstieg für eine frische Umgebung oder ein Deployment.

Wichtig für das aktuelle Verhalten:

- Die Seed-Daten werden aus `backend/src/database/seeder/json-${DB_DATA_SEEDER}/...` geladen.
- Erfolgreich ausgeführte Seed-Dateien werden in `seed_script_item` protokolliert und bei späteren Läufen übersprungen.
- Seeding ist damit dateinamenbasiert idempotent: Wenn du neue Seed-Daten ausrollen willst, legst du in der Regel eine neue JSON-Datei an, statt eine bereits erfolgreich gelaufene Datei still zu überschreiben.
- `TranslationSeeder` importiert Sprachwerte getrennt für Deutsch und Englisch, während `PermissionSeeder` fehlende Rollen-/Entitätsberechtigungen ergänzt.

Für die erste Inbetriebnahme ist daher meist genau dieser Ablauf sinnvoll:

```bash
npm run orm:deploy --prefix backend
```

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
| `npm run debug:backend` | Startet nur das Backend im Debug-/Watch-Modus |
| `npm run debug:frontend` | Startet nur das Frontend im Debug-/Dev-Modus |
| `npm run debug` | Startet Backend und Frontend parallel für die lokale Entwicklung |
| `npm run release:backend` | Startet nur das Backend über das Release-Entry-Script |
| `npm run release:frontend` | Startet nur das Frontend über das Release-Entry-Script |
| `npm run release` | Startet Backend und Frontend parallel über die Release-Scripts |

### Backend

| Command | Description |
| --- | --- |
| `npm run clean --prefix backend` | Entfernt Build-Artefakte und TypeScript-Build-Infos |
| `npm run build --prefix backend` | Baut das NestJS-Backend in `backend/dist` |
| `npm run start --prefix backend` | Startet das Backend ohne Watch-Modus |
| `npm run start:dev --prefix backend` | Startet das Backend im Watch-Modus |
| `npm run start:debug --prefix backend` | Startet das Backend im Watch-Modus mit Debug-Port |
| `npm run start:prod --prefix backend` | Startet das Backend mit dem produktionsnahen Startkommando |
| `npm run format --prefix backend` | Formatiert Backend-Quellcode mit Prettier |
| `npm run lint --prefix backend` | Lintet und korrigiert Backend-Code mit ESLint |
| `npm run test --prefix backend` | Führt die Backend-Unit-Tests aus |
| `npm run test:watch --prefix backend` | Startet die Backend-Tests im Watch-Modus |
| `npm run test:cov --prefix backend` | Führt die Backend-Tests mit Coverage aus |
| `npm run test:debug --prefix backend` | Startet die Backend-Tests im Debug-Modus |
| `npm run orm:migrate --prefix backend` | Führt nur ausstehende Migrationen aus |
| `npm run orm:seed --prefix backend` | Führt nur Seeder aus |
| `npm run orm:deploy --prefix backend` | Führt Migrationen und Seeder nacheinander aus |

### Frontend

| Command | Description |
| --- | --- |
| `npm run start:dev --prefix frontend` | Startet den Vite-Dev-Server |
| `npm run start:debug --prefix frontend` | Entspricht dem Dev-Server für lokale Debug-Sessions |
| `npm run start:prod --prefix frontend` | Startet das aktuell definierte Frontend-Startscript |
| `npm run build --prefix frontend` | Baut das Frontend für den produktiven Einsatz |
| `npm run build-only --prefix frontend` | Zusätzlicher Build-Alias für das Frontend |
| `npm run preview --prefix frontend` | Vorschau des gebauten Frontends mit Vite |
| `npm run serve --prefix frontend` | Alias für `vite preview` |
| `npm run lint --prefix frontend` | Lintet und korrigiert Frontend-Code mit ESLint |
| `npm run test:unit --prefix frontend` | Führt die Frontend-Unit-Tests mit Vitest aus |
| `npm run type-check --prefix frontend` | Führt Vue-/TypeScript-Type-Checks aus |
| `npm run format --prefix frontend` | Formatiert das Frontend mit Prettier |
| `npm run format:check --prefix frontend` | Prüft das Frontend auf Formatierungsabweichungen |

## Configuration Notes

### Backend

Die Backend-Konfiguration ist stark umgebungsbasiert aufgebaut. Besonders wichtig sind die CORS-/Session-Kombination aus `SAPLING_FRONTEND_URL`, `SESSION_COOKIE_*` und `SESSION_TRUST_PROXY`, weil darüber entschieden wird, ob Login, Cookies und Reverse-Proxy-Setups sauber funktionieren.

Das Backend stellt zusätzlich Swagger unter `/api/swagger` bereit und schreibt Request- sowie Server-Logs über Morgan und Log4js in das konfigurierte Log-Verzeichnis. Wenn Redis deaktiviert ist, laufen Queue- und BullMQ-bezogene Funktionen nicht mit, das restliche System kann aber weiterhin betrieben werden.

### Frontend

Das Frontend erwartet, dass `VITE_BACKEND_URL` bereits auf den API-Pfad zeigt und typischerweise mit `/api/` endet. Für lokale Setups sollten außerdem `VITE_ALLOWED_HOSTS`, die gewünschte Dev-Port-Konfiguration und die Login-Toggles zu den tatsächlich aktivierten Authentifizierungswegen passen.

Die Werte für Standardseitenlängen, Fensterbreiten und Debug-Zugangsdaten sind rein anwendungsbezogene Komfortkonfiguration. Für Produktivumgebungen sollten Debug-Credentials nicht verwendet und externe URLs wie `VITE_NAVIGATION_URL` bewusst gesetzt werden.

### AI and MCP

Die AI-Funktionalität ist nicht hart im Code auf ein einziges Modell festgelegt, sondern arbeitet mit aktiven Providern und Modellen aus der Datenbank. Dadurch lassen sich verfügbare Modelle, Standards und Tool-Fähigkeiten zentral pflegen, ohne jedes Mal die Anwendung umbauen zu müssen.

Für MCP gilt dasselbe Prinzip: Sapling bringt einen eingebauten internen MCP-Server mit sicheren Datenwerkzeugen mit und kann darüber hinaus externe Server registrieren. Die Konfiguration dafür liegt in `mcpServerConfig`, inklusive Transport, Headern, Authentifizierung, erlaubten Tools und Sortierung.

## Deployment

Für ein Ubuntu-Deployment empfiehlt sich eine klassische Trennung aus statischem Frontend, Node.js-Backend und PostgreSQL-Datenbank. In der Praxis bedeutet das meist: `frontend/dist` über Nginx ausliefern, `backend/dist/main.js` mit PM2 oder einem vergleichbaren Prozessmanager betreiben und die Datenbankmigrationen vor dem Start des Backends ausführen.

Ein typischer Ablauf sieht so aus:

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend

npm run build --prefix backend
npm run build --prefix frontend
npm run orm:deploy --prefix backend
```

Danach kann das Backend zum Beispiel mit PM2 gestartet werden:

```bash
cd backend
pm2 start dist/main.js --name sapling-backend
pm2 save
```

Für Reverse-Proxy-Umgebungen sollten `SAPLING_FRONTEND_URL`, `SESSION_TRUST_PROXY` und `SESSION_COOKIE_SECURE` sauber auf das Zielsetup abgestimmt werden. Wenn Webhooks oder Hintergrundjobs produktiv genutzt werden, sollte zusätzlich ein Redis-Dienst bereitstehen und `REDIS_ENABLED=true` gesetzt werden.

Das Repository enthält außerdem mit `.github/workflows/ionos_deploy.yml` eine vorhandene Basis für CI/CD in eine IONOS-Umgebung. Sie eignet sich gut als Startpunkt, sollte aber vor dem produktiven Einsatz mit den aktuell gewünschten Build- und Server-Schritten abgeglichen werden.

## Logging

Application logs are written to the root `log/` directory. Log file names, retention, output targets, and log level are controlled through backend environment variables.

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE) for details.
