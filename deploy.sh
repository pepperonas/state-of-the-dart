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

# Nur dist und package files syncen (ohne node_modules und data)
rsync -avz \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='*.sqlite*' \
  --exclude='src' \
  --exclude='scripts' \
  --exclude='.env' \
  server/dist/ ${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/dist/

rsync -avz server/package*.json ${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/

echo "   Backend deployed"

# ============================================
# SCHRITT 4: Server neu starten
# ============================================
echo "4/4 Backend neu starten..."

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
