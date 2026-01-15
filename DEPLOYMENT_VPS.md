# 🚀 VPS Deployment Anleitung für v0.0.2

## Schnellstart

```bash
# 1. VPS-IP im Script eintragen
nano deploy-complete.sh
# Ändere: VPS_IP="YOUR_VPS_IP_HERE" zu deiner echten IP

# 2. Script ausführen
./deploy-complete.sh

# 3. Auf VPS: Echte Credentials eintragen
ssh root@YOUR_VPS_IP
nano /opt/stateofthedart/server/.env
# Trage echte Werte ein für:
# - SMTP_PASS
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET  
# - STRIPE_SECRET_KEY

# 4. Backend neu starten
pm2 restart state-of-the-dart-api
```

---

## Was das Script macht

### ✅ Frontend Deployment
- Baut React App mit Production-Config
- Uploaded nach `/var/www/stateofthedart`
- Konfiguriert Nginx für `stateofthedart.com`

### ✅ Backend Deployment
- Baut Express.js API
- Uploaded nach `/opt/stateofthedart/server`
- Installiert Dependencies
- Erstellt `.env` mit Platzhaltern
- Erstellt Admin-Konto (`martin.pfeffer@celox.io`)
- Generiert Demo-Daten (4 Spieler, 20 Matches)
- Startet mit PM2

### ✅ Nginx Konfiguration
- Frontend: `stateofthedart.com`
- Backend API: `api.stateofthedart.com`
- Gzip Compression
- Static Asset Caching
- Reverse Proxy für API

### ✅ Optional: SSL
- Let's Encrypt Zertifikate
- Automatische Erneuerung
- HTTPS für beide Domains

---

## Voraussetzungen auf dem VPS

Das Script installiert automatisch:
- ✅ Node.js 20.x
- ✅ PM2 (Process Manager)
- ✅ Nginx (falls nicht vorhanden)
- ✅ Certbot (für SSL, optional)

**Minimale VPS-Anforderungen:**
- Ubuntu 20.04+ oder Debian 11+
- 1 GB RAM
- 10 GB Speicher
- Root-Zugriff

---

## DNS-Einstellungen

Stelle sicher, dass folgende DNS-Records gesetzt sind:

```
A     stateofthedart.com     → DEINE_VPS_IP
A     www.stateofthedart.com → DEINE_VPS_IP
A     api.stateofthedart.com → DEINE_VPS_IP
```

---

## Nach dem Deployment

### 1. Credentials eintragen

```bash
ssh root@YOUR_VPS_IP
cd /opt/stateofthedart/server
nano .env
```

Ersetze die Platzhalter:

```env
# SMTP (für Email-Verifikation)
SMTP_PASS=<DEIN_ECHTES_PASSWORT>

# Google OAuth
GOOGLE_CLIENT_ID=<DEINE_ECHTE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<DEIN_ECHTES_SECRET>

# Stripe
STRIPE_SECRET_KEY=<DEIN_ECHTER_STRIPE_KEY>
```

### 2. Backend neu starten

```bash
pm2 restart state-of-the-dart-api
pm2 save
```

### 3. Status prüfen

```bash
# PM2 Status
pm2 status

# Backend Logs
pm2 logs state-of-the-dart-api

# Health Check
curl https://api.stateofthedart.com/health

# Nginx Status
systemctl status nginx
```

### 4. App testen

1. Öffne https://stateofthedart.com
2. Klicke auf "Login"
3. Logge als Admin ein:
   - Email: `martin.pfeffer@celox.io`
   - Passwort: `d8jhFWJ3hErj`
4. Im Main Menu sollte "👑 Admin Panel" erscheinen
5. Prüfe Demo-Daten in Statistics/Players

---

## Troubleshooting

### Backend startet nicht

```bash
# Logs prüfen
pm2 logs state-of-the-dart-api --lines 100

# Manuell starten
cd /opt/stateofthedart/server
node dist/index.js
```

### Frontend zeigt 404

```bash
# Nginx Config prüfen
nginx -t

# Nginx neu laden
systemctl reload nginx

# Logs prüfen
tail -f /var/log/nginx/error.log
```

