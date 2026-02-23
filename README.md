
# Sapling CRM

**Sapling CRM** ist eine moderne, leistungsstarke und flexible Plattform für Selbstständige sowie kleine und mittlere Unternehmen. Die Lösung ist sowohl cloudbasiert als auch als Self-Hosted-Variante verfügbar und bietet volle Kontrolle über Ihre Daten und Prozesse.

---

## Login

Die Anmeldung in Sapling CRM erfolgt über ein modernes Authentifizierungssystem, das verschiedene Methoden unterstützt: Lokale Anmeldung mit Benutzername und Passwort, Single Sign-On via Microsoft Azure Active Directory sowie Google OAuth2. Die Authentifizierung wird über Passport.js realisiert und ist flexibel konfigurierbar, sodass Unternehmen die passende Strategie für ihre Umgebung wählen können. Nach erfolgreichem Login erhalten Nutzer Zugriff auf alle Funktionen der Plattform, wobei die Sicherheit und der Schutz der Daten stets im Vordergrund stehen.

## Account

Im Account-Bereich können Nutzer ihre persönlichen Arbeitszeiten verwalten, Kontaktdaten wie E-Mail-Adresse und Telefonnummer aktualisieren sowie ihr Passwort ändern. Die Oberfläche ist intuitiv gestaltet und ermöglicht eine schnelle Anpassung der eigenen Informationen. Änderungen werden direkt übernommen und sorgen für eine stets aktuelle und sichere Nutzerverwaltung.

## Dashboard

Das Dashboard bietet einen zentralen Überblick über alle relevanten Kennzahlen (KPIs) und Favoriten. KPIs werden als absolute Zahlen, in Listenform, mit Trendanzeige und als Sparkline visualisiert. So erhalten Nutzer auf einen Blick Informationen zu aktuellen Entwicklungen und wichtigen Geschäftsmetriken. Die Favoritenfunktion ermöglicht es, besonders wichtige KPIs oder Funktionen direkt im Dashboard zu platzieren, sodass sie jederzeit schnell erreichbar sind. Die Darstellung ist übersichtlich und unterstützt eine effiziente Arbeitsweise, indem alle wesentlichen Informationen kompakt und verständlich präsentiert werden.


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
- **Webhooks**: Schnelle, einfache und sichere Webhooks mittels Redis

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

## Branches

master: Protected Stable
patch/x: Patch-Branch für Fehlerbehebungen
feature/x: Feature-Branch für neue Anpassungen
release/x: Release Branch für die automatische Verteilung via GitHub-Actions


---
Deployment App auf Ubuntu 24 LTS
---

Diese Anleitung beschreibt die Einrichtung einer Node.js Anwendung mit GitHub-Integration, PM2 Prozess-Management und Nginx als Reverse Proxy.

# 1. GitHub & Repository Setup

Um das Projekt sicher und automatisiert zu klonen, nutzen wir SSH-Deploy-Keys.

## SSH-Key generieren

```
ssh-keygen -t ed25519 -C "sapling"
# Bestätige den Pfad mit Enter, vergieb kein Passwort.
```

## Key bei GitHub hinterlegen

1.  Inhalt des Keys anzeigen: cat ~/.ssh/id_ed25519.pub

2.  Kopiere den Text (beginnt mit ssh-ed25519\...).

3.  Gehe zu GitHub: **Repository \> Settings \> Deploy keys \> Add deploy key**.

4.  Titel: "Sapling", Key einfügen, **Add key**.

## Verzeichnis vorbereiten & Klonen

```
# Verzeichnis erstellen und Berechtigungen auf deinen User setzen
sudo mkdir -p /var/www
sudo chown -R root /var/www
```
```
# In das Verzeichnis wechseln und klonen
cd /var/www
git clone git@github.com:martin-rosbund/sapling.git
cd sapling
```
```
# Abhängigkeiten installieren
npm install
cd backend && npm install
cd frontend && npm install
```
# 2. PM2: Prozess-Management

Damit die Anwendung im Hintergrund läuft und bei einem Absturz oder Reboot automatisch startet.

## Anwendung starten

Wir starten das release-Script aus der package.json:

```
# Startbefehl
pm2 start npm --name "sapling" -- run release
```
```
# Logs prüfen (optional)
pm2 logs sapling
```
## Autostart bei System-Reboot
```
# Generiert den notwendigen System-Befehl (diesen kopieren und ausführen)
pm2 startup
```
```
# Aktuellen Prozess-Status speichern
pm2 save
```
# 3. Nginx: Reverse Proxy Konfiguration

Nginx leitet den Traffic von Port 80 bzw. 443 an die internen Ports der Anwendung weiter (Frontend auf 5173, Backend-API auf 3000).

## Konfiguration erstellen

1.  Datei anlegen: sudo nano /etc/nginx/sites-available/sapling

2.  Folgenden Inhalt einfügen:

```
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name sapling.craffel.de www.sapling.craffel.de;

    ssl_certificate /etc/nginx/ssl/craffel.de_ssl_certificate.cer;
    ssl_certificate_key /etc/nginx/ssl/craffel.de_private_key.key;

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

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name craffel.de www.craffel.de;

    ssl_certificate /etc/nginx/ssl/craffel.de_ssl_certificate.cer;
    ssl_certificate_key /etc/nginx/ssl/craffel.de_private_key.key;

    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }

}

server {
    listen 80;
    listen [::]:80;
    server_name server_name craffel.de www.craffel.de sapling.craffel.de www.sapling.craffel.de;
    return 301 https://$host$request_uri;
}
```
## Zertifikat hinzufügen
Erstellen Sie einen Ordner, um die Zertifikate sauber abzulegen (falls noch nicht vorhanden)

```
sudo mkdir -p /etc/nginx/ssl
```
Erstellen Sie eine neue Datei.
```
sudo nano /etc/nginx/ssl/craffel.de.crt
```
Öffnen Sie lokal Ihre .crt-Datei mit einem Texteditor. Markieren Sie alles (Strg+A / Cmd+A). Es muss exakt so aussehen, inklusive der Striche am Anfang und Ende:
```
-----BEGIN CERTIFICATE-----
MIIQDzCCBSegAwIBAgIQCgAAA... (viele kryptische Zeichen) ...
...
-----END CERTIFICATE-----
```
Fügen Sie den Inhalt in das Terminal-Fenster ein (meist Rechtsklick oder Strg+Shift+V).
Wichtig: Achten Sie darauf, dass keine Leerzeichen vor dem ersten Bindestrich oder nach dem letzten Bindestrich sind.

Drücken Sie Strg+O und dann Enter zum Speichern. Drücken Sie Strg+X zum Beenden.

Wiederholen Sie das Gleiche für die .key-Datei (/etc/nginx/ssl/craffel.de.key).

Setzen Sie die Berechtigungen so, dass nur root den Key lesen kann:
```
sudo chmod 600 /etc/nginx/ssl/craffel.de.key
```
## Konfiguration aktivieren
```
# Verknüpfung erstellen
sudo ln -s /etc/nginx/sites-available/sapling /etc/nginx/sites-enabled/
```
```
# Syntax prüfen
sudo nginx -t
```
```
# Nginx neu laden
sudo systemctl restart nginx
```
