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
- KPI-Dashboard mit Trends, Sparklines, Drilldowns und Arbeitslisten
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
| `VITE_DOCUMENT_MAX_FILE_SIZE_MB` | Maximale Dateigröße pro Upload-Datei im Frontend in MB |

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
| `npm run build:backend` | Baut nur das Backend in `backend/dist` |
| `npm run build:frontend` | Baut nur das Frontend fuer den produktiven Einsatz |
| `npm run build` | Baut Backend und Frontend nacheinander |
| `npm run debug:backend` | Startet nur das Backend im Debug-/Watch-Modus |
| `npm run debug:frontend` | Startet nur das Frontend im Debug-/Dev-Modus |
| `npm run debug` | Startet Backend und Frontend parallel fuer die lokale Entwicklung |
| `npm run test:backend` | Fuehrt nur die Backend-Tests aus |
| `npm run test:frontend` | Fuehrt nur die Frontend-Tests aus |
| `npm run test` | Fuehrt Backend- und Frontend-Tests nacheinander aus |
| `npm run type-check:backend` | Fuehrt den TypeScript-Build-Check fuer das Backend aus |
| `npm run type-check:frontend` | Fuehrt Vue-/TypeScript-Type-Checks fuer das Frontend aus |
| `npm run type-check` | Fuehrt alle Type-Checks des Monorepos aus |
| `npm run verify` | Fuehrt Type-Checks und alle Tests als Gesamtpruefung aus |
| `npm run release:backend` | Startet nur das Backend ueber das produktionsnahe Startscript |
| `npm run release:frontend` | Startet nur das Frontend ueber das Release-Entry-Script |
| `npm run release` | Startet Backend und Frontend parallel ueber die Release-Scripts |
| `npm run orm:migrate` | Fuehrt nur ausstehende Datenbankmigrationen aus |
| `npm run orm:seed` | Fuehrt nur die Seeder aus |
| `npm run orm:deploy` | Fuehrt Build, Migrationen und Seeder fuer das Backend aus |
| `npm run format:backend` | Formatiert nur den Backend-Code |
| `npm run format:frontend` | Formatiert nur den Frontend-Code |
| `npm run format` | Formatiert Backend und Frontend nacheinander |

## Configuration Notes

### Backend

Die Backend-Konfiguration ist stark umgebungsbasiert aufgebaut. Besonders wichtig sind die CORS-/Session-Kombination aus `SAPLING_FRONTEND_URL`, `SESSION_COOKIE_*` und `SESSION_TRUST_PROXY`, weil darüber entschieden wird, ob Login, Cookies und Reverse-Proxy-Setups sauber funktionieren.

Das Backend stellt zusätzlich Swagger unter `/api/swagger` bereit und schreibt Request- sowie Server-Logs über Morgan und Log4js in das konfigurierte Log-Verzeichnis. Wenn Redis deaktiviert ist, laufen Queue- und BullMQ-bezogene Funktionen nicht mit, das restliche System kann aber weiterhin betrieben werden.

### Frontend

Das Frontend erwartet, dass `VITE_BACKEND_URL` bereits auf den API-Pfad zeigt und typischerweise mit `/api/` endet. Für lokale Setups sollten außerdem `VITE_ALLOWED_HOSTS`, die gewünschte Dev-Port-Konfiguration und die Login-Toggles zu den tatsächlich aktivierten Authentifizierungswegen passen.

Die Werte für Standardseitenlängen, Fensterbreiten, Dokument-Upload-Grenzen und Debug-Zugangsdaten sind rein anwendungsbezogene Komfortkonfiguration. Für Produktivumgebungen sollten Debug-Credentials nicht verwendet und externe URLs wie `VITE_NAVIGATION_URL` bewusst gesetzt werden.

### AI and MCP

