#!/bin/bash

# State of the Dart - Deployment Script
# Deploys the app to production VPS

set -e  # Exit on error

echo "🎯 State of the Dart - Deployment Script"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/Users/martin/cursor/state-of-the-dart"
VPS_HOST="root@69.62.121.168"
VPS_PATH="/var/www/stateofthedart"
LOCAL_BUILD_PATH="dist"

# Step 1: Build
echo ""
echo -e "${YELLOW}📦 Step 1/4: Building app...${NC}"
npm run build

if [ ! -d "$LOCAL_BUILD_PATH" ]; then
    echo "❌ Build failed - dist directory not found!"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Step 2: Backup (optional)
echo ""
echo -e "${YELLOW}💾 Step 2/4: Creating backup on VPS...${NC}"
ssh $VPS_HOST "if [ -d $VPS_PATH ]; then cp -r $VPS_PATH ${VPS_PATH}.backup-$(date +%Y%m%d-%H%M%S); fi"
echo -e "${GREEN}✅ Backup created${NC}"

# Step 3: Upload
echo ""
echo -e "${YELLOW}📤 Step 3/4: Uploading to VPS...${NC}"
rsync -avz --progress --delete $LOCAL_BUILD_PATH/ $VPS_HOST:$VPS_PATH/

# Step 4: Set Permissions
echo ""
echo -e "${YELLOW}🔐 Step 4/4: Setting permissions...${NC}"
ssh $VPS_HOST "chown -R www-data:www-data $VPS_PATH"
echo -e "${GREEN}✅ Permissions set${NC}"

# Final verification
echo ""
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://stateofthedart.com)

if [ $HTTP_STATUS -eq 200 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "🎉 App is live at:"
    echo "   🌐 https://stateofthedart.com"
    echo "   🌐 https://www.stateofthedart.com"
else
    echo -e "⚠️  Warning: HTTP status code $HTTP_STATUS"
    echo "   Please check the deployment manually"
fi

echo ""
echo "========================================"
echo "Deployment completed at $(date)"
