## 🚀 **Deployment Guide - State of the Dart**

Komplette Anleitung zum Deployment auf deinem VPS mit `stateofthedart.com`.

---

## **📋 Voraussetzungen**

- ✅ VPS mit Ubuntu 20.04+ (oder Debian)
- ✅ Root/Sudo Zugriff
- ✅ Domain: `stateofthedart.com`
- ✅ SSH Zugriff konfiguriert

---

## **🎯 Architektur**

```
Frontend:  https://stateofthedart.com      → Nginx → /var/www/stateofthedart/
Backend:   https://api.stateofthedart.com  → Nginx → localhost:3001 (PM2)
```

---

## **TEIL 1: DNS konfigurieren**

### **Bei deinem Domain-Provider (z.B. Cloudflare):**

```
A Record:
- Host: @
- Value: DEINE_VPS_IP
- TTL: Auto (oder 3600)

A Record:
- Host: api
- Value: DEINE_VPS_IP
- TTL: Auto (oder 3600)
```

### **DNS Propagation prüfen:**

```bash
# Lokal testen:
dig stateofthedart.com +short
dig api.stateofthedart.com +short

# Sollte deine VPS IP zeigen!
```

**Warte 5-10 Minuten** bis DNS propagiert ist.

---

## **TEIL 2: VPS Initial Setup**

### **1. SSH zum VPS:**

```bash
ssh root@DEINE_VPS_IP
```

### **2. Setup Script ausführen:**

```bash
# Download setup script
curl -o vps-setup.sh https://raw.githubusercontent.com/pepperonas/state-of-the-dart/main/server/vps-setup.sh

# Ausführbar machen
chmod +x vps-setup.sh

# Ausführen
./vps-setup.sh
```

**ODER manuell installieren:**

```bash
# System update
apt-get update && apt-get upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PM2
npm install -g pm2

# Nginx
apt-get install -y nginx

# Certbot (SSL)
apt-get install -y certbot python3-certbot-nginx

# Directories
mkdir -p /var/www/stateofthedart
mkdir -p /opt/server/data

# Firewall
apt-get install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## **TEIL 3: Backend Deployment**

### **Option A: Mit Deployment Script (empfohlen)**

**Auf deinem lokalen Rechner:**

```bash
cd /Users/martin/cursor/state-of-the-dart

# Script anpassen
nano deploy-backend.sh
# Ersetze: VPS_IP="DEINE_VPS_IP"

# Ausführbar machen
chmod +x deploy-backend.sh

# Ausführen
./deploy-backend.sh
```

### **Option B: Manuell**

**Auf lokalem Rechner:**

```bash
cd /Users/martin/cursor/state-of-the-dart

# Backend bauen
cd server
npm run build
cd ..

# Packen
tar -czf backend.tar.gz server/

# Upload
scp backend.tar.gz root@DEINE_VPS_IP:/opt/
```

**Auf VPS:**

```bash
ssh root@DEINE_VPS_IP

cd /opt
tar -xzf backend.tar.gz
cd server

# Dependencies
npm install --production

# .env erstellen (siehe unten)
nano .env

# Stripe Produkte erstellen
npm run setup:stripe

# PM2 starten
pm2 start dist/index.js --name state-of-the-dart-api
pm2 save
pm2 startup
```

### **Backend .env auf VPS:**

```bash
# Auf VPS: /opt/server/.env

# Server Configuration
PORT=3001
NODE_ENV=production
APP_URL=https://stateofthedart.com
API_URL=https://api.stateofthedart.com

# Database
DATABASE_PATH=./data/state-of-the-dart.db

# JWT Secrets (GENERIERE AUF VPS!)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# CORS Origins
CORS_ORIGINS=https://stateofthedart.com

# SMTP Configuration (TRAGE DEINE CREDENTIALS EIN!)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-secure-smtp-password
SMTP_FROM=Your App Name <your-email@your-domain.com>

# Google OAuth
GOOGLE_CLIENT_ID=<DEINE_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<DEIN_GOOGLE_CLIENT_SECRET>
GOOGLE_CALLBACK_URL=https://api.stateofthedart.com/api/auth/google/callback

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx  # DEINE KEYS
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRICE_ID_LIFETIME=price_xxx

# Trial Period
TRIAL_PERIOD_DAYS=30
```

---

## **TEIL 4: Frontend Deployment**

### **Option A: Mit Deployment Script**

```bash
cd /Users/martin/cursor/state-of-the-dart

# Script anpassen
nano deploy-frontend.sh
# Ersetze: VPS_IP="DEINE_VPS_IP"

# Ausführbar machen
chmod +x deploy-frontend.sh

# Ausführen
./deploy-frontend.sh
```

### **Option B: Manuell**

```bash
cd /Users/martin/cursor/state-of-the-dart

# Production .env
echo "VITE_API_URL=https://api.stateofthedart.com" > .env

# Build
npm run build

# Upload
rsync -avz --delete dist/ root@DEINE_VPS_IP:/var/www/stateofthedart/
```

---

## **TEIL 5: Nginx konfigurieren**

**Auf VPS:**

```bash
# Nginx Config erstellen
cat > /etc/nginx/sites-available/stateofthedart << 'EOF'
# Frontend
server {
    listen 80;
    server_name stateofthedart.com www.stateofthedart.com;
    
    root /var/www/stateofthedart;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}

