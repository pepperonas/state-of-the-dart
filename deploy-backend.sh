#!/bin/bash

# Backend Deployment Script
# Usage: ./deploy-backend.sh

set -e

echo "🚀 Backend Deployment gestartet..."

# Configuration
VPS_IP="YOUR_VPS_IP"  # Ersetze mit deiner VPS IP
VPS_USER="root"
DEPLOY_PATH="/opt/server"

# 1. Build lokal
echo "🔨 Baue Backend lokal..."
cd server
npm run build
cd ..

# 2. Erstelle tar.gz
echo "📦 Packe Backend..."
tar -czf backend.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='data/*.db' \
  server/

# 3. Upload
echo "📤 Uploade zu VPS..."
scp backend.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/

# 4. Auf VPS entpacken & installieren
echo "🔧 Installiere auf VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
  cd /opt
  
  # Backup alte Version
  if [ -d "server" ]; then
    mv server server.backup.$(date +%Y%m%d_%H%M%S)
  fi
  
  # Entpacken
  tar -xzf /tmp/backend.tar.gz
  cd server
  
  # Dependencies installieren
  npm install --production
  
  # PM2 neu starten
  pm2 restart state-of-the-dart-api || pm2 start dist/index.js --name state-of-the-dart-api
  pm2 save
  
  # Cleanup
  rm /tmp/backend.tar.gz
  
  echo "✅ Backend deployed!"
ENDSSH

# 5. Cleanup lokal
rm backend.tar.gz

echo "✅ Backend Deployment erfolgreich!"
echo ""
echo "🔍 Logs anzeigen: ssh ${VPS_USER}@${VPS_IP} 'pm2 logs state-of-the-dart-api'"
echo "📊 Status prüfen: ssh ${VPS_USER}@${VPS_IP} 'pm2 status'"
