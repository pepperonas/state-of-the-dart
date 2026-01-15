#!/bin/bash

# Frontend Deployment Script
# Usage: ./deploy-frontend.sh

set -e

echo "🚀 Frontend Deployment gestartet..."

# Configuration
VPS_IP="YOUR_VPS_IP"  # Ersetze mit deiner VPS IP
VPS_USER="root"
DEPLOY_PATH="/var/www/stateofthedart"

# 1. Production .env erstellen
echo "📝 Erstelle Production .env..."
cat > .env << 'EOF'
VITE_API_URL=https://api.stateofthedart.com
EOF

# 2. Build
echo "🔨 Baue Frontend..."
npm run build

# 3. Upload
echo "📤 Uploade zu VPS..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  dist/ ${VPS_USER}@${VPS_IP}:${DEPLOY_PATH}/

echo "✅ Frontend Deployment erfolgreich!"
echo ""
echo "🌐 Öffne: https://stateofthedart.com"