### API nicht erreichbar

```bash
# Port 3001 prüfen
netstat -tlnp | grep 3001

# Firewall prüfen
ufw status

# Falls geschlossen:
ufw allow 80/tcp
ufw allow 443/tcp
```

### SSL-Fehler

```bash
# Zertifikate erneuern
certbot renew

# Nginx neu laden
systemctl reload nginx
```

### Datenbank-Fehler

```bash
cd /opt/stateofthedart/server

# Datenbank neu erstellen
rm database.sqlite
npm run create:admin
npm run seed:demo

# Backend neu starten
pm2 restart state-of-the-dart-api
```

---

## Nützliche Commands

### PM2 Management

```bash
# Status
pm2 status

# Logs (live)
pm2 logs state-of-the-dart-api

# Logs (letzte 100 Zeilen)
pm2 logs state-of-the-dart-api --lines 100

# Neu starten
pm2 restart state-of-the-dart-api

# Stoppen
pm2 stop state-of-the-dart-api

# Löschen
pm2 delete state-of-the-dart-api

# Beim Boot starten
pm2 startup
pm2 save
```

### Nginx Management

```bash
# Config testen
nginx -t

# Neu laden
systemctl reload nginx

# Neu starten
systemctl restart nginx

# Status
systemctl status nginx

# Logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Management

```bash
cd /opt/stateofthedart/server

# Admin erstellen
npm run create:admin

# Demo-Daten
npm run seed:demo

# Datenbank-Backup
cp database.sqlite database.backup.$(date +%Y%m%d).sqlite

# Datenbank wiederherstellen
cp database.backup.YYYYMMDD.sqlite database.sqlite
pm2 restart state-of-the-dart-api
```

---

## Update auf neue Version

```bash
# Lokal: Neue Version bauen
npm run build
cd server && npm run build && cd ..

# Deployment-Script erneut ausführen
./deploy-complete.sh

# Auf VPS: Backend neu starten
ssh root@YOUR_VPS_IP 'pm2 restart state-of-the-dart-api'
```

---

## Sicherheit

### ⚠️ WICHTIG nach Deployment:

1. **Ändere Admin-Passwort** im Admin Panel
2. **Ändere JWT_SECRET** in `.env` (generiere mit `openssl rand -hex 32`)
3. **Ändere SESSION_SECRET** in `.env`
4. **Ändere SMTP-Passwort** (falls im Chat gepostet)
5. **Ändere Stripe Keys** (falls im Chat gepostet)
6. **Ändere Google OAuth Keys** (falls im Chat gepostet)

### Firewall konfigurieren

```bash
# UFW installieren
apt-get install ufw

# Ports öffnen
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# Aktivieren
ufw enable

# Status
ufw status
```

### Automatische Updates

```bash
# Unattended Upgrades installieren
apt-get install unattended-upgrades

# Konfigurieren
dpkg-reconfigure -plow unattended-upgrades
```

---

## Monitoring

### PM2 Monitoring

```bash
# PM2 Plus (kostenlos)
pm2 link <secret> <public>

# Oder: PM2 Web UI
pm2 web
```

### Nginx Monitoring

```bash
# Access Logs analysieren
tail -f /var/log/nginx/access.log | grep -v "bot"

# Error Rate
tail -f /var/log/nginx/error.log
```

### Disk Space

```bash
# Speicher prüfen
df -h

# Logs rotieren
logrotate -f /etc/logrotate.conf
```

---

## Support

Bei Problemen:

1. **Logs prüfen**: `pm2 logs state-of-the-dart-api`
2. **Health Check**: `curl https://api.stateofthedart.com/health`
3. **Nginx Logs**: `tail -f /var/log/nginx/error.log`
4. **GitHub Issues**: https://github.com/pepperonas/state-of-the-dart/issues

---

## Changelog

### v0.0.2 (2026-01-16)
- Vollständiges Authentication-System
- Admin Panel für User-Management
- Cloud-Synchronisation
- Dart-Heatmap
- Training-Statistiken
- Demo-Daten Generator

---

**🎉 Viel Erfolg mit dem Deployment!**
