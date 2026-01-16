# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [0.1.0] - 2026-01-16

### ✨ Hinzugefügt

#### Multi-Format Export System
- **CSV Export** - Text-basiertes Format für Excel/Google Sheets
  - Alle Match-Details in komma-separiertem Format
  - Kompatibel mit allen Tabellenkalkulations-Programmen
- **Excel Export (.xlsx)** - Native Excel-Dateien
  - Match History Sheet mit allen Details
  - Summary Sheet mit aggregierten Statistiken (Wins, Losses, Win Rate, Average, Total 180s)
  - Automatische Spaltenbreiten-Anpassung
  - Professionelles Layout
- **PDF Export** - Professionelle Reports
  - Header mit Player-Info und Export-Datum
  - Formatierte Tabellen mit allen Match-Daten
  - Automatische Paginierung mit Seitenzahlen
  - "State of the Dart" Branding im Footer
- **Modernes Export-Dropdown** - UI-Verbesserungen
  - Dropdown-Menü statt einzelnem Button
  - Spezifische Icons für jedes Format (FileText, FileSpreadsheet)
  - Click-Outside zum Schließen
  - Smooth Hover-Effekte

#### Database-First Architecture
- **Vollständige Migration** von localStorage zu SQLite-Datenbank
  - Alle Matches werden direkt aus der API geladen (`api.matches.getAll()`)
  - Training Sessions aus API (`api.training.getAll()`)
  - Settings aus API (`api.settings.get()`)
  - Achievements aus API (`api.achievements.getByPlayer()`)
- **Batch-Endpoints** für bessere Performance
  - `/api/players/heatmaps/batch` - Lädt alle Heatmaps in einem Request
  - Reduziert API-Calls von N auf 1
- **Konsistente Datenquelle** - Alle Komponenten nutzen jetzt die Datenbank als Single Source of Truth
  - StatsOverview: Matches aus API
  - Dashboard: Matches aus API
  - TrainingStats: Sessions aus API
  - TrainingScreen: Speichert Sessions via API

#### Dummy-Player: King Lui
- **Elite-Spieler** mit extremem Wurfbild
  - Name: King Lui (KL)
  - 38 Spiele (32 Wins, 84% Winrate)
  - Average: 85.7 (Best: 92.5)
  - 48x 180s
  - Checkout %: 72.3%
  - Highest Checkout: nur 14 (D7!)
- **Extremes Wurfbild** - NUR zwei Felder!
  - T20: 440 Darts (80%) - Hauptfeld
  - D7: 110 Darts (20%) - Checkout-Feld
  - Andere: 0 Darts (0%) - NICHTS!
- **Einzigartige Heatmap** - Nur zwei massive Hot Spots
  - T20: Extreme RED HOT ZONE (oben)
  - D7: HOT ZONE (unten rechts)
  - Rest: EISKALT (0%)

### 🐛 Behoben

#### Null-Safety Fixes
- **StatsOverview.tsx** - Umfassende Null-Prüfungen
  - `match.players` kann jetzt `undefined` sein
  - Fallback auf `match.winner` wenn players fehlt
  - Null-Prüfungen für `match.legs` und `match.startedAt`
- **exportImport.ts** - Sichere Export-Funktionen
  - CSV Export: Null-Prüfungen für `match.players`
  - Excel Export: Null-Prüfungen in allen reduce-Funktionen
  - PDF Export: Null-Prüfungen für Match-Daten
  - `calculateImprovement`: Robuste Berechnungen auch bei unvollständigen Daten
- **Alle Array-Zugriffe** mit `|| []` abgesichert
- **Optional Chaining** (`?.`) für nested properties
- **Fallback-Werte** für fehlende Daten

#### Browser Caching
- **Dynamische Module** - Verbesserte Cache-Handling
  - Fresh Builds für neue Chunk-Hashes
  - Service Worker Updates
  - Nginx Cache-Headers optimiert

#### Heatmap Loading
- **Debug-Logs** hinzugefügt für Troubleshooting
  - Console-Logs für Heatmap-Loading
  - Player-spezifische Logs
  - Batch-Endpoint Logs

### 🔧 Geändert

#### API-Integration
- **Alle Komponenten** nutzen jetzt API-Endpoints statt localStorage
  - StatsOverview: `api.matches.getAll()`
  - Dashboard: `api.matches.getAll()`
  - TrainingStats: `api.training.getAll()`
  - TrainingScreen: `api.training.create()`
- **Error Handling** verbessert in allen API-Calls
- **Loading States** für bessere UX

#### Code-Qualität
- **TypeScript** - Erweiterte Typen für bessere Typsicherheit
- **Error Boundaries** - Verbesserte Fehlerbehandlung
- **Console Logs** - Debug-Logs für Entwicklung

### 📚 Dokumentation

- **README.md** aktualisiert mit neuen Features
- **CHANGELOG.md** erstellt für detaillierte Versionshistorie
- **ARCHITECTURE.md** dokumentiert Database-First Policy
- **DATABASE_FIRST_MIGRATION.md** dokumentiert Migrations-Status

### 🔄 Dependencies

- **xlsx** (^0.18.5) - Excel-Generierung
- **jspdf** (^2.5.1) - PDF-Generierung
- **jspdf-autotable** (^3.8.2) - PDF-Tabellen

---

## [0.0.5] - 2026-01-15

### ✨ Hinzugefügt
- L.A. Style Heatmap mit Smooth Blur-Effekten
- Professionelles Dartboard-Design in Heatmap
- Top 5 Hotspots mit Progress-Bars
- Accuracy Stats (Miss Rate, Triple Rate, Double Rate)

---

[0.1.0]: https://github.com/pepperonas/state-of-the-dart/releases/tag/v0.1.0
[0.0.5]: https://github.com/pepperonas/state-of-the-dart/releases/tag/v0.0.5