Die AI-Funktionalität ist nicht hart im Code auf ein einziges Modell festgelegt, sondern arbeitet mit aktiven Providern und Modellen aus der Datenbank. Dadurch lassen sich verfügbare Modelle, Standards und Tool-Fähigkeiten zentral pflegen, ohne jedes Mal die Anwendung umbauen zu müssen.

Für MCP gilt dasselbe Prinzip: Sapling bringt einen eingebauten internen MCP-Server mit sicheren Datenwerkzeugen mit und kann darüber hinaus externe Server registrieren. Die Konfiguration dafür liegt in `mcpServerConfig`, inklusive Transport, Headern, Authentifizierung, erlaubten Tools und Sortierung.

## Deployment

Fuer ein Ubuntu-Deployment empfiehlt sich bei Sapling eine klare Trennung:

- `frontend/dist` wird statisch ueber Nginx ausgeliefert
- das NestJS-Backend laeuft separat ueber PM2 auf Port `3000`
- PostgreSQL wird direkt vom Backend genutzt
- Redis ist nur noetig, wenn Queue-/Webhook-Funktionen produktiv aktiviert werden sollen

### Kompakte Ubuntu-Installationsanleitung

Die folgenden Schritte sind auf dieses Repository zugeschnitten und gehen davon aus, dass Sapling unter `/var/www/sapling` betrieben wird.

#### 1. Systempakete und Node.js installieren

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg build-essential \
  postgresql postgresql-contrib nginx certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Optional nur fuer BullMQ / Webhooks
sudo apt install -y redis-server
```

#### 2. Repository bereitstellen und Abhaengigkeiten installieren

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www

git clone https://github.com/martin-rosbund/sapling.git sapling
cd sapling

npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

#### 3. `.env`-Dateien anlegen und fuer HTTPS vorbereiten

```bash
cp backend/.env.default backend/.env
cp frontend/.env.default frontend/.env
```

Fuer ein produktives Setup sollten mindestens diese Werte angepasst werden:

`backend/.env`

```dotenv
PORT=3000
SAPLING_FRONTEND_URL=https://sapling.craffel.de
SESSION_COOKIE_SECURE=true
SESSION_TRUST_PROXY=1
DB_HOST=localhost
DB_PORT=5432
DB_USER=sapling
DB_PASSWORD=<secure-password>
DB_NAME=sapling
REDIS_ENABLED=false
```

`frontend/.env`

```dotenv
VITE_BACKEND_URL=https://sapling.craffel.de/api/
```

Wenn Microsoft- oder Google-Login aktiv genutzt wird, muessen auch die Callback-URLs in `backend/.env` auf die produktive HTTPS-Domain zeigen.

#### 4. Datenbank vorbereiten und Anwendung bauen

```bash
sudo -u postgres createuser --pwprompt sapling
sudo -u postgres createdb --owner=sapling sapling

npm run build --prefix backend
npm run build --prefix frontend
npm run orm:deploy --prefix backend
```

#### 5. PM2 installieren und Frontend + Backend als Dienste einrichten

Im hier dokumentierten Setup liefert Nginx das Frontend nicht direkt aus `frontend/dist` aus, sondern leitet `/` an den Frontend-Prozess auf Port `5173` und `/api/` an das Backend auf Port `3000` weiter. Deshalb sollten beide Prozesse ueber PM2 laufen.

```bash
sudo npm install -g pm2

cd /var/www/sapling
pm2 start npm --name sapling-backend -- run release:backend
pm2 start npm --name sapling-frontend -- run release:frontend
pm2 save
pm2 startup
```

Danach den von `pm2 startup` ausgegebenen `sudo`-Befehl einmal ausfuehren und anschliessend mit `pm2 list`, `pm2 logs sapling-backend` und `pm2 logs sapling-frontend` pruefen, ob beide Prozesse sauber laufen.

#### 6. Nginx installieren und konfigurieren

Erstelle zunaechst eine Site-Konfiguration:

```bash
sudo nano /etc/nginx/sites-available/sapling
```

Beispielkonfiguration fuer dieses Repository:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name sapling.craffel.de www.sapling.craffel.de;

    ssl_certificate /etc/nginx/ssl/craffel.de_ssl_certificate.cer;
    ssl_certificate_key /etc/nginx/ssl/craffel.de_private_key.key;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Danach die Site aktivieren und Nginx laden:

```bash
sudo ln -s /etc/nginx/sites-available/sapling /etc/nginx/sites-enabled/sapling
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

