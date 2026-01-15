#!/bin/bash

# State of the Dart - VPS Deployment Script
# This script deploys the backend API to a VPS with PM2 and Nginx

set -e  # Exit on error

echo "🚀 State of the Dart - VPS Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuration
APP_NAME="state-of-the-dart-api"
APP_DIR="/var/www/state-of-the-dart"
NGINX_CONF="/etc/nginx/sites-available/state-of-the-dart"
NGINX_ENABLED="/etc/nginx/sites-enabled/state-of-the-dart"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run as root${NC}"
   exit 1
fi

# Step 1: Install dependencies
echo -e "\n${BLUE}📦 Step 1: Installing system dependencies...${NC}"
sudo apt update
sudo apt install -y nginx nodejs npm

# Step 2: Install PM2
echo -e "\n${BLUE}🔧 Step 2: Installing PM2...${NC}"
sudo npm install -g pm2

# Step 3: Create application directory
echo -e "\n${BLUE}📁 Step 3: Setting up application directory...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Step 4: Copy files
echo -e "\n${BLUE}📋 Step 4: Copying application files...${NC}"
cp -r dist $APP_DIR/
cp -r node_modules $APP_DIR/
cp package.json $APP_DIR/
cp env.example $APP_DIR/.env

echo -e "${GREEN}✅ Files copied${NC}"
echo -e "${BLUE}⚠️  Please edit $APP_DIR/.env with production values${NC}"
read -p "Press enter when .env is configured..."

# Step 5: Start application with PM2
echo -e "\n${BLUE}🚀 Step 5: Starting application with PM2...${NC}"
cd $APP_DIR
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start dist/index.js --name $APP_NAME
pm2 save
pm2 startup | tail -n 1 | bash

echo -e "${GREEN}✅ Application started${NC}"

# Step 6: Configure Nginx
echo -e "\n${BLUE}🌐 Step 6: Configuring Nginx...${NC}"

read -p "Enter your domain (e.g., api.example.com): " DOMAIN

sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf $NGINX_CONF $NGINX_ENABLED
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured${NC}"

# Step 7: Optional - Setup SSL with Let's Encrypt
echo -e "\n${BLUE}🔒 Step 7: SSL Certificate (optional)${NC}"
read -p "Do you want to setup SSL with Let's Encrypt? (y/n): " SETUP_SSL

if [ "$SETUP_SSL" = "y" ]; then
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d $DOMAIN
    echo -e "${GREEN}✅ SSL certificate installed${NC}"
fi

# Summary
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${BLUE}🔗 API URL:${NC} http://$DOMAIN"
echo -e "${BLUE}🏥 Health Check:${NC} http://$DOMAIN/health"
echo -e "${BLUE}📊 API Docs:${NC} http://$DOMAIN/api"
echo -e "\n${BLUE}Useful PM2 Commands:${NC}"
echo -e "  pm2 status              # View app status"
echo -e "  pm2 logs $APP_NAME      # View logs"
echo -e "  pm2 restart $APP_NAME   # Restart app"
echo -e "  pm2 stop $APP_NAME      # Stop app"
echo -e "  pm2 delete $APP_NAME    # Delete app"
echo -e "\n${BLUE}Nginx Commands:${NC}"
echo -e "  sudo nginx -t           # Test config"
echo -e "  sudo systemctl reload nginx  # Reload"
echo -e "  sudo systemctl status nginx  # Status"

echo -e "\n${GREEN}🎉 Happy darting!${NC}\n"
