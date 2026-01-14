# Deployment-Anleitung für State of the Dart

## 🎯 Produktiv-Umgebung

**Domain:** https://stateofthedart.com  
**VPS:** 69.62.121.168  
**Pfad:** /var/www/stateofthedart/  
**Nginx Config:** /etc/nginx/sites-available/stateofthedart

---

## 📦 Deployment-Prozess

### 1. Lokaler Build

```bash
cd /Users/martin/cursor/dart4friends/state-of-the-dart

# Dependencies installieren (falls nötig)
npm install

# Production Build erstellen
npm run build
```

Dies erstellt einen optimierten Build im `dist/` Ordner.

### 2. Upload zum VPS

```bash
# Build-Dateien auf VPS synchronisieren
rsync -avz --progress \
  --delete \
  dist/ \
  root@69.62.121.168:/var/www/stateofthedart/

# Permissions setzen
ssh root@69.62.121.168 "chown -R www-data:www-data /var/www/stateofthedart"
```

**Hinweis:** Das `--delete` Flag entfernt alte Dateien auf dem Server, die nicht mehr im Build vorhanden sind.

### 3. Cache leeren (optional)

```bash
# Browser-Cache für statische Assets invalidieren
ssh root@69.62.121.168 "nginx -s reload"
```

---

## 🚀 Quick Deployment Script

Erstelle ein Deploy-Script für schnelle Updates:

```bash
#!/bin/bash
# deploy.sh

echo "🔨 Building app..."
npm run build

echo "📤 Uploading to VPS..."
rsync -avz --progress --delete dist/ root@69.62.121.168:/var/www/stateofthedart/

echo "✅ Deployment complete!"
echo "🌐 Visit: https://stateofthedart.com"
```

Dann:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔧 VPS-Wartung

### Nginx Status prüfen

```bash
ssh root@69.62.121.168 "systemctl status nginx"
```

### Logs anschauen

```bash
# Access Logs
ssh root@69.62.121.168 "tail -f /var/log/nginx/stateofthedart-access.log"

# Error Logs
ssh root@69.62.121.168 "tail -f /var/log/nginx/stateofthedart-error.log"
```

### Nginx Konfiguration testen

```bash
ssh root@69.62.121.168 "nginx -t"
```

### SSL-Zertifikat erneuern

Das Zertifikat wird automatisch alle 60 Tage erneuert. Manuelles Renewal:

```bash
ssh root@69.62.121.168 "certbot renew --dry-run"
```

---

## 📁 Dateistruktur auf VPS

```
/var/www/stateofthedart/
├── assets/
│   ├── index-CEBJY6ys.js    # Main JavaScript Bundle
│   └── index-D7AlpaDl.css   # Styles
├── sounds/                   # Audio-Dateien für Dart-Spiel
├── index.html               # Entry Point (SPA)
└── vite.svg                # Favicon
```

---

## 🔐 Sicherheit

### Implementierte Security Headers

- ✅ X-Frame-Options: SAMEORIGIN
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: no-referrer-when-downgrade

### SSL/TLS

- ✅ Let's Encrypt Zertifikat
- ✅ Automatisches HTTP→HTTPS Redirect
- ✅ HTTP/2 aktiviert
- ✅ Auto-Renewal konfiguriert (läuft bis 2026-04-14)

---

## 🐛 Troubleshooting

### Problem: App lädt nicht

```bash
# 1. Prüfe ob Dateien vorhanden sind
ssh root@69.62.121.168 "ls -la /var/www/stateofthedart/"

# 2. Prüfe Nginx Logs
ssh root@69.62.121.168 "tail -50 /var/log/nginx/stateofthedart-error.log"

# 3. Prüfe Permissions
ssh root@69.62.121.168 "ls -l /var/www/stateofthedart/"
# Sollte www-data:www-data sein
```

### Problem: 502 Bad Gateway

```bash
# Nginx neu starten
ssh root@69.62.121.168 "systemctl restart nginx"
```

### Problem: SSL-Fehler

```bash
# Zertifikat prüfen
ssh root@69.62.121.168 "certbot certificates"

# Nginx Config testen
ssh root@69.62.121.168 "nginx -t"
```

### Problem: Alte App-Version wird angezeigt

Browser-Cache ist das Problem. Lösungen:

1. Hard Refresh im Browser (Cmd+Shift+R / Ctrl+F5)
2. Versionsnummer im HTML ändern (automatisch durch Vite Build)
3. CloudFlare/CDN Cache leeren (falls verwendet)

---

## 🔄 Rollback

Falls ein Deployment fehlschlägt:

```bash
# 1. Vorherige Version aus Git-Historie holen
git checkout HEAD~1

# 2. Neu bauen
npm run build

# 3. Deployen
rsync -avz --progress --delete dist/ root@69.62.121.168:/var/www/stateofthedart/
```

Oder vorher ein Backup erstellen:

```bash
# Vor Deployment
ssh root@69.62.121.168 "cp -r /var/www/stateofthedart /var/www/stateofthedart.backup"

# Rollback
ssh root@69.62.121.168 "rm -rf /var/www/stateofthedart && mv /var/www/stateofthedart.backup /var/www/stateofthedart"
```

---

## 📊 Monitoring

### Analytics

Falls Google Analytics oder ähnliches gewünscht:

1. Analytics ID in `index.html` einbauen (via Vite Plugin)
2. Oder: Plausible/Umami selbst hosten auf VPS

### Uptime Monitoring

Empfohlene Tools:
- **UptimeRobot** (kostenlos, bis 50 Monitore)
- **Better Uptime** (schönere Dashboards)
- **Pingdom** (professionell)

---

## 🎨 Anpassungen

### App-Titel ändern

```html
<!-- index.html -->
<title>State of the Dart</title>
```

### Favicon ändern

Ersetze `vite.svg` mit eigenem Favicon und update `index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### Meta-Tags für SEO

Füge in `index.html` ein:

```html
<meta name="description" content="Professional Dart Scoring System with Multi-User Support">
<meta name="keywords" content="dart, scoring, darts, 501, tournament">
<meta property="og:title" content="State of the Dart">
<meta property="og:description" content="Professional Dart Counter App">
<meta property="og:image" content="https://stateofthedart.com/og-image.png">
```

---

## 📝 Deployment Checklist

Vor jedem Deployment:

- [ ] `npm run build` läuft ohne Fehler durch
- [ ] Lokaler Test (`npm run dev`) funktioniert
- [ ] TypeScript Errors behoben
- [ ] Keine ESLint Warnings (kritisch)
- [ ] Git Commit erstellt
- [ ] rsync Upload erfolgreich
- [ ] HTTPS Test: `curl -I https://stateofthedart.com`
- [ ] Browser Test durchgeführt
- [ ] Multi-Tenant Funktionalität getestet

---

## 🎉 Deployment erfolgreich!

**Live URL:** https://stateofthedart.com

Die App ist jetzt live und unter beiden Domains erreichbar:
- ✅ https://stateofthedart.com
- ✅ https://www.stateofthedart.com

**Features:**
- 🚀 Optimierter Production Build
- 🔒 SSL/TLS verschlüsselt
- 👥 Multi-Tenant Support
- 📱 Responsive Design
- 🎯 Professionelles Dart-Scoring
- 💾 Persistente Daten (localStorage)
- 🔄 Auto-Save & Continue Match

---

## 📞 Support

Bei Fragen oder Problemen:
- **Email:** martin.pfeffer@celox.io
- **VPS IP:** 69.62.121.168
- **SSH:** `ssh root@69.62.121.168`

**Letzte Aktualisierung:** 14. Januar 2026
