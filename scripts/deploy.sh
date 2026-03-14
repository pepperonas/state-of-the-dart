#!/bin/bash

# State of the Dart - VPS Deployment
set -e

# VPS Configuration
VPS_HOST="celox"
FRONTEND_PATH="/var/www/stateofthedart"
BACKEND_PATH="/var/www/stateofthedart-backend"
PM2_NAME="stateofthedart-backend"

echo "========================================"
echo "  State of the Dart - Deployment"
echo "  VPS: ${VPS_HOST}"
echo "========================================"
echo ""

# ============================================
# SCHRITT 1: Frontend bauen
# ============================================
echo "1/5 Frontend bauen..."

# .env für Production erstellen
cat > .env << 'EOF'
VITE_API_URL=https://api.stateofthedart.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SbJLI6sUXfiu5sCaFj6prXjK1rMW0uU1eJksdYCZDpYqgOP5LHEzcskMEFhsVIF1UFupBDVpZl3Cl6v1AonUahF00evYZdsji
EOF

npm run build
echo "   Frontend gebaut"

# ============================================
# SCHRITT 2: Frontend deployen
# ============================================
echo "2/5 Frontend deployen..."
rsync -avz --delete dist/ ${VPS_HOST}:${FRONTEND_PATH}/
echo "   Frontend deployed"

# ============================================
# SCHRITT 3: Backend bauen und deployen
# ============================================
echo "3/5 Backend bauen und deployen..."
cd server
npm run build
cd ..

# WICHTIG: Nur dist syncen, NIEMALS .env überschreiben!
# Die .env auf dem VPS enthält Production-Secrets und muss manuell gepflegt werden
rsync -avz \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='*.sqlite*' \
  --exclude='src' \
  --exclude='scripts' \
  --exclude='.env' \
  --exclude='env.example' \
  server/dist/ ${VPS_HOST}:${BACKEND_PATH}/dist/

rsync -avz server/package*.json ${VPS_HOST}:${BACKEND_PATH}/

echo "   ⚠️  HINWEIS: .env wird NICHT deployed (Production-Secrets!)"

echo "   Backend deployed"

# ============================================
# SCHRITT 4: Backup-Scripts deployen
# ============================================
echo "4/5 Backup-Scripts deployen..."

# Backup- und Restore-Scripts auf VPS aktualisieren
scp -q scripts/backup-db.sh scripts/restore-db.sh ${VPS_HOST}:${BACKEND_PATH}/
ssh ${VPS_HOST} "chmod +x ${BACKEND_PATH}/backup-db.sh ${BACKEND_PATH}/restore-db.sh && mkdir -p ${BACKEND_PATH}/backups"
echo "   Backup-Scripts deployed"

# Pre-Deployment Backup erstellen
echo "   Erstelle Pre-Deployment Backup..."
ssh ${VPS_HOST} "${BACKEND_PATH}/backup-db.sh" || echo "   Backup fehlgeschlagen (DB evtl. noch nicht vorhanden)"

# ============================================
# SCHRITT 5: Server neu starten
# ============================================
echo "5/5 Backend neu starten..."

# ============================================
# KRITISCH: VPS .env validieren
# ============================================
echo "   Validiere VPS .env..."

REQUIRED_VARS="GOOGLE_CALLBACK_URL APP_URL API_URL CORS_ORIGINS"
MISSING_VARS=""

for var in $REQUIRED_VARS; do
  if ! ssh ${VPS_HOST} "grep -q '^${var}=' ${BACKEND_PATH}/.env" 2>/dev/null; then
    MISSING_VARS="$MISSING_VARS $var"
  fi
done

if [ -n "$MISSING_VARS" ]; then
  echo ""
  echo "========================================"
  echo "  ⚠️  WARNUNG: VPS .env unvollständig!"
  echo "========================================"
  echo "Fehlende Variablen:$MISSING_VARS"
  echo ""
  echo "Diese Variablen MÜSSEN gesetzt sein:"
  echo "  GOOGLE_CALLBACK_URL=https://api.stateofthedart.com/api/auth/google/callback"
  echo "  APP_URL=https://stateofthedart.com"
  echo "  API_URL=https://api.stateofthedart.com"
  echo "  CORS_ORIGINS=https://stateofthedart.com,https://api.stateofthedart.com"
  echo ""
  echo "Deployment wird abgebrochen!"
  exit 1
fi

# Prüfe ob GOOGLE_CALLBACK_URL auf Production zeigt
CALLBACK_URL=$(ssh ${VPS_HOST} "grep '^GOOGLE_CALLBACK_URL=' ${BACKEND_PATH}/.env | cut -d'=' -f2")
if [[ "$CALLBACK_URL" == *"localhost"* ]]; then
  echo ""
  echo "========================================"
  echo "  ❌ FEHLER: GOOGLE_CALLBACK_URL zeigt auf localhost!"
  echo "========================================"
  echo "Aktuell: $CALLBACK_URL"
  echo "Erwartet: https://api.stateofthedart.com/api/auth/google/callback"
  echo ""
  echo "Deployment wird abgebrochen!"
  exit 1
fi

echo "   VPS .env OK ✓"

ssh ${VPS_HOST} << ENDSSH
  cd ${BACKEND_PATH}

  # Nginx: client_max_body_size auf 10m setzen (für Screenshot-Uploads)
  if grep -q 'client_max_body_size' /etc/nginx/sites-enabled/api.stateofthedart.com 2>/dev/null; then
    sed -i 's/client_max_body_size.*/client_max_body_size 10m;/' /etc/nginx/sites-enabled/api.stateofthedart.com
  else
    sed -i '/server_name/a\\    client_max_body_size 10m;' /etc/nginx/sites-enabled/api.stateofthedart.com 2>/dev/null || true
  fi
  nginx -t 2>/dev/null && nginx -s reload 2>/dev/null || true

  # Logs-Verzeichnis erstellen
  mkdir -p ${BACKEND_PATH}/logs

  # Dependencies aktualisieren falls nötig
  npm install --production --silent 2>/dev/null || true

  # PM2 neu starten
  pm2 restart ${PM2_NAME}
  pm2 save

  echo "   Backend neu gestartet"
ENDSSH

echo ""
echo "========================================"
echo "  DEPLOYMENT ERFOLGREICH!"
echo "========================================"
echo ""
echo "URLs:"
echo "  Frontend: https://stateofthedart.com"
echo "  Backend:  https://api.stateofthedart.com"
echo ""
echo "Status pruefen:"
echo "  ssh ${VPS_HOST} 'pm2 status'"
echo ""
echo "Logs:"
echo "  ssh ${VPS_HOST} 'pm2 logs ${PM2_NAME}'"
echo ""
