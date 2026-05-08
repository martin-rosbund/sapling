# Sapling Deployment (IONOS VPS)

## Zielarchitektur

- **GitHub Actions CI/CD** mit CI auf `push`/`pull_request`
- **Deployment nur für `push` auf `main`**
- **Release-basiertes Deployment** unter `/var/www/sapling/releases/<release>`
- Aktives Release via Symlink `/var/www/sapling/current`
- **Backend** als PM2-Prozess (`sapling-backend`)
- **Frontend statisch** über Nginx aus `/var/www/sapling/current/frontend/dist`
- **PostgreSQL (pgvector) + Redis** per Docker Compose

## Erwartete Serverstruktur

```text
/var/www/sapling/
├─ current -> /var/www/sapling/releases/<release>
├─ releases/
│  ├─ <release-1>/
│  └─ <release-2>/
└─ shared/
   ├─ backend/.env
   ├─ frontend/.env
   ├─ log/
   └─ infrastructure/
      ├─ docker-compose.infrastructure.yml
      ├─ postgres-data/
      └─ redis-data/
```

## Benötigte GitHub Secrets

Nutze in GitHub Actions (Repository oder Environment `production`) folgende Secrets:

- `SAPLING_SSH_HOST` (z. B. `203.0.113.10`)
- `SAPLING_SSH_PORT` (optional, default `22`)
- `SAPLING_SSH_USER` (Deploy-User auf dem Server)
- `SAPLING_SSH_PRIVATE_KEY` (Private Key passend zum Server)
- `SAPLING_SSH_KNOWN_HOSTS` (optional, empfohlen; Ausgabe von `ssh-keyscan -H <host>`)
- `SAPLING_APP_ROOT` (optional, default `/var/www/sapling`)

## Erstinstallation / Bootstrap

Das Bootstrap-Skript richtet eine Ubuntu-22.04+-Maschine idempotent ein:

- Basis-Pakete, Nginx, UFW, Certbot
- Node.js 20 + PM2
- Docker + Compose Plugin
- App-User + Verzeichnisstruktur
- Infrastruktur-Compose (PostgreSQL pgvector + Redis)
- Nginx-Site mit statischem Frontend + `/api/` Reverse Proxy
- SSL via Let's Encrypt

Auf dem Server im ausgecheckten Repo ausführen (alternativ mindestens den Ordner `deploy/` auf den Server kopieren):

```bash
sudo DOMAIN=sapling.example.com EMAIL=ops@example.com APP_USER=sapling APP_GROUP=sapling APP_ROOT=/var/www/sapling bash deploy/bootstrap-server.sh
```

Optionale Parameter:

- `INSTALL_FAIL2BAN=true`
- `ENABLE_CERTBOT=false` (falls Zertifikat später manuell eingerichtet wird)

## Deployment-Ablauf

Workflow `.github/workflows/ci-cd-ionos.yml`:

1. CI (Runner):
   - `npm ci`
   - `npm ci --prefix backend`
   - `npm ci --prefix frontend`
   - `npm run type-check`
   - `npm run test`
2. CD (nur `main`):
   - Release-ID erzeugen
   - Repo per `rsync` nach `/var/www/sapling/releases/<release>` übertragen
   - `deploy/remote-deploy.sh` auf dem Server ausführen

`deploy/remote-deploy.sh` führt aus:

- Shared `.env` und `log` symlinken
- `npm ci` (root/backend/frontend)
- `npm run build`
- `npm run orm:deploy --prefix backend`
- Symlink `current` erst nach Erfolg umstellen
- PM2 `startOrReload`
- `nginx -t` + Reload
- Backend-Healthcheck gegen `http://127.0.0.1:3000/api`
- Cleanup alter Releases (Default: 5)

## Rollback

Rollback auf ein älteres Release:

```bash
cd /var/www/sapling
ls -1 releases
ln -sfn /var/www/sapling/releases/<altes-release> current
pm2 startOrReload /var/www/sapling/current/deploy/ecosystem.config.cjs --env production
pm2 save
sudo nginx -t && sudo systemctl reload nginx
```

## Hinweise zu `.env`

- `.env` Dateien liegen **nur** in `shared/` und werden je Release verlinkt.
- Kein Secret-Management über GitHub Actions für App-Runtime-Variablen.
- Nach Bootstrap zwingend Werte in folgenden Dateien prüfen:
  - `/var/www/sapling/shared/backend/.env`
  - `/var/www/sapling/shared/frontend/.env`
