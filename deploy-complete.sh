#!/bin/bash

# Complete VPS Deployment Script for State of the Dart v0.0.2
# This deploys BOTH frontend and backend with authentication system

set -e

echo "🚀 Complete Deployment für State of the Dart v0.0.2"
echo "=================================================="
echo ""

# Configuration - BITTE ANPASSEN!
VPS_IP="147.93.61.153"  # z.B. "123.45.67.89"
VPS_USER="u246949900"
FRONTEND_PATH="/var/www/stateofthedart"
BACKEND_PATH="/opt/stateofthedart"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Deployment Konfiguration:${NC}"
echo "  VPS IP: $VPS_IP"
echo "  VPS User: $VPS_USER"
echo "  Frontend: $FRONTEND_PATH"
echo "  Backend: $BACKEND_PATH"
echo ""

# Check if VPS_IP is set
if [ "$VPS_IP" = "YOUR_VPS_IP_HERE" ]; then
    echo -e "${RED}❌ FEHLER: Bitte setze VPS_IP in diesem Script!${NC}"
    echo ""
    echo "Öffne deploy-complete.sh und ändere:"
    echo '  VPS_IP="147.93.61.153"'
    echo "zu deiner echten VPS IP, z.B.:"
    echo '  VPS_IP="123.45.67.89"'
    exit 1
fi

# ============================================
# SCHRITT 1: Frontend bauen
# ============================================
echo -e "${BLUE}🔨 SCHRITT 1: Frontend bauen...${NC}"

# Production .env für Frontend erstellen
cat > .env << 'EOF'
VITE_API_URL=https://api.stateofthedart.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SbJLI6sUXfiu5sCaFj6prXjK1rMW0uU1eJksdYCZDpYqgOP5LHEzcskMEFhsVIF1UFupBDVpZl3Cl6v1AonUahF00evYZdsji
EOF

npm run build
echo -e "${GREEN}✅ Frontend gebaut${NC}"
echo ""

# ============================================
# SCHRITT 2: Backend bauen
# ============================================
echo -e "${BLUE}🔨 SCHRITT 2: Backend bauen...${NC}"
cd server
npm run build
cd ..
echo -e "${GREEN}✅ Backend gebaut${NC}"
echo ""

# ============================================
# SCHRITT 3: Deployment-Paket erstellen
# ============================================
echo -e "${BLUE}📦 SCHRITT 3: Deployment-Paket erstellen...${NC}"

# Backend packen (ohne node_modules, die werden auf VPS installiert)
tar -czf backend-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='database.sqlite' \
  --exclude='database.sqlite-journal' \
  --exclude='data/' \
  server/

echo -e "${GREEN}✅ Deployment-Paket erstellt${NC}"
echo ""

# ============================================
# SCHRITT 4: VPS vorbereiten
# ============================================
echo -e "${BLUE}🔧 SCHRITT 4: VPS vorbereiten...${NC}"

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
  # Verzeichnisse erstellen
  mkdir -p /var/www/stateofthedart
  mkdir -p /opt/stateofthedart
  
  # Node.js installieren (falls nicht vorhanden)
  if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  
  # PM2 installieren (falls nicht vorhanden)
  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
  fi
  
  echo "✅ VPS vorbereitet"
ENDSSH

echo -e "${GREEN}✅ VPS vorbereitet${NC}"
echo ""

# ============================================
# SCHRITT 5: Frontend deployen
# ============================================
echo -e "${BLUE}📤 SCHRITT 5: Frontend deployen...${NC}"

rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  dist/ ${VPS_USER}@${VPS_IP}:${FRONTEND_PATH}/

echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

# ============================================
# SCHRITT 6: Backend deployen
# ============================================
echo -e "${BLUE}📤 SCHRITT 6: Backend deployen...${NC}"

# Upload Backend
scp backend-deploy.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/

