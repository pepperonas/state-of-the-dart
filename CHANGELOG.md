# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [0.1.7] - 2026-01-17

### ✨ Hinzugefügt

#### Trial-Status Anzeige mit Upgrade-Button
- **UserMenu Dropdown** - Prominenter Trial-Banner für Trial-User
  - Zeigt verbleibende Trial-Tage ("Noch X Tage Premium-Trial")
  - Gradient-Button "Jetzt upgraden" → `/pricing`
  - Crown-Icon für visuelle Hervorhebung
- **Dashboard Banner** - Großer Trial-Info-Banner
  - Uhr-Icon mit Tage-Countdown
  - "Genieße alle Premium-Features während deiner Testphase"
  - Auffälliger Upgrade-Button mit Hover-Animation

#### Trial-Ablauf Verhalten
- **Soft-Lock nach Trial-Ende** - User kann sich einloggen, aber nicht spielen
  - Automatischer Redirect zu `/pricing` wenn Trial abgelaufen
  - Account-Zugang bleibt erhalten
  - Daten werden nicht gelöscht

### 🐛 Behoben

#### SMTP-Konfiguration
- **Email-Versand funktioniert wieder** - `SMTP_PASS` → `SMTP_PASSWORD` in VPS .env
  - Password-Reset Emails werden jetzt korrekt gesendet
  - PM2 mit `--update-env` neugestartet

---

## [0.1.6] - 2026-01-17

### 🐛 Behoben

#### Admin-Status wird bei jedem Login geprüft
- **Google OAuth aktualisiert `is_admin` bei Login** - `martinpaush@gmail.com` erhält automatisch Admin-Rechte
  - Bei existierenden Usern wird Admin-Status bei jedem Login geprüft
  - Bei Account-Linking (Email zu Google) wird Admin-Status aktualisiert
  - User-Daten werden nach Update refreshed

#### Match History zeigt jetzt Verlauf an
- **API `/api/matches` lädt jetzt Spieler-Daten mit** - Frontend benötigt `match.players` Array
  - Match-Players werden mit JOIN aus `match_players` und `players` Tabellen geladen
  - Konvertierung von snake_case zu camelCase für Frontend-Kompatibilität
  - Spielernamen und Avatare werden aus `players` Tabelle geholt
  - Stats wie matchAverage, match180s, legsWon etc. werden korrekt zurückgegeben

---

## [0.1.5] - 2026-01-17

### ✨ Hinzugefügt

#### Match-Persistenz bei Page Refresh
- **localStorage-Speicherung für aktive Matches** - Spiel wird bei Seiten-Refresh wiederhergestellt
  - Aktive Matches werden unter `state-of-the-dart-active-match` gespeichert
  - Korrekter Spielerindex wird aus Throws berechnet
  - Abgeschlossene Matches werden automatisch entfernt

#### Admin Panel nur für Admin
- **Admin-Dashboard exklusiv für `martinpaush@gmail.com`**
  - `is_admin` Flag in Datenbank wird geprüft
  - Neues Theme passend zur restlichen App (gradient-mesh, glass-cards)
  - Deutsche Übersetzungen
  - Lucide Icons statt Emojis für Actions
  - Avatar-Support für Google-Profile-Bilder

### 🐛 Behoben

#### Dashboard Datumsanzeige
- **"undefined - -" in letzten Aktivitäten** - API gibt snake_case Felder zurück
  - `game_type` und `completed_at` werden jetzt korrekt ausgelesen
  - Fallback auf camelCase für Kompatibilität

#### Admin Panel Avatar
- **Google-Avatar URL wurde als Text angezeigt**
  - URLs werden jetzt als `<img>` gerendert
  - Fallback auf Initialen bei Ladefehler

## [0.1.4] - 2026-01-17

### ✨ Hinzugefügt

#### Zentrale Datums-Utility
- **`src/utils/dateUtils.ts`** - Einheitliche Datumsverarbeitung in der gesamten App
  - `toDate()` - Konvertiert Unix-Timestamps, ISO-Strings oder Date-Objekte
  - `toDateOrNow()` - Fallback auf aktuelles Datum wenn ungültig
  - `formatDate()` - Deutsche Locale-Formatierung (de-DE)
  - `formatDateTime()` - Datum mit Uhrzeit
  - `formatDateShort()` - Kurzformat für Charts (DD.MM.)
  - `getTimestampForSort()` - Sichere Sortierung nach Datum

### 🐛 Behoben