# Backend API
server {
    listen 80;
    server_name api.stateofthedart.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Symlink
ln -s /etc/nginx/sites-available/stateofthedart /etc/nginx/sites-enabled/

# Nginx testen
nginx -t

# Neu starten
systemctl restart nginx
```

---

## **TEIL 6: SSL (HTTPS) einrichten**

**Auf VPS:**

```bash
# Let's Encrypt SSL
certbot --nginx \
  -d stateofthedart.com \
  -d www.stateofthedart.com \
  -d api.stateofthedart.com

# Email eingeben
# Terms akzeptieren (Y)
# HTTP→HTTPS redirect (2)
```

**Auto-Renewal testen:**

```bash
certbot renew --dry-run
```

---

## **TEIL 7: Stripe Webhooks**

1. Gehe zu: https://dashboard.stripe.com/webhooks
2. Klicke **"Add endpoint"**
3. Endpoint URL: `https://api.stateofthedart.com/api/payment/webhook`
4. Events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. Klicke **"Add endpoint"**
6. Kopiere **Signing Secret** → `STRIPE_WEBHOOK_SECRET` in VPS `.env`
7. PM2 neu starten: `pm2 restart state-of-the-dart-api`

---

## **🧪 TESTEN**

### **1. Backend Health Check:**

```bash
curl https://api.stateofthedart.com/health
```

**Erwartete Ausgabe:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### **2. Frontend öffnen:**

```
https://stateofthedart.com
```

✅ Sollte die App zeigen!

### **3. Registrierung testen:**

1. Klicke **"Registrieren"**
2. Email + Password eingeben
3. ✅ Email Verification sollte funktionieren

### **4. Google OAuth testen:**

1. Klicke **"Mit Google anmelden"**
2. ✅ Sollte zu Google → zurück zur App

### **5. Stripe Checkout testen:**

1. Gehe zu **"/pricing"**
2. Klicke **"Monatlich abonnieren"**
3. ✅ Sollte Stripe Checkout öffnen

---

## **📊 Monitoring & Logs**

### **Backend Logs:**

```bash
# Real-time logs
pm2 logs state-of-the-dart-api

# Nur Errors
pm2 logs state-of-the-dart-api --err

# Status
pm2 status
```

### **Nginx Logs:**

```bash
# Access Logs
tail -f /var/log/nginx/access.log

# Error Logs
tail -f /var/log/nginx/error.log
```

### **Systemd Status:**

```bash
# PM2 Service
systemctl status pm2-root

# Nginx
systemctl status nginx
```

---

## **🔄 Updates deployen**

### **Backend Update:**

```bash
./deploy-backend.sh
```

### **Frontend Update:**

```bash
./deploy-frontend.sh
```

---

## **🛡️ Security Checklist**

- [ ] ✅ UFW Firewall aktiviert
- [ ] ✅ SSH Key-based Auth (disable password)
- [ ] ✅ SSL/HTTPS aktiv
- [ ] ✅ `.env` Dateien haben richtige Permissions (`chmod 600`)
- [ ] ✅ Stripe Webhooks konfiguriert
- [ ] ✅ PM2 mit Auto-Restart
- [ ] ✅ Nginx rate limiting (optional)
- [ ] ✅ Fail2ban installiert (optional)

---

## **🚨 Troubleshooting**

### **Backend startet nicht:**

```bash
# Logs prüfen
pm2 logs state-of-the-dart-api --err

# Manuell testen
cd /opt/server
node dist/index.js
```

### **Frontend zeigt 502 Bad Gateway:**

```bash
# PM2 Status prüfen
pm2 status

# Backend neu starten
pm2 restart state-of-the-dart-api
```

### **SSL nicht erreichbar:**

```bash
# DNS prüfen
dig stateofthedart.com +short

# Certbot neu laufen lassen
certbot --nginx -d stateofthedart.com
```

### **Database Fehler:**

```bash
# Permissions prüfen
ls -la /opt/server/data/

# Falls nötig
chmod 755 /opt/server/data
chmod 644 /opt/server/data/*.db
```

---

## **📦 Backup**

### **Database Backup:**

```bash
# Auf VPS
cd /opt/server
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Download zu lokal
scp root@DEINE_VPS_IP:/opt/server/backup-*.tar.gz ./backups/
```

### **Automatisches Backup (Cron):**

```bash
# Crontab öffnen
crontab -e

# Daily backup um 3 Uhr nachts
0 3 * * * cd /opt/server && tar -czf /backups/db-$(date +\%Y\%m\%d).tar.gz data/ && find /backups -mtime +30 -delete
```

---

## **🎉 Fertig!**

Deine App läuft jetzt auf:
- 🌐 **Frontend:** https://stateofthedart.com
- ⚡ **Backend API:** https://api.stateofthedart.com
- 📊 **Stripe Dashboard:** https://dashboard.stripe.com
- 🔑 **Google OAuth:** https://console.cloud.google.com

---

## **📞 Support**

Bei Problemen:
1. Prüfe Logs: `pm2 logs`
2. Prüfe Nginx: `nginx -t`
3. Prüfe DNS: `dig stateofthedart.com`
4. Lies SECURITY.md
5. Lies server/SETUP.md

---

🚀 **Happy Deploying!**
