# Sapling

Sapling ist eine Full-Stack-Plattform fuer CRM, Service, operative Ablaeufe und teaminterne Zusammenarbeit. Die Anwendung buendelt Stammdaten, Tickets, Termine, Dateien, Kennzahlen, Arbeitslisten, Vorlagen, Integrationen und KI-gestuetzte Assistenz in einer gemeinsamen Oberflaeche.

Das Repository ist als JavaScript/TypeScript-Monorepo aufgebaut und kombiniert ein NestJS-Backend mit einem Vue-3-Frontend. Sapling eignet sich fuer lokale Entwicklung, Docker-gestuetzte Infrastruktur und selbst betriebene Ubuntu-Deployments mit PostgreSQL, optional Redis und Reverse Proxy.

## Highlights

- **Generisches Datenmodell:** Unternehmen, Personen, Tickets, Verkaufschancen, Vertraege, Produkte, Termine, Dokumente, Rollen, Systemlandschaften und weitere Fachobjekte laufen ueber ein einheitliches Entity-, Template- und Berechtigungsmodell.
- **Arbeitslisten:** Vordefinierte und personalisierbare Arbeitslisten basieren auf gespeicherten Filtern, z. B. offene eigene Tickets, ueberfaellige Tickets, heutige Termine, aktive Verkaufschancen oder relevante Kunden-/Vertragslisten.
- **Vorlagen fuer Dashboards und Arbeitslisten:** Rollen koennen Starter-Dashboards und Starter-Arbeitslisten erhalten. Neue Benutzer bekommen damit direkt passende KPI-Sichten und operative Listen.
- **Dashboard- und KPI-System:** KPI-Karten, Trends, Sparklines, Zeitraeume, Aggregationen, Drilldowns und Dashboard-Templates machen operative Kennzahlen nachvollziehbar.
- **Teams-Integration:** Sapling kann Microsoft-Teams-Nachrichten aus Templates erzeugen, Platzhalter aus Datensaetzen fuellen, 1:1-Chats bzw. Self-Chats anlegen und Zustellungen als Deliveries nachverfolgen.
- **Mail- und Message-Templates:** E-Mail- und Teams-Vorlagen unterstuetzen Markdown, Platzhalter und fachliche Kontexte aus Entitaeten.
- **Kalender und Termine:** Terminverwaltung mit Status, Teilnehmenden, Kontextpanels und optionaler Microsoft-/Google-Kalenderanbindung.
- **Dateien und Dokumente:** Dokumenttypen, Uploads, Dateivorschauen und Zuordnung zu Fachobjekten sind integriert.
- **Berechtigungen und Rollen:** Authentifizierung per lokaler Anmeldung sowie Microsoft- und Google-OAuth; Rollen steuern Zugriff auf Entitaeten und Funktionen.
- **AI-Assistent Songbird:** AI-Chat mit Sitzungen, Modellwahl, Streaming, Seitenkontext, Transkription, Vektorisierung und interner Tool-Nutzung.
- **MCP-Unterstuetzung:** Interner Sapling-MCP-Server fuer berechtigte Datenzugriffe sowie externe MCP-Server per HTTP oder `stdio`.
- **Integrationen und Automatisierung:** Webhooks, GitHub-Anbindung, Script-Buttons, Systeminformationen, Mail-, Teams- und Kalenderfunktionen sowie optionale Queue-Verarbeitung mit Redis/BullMQ.

## Architektur

| Layer | Technologie | Zweck |
| --- | --- | --- |
| Frontend | Vue 3, Vite, Vuetify, Pinia, Vue Router | Responsive Weboberflaeche |
| Backend | NestJS, TypeScript, Passport.js | API, Authentifizierung, Fachlogik |
| Datenbank | PostgreSQL ueber MikroORM | Persistente Anwendungsdaten |
| Queue / Jobs | BullMQ, Redis optional | Hintergrundjobs, Webhooks, Mail und Teams |
| AI | OpenAI, Gemini, MCP | Chat, Tools, Vektorisierung und Assistenz |
| Integrationen | Microsoft Graph, Google APIs, GitHub API | Kalender, Mail, Teams, Repository-Kontext |
| Logging | Morgan, Log4js | Request- und Server-Logging |

