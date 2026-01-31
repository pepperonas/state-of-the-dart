#!/bin/bash

# SQLite Restore Script
# Stellt Backup wieder her

BACKUP_DIR="/var/www/stateofthedart-backend/backups"
DB_PATH="/var/www/stateofthedart-backend/data/state-of-the-dart.db"

echo "🔍 Verfügbare Backups:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backups auflisten
ls -lh "$BACKUP_DIR"/state-of-the-dart_*.db 2>/dev/null | awk '{print NR". "$9" ("$5")"}'

if [ ! "$(ls -A $BACKUP_DIR/state-of-the-dart_*.db 2>/dev/null)" ]; then
    echo "❌ Keine Backups gefunden in $BACKUP_DIR"
    exit 1
fi

echo ""
read -p "Welches Backup wiederherstellen? (Dateiname eingeben): " BACKUP_FILE

if [ ! -f "$BACKUP_FILE" ]; then
    # Versuche im Backup-Verzeichnis zu finden
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup-Datei nicht gefunden: $BACKUP_FILE"
    exit 1
fi

echo ""
echo "⚠️  WARNUNG: Dies überschreibt die aktuelle Datenbank!"
echo "📂 Quelle: $BACKUP_FILE"
echo "💾 Ziel: $DB_PATH"
echo ""
read -p "Fortfahren? (ja/nein): " CONFIRM

if [ "$CONFIRM" != "ja" ]; then
    echo "❌ Abgebrochen"
    exit 0
fi

# PM2 stoppen
echo "⏸️  Stoppe Backend..."
pm2 stop stateofthedart-backend

# Sicherheitskopie der aktuellen DB erstellen
echo "💾 Erstelle Sicherheitskopie der aktuellen DB..."
cp "$DB_PATH" "$DB_PATH.before-restore"

# Backup wiederherstellen
echo "♻️  Stelle Backup wieder her..."
cp "$BACKUP_FILE" "$DB_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Backup erfolgreich wiederhergestellt"

    # PM2 starten
    echo "▶️  Starte Backend..."
    pm2 start stateofthedart-backend

    echo "✅ Wiederherstellung abgeschlossen"
    echo "💡 Alte DB gesichert unter: $DB_PATH.before-restore"
else
    echo "❌ Wiederherstellung fehlgeschlagen!"

    # Rollback
    echo "⏮️  Stelle alte DB wieder her..."
    cp "$DB_PATH.before-restore" "$DB_PATH"
    pm2 start stateofthedart-backend

    exit 1
fi
