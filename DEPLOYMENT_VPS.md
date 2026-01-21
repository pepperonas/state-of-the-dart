# VPS Deployment Anleitung

## Server-Setup

| Komponente | Wert |
|------------|------|
| **VPS IP** | `69.62.121.168` |
| **Frontend** | `/var/www/stateofthedart` |
| **Backend** | `/var/www/stateofthedart-backend` |
| **Datenbank** | `/var/www/stateofthedart-backend/data/state-of-the-dart.db` |
| **PM2 Prozess** | `stateofthedart-backend` |
| **Port** | `3002` |
| **URLs** | `stateofthedart.com` / `api.stateofthedart.com` |

---

## Deployment

```bash
# Alles deployen (empfohlen)
./deploy.sh

# Nur Frontend
npm run build && rsync -avz --delete dist/ root@69.62.121.168:/var/www/stateofthedart/

# Nur Backend (WICHTIG: data/ NICHT überschreiben!)
cd server && npm run build && cd ..
rsync -avz --exclude='node_modules' --exclude='data/' --exclude='.env' server/ root@69.62.121.168:/var/www/stateofthedart-backend/
ssh root@69.62.121.168 "pm2 restart stateofthedart-backend"
```

---

## PM2 Commands

```bash
ssh root@69.62.121.168 "pm2 status"                                    # Status
ssh root@69.62.121.168 "pm2 logs stateofthedart-backend --lines 50"    # Logs
ssh root@69.62.121.168 "pm2 restart stateofthedart-backend"            # Restart
```

---

## Troubleshooting

### Google OAuth leitet auf localhost
```bash
# Prüfen
ssh root@69.62.121.168 "grep GOOGLE_CALLBACK /var/www/stateofthedart-backend/.env"
# Muss sein: GOOGLE_CALLBACK_URL=https://api.stateofthedart.com/api/auth/google/callback
```

### Spieler/Matches fehlen (Multi-Tenant Bug)
**Symptom:** User sieht keine Daten obwohl welche existieren.
**Ursache:** User hat mehrere Tenants, falscher wurde ausgewählt.
**Fix:** Query in `auth.ts` verwendet `ORDER BY last_active DESC LIMIT 1`

### SQLite WAL-Korruption
**Symptom:** `FOREIGN KEY constraint failed` obwohl Daten existieren.
```bash
# Diagnose
ssh root@69.62.121.168 "sqlite3 /var/www/stateofthedart-backend/data/state-of-the-dart.db 'PRAGMA wal_checkpoint(FULL)'"

# Fix
ssh root@69.62.121.168 "pm2 stop stateofthedart-backend"
ssh root@69.62.121.168 "rm -f /var/www/stateofthedart-backend/data/*.db-shm /var/www/stateofthedart-backend/data/*.db-wal"
scp server/data/state-of-the-dart.db root@69.62.121.168:/var/www/stateofthedart-backend/data/
ssh root@69.62.121.168 "pm2 restart stateofthedart-backend"
```
**Prävention:** Server macht automatisch WAL-Checkpoint alle 5 Min.

### Login zeigt "Email nicht verifiziert"
**Fix:** Login-Response muss `emailVerified` Feld enthalten (`auth.ts`)

---

## Backend .env (VPS)

```env
PORT=3002
NODE_ENV=production
DATABASE_URL=./data/state-of-the-dart.db

# URLs (KRITISCH!)
APP_URL=https://stateofthedart.com
API_URL=https://api.stateofthedart.com
CORS_ORIGINS=https://stateofthedart.com,https://api.stateofthedart.com
GOOGLE_CALLBACK_URL=https://api.stateofthedart.com/api/auth/google/callback

# Secrets
JWT_SECRET=<secret>
SESSION_SECRET=<secret>
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
STRIPE_SECRET_KEY=<key>
STRIPE_WEBHOOK_SECRET=<secret>

# SMTP
SMTP_HOST=premium269-4.web-hosting.com
SMTP_PORT=465
SMTP_USER=stateofthedart@celox.io
SMTP_PASSWORD=<password>
```

**Prüfen:**
```bash
ssh root@69.62.121.168 "grep -E 'GOOGLE_CALLBACK|APP_URL|PORT' /var/www/stateofthedart-backend/.env"
```

---

## Bekannte Bugs & Fixes

| Bug | Ursache | Fix | Datei |
|-----|---------|-----|-------|
| Rate Limiter 500 Error | `trust proxy: true` rejected | `validate.trustProxy: false` | `server/src/index.ts:66` |
| OAuth localhost redirect | `GOOGLE_CALLBACK_URL` fehlt/falsch | VPS .env korrigieren | `.env` |
| Frontend 403 Error | Backend-Dist deployed | Richtiges `dist/` deployen | Deployment |
| PORT Conflict (EADDRINUSE) | `.env` PORT=3001 | PORT=3002 setzen | `.env` |
| Spieler fehlen | Multi-Tenant Query ohne Sortierung | `ORDER BY last_active DESC` | `auth.ts:40` |
| WAL-Korruption | Checkpoint nicht ausgeführt | Auto-Checkpoint alle 5 Min | `database/index.ts` |
| "Email nicht verifiziert" | `emailVerified` fehlt in Response | Feld hinzugefügt | `routes/auth.ts` |
| Theme kaputt | CSS mit 1900 Zeilen !important | Komplett neu geschrieben | `index.css` |

---

## Changelog

### 2026-01-21
- **Rate Limiter Fix**: `express-rate-limit` Kompatibilität (`validate.trustProxy: false`)
- **Google OAuth Fix**: `.env` URLs korrigiert (APP_URL, GOOGLE_CALLBACK_URL)
- **NODE_ENV**: Production Mode aktiviert
- **SMTP Fix**: Variable Name korrigiert (`SMTP_PASS` → `SMTP_PASSWORD`)
- **Modal UX**: Click-Outside schließt MatchDetailModal
- **Frontend Deployment**: Korrektes Dist deployed (war Backend-Dist)
- **Berechtigungen**: `www-data:www-data` für Frontend

### 2026-01-17
- Admin-Status wird bei jedem Google OAuth Login geprüft
- Match History zeigt jetzt Spielverlauf an (API lädt match_players)
- rsync excludiert `data/` um VPS-Datenbank nicht zu überschreiben

### 2026-01-16
- Cyberpunk Theme neu erstellt (620 statt 1900 Zeilen CSS)
- SQLite WAL-Checkpoint Prävention
- Multi-Tenant Query Fix
- Login emailVerified Fix
- Backend .env komplett überarbeitet
- Port 3002 (statt 3001, Konflikt mit kiezform-v3)