#### Datumsanzeige global repariert
- **Inkonsistente Datumskonvertierung** - Backend speichert Unix-Timestamps, Frontend erwartet Date-Objekte
  - Alle Komponenten nutzen jetzt die zentrale `dateUtils.ts`
  - Robuste Konvertierung egal ob Timestamp (Zahl), ISO-String oder Date-Objekt
  - Betroffene Dateien:
    - `GameContext.tsx` - `reviveMatchDates()` komplett überarbeitet
    - `TenantContext.tsx` - `reviveTenantDates()` mit robuster Konvertierung
    - `MatchHistory.tsx` - Sortierung und Anzeige
    - `StatsOverview.tsx` - Charts und monatliche Statistiken
    - `TrainingStats.tsx` - Session-Daten und Charts
    - `PlayerProfile.tsx` - Personal Bests und Karriere-Timeline
    - `Dashboard.tsx` - Letzte Aktivitäten
    - `AchievementsScreen.tsx` - Freischaltdatum
    - `TenantSelector.tsx` - Letzte Aktivität
    - `exportImport.ts` - CSV, Excel und PDF Export

## [0.1.3] - 2026-01-17

### ✨ Hinzugefügt

#### Stats Tab Persistence
- **URL-basierte Tab-Navigation** - Stats-Tab bleibt bei Refresh erhalten
  - URL enthält jetzt Tab-Parameter: `/stats?tab=history`
  - Browser-Navigation (Zurück/Vorwärts) funktioniert mit Tabs
  - Direktlinks zu spezifischen Tabs möglich

### 🐛 Behoben

#### Stats-Verlauf weißer Bildschirm
- **MatchHistory Null-Safety** - Robuste Fehlerbehandlung für fehlende Match-Daten
  - `match.players` Array wird jetzt sicher gehandhabt
  - Opponent kann optional sein (für unvollständige Daten)
  - Alle numerischen Werte mit Fallback-Werten abgesichert
  - `prepareRoundData` gibt leeres Array zurück bei fehlenden Daten

#### Leaderboard Avatar-URLs
- **Google OAuth Avatars** werden jetzt als Bilder angezeigt statt als URL-Text
  - URLs die mit `http` beginnen werden als `<img>` gerendert
  - Emoji-Avatare bleiben als Text

#### Backend TypeScript Fixes
- **Middleware Typen** - Express-kompatible Middleware-Signaturen
  - `authenticateToken`, `authenticateTenant`, `optionalAuth` nutzen jetzt `Request` mit Cast
  - Behebt TypeScript-Kompilierungsfehler

## [0.1.2] - 2026-01-17

### ✨ Hinzugefügt

#### Leg-Gewonnen Animation
- **Fullscreen Overlay** wenn ein Spieler ein Leg gewinnt
  - Großer Avatar des Gewinners mit Bounce-Animation
  - "LEG X" in goldener Schrift mit Glow-Effekt
  - Fortschritts-Punkte (z.B. 2/3 Legs)
  - "Nächstes Leg startet..." Indikator
  - 3 Sekunden Anzeigedauer

### 🐛 Behoben

#### Code-Analyse & Bugfixes
- **Leg-Number Off-by-One** - Animation zeigte falsche Leg-Nummer (LEG 2 statt LEG 1)
- **SpinnerWheel Division by Zero** - Validierung hinzugefügt für leere Spielerliste
- **SpinnerWheel Race Condition** - Spieler werden bei Spin-Start gespeichert, verhindert Fehler wenn Spieler während Spin geändert werden
- **Match Create Race Condition** - Verhindert doppelte Match-Erstellung durch parallele API-Calls
- **Animation Cleanup** - Timeout wird bei Component-Unmount korrekt aufgeräumt

## [0.1.1] - 2026-01-16

### ✨ Hinzugefügt

#### Spinner-Rad für Startspieler-Ermittlung
- **Glücksrad** vor jedem Match zur zufälligen Auswahl des Startspielers
  - Animiertes Rad mit allen Spielern und Avataren
  - Spannende Drehanimation mit Audio-Feedback
  - Audio-Ansagen: "Time to spin the wheel", "Who gets lucky today", etc.
  - Gewinner wird visuell angezeigt und startet das Match

### 🐛 Behoben

#### Navigation "Zurück zum Menü"
- **Backend Player-Update Fix** - NOT NULL Constraint Fehler behoben wenn nur Stats aktualisiert werden
- **Backend Match-Update Fix** - `leg_number` wird jetzt automatisch aus dem Index generiert
- **Frontend Navigation Fix** - "Zurück zum Menü" funktioniert jetzt zuverlässig aus allen Screens
  - Setup-Screen: Direkter Redirect zum Hauptmenü
  - Laufendes Spiel: Pausieren und zum Menü navigieren
  - Pausiertes Spiel: Automatischer Redirect zum Setup

#### Avatar-Anzeige in Account-Einstellungen
- **Google OAuth Avatars** werden jetzt als Bild angezeigt statt als URL-Text
- Avatar-Picker wird für URL-Avatars deaktiviert (nicht änderbar)

#### Fehlerbehandlung verbessert
- Stats-Updates blockieren nicht mehr die UI bei Fehlern
- Match-Speicherung mit robuster Create/Update Logik

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
