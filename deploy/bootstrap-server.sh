#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

readonly DOMAIN="${DOMAIN:?DOMAIN is required}"
readonly EMAIL="${EMAIL:?EMAIL is required}"
readonly APP_USER="${APP_USER:-sapling}"
readonly APP_GROUP="${APP_GROUP:-$APP_USER}"
readonly APP_ROOT="${APP_ROOT:-/var/www/sapling}"
readonly APP_HOME="${APP_HOME:-/home/$APP_USER}"
readonly INSTALL_FAIL2BAN="${INSTALL_FAIL2BAN:-false}"
readonly ENABLE_CERTBOT="${ENABLE_CERTBOT:-true}"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

on_error() {
  local line="$1"
  local code="$2"
  log "ERROR: bootstrap failed at line ${line} with exit code ${code}."
}
trap 'on_error "$LINENO" "$?"' ERR

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

validate_inputs() {
  if [[ ! "$APP_USER" =~ ^[a-z_][a-z0-9_-]*[$]?$ ]]; then
    echo "APP_USER contains unsupported characters: $APP_USER" >&2
    exit 1
  fi
  if [[ ! "$APP_GROUP" =~ ^[a-z_][a-z0-9_-]*[$]?$ ]]; then
    echo "APP_GROUP contains unsupported characters: $APP_GROUP" >&2
    exit 1
  fi
  if [[ "$APP_ROOT" != /* ]]; then
    echo "APP_ROOT must be an absolute path: $APP_ROOT" >&2
    exit 1
  fi
  if [[ "$APP_HOME" != /* ]]; then
    echo "APP_HOME must be an absolute path: $APP_HOME" >&2
    exit 1
  fi
}

install_base_packages() {
  log "Installing base packages"
  apt-get update
  apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    rsync \
    git \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx

  if [[ "$INSTALL_FAIL2BAN" == "true" ]]; then
    apt-get install -y --no-install-recommends fail2ban
    systemctl enable --now fail2ban
  fi
}

install_nodejs_20() {
  log "Installing Node.js 20"
  if command -v node >/dev/null 2>&1 && [[ "$(node -v)" =~ ^v20\. ]]; then
    return
  fi

  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list

  apt-get update
  apt-get install -y --no-install-recommends nodejs
}

install_pm2() {
  log "Installing PM2"
  npm install -g pm2
}

install_docker() {
  log "Installing Docker and Compose plugin"
  apt-get install -y --no-install-recommends docker.io docker-compose-plugin
  systemctl enable --now docker
}

ensure_app_user() {
  log "Ensuring app user and group"
  if ! getent group "$APP_GROUP" >/dev/null; then
    groupadd --system "$APP_GROUP"
  fi

  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    useradd --system --gid "$APP_GROUP" --create-home --home-dir "$APP_HOME" --shell /bin/bash "$APP_USER"
  fi

  usermod -aG docker "$APP_USER"
}

prepare_directories() {
  log "Preparing application directory layout"
  install -d -m 0755 "$APP_ROOT" "$APP_ROOT/releases" "$APP_ROOT/shared"
  install -d -m 0750 "$APP_ROOT/shared/backend" "$APP_ROOT/shared/frontend" "$APP_ROOT/shared/log"
  install -d -m 0755 "$APP_ROOT/shared/infrastructure"
  chown -R "$APP_USER:$APP_GROUP" "$APP_ROOT"
}

install_env_templates() {
  log "Installing env templates"
  if [[ ! -f "$APP_ROOT/shared/backend/.env" ]]; then
    install -m 0640 -o "$APP_USER" -g "$APP_GROUP" "$SCRIPT_DIR/env/backend.env.example" "$APP_ROOT/shared/backend/.env"
  fi

  if [[ ! -f "$APP_ROOT/shared/frontend/.env" ]]; then
    install -m 0640 -o "$APP_USER" -g "$APP_GROUP" "$SCRIPT_DIR/env/frontend.env.example" "$APP_ROOT/shared/frontend/.env"
  fi
}

install_infrastructure_compose() {
  log "Installing and starting infrastructure containers"
  local compose_target="$APP_ROOT/shared/infrastructure/docker-compose.infrastructure.yml"
  install -m 0644 "$SCRIPT_DIR/docker-compose.infrastructure.yml" "$compose_target"

  APP_ROOT="$APP_ROOT" docker compose -f "$compose_target" up -d
}

install_nginx_http_bootstrap_config() {
  log "Installing temporary HTTP-only Nginx configuration"

  cat > /etc/nginx/sites-available/sapling <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${APP_ROOT}/current/frontend/dist;
    index index.html;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

  ln -sfn /etc/nginx/sites-available/sapling /etc/nginx/sites-enabled/sapling
  rm -f /etc/nginx/sites-enabled/default

  nginx -t
  systemctl reload nginx
  systemctl enable nginx
}

install_nginx_ssl_config() {
  log "Installing Nginx SSL configuration"

  local nginx_target="/etc/nginx/sites-available/sapling"
  sed \
    -e "s|__DOMAIN__|$DOMAIN|g" \
    -e "s|__APP_ROOT__|$APP_ROOT|g" \
    "$SCRIPT_DIR/nginx.sapling.conf" > "$nginx_target"

  ln -sfn "$nginx_target" /etc/nginx/sites-enabled/sapling
  rm -f /etc/nginx/sites-enabled/default

  nginx -t
  systemctl reload nginx
  systemctl enable nginx
}

setup_certbot() {
  if [[ "$ENABLE_CERTBOT" != "true" ]]; then
    log "Skipping certbot setup (ENABLE_CERTBOT=$ENABLE_CERTBOT)"
    return
  fi

  log "Setting up Let's Encrypt certificate"
  certbot certonly --webroot --non-interactive --agree-tos --email "$EMAIL" -w /var/www/html -d "$DOMAIN"
}

configure_firewall() {
  log "Configuring UFW"
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable
}

setup_pm2_startup() {
  log "Configuring PM2 startup for $APP_USER"
  pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME"
  su - "$APP_USER" -c "pm2 save"
}

ensure_command sed
validate_inputs
install_base_packages
install_nodejs_20
install_pm2
install_docker
ensure_app_user
prepare_directories
install_env_templates
install_infrastructure_compose
install_nginx_http_bootstrap_config
setup_certbot
if [[ "$ENABLE_CERTBOT" == "true" ]]; then
  install_nginx_ssl_config
fi
configure_firewall
setup_pm2_startup

log "Bootstrap completed. Review $APP_ROOT/shared/backend/.env and $APP_ROOT/shared/frontend/.env before first deployment."