## Repository-Struktur

```text
sapling/
|-- backend/          NestJS API, ORM, Auth, Integrationen, Seeder
|-- frontend/         Vue 3 Client, Views, Komponenten, Stores
|-- log/              Lokale Laufzeitlogs
|-- package.json      Root-Skripte fuer Build, Debug, Tests und ORM
|-- LICENSE
`-- README.md
```

## Voraussetzungen

- Node.js `^20.19.0` oder `>=22.12.0`
- npm
- PostgreSQL
- Redis optional, wenn Queues fuer Mail, Webhooks oder Teams genutzt werden sollen
- Ubuntu 22.04 LTS oder neuer fuer die Deployment-Beispiele

Fuer lokale Entwicklung kann PostgreSQL klassisch installiert oder per Docker gestartet werden. Wenn AI-Vektorisierung genutzt werden soll, empfiehlt sich ein PostgreSQL-Image mit `pgvector`.

## Lokale Installation

```bash
git clone <REPOSITORY_URL>
cd sapling

npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

### Datenbank anlegen

```bash
sudo -u postgres createuser --pwprompt sapling
sudo -u postgres createdb --owner=sapling sapling
```

Alternativ kann die Infrastruktur mit Docker gestartet werden, siehe [Docker](#docker).

### Environment-Dateien anlegen

```bash
cp backend/.env.default backend/.env
cp frontend/.env.default frontend/.env
```

Passe danach mindestens Datenbank, Secret, Frontend-URL und Login-/Integrationswerte an.

## Environment-Konfiguration

Im Repository gibt es aktuell zwei dokumentierte Runtime-Umgebungen:

- `backend/.env` fuer API, Datenbank, Sessions, Integrationen, Logging, AI und Queues
- `frontend/.env` fuer den Vite-Client, API-Ziel, UI-Grenzwerte und Login-Schalter

### Backend `.env`

| Variable | Bedeutung |
| --- | --- |
| `PORT` | Port des NestJS-Backends, Standard `3000`. |
| `SAPLING_WHITELISTED_IPS` | Kommagetrennte Liste erlaubter IPs fuer geschuetzte Systemzugriffe. |
| `SAPLING_SECRET` | Pflichtwert fuer Session- und Sicherheitslogik; produktiv immer stark und eindeutig setzen. |
| `SAPLING_FRONTEND_URL` | Exakte Frontend-URL fuer CORS, Redirects und Cookies, z. B. `http://localhost:5173`. |
| `SAPLING_HASH_INDICATOR` / `SAPLING_HASH_COST` | Passwort-Hashing-Konfiguration. |
| `DB_DRIVER` | Datenbanktreiber, aktuell `postgresql`. |
| `DB_HOST` / `DB_PORT` | PostgreSQL Host und Port. |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Datenbankzugang und Datenbankname. |
| `DB_DATA_SEEDER` | Seed-Datensatz, typischerweise `demonstration` oder `production`. |
| `DB_LOGGING` | Aktiviert SQL-Logging fuer Debugging. |
| `SESSION_COOKIE_NAME` | Name des Session-Cookies. |
| `SESSION_MAX_AGE` / `SESSION_REMEMBER_ME_MAX_AGE` | Session-Lebensdauer in Millisekunden. |
| `SESSION_COOKIE_SECURE` | Muss bei HTTPS/Produktion normalerweise `true` sein. |
| `SESSION_COOKIE_SAME_SITE` | Cookie-SameSite-Policy: `lax`, `strict`, `none` oder `false`. |
| `SESSION_TRUST_PROXY` | Anzahl vertrauter Reverse Proxies, meist `1` hinter Nginx. |
| `GENERIC_DOWNLOAD_LIMIT` | Maximale Anzahl Datensaetze fuer generische Exporte. |
| `LOG_OUTPUT_PATH` | Zielordner fuer Logs, relativ zum Backend-Prozess. |
| `LOG_BACKUP_FILES` | Anzahl rotierter Logdateien. |
| `LOG_LEVEL` | Log-Level, z. B. `info` oder `debug`. |
| `LOG_NAME_REQUESTS` / `LOG_NAME_SERVER` | Dateinamen fuer Request- und Serverlogs. |
| `LOG_APPENDERS` | Log-Ziele, z. B. `console,file`. |
| `REDIS_ENABLED` | Aktiviert Redis/BullMQ-Queues. |
| `REDIS_SERVER` / `REDIS_PORT` | Redis Host und Port. |
| `REDIS_USERNAME` / `REDIS_PASSWORD` | Redis-Zugang, falls erforderlich. |
| `REDIS_ATTEMPTS` / `REDIS_BACKOFF_*` | Retry-Verhalten fuer Queue-Jobs. |
| `REDIS_REMOVE_ON_FAIL` / `REDIS_REMOVE_ON_COMPLETE` | Aufraeumverhalten abgeschlossener oder fehlgeschlagener Jobs. |
| `WEBHOOK_TIMEOUT` / `WEBHOOK_MAX_REDIRECTS` | HTTP-Verhalten fuer Webhook-Zustellung. |
| `AZURE_AD_TENNANT_ID` | Microsoft Tenant-ID. Der Name ist im Code aktuell so geschrieben. |
| `AZURE_AD_CLIENT_ID` / `AZURE_AD_CLIENT_SECRET` | Microsoft OAuth App Credentials. |
| `AZURE_AD_REDIRECT_URL` | Callback, z. B. `http://localhost:3000/api/auth/azure/callback`. |
| `AZURE_AD_SCOPE` | Microsoft Graph Scopes fuer Login, Kalender, Mail und Teams. |
| `AZURE_AD_RESPONSE_TYPE` / `AZURE_AD_RESPONSE_MODE` | Optionales OAuth-Antwortverhalten. |
| `AZURE_AD_ALLOW_HTTP` | Nur fuer lokale Microsoft-OAuth-Setups ohne HTTPS relevant. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth App Credentials. |
| `GOOGLE_CALLBACK_URL` | Callback, z. B. `http://localhost:3000/api/auth/google/callback`. |
| `GOOGLE_SCOPE` | Google Scopes fuer Login und Kalender. |
| `AI_CHAT_MESSAGE_PAGE_SIZE` | Standard-Seitengroesse fuer Chat-Historien. |
| `AI_MAX_CHAT_MESSAGE_PAGE_SIZE` | Maximale Chat-Historien-Seitengroesse. |
| `AI_STREAM_HISTORY_MESSAGE_LIMIT` | Anzahl vorheriger Nachrichten im Streaming-Kontext. |
| `GITHUB_REPO` / `GITHUB_API_URL` / `GITHUB_TOKEN` | GitHub-Integration. |
| `API_TITLE` / `API_VERSION` / `API_DESCRIPTION` | Swagger-Metadaten. |
| `API_CONTACT_NAME` / `API_CONTACT_URL` / `API_CONTACT_EMAIL` | Swagger-Kontaktdaten. |

AI-Provider-Credentials werden im laufenden System datengetrieben ueber Provider-Datensaetze gepflegt. Die `.env` steuert vor allem Laufzeitlimits und Infrastruktur; Modelle, Provider und MCP-Konfigurationen liegen in der Datenbank.

### Frontend / Client `.env`

| Variable | Bedeutung |
| --- | --- |
| `VITE_BACKEND_URL` | Backend-Basis inklusive `/api/`, z. B. `http://localhost:3000/api/`. |
| `VITE_GIT_URL` | Repository-URL, die im Client fuer Projekt-/GitHub-Verweise genutzt wird. |
| `VITE_PORT` | Port des Vite-Dev-Servers, Standard `5173`. |
| `VITE_ALLOWED_HOSTS` | Kommagetrennte erlaubte Hosts fuer lokale Vite-Zugriffe. |
| `VITE_DEFAULT_SMALL_WINDOW_WIDTH` | Breakpoint fuer kleine Fenster. |
| `VITE_DEFAULT_MEDIUM_WINDOW_WIDTH` | Breakpoint fuer mittlere Fenster. |
| `VITE_DEFAULT_LARGE_WINDOW_WIDTH` | Breakpoint fuer grosse Fenster. |
| `VITE_DEFAULT_PAGE_SIZE_SMALL` | Standard-Seitengroesse fuer kleine Viewports. |
| `VITE_DEFAULT_PAGE_SIZE_MEDIUM` | Standard-Seitengroesse fuer mittlere Viewports. |
| `VITE_DEFAULT_PAGE_SIZE_LARGE` | Standard-Seitengroesse fuer grosse Viewports. |
| `VITE_DEFAULT_PAGE_SIZE_OPTIONS` | Auswahlwerte fuer Tabellen-Pagination, z. B. `10,25,50,100`. |
| `VITE_DEFAULT_ENTITY_ITEMS_COUNT` | Standardlimit fuer Entity-Abfragen im Client. |
| `VITE_DOCUMENT_MAX_FILE_SIZE_MB` | Maximale Uploadgroesse pro Datei im Frontend. |
| `VITE_MOBILE_CARD_FIELD_LIMIT` | Maximale Feldanzahl in mobilen Kartenansichten. |
| `VITE_DESKTOP_TABLE_COLUMN_LIMIT` | Maximale Spaltenanzahl in Desktop-Tabellenansichten. |
| `VITE_DEBUG_USERNAME` / `VITE_DEBUG_PASSWORD` | Komfortwerte fuer lokale Login-Entwicklung; nicht produktiv verwenden. |
| `VITE_IS_LOGIN_WITH_AZURE_ENABLED` | Schaltet Microsoft-Login im Frontend sichtbar. |
| `VITE_IS_LOGIN_WITH_GOOGLE_ENABLED` | Schaltet Google-Login im Frontend sichtbar. |
| `VITE_NAVIGATION_URL` | Externe Navigations-/Maps-Basis-URL. |

Wichtig: Vite liest nur Variablen mit `VITE_`-Praefix in den Client ein. Geheimnisse gehoeren daher ausschliesslich in `backend/.env`, niemals in `frontend/.env`.

## Datenbank, Migrationen und Seeder

Die Datenbankpflege laeuft ueber Backend-Kommandos:

```bash
npm run orm:migrate --prefix backend
npm run orm:seed --prefix backend
npm run orm:deploy --prefix backend
```

- `orm:migrate` baut das Backend und fuehrt ausstehende MikroORM-Migrationen aus.
- `orm:seed` baut das Backend und startet die Seeder.
- `orm:deploy` kombiniert Migrationen und Seeder und ist der beste Einstieg fuer frische Umgebungen.
- `orm:create-migration` erstellt eine neue MikroORM-Migration aus dem aktuellen Entity-Modell.

Seed-Daten liegen unter `backend/src/database/seeder/json-${DB_DATA_SEEDER}/...`. Erfolgreich gelaufene Seed-Dateien werden in `seed_script_item` protokolliert und spaeter uebersprungen. Neue Seed-Daten sollten deshalb in neuen JSON-Dateien ausgeliefert werden.

## Projekt starten

Vom Repository-Root:

```bash
# Backend und Frontend im lokalen Debug-/Watch-Modus starten
npm run debug

# Produktionsnahe Startkommandos fuer beide Teile
npm run release
```

Lokale Standard-Endpunkte:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/swagger`

## Root-Skripte

| Command | Beschreibung |
| --- | --- |
| `npm run build:backend` | Baut nur das Backend. |
| `npm run build:frontend` | Baut nur das Frontend. |
| `npm run build` | Baut Backend und Frontend nacheinander. |
| `npm run debug:backend` | Startet das Backend im Debug-/Watch-Modus. |
| `npm run debug:frontend` | Startet den Vite-Client im Dev-Modus. |
| `npm run debug` | Startet Backend und Frontend parallel mit `concurrently`. |
| `npm run test:backend` | Fuehrt Backend-Tests mit Jest aus. |
| `npm run test:frontend` | Fuehrt Frontend-Unit-Tests mit Vitest aus. |
| `npm run test` | Fuehrt Backend- und Frontend-Tests nacheinander aus. |
| `npm run type-check:backend` | Fuehrt den TypeScript-Build-Check fuer das Backend aus. |
| `npm run type-check:frontend` | Fuehrt Vue-/TypeScript-Type-Checks fuer das Frontend aus. |
| `npm run type-check` | Fuehrt alle Type-Checks aus. |
| `npm run verify` | Fuehrt Type-Checks und Tests als Gesamtpruefung aus. |
| `npm run release:backend` | Startet nur das Backend ueber das produktionsnahe Startscript. |
| `npm run release:frontend` | Startet nur das Frontend ueber das Release-Entry-Script. |
| `npm run release` | Startet Backend und Frontend parallel ueber Release-Skripte. |
| `npm run orm:migrate` | Fuehrt Backend-Migrationen aus. |
| `npm run orm:seed` | Fuehrt Backend-Seeder aus. |
| `npm run orm:deploy` | Fuehrt Backend-Build, Migrationen und Seeder aus. |
| `npm run orm:create-migration` | Erstellt eine neue MikroORM-Migration. |
| `npm run format:backend` | Formatiert Backend-Code. |
| `npm run format:frontend` | Formatiert Frontend-Code. |
| `npm run format` | Formatiert Backend und Frontend. |

## Feature-Details

### Arbeitslisten

Arbeitslisten werden als `FavoriteTemplateItem` gepflegt. Sie definieren Entity, Route und Filter und koennen Platzhalter wie `{{currentUser.handle}}`, `{{today.start}}`, `{{week.start}}` oder `{{month.end}}` nutzen. Dadurch entstehen dynamische Listen fuer den aktuellen Benutzer, z. B.:

- eigene offene, wartende, ueberfaellige oder heute faellige Tickets
- eigene Verkaufschancen nach Pipeline-Phase
- heutige, morgige oder wochenbezogene Termine
- aktive Kontakte, Unternehmen, Vertraege und Systemlandschaften

Rollen koennen Starter-Arbeitslisten referenzieren. Beim ersten Zugriff werden daraus persoenliche Favoriten fuer den Benutzer erzeugt.

### Dashboard-Vorlagen

`DashboardTemplateItem` beschreibt wiederverwendbare Dashboard-Zusammenstellungen mit KPI-Sets. Der Produktions-Seed bringt unter anderem Vorlagen fuer Support Operations, Sales Pipeline, Event Coordination, Contracts & Products, Master Data Quality und System Operations mit.

Rollen koennen Starter-Dashboards erhalten. Hat ein Benutzer noch keine persoenlichen Dashboards, werden passende Vorlagen automatisch provisioniert.

### Teams-Integration

Die Teams-Funktion besteht aus drei Bausteinen:

- `TeamsTemplateItem`: Markdown-Vorlagen mit Platzhaltern pro Entity.
- `TeamsSubscriptionItem`: fachliche Ausloeser inklusive Ziel-/Empfaengerfeld.
- `TeamsDeliveryItem`: protokollierte Zustellung mit Status, Provider-Response und Retry-Moeglichkeit.

Die Zustellung erfolgt ueber Microsoft Graph. Sender und Empfaenger muessen Azure-Benutzer mit gueltiger Session bzw. Login-Information sein. Ist Redis aktiv, laufen Teams-Zustellungen ueber BullMQ; ohne Redis werden sie direkt verarbeitet.

### AI und MCP

Songbird verwendet Provider- und Modelldaten aus der Datenbank. Der interne Sapling-MCP-Server stellt berechtigungsabhaengige Datenwerkzeuge bereit; externe MCP-Server koennen ueber `mcpServerConfig` mit Transport, Headern, Authentifizierung und erlaubten Tools angebunden werden.

## Docker

Docker wird in diesem Repository vor allem fuer lokale Infrastruktur empfohlen. Backend und Frontend laufen weiterhin bequem per `npm run debug`; PostgreSQL und Redis koennen isoliert in Containern laufen.

### PostgreSQL mit pgvector

```bash
docker run \
  --name sapling-postgres-vector \
  --restart unless-stopped \
  -e POSTGRES_DB=sapling \
  -e POSTGRES_USER=sapling \
  -e POSTGRES_PASSWORD=sapling \
  -p 5432:5432 \
  -d pgvector/pgvector:pg18
```

Passende Backend-Werte:

```dotenv
DB_DRIVER=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_USER=sapling
DB_PASSWORD=sapling
DB_NAME=sapling
```

Falls Port `5432` lokal bereits belegt ist, kann links ein anderer Host-Port verwendet werden, z. B. `-p 55432:5432`; dann muss `DB_PORT=55432` gesetzt werden.

### Redis fuer Queues

```bash
docker run \
  --name sapling-redis-cache \
  --restart unless-stopped \
  -p 6379:6379 \
  -d redis:alpine
```

Passende Backend-Werte:

```dotenv
REDIS_ENABLED=true
REDIS_SERVER=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
```

Redis ist optional. Wenn `REDIS_ENABLED=false` ist, kann Sapling ohne Queue-Infrastruktur laufen; bestimmte Jobs werden dann direkt verarbeitet oder Queue-Funktionen bleiben deaktiviert.

### Container verwalten

```bash
docker ps
docker logs sapling-postgres-vector
docker logs sapling-redis-cache
docker stop sapling-postgres-vector sapling-redis-cache
docker start sapling-postgres-vector sapling-redis-cache
```

Nach dem ersten Start:

```bash
npm run orm:deploy --prefix backend
npm run debug
```

## Ubuntu-Deployment

Fuer ein selbst betriebenes Deployment empfiehlt sich:

- PostgreSQL lokal oder als verwalteter Dienst
- optional Redis fuer Queue-basierte Verarbeitung
- Backend als PM2-Prozess auf Port `3000`
- Frontend statisch aus `frontend/dist` via Nginx
- Nginx als Reverse Proxy fuer `/` und `/api/`

### Build und Deployment-Schritte

```bash
cd /var/www/sapling
git pull

npm ci
npm ci --prefix backend
npm ci --prefix frontend

npm run build
npm run orm:deploy --prefix backend
```

### PM2 (Backend)

```bash
sudo npm install -g pm2

pm2 start npm --name sapling-backend -- run release:backend
pm2 save
pm2 startup
```

Danach den von `pm2 startup` ausgegebenen `sudo`-Befehl ausfuehren.

### Nginx-Beispiel (statisches Frontend)

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name sapling.example.com;

    ssl_certificate /etc/letsencrypt/live/sapling.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sapling.example.com/privkey.pem;

    client_max_body_size 20M;
    root /var/www/sapling/current/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Wichtige Produktionswerte:

```dotenv
SAPLING_FRONTEND_URL=https://sapling.example.com
SESSION_COOKIE_SECURE=true
SESSION_TRUST_PROXY=1
VITE_BACKEND_URL=https://sapling.example.com/api/
```

Nach Nginx-Aenderungen:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Ein produktionsreifes Bootstrap- und CI/CD-Setup liegt unter [deploy/README.md](./deploy/README.md).

## Logging

Backend-Logs werden standardmaessig in `log/` geschrieben. Zielpfad, Dateinamen, Retention, Appender und Log-Level werden ueber `LOG_*` in `backend/.env` gesteuert.

## Lizenz

Sapling steht unter der GNU General Public License v3.0. Details stehen in [LICENSE](./LICENSE).
