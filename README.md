
# Sapling CRM

**Sapling CRM** ist eine moderne, leistungsstarke und flexible Plattform für Selbstständige sowie kleine und mittlere Unternehmen. Die Lösung ist sowohl cloudbasiert als auch als Self-Hosted-Variante verfügbar und bietet volle Kontrolle über Ihre Daten und Prozesse.

---


## Highlights & Features

- **Cloud oder On-Premises**: Flexible Bereitstellung – wahlweise in der Cloud oder auf eigenen Servern
- **Self-Service Plattform**: Benutzer können eigenständig Accounts verwalten, Einstellungen anpassen und Support-Tickets erstellen
- **Ticketverwaltung**: Integriertes System zur Erfassung, Bearbeitung und Nachverfolgung von Kundenanfragen und internen Aufgaben
- **Kalender & Ressourcenplanung**: Effiziente Organisation von Terminen, Meetings und Ressourcen (z.B. Räume, Geräte)
- **Moderne Authentifizierung**: Lokale Anmeldung, Azure AD (Active Directory) und Google OAuth2 – alle Strategien via Passport.js
- **Mehrsprachenfähigkeit**: Vollständige Internationalisierung (i18n) mit dynamischer Sprachumschaltung und Übersetzungen für alle UI-Komponenten
- **Modernes 3D-Design**: Glass UI und Tilt-Effekte für ein ansprechendes, interaktives und zeitgemäßes Nutzererlebnis
- **Klar getrennte Architektur**: Backend (NestJS) und Frontend (Vue 3 + Vuetify) als eigenständige Projekte
- **Mikro-ORM**: Moderne Datenbankanbindung und Migrationen (MySQL/SQLite)
- **Logging**: Umfangreiche Protokollierung mit Morgan und Log4js

---

## Authentifizierung

