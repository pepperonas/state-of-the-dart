# VPS Deployment Anleitung

## Aktuelles Server-Setup (Stand: 2026-01-16)

| Komponente | Pfad / Wert |
|------------|-------------|
| **VPS IP** | `69.62.121.168` |
| **SSH User** | `root` |
| **SSH Port** | `22` (Standard) |
| **Frontend** | `/var/www/stateofthedart` |
| **Backend** | `/var/www/stateofthedart-backend` |
| **Datenbank** | `/var/www/stateofthedart-backend/data/state-of-the-dart.db` |
| **PM2 Prozess** | `stateofthedart-backend` |
| **Backend Port** | `3002` |
| **Frontend URL** | `https://stateofthedart.com` |
| **API URL** | `https://api.stateofthedart.com` |

---

## Schnellstart Deployment

```bash
# 1. Frontend bauen und deployen
npm run build
rsync -avz --delete dist/ root@69.62.121.168:/var/www/stateofthedart/

# 2. Backend bauen und deployen (falls Code-Änderungen)
cd server && npm run build && cd ..
rsync -avz --exclude='node_modules' --exclude='data' server/ root@69.62.121.168:/var/www/stateofthedart-backend/
ssh root@69.62.121.168 "cd /var/www/stateofthedart-backend && npm install --production && pm2 restart stateofthedart-backend"

# 3. Nur Backend neu starten
ssh root@69.62.121.168 "pm2 restart stateofthedart-backend"
```

---

## Wichtige Dateien auf dem Server

### Backend .env (`/var/www/stateofthedart-backend/.env`)

```env
# Database
DATABASE_URL=./data/state-of-the-dart.db

# JWT & Session
JWT_SECRET=<secret>
SESSION_SECRET=<secret>

# SMTP (WICHTIG: SMTP_PASSWORD, nicht SMTP_PASS!)
SMTP_HOST=premium269-4.web-hosting.com
SMTP_PORT=465
SMTP_USER=stateofthedart@celox.io
SMTP_PASSWORD=<password>

# Google OAuth
GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<client_secret>

# Stripe
STRIPE_SECRET_KEY=<stripe_key>
STRIPE_WEBHOOK_SECRET=<webhook_secret>

# URLs
CLIENT_URL=https://stateofthedart.com
SERVER_URL=https://api.stateofthedart.com
APP_URL=https://stateofthedart.com
API_URL=https://api.stateofthedart.com
CORS_ORIGINS=https://stateofthedart.com,https://api.stateofthedart.com
GOOGLE_CALLBACK_URL=https://api.stateofthedart.com/api/auth/google/callback

# Server
PORT=3002
NODE_ENV=production
```

### Frontend .env (lokal: `.env`)

```env
VITE_API_URL=https://api.stateofthedart.com
VITE_STRIPE_PUBLISHABLE_KEY=<publishable_key>
```

---

## DNS-Einstellungen

```
A     stateofthedart.com     → 69.62.121.168
A     www.stateofthedart.com → 69.62.121.168
A     api.stateofthedart.com → 69.62.121.168
```

---

## PM2 Commands

```bash
# Status
ssh root@69.62.121.168 "pm2 status"

# Logs (live)
ssh root@69.62.121.168 "pm2 logs stateofthedart-backend"

# Logs (letzte 50 Zeilen)
ssh root@69.62.121.168 "pm2 logs stateofthedart-backend --lines 50 --nostream"

# Neu starten
ssh root@69.62.121.168 "pm2 restart stateofthedart-backend"

# Speichern (für Autostart)
ssh root@69.62.121.168 "pm2 save"
```

---

## Datenbank Management

```bash
# Datenbank-Backup erstellen
ssh root@69.62.121.168 "cp /var/www/stateofthedart-backend/data/state-of-the-dart.db /var/www/stateofthedart-backend/data/backup-\$(date +%Y%m%d).db"

# Lokale DB zum Server kopieren
scp server/database.sqlite root@69.62.121.168:/var/www/stateofthedart-backend/data/state-of-the-dart.db

# Heatmaps regenerieren (lokal)
cd server && npx ts-node scripts/regenerate-heatmaps.ts

# Datenbank-Inhalt prüfen
ssh root@69.62.121.168 "sqlite3 /var/www/stateofthedart-backend/data/state-of-the-dart.db 'SELECT COUNT(*) FROM players'"
```

---

## Troubleshooting

### Backend startet nicht
```bash
ssh root@69.62.121.168 "pm2 logs stateofthedart-backend --lines 100 --nostream"
ssh root@69.62.121.168 "cd /var/www/stateofthedart-backend && node dist/index.js"
```

### API nicht erreichbar
```bash
curl https://api.stateofthedart.com/health
ssh root@69.62.121.168 "netstat -tlnp | grep 3002"
```

### Google OAuth leitet auf localhost
- Prüfe ob `.env` lokal existiert mit `VITE_API_URL=https://api.stateofthedart.com`
- Frontend neu bauen: `npm run build`
- Neu deployen

### Spieler/Daten fehlen
- Prüfe ob User dem richtigen Tenant zugeordnet ist
- Tenant-Zuordnung ändern:
```bash
ssh root@69.62.121.168 "sqlite3 /var/www/stateofthedart-backend/data/state-of-the-dart.db \"UPDATE tenants SET user_id = '<neue_user_id>' WHERE id = '<tenant_id>'\""
```

---

## Nginx Konfiguration

Die Nginx-Config befindet sich unter `/etc/nginx/sites-available/stateofthedart.com`:

- Frontend: Reverse Proxy zu statischen Dateien
- API: Reverse Proxy zu `localhost:3002`
- SSL: Let's Encrypt Zertifikate

```bash
# Config testen
ssh root@69.62.121.168 "nginx -t"

# Nginx neu laden
ssh root@69.62.121.168 "systemctl reload nginx"
```

---

## Changelog

### 2026-01-16
- Backend-Pfad konsolidiert auf `/var/www/stateofthedart-backend`
- Datenbank-Pfad: `/var/www/stateofthedart-backend/data/state-of-the-dart.db`
- PM2 Prozess: `stateofthedart-backend`
- Alte Backups und Duplikate entfernt
- Heatmap-Regeneration Script erstellt
- Google OAuth Fix (Frontend .env)
- SMTP-Konfiguration: `SMTP_PASSWORD` (nicht `SMTP_PASS`)
- Heatmap-Visualisierung verbessert (mehr Kontrast, präsentere Farben)
- Demo-Spieler mit charakteristischen Heatmaps erstellt
- Registrierung: Email-Fehler blockieren nicht mehr die Account-Erstellung