# Auf VPS installieren
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
  cd /opt/stateofthedart
  
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
  
  # PM2 neu starten
  echo "🔄 Starte Backend..."
  pm2 delete state-of-the-dart-api 2>/dev/null || true
  pm2 start dist/index.js --name state-of-the-dart-api
  pm2 save
  
  # Cleanup
  rm /tmp/backend-deploy.tar.gz
  
  echo "✅ Backend deployed und gestartet!"
ENDSSH

echo -e "${GREEN}✅ Backend deployed${NC}"
echo ""

# ============================================
# SCHRITT 7: Nginx konfigurieren
# ============================================
echo -e "${BLUE}🌐 SCHRITT 7: Nginx konfigurieren...${NC}"

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
  # Frontend Config
  cat > /etc/nginx/sites-available/stateofthedart << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name stateofthedart.com www.stateofthedart.com;
    
    root /var/www/stateofthedart;
    index index.html;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Service Worker - no cache
    location = /sw.js {
        add_header Cache-Control "no-cache";
        proxy_cache_bypass $http_pragma;
        proxy_cache_revalidate on;
        expires off;
        access_log off;
    }
}
EOF

  # Backend API Config
  cat > /etc/nginx/sites-available/api.stateofthedart << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.stateofthedart.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

  # Symlinks erstellen
  ln -sf /etc/nginx/sites-available/stateofthedart /etc/nginx/sites-enabled/
  ln -sf /etc/nginx/sites-available/api.stateofthedart /etc/nginx/sites-enabled/
  
  # Nginx testen und neu laden
  nginx -t && systemctl reload nginx
  
  echo "✅ Nginx konfiguriert"
ENDSSH

echo -e "${GREEN}✅ Nginx konfiguriert${NC}"
echo ""

# ============================================
# SCHRITT 8: SSL mit Certbot (optional)
# ============================================
echo -e "${BLUE}🔒 SCHRITT 8: SSL Zertifikate...${NC}"
echo "Möchtest du SSL-Zertifikate mit Let's Encrypt installieren? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
        # Certbot installieren
        if ! command -v certbot &> /dev/null; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Zertifikate erstellen
        certbot --nginx -d stateofthedart.com -d www.stateofthedart.com --non-interactive --agree-tos -m admin@stateofthedart.com
        certbot --nginx -d api.stateofthedart.com --non-interactive --agree-tos -m admin@stateofthedart.com
        
        echo "✅ SSL Zertifikate installiert"
ENDSSH
    echo -e "${GREEN}✅ SSL aktiviert${NC}"
else
    echo "⏭️  SSL übersprungen"
fi
echo ""

# ============================================
# Cleanup
# ============================================
echo -e "${BLUE}🧹 Cleanup...${NC}"
rm backend-deploy.tar.gz
rm .env
echo -e "${GREEN}✅ Cleanup abgeschlossen${NC}"
echo ""

# ============================================
# FERTIG!
# ============================================
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 DEPLOYMENT ERFOLGREICH!${NC}"
echo "=================================================="
echo ""
echo "📊 Status prüfen:"
echo "  ssh ${VPS_USER}@${VPS_IP} 'pm2 status'"
echo ""
echo "📝 Backend Logs:"
echo "  ssh ${VPS_USER}@${VPS_IP} 'pm2 logs state-of-the-dart-api'"
echo ""
echo "🌐 URLs:"
echo "  Frontend: https://stateofthedart.com"
echo "  Backend:  https://api.stateofthedart.com"
echo "  Health:   https://api.stateofthedart.com/health"
echo ""
echo "👑 Admin Login:"
echo "  Email:    martin.pfeffer@celox.io"
echo "  Password: d8jhFWJ3hErj"
echo ""
echo "🔄 Nächste Schritte:"
echo "  1. Öffne https://stateofthedart.com"
echo "  2. Registriere einen Account oder logge als Admin ein"
echo "  3. Prüfe das Admin Panel im Main Menu"
echo ""
