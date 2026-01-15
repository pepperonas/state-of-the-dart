#!/bin/bash

# Hostinger VPS Deployment für State of the Dart v0.0.2
set -e

# Hostinger VPS Configuration
VPS_IP="147.93.61.153"
VPS_PORT="65002"
VPS_USER="u246949900"
SSH_KEY="$HOME/.ssh/id_ed25519_hostinger_webhost"
FRONTEND_PATH="/home/u246949900/domains/stateofthedart.com/public_html"
BACKEND_PATH="/home/u246949900/stateofthedart-backend"

# SSH Command Helper
SSH_CMD="ssh -p ${VPS_PORT} -i ${SSH_KEY} ${VPS_USER}@${VPS_IP}"
SCP_CMD="scp -P ${VPS_PORT} -i ${SSH_KEY}"

echo "🚀 Hostinger VPS Deployment gestartet..."
echo "=========================================="
echo ""

# ============================================
# SCHRITT 1: Frontend bauen
# ============================================
echo "🔨 SCHRITT 1: Frontend bauen..."

cat > .env << 'EOF'
VITE_API_URL=https://api.stateofthedart.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SbJLI6sUXfiu5sCaFj6prXjK1rMW0uU1eJksdYCZDpYqgOP5LHEzcskMEFhsVIF1UFupBDVpZl3Cl6v1AonUahF00evYZdsji
EOF

npm run build
echo "✅ Frontend gebaut"
echo ""

# ============================================
# SCHRITT 2: Backend bauen
# ============================================
echo "🔨 SCHRITT 2: Backend bauen..."
cd server
npm run build
cd ..
echo "✅ Backend gebaut"
echo ""

# ============================================
# SCHRITT 3: Backend-Paket erstellen
# ============================================
echo "📦 SCHRITT 3: Backend-Paket erstellen..."
tar -czf backend-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='database.sqlite' \
  --exclude='database.sqlite-journal' \
  --exclude='data/' \
  server/
echo "✅ Backend-Paket erstellt"
echo ""

# ============================================
# SCHRITT 4: VPS vorbereiten
# ============================================
echo "🔧 SCHRITT 4: VPS vorbereiten..."
$SSH_CMD << 'ENDSSH'
  # Verzeichnisse erstellen
  mkdir -p ~/domains/stateofthedart.com/public_html
  mkdir -p ~/stateofthedart-backend
  
  # Node.js Version prüfen
  if command -v node &> /dev/null; then
    echo "Node.js Version: $(node -v)"
  else
    echo "⚠️  Node.js nicht gefunden - bitte über Hostinger Panel installieren"
  fi
  
  # PM2 installieren (falls nicht vorhanden)
  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
  fi
  
  echo "✅ VPS vorbereitet"
ENDSSH
echo ""

# ============================================
# SCHRITT 5: Frontend deployen
# ============================================
echo "📤 SCHRITT 5: Frontend deployen..."
rsync -avz --delete -e "ssh -p ${VPS_PORT} -i ${SSH_KEY}" \
  --exclude='node_modules' \
  --exclude='.git' \
  dist/ ${VPS_USER}@${VPS_IP}:${FRONTEND_PATH}/
echo "✅ Frontend deployed"
echo ""

# ============================================
# SCHRITT 6: Backend deployen
# ============================================
echo "📤 SCHRITT 6: Backend deployen..."

# Upload
$SCP_CMD backend-deploy.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/

# Installieren
$SSH_CMD << 'ENDSSH'
  cd ~/stateofthedart-backend
  
  # Backup alte Version
  if [ -d "server" ]; then
    echo "📦 Backup alte Version..."
    mv server server.backup.$(date +%Y%m%d_%H%M%S)
  fi
  
  # Entpacken
  echo "📦 Entpacke neue Version..."
  tar -xzf /tmp/backend-deploy.tar.gz
  cd server
  
  # Dependencies installieren
  echo "📦 Installiere Dependencies..."
  npm install --production
  
  # .env erstellen (falls nicht vorhanden)
  if [ ! -f ".env" ]; then
    echo "📝 Erstelle .env..."
    cat > .env << 'EOF'
# Database
DATABASE_URL=./database.sqlite

# JWT & Session
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters-long
SESSION_SECRET=your-super-secret-session-key-change-this-in-production-minimum-32-characters-long

# SMTP Configuration
SMTP_HOST=premium269-4.web-hosting.com
SMTP_PORT=465
SMTP_USER=stateofthedart@celox.io
SMTP_PASS=<DEIN_SMTP_PASSWORT>

# Google OAuth
GOOGLE_CLIENT_ID=<DEINE_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<DEIN_GOOGLE_CLIENT_SECRET>

# Stripe
STRIPE_SECRET_KEY=<DEIN_STRIPE_SECRET_KEY>
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs
STRIPE_MONTHLY_PRICE_ID=price_xxx
STRIPE_LIFETIME_PRICE_ID=price_xxx

# URLs
CLIENT_URL=https://stateofthedart.com
SERVER_URL=https://api.stateofthedart.com

# Server
PORT=3001
NODE_ENV=production
EOF
  fi
  
  # Admin-Konto erstellen (falls Datenbank neu)
  if [ ! -f "database.sqlite" ]; then
    echo "👑 Erstelle Admin-Konto..."
    npm run create:admin
    echo "📊 Generiere Demo-Daten..."
    npm run seed:demo
  fi
  
  # PM2 starten/neu starten
  echo "🔄 Starte Backend..."
  pm2 delete state-of-the-dart-api 2>/dev/null || true
  pm2 start dist/index.js --name state-of-the-dart-api
  pm2 save
  
  # Cleanup
  rm /tmp/backend-deploy.tar.gz
  
  echo "✅ Backend deployed und gestartet!"
ENDSSH
echo ""

# ============================================
# Cleanup
# ============================================
echo "🧹 Cleanup..."
rm backend-deploy.tar.gz
rm .env
echo "✅ Cleanup abgeschlossen"
echo ""

# ============================================
# FERTIG!
# ============================================
echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT ERFOLGREICH!"
echo "=========================================="
echo ""
echo "📊 Status prüfen:"
echo "  $SSH_CMD 'pm2 status'"
echo ""
echo "📝 Backend Logs:"
echo "  $SSH_CMD 'pm2 logs state-of-the-dart-api'"
echo ""
echo "🌐 URLs:"
echo "  Frontend: https://stateofthedart.com"
echo "  Backend:  https://api.stateofthedart.com"
echo ""
echo "👑 Admin Login:"
echo "  Email:    martin.pfeffer@celox.io"
echo "  Password: d8jhFWJ3hErj"
echo ""
echo "⚠️  WICHTIG: Credentials in .env eintragen:"
echo "  $SSH_CMD 'nano ~/stateofthedart-backend/server/.env'"
echo ""
echo "Dann Backend neu starten:"
echo "  $SSH_CMD 'pm2 restart state-of-the-dart-api'"
echo ""
