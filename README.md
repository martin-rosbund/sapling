# Sapling CRM

Ein modernes, cloud-basiertes und selbst-gehostetes CRM-System mit Fokus auf Flexibilität, Sicherheit und Erweiterbarkeit.

## Features

- **Cloud-basiert oder selbst-gehostet**: Betrieb in der Cloud oder On-Premises möglich
- **Moderne Authentifizierung**: Anmeldung lokal oder via Azure AD (Active Directory) mittels Passport.js-Strategien
- **Klar getrennte Architektur**: Backend (`/backend`) und Frontend (`/frontend`) als eigenständige Projekte
- **Mikro-ORM**: Moderne Datenbankanbindung und Migrationen
- **Logging**: Umfangreiche Protokollierung mit Morgan und Log4js

---

## Authentifizierung

Die Authentifizierung erfolgt über [Passport.js](http://www.passportjs.org/), ein flexibles Authentifizierungs-Framework für Node.js. Unterstützt werden:

- **Lokale Anmeldung**: Benutzername & Passwort
- **Azure AD Anmeldung**: Single Sign-On via Microsoft Azure Active Directory

**Passport-Strategien:**
- *LocalStrategy*: Prüft Benutzername und Passwort gegen die lokale Datenbank
- *AzureAdOAuth2Strategy*: OAuth2-basierte Anmeldung gegen Azure AD

Die Strategie wird im Backend konfiguriert und kann je nach Umgebung gewählt werden.

---

## Projektstruktur

```
sapling/
├── backend/         # NestJS Backend (API, Auth, ORM, Logging)
│   ├── src/
│   ├── .env         # Umgebungsvariablen (siehe unten)
│   └── ...
├── frontend/        # Vue 3 + Vuetify Frontend
│   ├── src/
│   ├── .env         # Umgebungsvariablen (siehe unten)
│   └── ...
└── log/             # Logdateien
```

---

## Backend

Das Backend basiert auf [NestJS](https://nestjs.com/) (TypeScript, Express), einem fortschrittlichen Node.js-Framework für skalierbare Serveranwendungen.

- **API-Design**: Modular, Controller-basiert
- **ORM**: [Mikro-ORM](https://mikro-orm.io/) für Datenbankzugriff (MySQL/SQLite)
- **Migrationen**: `npx mikro-orm migration:create --initial` für initiale Migrationen
- **Seeder**: Initialdaten werden automatisch eingespielt, Datenbank wird bei Bedarf automatisch erstellt
- **Logging**: [Morgan](https://www.npmjs.com/package/morgan) (HTTP-Logging), [log4js](https://www.npmjs.com/package/log4js) (flexibles Logging)

### Wichtige Backend-Pakete

- `@nestjs/core:11.1.6` – NestJS Kern-Framework
- `@mikro-orm/core:6.5.7` – Mikro-ORM für Datenbankzugriff
- `passport:0.7.0` – Authentifizierungs-Framework
- `passport-azure-ad:4.3.5` – Azure AD Strategie
- `express-session:1.18.2` – Session-Management
- `morgan:1.10.1` – HTTP-Request-Logging
- `log4js:6.9.1` – Logging-Framework
- `class-validator:0.14.2` / `class-transformer:0.5.1` – Validierung & Transformation

---

## Frontend

Das Frontend basiert auf [Vue 3](https://vuejs.org/) und [Vuetify 3](https://vuetifyjs.com/), einem modernen UI-Framework.

- **Komponentenbasiert**: Übersichtliche Struktur, einfache Erweiterbarkeit
- **State-Management**: [Pinia](https://pinia.vuejs.org/)
- **Routing**: [Vue Router](https://router.vuejs.org/)
- **Internationalisierung**: [vue-i18n](https://vue-i18n.intlify.dev/)

### Wichtige Frontend-Pakete

- `vue:3.5.22` – Hauptframework
- `vuetify:3.10.5` – UI-Komponenten
- `pinia:3.0.3` – State-Management
- `vue-router:4.5.1` – Routing
- `axios:1.12.2` – HTTP-Client

---

## .env Konfiguration

### Backend

Im Ordner `backend/` muss eine `.env`-Datei angelegt werden. Vorlage: `.env.mysql.default` oder `.env.sqlite.default` kopieren und in `.env` umbenennen.

**Wichtige Eigenschaften:**

- `DB_DRIVER` – Datenbanktyp (`mysql` oder `sqlite`)
- `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` – Datenbankverbindung (bei MySQL)
- `SAPLING_SECRET` – Geheimer Schlüssel für JWT-Token
- `SAPLING_FRONTEND_URL` – URL des Frontends (z.B. http://localhost:5173)
- `SAPLING_HASH_INDICATOR` / `SAPLING_HASH_COST` – Einstellungen für Passwort-Hashing
- `LOG_OUTPUT_PATH` – Pfad für Logdateien
- `LOG_BACKUP_FILES` – Anzahl der Log-Backups
- `LOG_LEVEL` – Loglevel (z.B. info, debug)
- `LOG_NAME_REQUESTS` / `LOG_NAME_SERVER` – Dateinamen für Logs
- `AZURE_AD_*` – Einstellungen für Azure AD Authentifizierung

### Frontend

Im Ordner `frontend/` muss eine `.env`-Datei angelegt werden. Vorlage: `.env.default` kopieren und in `.env` umbenennen.

**Wichtige Eigenschaften:**

- `VITE_BACKEND_URL` – URL zum Backend (z.B. http://localhost:3000/)
- `VITE_DEBUG_USERNAME` / `VITE_DEBUG_PASSWORD` – Debug-Login für lokale Entwicklung

---

## Logging

- **Morgan**: Protokolliert HTTP-Anfragen im Backend (z.B. für Monitoring und Debugging)
- **log4js**: Flexibles Logging-Framework für verschiedene Log-Level und Log-Ausgabeformate (z.B. Datei, Konsole)

Logdateien werden im Verzeichnis `/log` abgelegt. Die Anzahl der Backups und das Loglevel sind in der `.env` konfigurierbar.

---

## Mitwirken

Entwickler:innen sind herzlich eingeladen, Pull Requests zu erstellen und das Projekt weiterzuentwickeln! Feedback und Feature-Ideen sind willkommen.

---

## Lizenz

Dieses Projekt steht unter der [GNU General Public License v3.0](./LICENSE).
