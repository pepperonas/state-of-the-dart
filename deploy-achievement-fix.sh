#!/bin/bash
# Deployment script for achievement API fix
# Run this on the VPS: ./deploy-achievement-fix.sh

set -e

echo "🚀 Deploying Achievement API Fix..."

VPS_USER="martin"
VPS_HOST="69.62.121.168"
BACKEND_DIR="/var/www/stateofthedart-backend"
FRONTEND_DIR="/var/www/stateofthedart"

echo "📦 Step 1: Deploy Backend..."
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
cd /var/www/stateofthedart-backend
echo "  📥 Pulling latest changes..."
git pull origin main
echo "  🔨 Building backend..."
npm install
npm run build
EOF

echo "📦 Step 2: Run Database Migration..."
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
cd /var/www/stateofthedart-backend
echo "  🔧 Running migration..."
DB_PATH=/var/www/stateofthedart-backend/data/database.db npx ts-node server/scripts/migrate-player-achievements.ts
EOF

echo "🔄 Step 3: Restart Backend..."
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
pm2 restart stateofthedart-backend
pm2 save
EOF

echo "📦 Step 4: Deploy Frontend..."
echo "  📤 Copying dist files..."
rsync -avz --delete dist/ ${VPS_USER}@${VPS_HOST}:${FRONTEND_DIR}/

echo "✅ Deployment Complete!"
echo ""
echo "🔍 Verify deployment:"
echo "  - Backend logs: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs stateofthedart-backend --lines 50'"
echo "  - Test API: curl https://api.stateofthedart.com/api/achievements"
echo "  - Open app: https://stateofthedart.com"
