# 🛠️ Scripts

Dieses Verzeichnis enthält Utility-Skripte für Entwicklung und Deployment.

## Verfügbare Skripte

### Deployment

| Skript | Beschreibung |
|--------|--------------|
| `deploy.sh` | Vollständiges Deployment (Frontend + Backend) |

### Datenbank

| Skript | Beschreibung |
|--------|--------------|
| `backup-db.sh` | Erstellt ein Backup der SQLite-Datenbank |
| `restore-db.sh` | Stellt ein Datenbank-Backup wieder her |

### Versionierung

| Skript | Beschreibung |
|--------|--------------|
| `bump-version.js` | Erhöht die Versionsnummer in package.json |

## Verwendung

```bash
# Deployment
./scripts/deploy.sh

# Datenbank-Backup
./scripts/backup-db.sh

# Version erhöhen
node scripts/bump-version.js patch  # 0.2.0 → 0.2.1
node scripts/bump-version.js minor  # 0.2.0 → 0.3.0
node scripts/bump-version.js major  # 0.2.0 → 1.0.0
```

## Hinweise

- Alle Skripte sollten vom Projekt-Root ausgeführt werden
- Backup-Skripte benötigen SSH-Zugang zum VPS
- Deployment-Skripte verwenden rsync für File-Transfer
