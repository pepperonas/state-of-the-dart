#!/bin/bash

# State of the Dart - VPS Deployment
set -e

# VPS Configuration
VPS_IP="69.62.121.168"
VPS_USER="root"
FRONTEND_PATH="/var/www/stateofthedart"
BACKEND_PATH="/var/www/stateofthedart-backend"
PM2_NAME="stateofthedart-backend"

echo "========================================"
echo "  State of the Dart - Deployment"
echo "  VPS: ${VPS_USER}@${VPS_IP}"
echo "========================================"
echo ""

# ============================================
# SCHRITT 1: Frontend bauen
# ============================================
echo "1/4 Frontend bauen..."

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
echo "2/4 Frontend deployen..."
rsync -avz --delete dist/ ${VPS_USER}@${VPS_IP}:${FRONTEND_PATH}/
echo "   Frontend deployed"

# ============================================
# SCHRITT 3: Backend bauen und deployen
# ============================================
echo "3/4 Backend bauen und deployen..."
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
  server/dist/ ${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/dist/

rsync -avz server/package*.json ${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/

echo "   ⚠️  HINWEIS: .env wird NICHT deployed (Production-Secrets!)"

echo "   Backend deployed"

# ============================================
# SCHRITT 4: Server neu starten
# ============================================
echo "4/4 Backend neu starten..."

# ============================================
# KRITISCH: VPS .env validieren
# ============================================
echo "   Validiere VPS .env..."

REQUIRED_VARS="GOOGLE_CALLBACK_URL APP_URL API_URL CORS_ORIGINS"
MISSING_VARS=""

for var in $REQUIRED_VARS; do
  if ! ssh ${VPS_USER}@${VPS_IP} "grep -q '^${var}=' ${BACKEND_PATH}/.env" 2>/dev/null; then
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
CALLBACK_URL=$(ssh ${VPS_USER}@${VPS_IP} "grep '^GOOGLE_CALLBACK_URL=' ${BACKEND_PATH}/.env | cut -d'=' -f2")
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

ssh ${VPS_USER}@${VPS_IP} << ENDSSH
  cd ${BACKEND_PATH}

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
echo "  ssh ${VPS_USER}@${VPS_IP} 'pm2 status'"
echo ""
echo "Logs:"
echo "  ssh ${VPS_USER}@${VPS_IP} 'pm2 logs ${PM2_NAME}'"
echo ""
