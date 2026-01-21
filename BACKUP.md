# Datenbank-Backup System

## Übersicht

Automatische SQLite-Backups mit Rotation - verhindert Speicher-Überlastung.

| Feature | Wert |
|---------|------|
| **Frequenz** | Täglich um 3:00 Uhr |
| **Retention** | 7 Tage (nur letzte 7 Backups behalten) |
| **Speicherort** | `/var/www/stateofthedart-backend/backups/` |
| **Format** | `state-of-the-dart_YYYY-MM-DD_HH-MM-SS.db` |

---

## Installation auf VPS

### 1. Scripts hochladen

```bash
# Von lokalem Rechner
scp backup-db.sh restore-db.sh root@69.62.121.168:/var/www/stateofthedart-backend/
```

### 2. Ausführbar machen

```bash
ssh root@69.62.121.168
cd /var/www/stateofthedart-backend
chmod +x backup-db.sh restore-db.sh
```

### 3. Cronjob einrichten (tägliches Backup um 3 Uhr)

```bash
# Cronjob-Editor öffnen
crontab -e

# Folgende Zeile hinzufügen:
0 3 * * * /var/www/stateofthedart-backend/backup-db.sh >> /var/www/stateofthedart-backend/backup.log 2>&1
```

**Erklärung:**
- `0 3 * * *` = Jeden Tag um 3:00 Uhr
- `>> backup.log` = Logs in Datei schreiben
- `2>&1` = Fehler auch loggen

### 4. Erstes Backup manuell testen

```bash
cd /var/www/stateofthedart-backend
./backup-db.sh
```

**Erwartete Ausgabe:**
```
🔄 Starte SQLite Backup...
📂 Quelle: /var/www/stateofthedart-backend/data/state-of-the-dart.db
💾 Ziel: /var/www/stateofthedart-backend/backups/state-of-the-dart_2026-01-21_03-00-00.db
✅ Backup erfolgreich erstellt
📊 Größe: 1.2M
🧹 Lösche Backups älter als 7 Tage...
📦 Verbleibende Backups: 1
💽 Gesamtgröße: 1.2M
✅ Backup-Prozess abgeschlossen
```

---

## Verwendung

### Manuelles Backup erstellen

```bash
ssh root@69.62.121.168
cd /var/www/stateofthedart-backend
./backup-db.sh
```

### Backup wiederherstellen

```bash
ssh root@69.62.121.168
cd /var/www/stateofthedart-backend
./restore-db.sh

# Script zeigt Liste verfügbarer Backups
# Dateiname eingeben und bestätigen
```

### Backups auflisten

```bash
ssh root@69.62.121.168
ls -lh /var/www/stateofthedart-backend/backups/
```

### Backup herunterladen

```bash
# Von lokalem Rechner
scp root@69.62.121.168:/var/www/stateofthedart-backend/backups/state-of-the-dart_2026-01-21_03-00-00.db ./
```

### Logs prüfen

```bash
ssh root@69.62.121.168
tail -50 /var/www/stateofthedart-backend/backup.log
```

---

## Speicher-Management

### Aktuelle Backup-Größe prüfen

```bash
ssh root@69.62.121.168
du -sh /var/www/stateofthedart-backend/backups/
```

### Retention anpassen (mehr/weniger Tage)

```bash
ssh root@69.62.121.168
nano /var/www/stateofthedart-backend/backup-db.sh

# Zeile 9 ändern:
RETENTION_DAYS=14  # z.B. 14 Tage statt 7
```

### Manuelle Cleanup (falls nötig)

```bash
# Alte Backups löschen
ssh root@69.62.121.168
find /var/www/stateofthedart-backend/backups/ -name "*.db" -mtime +7 -delete
```

---

## Remote-Backup (Optional)

### Option 1: Rsync zu anderem Server

In `backup-db.sh` auskommentieren und anpassen:

```bash
# Zeile 49-50:
rsync -avz --delete "$BACKUP_DIR/" user@backup-server:/backups/stateofthedart/
```

**Setup:**
```bash
# SSH-Key für passwortlosen Zugriff
ssh-keygen -t ed25519 -f ~/.ssh/backup_key
ssh-copy-id -i ~/.ssh/backup_key user@backup-server
```

### Option 2: AWS S3

```bash
# AWS CLI installieren
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Konfigurieren
aws configure

# In backup-db.sh auskommentieren (Zeile 52-53):
aws s3 sync "$BACKUP_DIR/" s3://my-bucket/stateofthedart-backups/ --delete
```

---

## Troubleshooting

### Backup schlägt fehl: "database is locked"

```bash
# PM2 kurz stoppen
pm2 stop stateofthedart-backend
./backup-db.sh
pm2 start stateofthedart-backend
```

### Cronjob läuft nicht

```bash
# Cronjobs auflisten
crontab -l

# Cron-Service prüfen
systemctl status cron

# Logs prüfen
grep CRON /var/log/syslog
```

### Speicherplatz wird knapp

```bash
# Retention reduzieren
RETENTION_DAYS=3  # Nur 3 Tage behalten

# Oder: Manuelle Cleanup
find /var/www/stateofthedart-backend/backups/ -name "*.db" -mtime +3 -delete
```

---

## Empfohlene Backup-Strategie

### Tägliche Backups (lokal)
- **Retention:** 7 Tage
- **Speicher:** ~10-15 MB (bei 1-2 MB pro Backup)
- **Vorteil:** Schnelle Wiederherstellung

### Wöchentliche Remote-Backups
- **Jeden Sonntag** zu externem Server/S3
- **Retention:** 4 Wochen
- **Vorteil:** Schutz vor VPS-Ausfall

### Monatliche Archiv-Backups
- **1. Tag des Monats** zu externem Speicher
- **Retention:** 12 Monate
- **Vorteil:** Langzeit-Archivierung

**Cronjob für erweiterte Strategie:**
```bash
# Täglich um 3:00 Uhr (lokal)
0 3 * * * /var/www/stateofthedart-backend/backup-db.sh >> /var/www/stateofthedart-backend/backup.log 2>&1

# Sonntags um 4:00 Uhr (remote)
0 4 * * 0 /var/www/stateofthedart-backend/backup-remote.sh >> /var/www/stateofthedart-backend/backup.log 2>&1

# 1. des Monats um 5:00 Uhr (archiv)
0 5 1 * * /var/www/stateofthedart-backend/backup-archive.sh >> /var/www/stateofthedart-backend/backup.log 2>&1
```

---

## Monitoring

### Backup-Größe über Zeit tracken

```bash
# Größenverlauf in Log schreiben
echo "$(date): $(du -sh /var/www/stateofthedart-backend/backups/ | cut -f1)" >> /var/www/stateofthedart-backend/backup-size.log
```

### Alert bei Backup-Fehler

```bash
# In backup-db.sh nach Zeile 36 einfügen:
if [ $? -ne 0 ]; then
    # Email senden (sendmail muss installiert sein)
    echo "Backup fehlgeschlagen!" | mail -s "BACKUP ERROR: State of the Dart" admin@example.com
fi
```

---

## Wiederherstellung-Test

**Wichtig:** Backup-System regelmäßig testen!

```bash
# 1. Backup erstellen
./backup-db.sh

# 2. Testumgebung erstellen
cp /var/www/stateofthedart-backend/backups/state-of-the-dart_*.db /tmp/test.db

# 3. Überprüfen ob Backup lesbar ist
sqlite3 /tmp/test.db "SELECT COUNT(*) FROM users;"

# 4. Cleanup
rm /tmp/test.db
```

**Empfehlung:** Monatlichen Wiederherstellungs-Test durchführen!
