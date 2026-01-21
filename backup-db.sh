#!/bin/bash

# SQLite Backup Script with Rotation
# Erstellt tägliche Backups und löscht alte automatisch

# Konfiguration
DB_PATH="/var/www/stateofthedart-backend/data/state-of-the-dart.db"
BACKUP_DIR="/var/www/stateofthedart-backend/backups"
RETENTION_DAYS=7  # Anzahl Tage die Backups behalten werden

# Timestamp für Dateinamen
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/state-of-the-dart_$TIMESTAMP.db"

# Backup-Verzeichnis erstellen falls nicht vorhanden
mkdir -p "$BACKUP_DIR"

echo "🔄 Starte SQLite Backup..."
echo "📂 Quelle: $DB_PATH"
echo "💾 Ziel: $BACKUP_FILE"

# SQLite VACUUM INTO (komprimiert und kopiert)
sqlite3 "$DB_PATH" "VACUUM INTO '$BACKUP_FILE';"

if [ $? -eq 0 ]; then
    echo "✅ Backup erfolgreich erstellt"

    # Dateigröße anzeigen
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Größe: $SIZE"

    # Alte Backups löschen (älter als RETENTION_DAYS)
    echo "🧹 Lösche Backups älter als $RETENTION_DAYS Tage..."
    find "$BACKUP_DIR" -name "state-of-the-dart_*.db" -type f -mtime +$RETENTION_DAYS -delete

    # Anzahl verbleibender Backups
    COUNT=$(ls -1 "$BACKUP_DIR"/state-of-the-dart_*.db 2>/dev/null | wc -l)
    echo "📦 Verbleibende Backups: $COUNT"

    # Gesamtgröße aller Backups
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    echo "💽 Gesamtgröße: $TOTAL_SIZE"
else
    echo "❌ Backup fehlgeschlagen!"
    exit 1
fi

# Optional: Remote-Backup zu anderem Server
# Auskommentieren und anpassen wenn gewünscht:
# rsync -avz --delete "$BACKUP_DIR/" user@backup-server:/backups/stateofthedart/

# Optional: Upload zu AWS S3
# aws s3 sync "$BACKUP_DIR/" s3://my-bucket/stateofthedart-backups/ --delete

echo "✅ Backup-Prozess abgeschlossen"