#### 6a. SSL-Zertifikat manuell fuer Nginx hinterlegen

Wenn das Zertifikat nicht ueber Certbot verwaltet wird, kann es direkt unter `/etc/nginx/ssl` abgelegt werden.

```bash
sudo mkdir -p /etc/nginx/ssl
sudo cp craffel.de_ssl_certificate.cer /etc/nginx/ssl/
sudo cp craffel.de_private_key.key /etc/nginx/ssl/
sudo chown root:root /etc/nginx/ssl/craffel.de_ssl_certificate.cer /etc/nginx/ssl/craffel.de_private_key.key
sudo chmod 644 /etc/nginx/ssl/craffel.de_ssl_certificate.cer
sudo chmod 600 /etc/nginx/ssl/craffel.de_private_key.key
```

Danach werden die Pfade in der Nginx-Datei ueber diese beiden Zeilen eingetragen:

```nginx
ssl_certificate /etc/nginx/ssl/craffel.de_ssl_certificate.cer;
ssl_certificate_key /etc/nginx/ssl/craffel.de_private_key.key;
```

Die Zertifikatsdatei ist der oeffentliche Teil fuer die Domain, die Key-Datei ist der private Schluessel. Falls dein Anbieter statt einer `.cer`-Datei ein Bundle oder eine Full-Chain-Datei liefert, sollte genau diese Datei bei `ssl_certificate` verwendet werden.

Nach dem Hinterlegen des Zertifikats sollten diese Werte nochmals geprueft werden:

- `SAPLING_FRONTEND_URL=https://sapling.craffel.de`
- `SESSION_COOKIE_SECURE=true`
- `SESSION_TRUST_PROXY=1`
- `VITE_BACKEND_URL=https://sapling.craffel.de/api/`

#### 6b. Dateigroesse fuer Uploads auf 20 MB setzen

Fuer Sapling ist die wichtigste Reverse-Proxy-Einstellung dafuer:

```nginx
client_max_body_size 20M;
```

Sie gehoert in den jeweiligen `server`-Block oder global in den `http`-Block. Nach Aenderungen immer neu laden:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Im aktuellen Projekt ist im Backend kein engeres Multer-Dateilimit hinterlegt, daher ist Nginx hier der entscheidende Schalter fuer Uploads.

#### Wartung und Updates

Ein minimales Update fuer ein bestehendes Deployment sieht so aus:

```bash
cd /var/www/sapling
git pull
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run build --prefix backend
npm run build --prefix frontend
npm run orm:deploy --prefix backend
pm2 restart sapling-frontend
pm2 restart sapling-backend
```

Das Repository enthaelt ausserdem mit `.github/workflows/ionos_deploy.yml` eine vorhandene Basis fuer CI/CD in eine IONOS-Umgebung. Sie eignet sich gut als Startpunkt, sollte aber vor dem produktiven Einsatz mit den aktuell gewuenschten Build- und Server-Schritten abgeglichen werden.

## Logging

Application logs are written to the root `log/` directory. Log file names, retention, output targets, and log level are controlled through backend environment variables.

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE) for details.

## Docker

Datenbank:
docker run --name sapling-postgres-vector -e POSTGRES_PASSWORD=sapling -p 5432:5432 -d pgvector/pgvector:pg18

Redis / BullMQ
docker run -d --name sapling-redis-cache --restart always -p 6379:6379 redis:alpine