Die Authentifizierung erfolgt über [Passport.js](http://www.passportjs.org/), ein flexibles Authentifizierungs-Framework für Node.js. Unterstützte Methoden:

- **Lokale Anmeldung**: Benutzername & Passwort
- **Azure AD Anmeldung**: Single Sign-On via Microsoft Azure Active Directory
- **Google Anmeldung**: OAuth2-basierte Anmeldung via Google

**Passport-Strategien:**
- *LocalStrategy*: Prüft Benutzername und Passwort gegen die lokale Datenbank
- *AzureAdOAuth2Strategy*: OAuth2-basierte Anmeldung gegen Azure AD
- *GoogleOAuth2Strategy*: OAuth2-basierte Anmeldung gegen Google

Die gewünschte Strategie wird im Backend konfiguriert und kann je nach Umgebung gewählt werden.

---

## Projektstruktur

Die Projektstruktur ist klar getrennt und modular aufgebaut:

```
sapling/
├── backend/           # NestJS Backend (API, Auth, ORM, Logging)
│   ├── src/
│   │   ├── api/       # API-Endpunkte (z.B. ai, kpi, system, template)
│   │   ├── auth/      # Authentifizierungslogik (local, azure, google)
│   │   ├── constants/ # Projektkonstanten
│   │   ├── database/  # ORM-Konfiguration, Migrationen, Seeder
│   │   ├── entity/    # Datenbank-Entities
│   │   ├── script/    # Automatisierungen, Event-Handling
│   │   ├── session/   # Session-Management
│   │   └── ...
│   ├── .env           # Umgebungsvariablen (siehe unten)
│   ├── package.json   # Backend-Abhängigkeiten
│   └── ...
├── frontend/          # Vue 3 + Vuetify Frontend
│   ├── src/
│   │   ├── assets/    # Statische Assets, Styles
│   │   ├── components/# UI-Komponenten
│   │   ├── composables# Wiederverwendbare Logik
│   │   ├── constants/ # Frontend-Konstanten
│   │   ├── entity/    # Datenmodelle
│   │   ├── plugins/   # Erweiterungen
│   │   ├── router/    # Routing
│   │   ├── services/  # API-Services
│   │   ├── stores/    # State-Management
│   │   ├── views/     # Seitenansichten
│   │   └── ...
│   ├── .env           # Umgebungsvariablen (siehe unten)
│   ├── package.json   # Frontend-Abhängigkeiten
│   └── ...
├── log/               # Logdateien
│   ├── requests.log.txt
│   ├── server.log.*
│   └── ...
└── LICENSE            # Lizenz
```

---

## Backend

Das Backend basiert auf [NestJS](https://nestjs.com/) (TypeScript, Express) und bietet:

- **Modulares API-Design**: Controller-basierte Struktur für klare Trennung der Funktionen
- **ORM**: [Mikro-ORM](https://mikro-orm.io/) für Datenbankzugriff (MySQL/SQLite)
- **Migrationen & Seeder**: Automatisierte Datenbankmigrationen und Initialdaten
- **Logging**: [Morgan](https://www.npmjs.com/package/morgan) für HTTP-Logging, [log4js](https://www.npmjs.com/package/log4js) für flexibles Logging
- **Session-Management**: Sichere Verwaltung von Nutzer-Sessions

### Wichtige Backend-Pakete

- `@nestjs/core` – NestJS Kern-Framework
- `@mikro-orm/core` – Mikro-ORM für Datenbankzugriff
- `passport` – Authentifizierungs-Framework
- `passport-azure-ad` – Azure AD Strategie
- `passport-google-oauth20` – Google OAuth2 Strategie
- `express-session` – Session-Management
- `morgan` – HTTP-Request-Logging
- `log4js` – Logging-Framework
- `class-validator` / `class-transformer` – Validierung & Transformation

---


## Frontend

Das Frontend basiert auf [Vue 3](https://vuejs.org/) und [Vuetify 3](https://vuetifyjs.com/):

- **Komponentenbasiert**: Übersichtliche Struktur, einfache Erweiterbarkeit
- **State-Management**: [Pinia](https://pinia.vuejs.org/)
- **Routing**: [Vue Router](https://router.vuejs.org/)
- **Internationalisierung (i18n)**: [vue-i18n](https://vue-i18n.intlify.dev/) für Mehrsprachenfähigkeit und dynamische Sprachumschaltung
- **Modernes 3D-Design**: Glass UI und Tilt-Effekte für ein visuell ansprechendes, interaktives und zeitgemäßes Nutzererlebnis
- **Moderne UI**: Responsive und barrierefreie Benutzeroberfläche

### Wichtige Frontend-Pakete

- `vue` – Hauptframework
- `vuetify` – UI-Komponenten
- `pinia` – State-Management
- `vue-router` – Routing
- `vue-i18n` – Internationalisierung
- `axios` – HTTP-Client
- `vanilla-tilt` – Tilt-Effekte für 3D-Interaktion

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
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – Einstellungen für Google Authentifizierung

### Frontend

Im Ordner `frontend/` muss eine `.env`-Datei angelegt werden. Vorlage: `.env.default` kopieren und in `.env` umbenennen.

**Wichtige Eigenschaften:**

- `VITE_BACKEND_URL` – URL zum Backend (z.B. http://localhost:3000/)
- `VITE_DEBUG_USERNAME` / `VITE_DEBUG_PASSWORD` – Debug-Login für lokale Entwicklung

---

## Logging

- **Morgan**: Protokolliert HTTP-Anfragen im Backend (Monitoring, Debugging)
- **log4js**: Flexibles Logging-Framework für verschiedene Log-Level und Ausgabeformate (Datei, Konsole)

Logdateien werden im Verzeichnis `/log` abgelegt. Die Anzahl der Backups und das Loglevel sind in der `.env` konfigurierbar.

---

## Mitwirken & Community

Wir freuen uns über Beiträge von Entwickler:innen! Pull Requests, Feedback und Feature-Ideen sind jederzeit willkommen. Bitte beachten Sie die Lizenzbedingungen und die Community-Richtlinien.

---

## Lizenz

Dieses Projekt steht unter der [GNU General Public License v3.0](./LICENSE).
