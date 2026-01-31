# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [0.2.0] - 2026-01-31

### ✨ Neue Features

#### 🎯 Cricket-Modus
- **Vollständiger Cricket-Spielmodus** implementiert
  - Zahlen 15-20 und Bull müssen 3x getroffen werden
  - Triple = 3 Marks, Double = 2 Marks, Single = 1 Mark
  - Punkte sammeln nach dem Schließen (solange Gegner offen)
  - Gewinner: Alle Zahlen geschlossen + meiste Punkte
- **Cricket-Scoreboard** mit Mark-Anzeige (/, X, ⊗)
- **Schnelle Eingabe** über dedizierte Cricket-Buttons
- **Winner-Konfetti** bei Spielende

#### 🏆 Turniersystem
- **Knockout-Modus** (Single Elimination)
  - 4-16 Spieler unterstützt
  - Automatische Bracket-Generierung
  - Gewinner rückt in nächste Runde vor
- **Round Robin-Modus** (Jeder gegen jeden)
  - 3-8 Spieler unterstützt
  - Automatische Paarungsgenerierung
  - Tabelle mit Siegen, Niederlagen, Leg-Differenz
- **Live-Tabelle** mit Medaillen (🥇🥈🥉)
- **Match-Scoring** direkt im Turnier
- **Turniersieger-Anzeige** mit Konfetti

#### 📴 Offline-First PWA
- **IndexedDB-basierte Datenspeicherung** für Offline-Nutzung
- **Pending Actions Queue** - Aktionen werden gespeichert und später synchronisiert
- **Offline-Indicator** zeigt Verbindungsstatus
- **NetworkFirst API-Caching** für Players, Matches, Settings
- **Auto-Sync** beim Wiederherstellen der Verbindung
- **Verbesserte Service Worker Konfiguration**
  - NavigateFallback für Offline-Navigation
  - Font-Caching (Google Fonts)
  - Erweiterte Audio-Cache (500 Einträge)

### 🔧 Verbesserungen
- **Bull-Größen angepasst** für bessere Touch-Eingabe
  - Inner Bull (50): 5.5% des Radius
  - Outer Bull (25): 12% des Radius
- **Pausierte Matches** werden korrekt gespeichert und können fortgesetzt werden
- **Pausierte Match-Anzeige** im Hauptmenü mit Spielernamen
- **Repository-Struktur** nach Industriestandard
  - Issue Templates (Bug Report, Feature Request)
  - Pull Request Template
  - CONTRIBUTING.md
  - CODE_OF_CONDUCT.md
  - LICENSE (MIT)

### 📦 Neue Abhängigkeiten
- `canvas-confetti` - Konfetti-Animationen
- `idb` - IndexedDB Wrapper für Offline-Sync

## [0.1.11] - 2026-01-31

### ✨ Hinzugefügt

#### Professionelle Heatmap mit Polarkoordinaten-Histogramm
- **Feinere Granularität** - 1440 Zellen statt 82 Standard-Felder
  - 20 konzentrische Ringe (radiale Bins)
  - 72 Winkelsegmente (5° pro Segment)
  - Zeigt systematische Abweichungen (zu hoch/tief, links/rechts)
- **Gaussian Blur (15px)** - Smooth Übergänge für professionellen Look
  - 2D-Histogramm wird mit Gaussian-Blur geglättet
  - Power-Kurve für besseren Kontrast
- **Cluster-Analyse** - Wissenschaftliche Visualisierung
  - **Fadenkreuz (⊕)** - Zeigt gewichteten Schwerpunkt aller Würfe
  - **Gestrichelter Kreis (○)** - Streuungsradius (Standardabweichung)
  - Visualisiert Präzision des Spielers
- **Neue Statistik-Karten** - Detaillierte Analyse
  - Cluster-Zentrum: "Sehr präzise" / "Präzise" / "Gestreut"
  - Streuungsradius: % vom Scheibendurchmesser
  - Triple-Rate: % aller Würfe auf Triple-Felder
  - Double-Rate: % aller Würfe auf Double-Felder
  - Bull-Rate: % auf Bull + Outer Bull (mit separater Inner-Bull-Rate)
- **Farbcodierung** - 6-stufiger Gradient
  - Blau (kalt) → Cyan → Grün → Gelb → Orange → Rot (heiß)
  - Halbtransparent für sichtbare Dartscheibe

### 🔧 Geändert

#### Heatmap-Komponente
- Alte Version gesichert in `DartboardHeatmapBlur.backup.tsx`
- Komplett neu geschrieben mit Polarkoordinaten-System
- Optimierte Canvas-Rendering-Pipeline
- Verbesserte Legende mit Erklärung der Overlay-Elemente

## [0.1.10] - 2026-01-31

### ✨ Hinzugefügt

#### Suchfunktion & Pagination für Spielerliste
- **Live-Suche nach Spielernamen** - Filtert Spielerliste in Echtzeit
- **Pagination** - Blättere durch Seiten mit 10/20/50/100 Items pro Seite
- **Vorherige/Nächste Buttons** - Einfache Navigation zwischen Seiten
- **Seitenzahlen** - Intelligente Anzeige (max. 5 Seiten sichtbar)
- **Items pro Seite wählbar** - Dropdown für individuelle Einstellung
- **Gefilterte Anzahl** - Zeigt "von X Spielern"
- **Empty State** - "Keine Spieler gefunden" bei Suche

#### Suchfunktion & Pagination für Match-Historie
- **Multi-Kriterien-Suche** - Filter nach Gegner, Datum oder Spieltyp
- **Pagination** - Blättere durch Seiten mit 10/20/50/100 Items pro Seite
- **Vorherige/Nächste Buttons** - Einfache Navigation zwischen Seiten
- **Seitenzahlen** - Intelligente Anzeige (max. 5 Seiten sichtbar)
- **Items pro Seite wählbar** - Dropdown für individuelle Einstellung
- **Gefilterte Anzahl** - Zeigt "von X Matches"
- **Empty State** - "Keine Matches gefunden" bei Suche

#### Wurfverlauf im MatchDetailModal
- **Detaillierter Wurfverlauf** - Zeigt alle Würfe pro Spieler aus allen Legs
- **Gleiche Formatierung wie im GameScreen** - Konsistente Darstellung
- **Collapsible Sektion** - Expand/Collapse für bessere Übersicht
- **Farbcodierung** - 140+ orange, 100+ blue, BUST rot
- **Dart-Kombinationen** - T20, D16, S5, Miss mit Farbcodierung

#### Größere Dartscheibe im GameScreen
- **Größe erhöht** - 320px → 480px (+50%)
- **Container angepasst** - max-w-sm → max-w-lg
- **Bessere Eingaben** - Größere Klick-/Touch-Bereiche
- **Bessere Lesbarkeit** - Größere Zahlen und Segmente

### 🔧 Geändert

#### Performance-Optimierungen
- **useMemo für Filterung** - Performante Suche ohne Re-Renders
- **Automatisches Zurücksetzen** - Seite 1 bei neuer Suche
- **Responsive Pagination** - Intelligente Seitenzahl-Anzeige

## [0.1.9] - 2026-01-31

### ✨ Hinzugefügt

#### Klickbare Spieler-Listeneinträge
- **Gesamter Listeneintrag führt zur Detailansicht** - Verbesserte UX
  - Problem: Nur das Auge-Icon führte zur Detailansicht
  - Lösung: Gesamter Listeneintrag ist jetzt klickbar (cursor-pointer)
  - Klick auf Eintrag → navigiert zu `/players/{playerId}`
  - Buttons haben `stopPropagation()` um Konflikte zu vermeiden
  - Avatar-Button hat auch `stopPropagation()` für Emoji-Picker
  - **Feature**: Bessere Benutzerfreundlichkeit, intuitivere Navigation

## [0.1.9] - 2026-01-31

### 🐛 Behoben

#### Achievement-Speicherung (HIGH Priority)
- **Achievements werden jetzt korrekt gespeichert und angezeigt**
  - Problem: Achievements wurden nach Spielende angezeigt, aber nicht auf der Achievements-Seite gespeichert
  - Lösung: Merge-Logik für localStorage und API-Daten beim Laden
  - Verhindert Überschreibung von lokal freigeschalteten Achievements
  - Achievements werden jetzt korrekt aus beiden Quellen zusammengeführt
  - **Fix**: Achievements gingen beim Seiten-Reload verloren
  - **Jetzt**: Achievements bleiben dauerhaft erhalten

#### Rekord Score UNDO (MEDIUM Priority)
- **Statistiken werden beim UNDO korrekt zurückgesetzt**
  - Problem: 180 wurde als höchster Score gewertet, auch nach UNDO
  - Lösung: Vollständige Neuberechnung aller Statistiken beim UNDO_THROW
  - matchHighestScore wird neu berechnet aus allen verbleibenden Würfen
  - match180s, match171Plus, match140Plus werden korrekt zurückgesetzt
  - matchAverage wird neu berechnet
  - Checkout-Versuche und Checkouts werden neu gezählt
  - **Fix**: Statistiken blieben nach UNDO falsch
  - **Jetzt**: Alle Statistiken werden korrekt zurückgesetzt

#### Match-Ende rückgängig machen (HIGH Priority)
- **Versehentlich beendete Matches können fortgesetzt werden**
  - Problem: Versehentlich beendetes Match konnte nicht fortgesetzt werden
  - Lösung: UNDO_END_MATCH Action hinzugefügt
  - Button zum Rückgängigmachen wird angezeigt, wenn Match beendet wurde
  - Match-Status wird von 'completed' zurück auf 'in-progress' gesetzt
  - **Fix**: Keine Möglichkeit, Match-Ende rückgängig zu machen
  - **Jetzt**: Match kann wieder fortgesetzt werden

#### Verlaufsanzeige beim UNDO (MEDIUM Priority)
- **Preview-Panel zeigt entfernte Würfe an**
  - Problem: Keine Anzeige der entfernten Würfe beim UNDO
  - Lösung: Temporäres Preview-Panel zeigt die entfernten Würfe
  - Zeigt alle Würfe des Spielers, die durch UNDO entfernt wurden
  - Format: Wurf #, Dart-Kombinationen, Score
  - Auto-Hide nach 3 Sekunden
  - **Feature**: Hilft beim Rekonstruieren des Verlaufs

#### Finish Marker
- **Finish Marker sollten bereits korrekt funktionieren**
  - checkoutSuggestion wird als highlightedSegments an Dartboard übergeben
  - isHighlighted-Funktion prüft korrekt mit T/D/S-Notation
  - Doppel-Segmente werden gelb hervorgehoben beim Checkout

### 🔧 Geändert

#### AchievementContext
- Merge-Logik für localStorage und API-Daten beim Laden
- Verhindert Überschreibung von lokal freigeschalteten Achievements
- Bevorzugt neuere Unlock-Daten bei Konflikten

#### GameContext
- UNDO_THROW berechnet jetzt alle Statistiken vollständig neu
- UNDO_END_MATCH Action hinzugefügt für Match-Ende rückgängig machen
- Verbesserte Statistik-Berechnung beim UNDO

#### GameScreen
- Undo-End-Match-Button wird angezeigt, wenn Match beendet wurde
- Preview-Panel für entfernte Würfe beim UNDO
- Verbesserte UX für Match-Management

### 🐛 Behoben

#### Heatmap-Visualisierung
- **Heatmap wird wieder korrekt angezeigt** - Koordinaten-Generierung aus Segment-Zählungen
  - Problem: Komponente erwartete x/y-Koordinaten-Arrays, Datenbank speichert nur Segment-Zählungen
  - Lösung: Automatische Koordinaten-Generierung aus Segment-Keys (z.B. `{"3x20":440}`)
  - Unterstützt alle Formate: `"3x20"`, `"20-3"`, `"20x3"`
  - Berechnet Winkel basierend auf Segment-Position (Segment 20 oben = -90°)
  - Bestimmt Radius basierend auf Multiplier (Triple/Double/Single)
  - Fügt kleine Zufallsvariationen hinzu (±2° Winkel, ±2% Radius) für Blur-Effekt
  - Unterstützt auch vorhandene Koordinaten-Arrays (Backward-Compatible)
  - **Fix**: Heatmap wurde nicht angezeigt, weil keine Koordinaten vorhanden waren
  - **Jetzt**: Funktioniert für alle Spieler, auch mit Segment-Zählungen aus Datenbank

#### Player Avatar Design
- **Anfangsbuchstabe mit schöner Schrift** - Professionelles Avatar-Design
  - Großer Anfangsbuchstabe des Namens in geschwungener Schrift
  - Gradient-Hintergrund (Primary → Accent → Success)
  - Text-Shadow und Glow-Effekte für bessere Lesbarkeit im dunklen Theme
  - Emoji als kleiner Badge unten rechts
  - Schrift: 'Brush Script MT', 'Lucida Handwriting', cursive
  - **Verbesserung**: Avatar hebt sich jetzt deutlich vom Hintergrund ab

#### Achievements-Anzahl
- **Korrekte Achievements-Anzahl angezeigt** - Dynamische Anzahl statt hardcodiert
  - Alle hardcodierten "20" durch `ACHIEVEMENTS.length` ersetzt
  - PlayerProfile.tsx: 3 Stellen aktualisiert
  - Leaderboard.tsx: 1 Stelle aktualisiert
  - Aktuelle Anzahl: 145 Achievements (wird automatisch aktualisiert)
  - **Fix**: Zeigte immer "20" statt der tatsächlichen Anzahl
  - **Jetzt**: Zeigt korrekt alle verfügbaren Achievements

#### Achievement-Synchronisation
- **Freigeschaltete Achievements gehen nicht mehr verloren** - API-Integration für Persistenz
  - Achievements werden jetzt korrekt aus der API geladen
  - On-demand Loading: Lädt pro Spieler beim ersten Zugriff
  - Unlock-Sync: `unlockAchievement()` sendet sofort zur API
  - Progress-Sync: `checkAchievement()` synchronisiert Fortschritt
  - localStorage als Fallback für Offline-Support
  - **Fix**: Vorher nur localStorage → Beim Reload verloren
  - **Jetzt**: API als Source of Truth → Achievements bleiben erhalten

---

## [0.1.8] - 2026-01-22

### ✨ Hinzugefügt

#### User Guide System
- **Umfassende In-App Anleitung** - 10 Sektionen mit detaillierter Dokumentation
  - Neue "Anleitung" Card im Hauptmenü mit BookOpen-Icon
  - Vollständiges UserGuideModal mit Sidebar-Navigation
  - **Sektionen:**
    1. Übersicht - Hauptfunktionen und Vorteile
    2. Quickstart - 4-Schritte-Anleitung für neue Nutzer
    3. Spiel-Modi - 501, Cricket, Around the Clock, Bot-Gegner
    4. Spieler - Spielerverwaltung, Haupt-Profil, Profile
    5. Training - Alle 6 Trainingsmodi erklärt
    6. Statistiken - Heatmap, Charts, Checkout-Stats, Export
    7. Achievements - Kategorien, Beispiele, Benachrichtigungen
    8. Einstellungen - Audio, Theme, Sprache, PWA-Installation
    9. Admin - Benutzerverwaltung, Abos, Bug-Reports
    10. Tipps & Tricks - Anfängertipps, Stats-Nutzung, Shortcuts
  - Glass-card Styling mit responsivem Layout
  - Click-outside zum Schließen
  - Direkter Zugriff aus dem Hauptmenü

#### Training Player Selection
- **Spielerauswahl vor Training** - Wähle aus, welcher Spieler trainiert
  - Player-Selection-Screen mit Avatar, Name und Average
  - Nur echte Spieler können trainieren (Bots gefiltert)
  - Training-Würfe werden automatisch in Heatmap des gewählten Spielers gespeichert
  - Unterstützt alle 6 Trainingsmodi

#### Database Backup System
- **Automatisierte SQLite-Backups mit Rotation** - Verhindert VPS-Speicher-Überlastung
  - `backup-db.sh` - Tägliche Backups um 3:00 Uhr via Cronjob
  - 7-Tage-Retention (automatische Löschung alter Backups)
  - VACUUM INTO für Kompression und Integrität
  - Timestamped Filenames: `state-of-the-dart_YYYY-MM-DD_HH-MM-SS.db`
  - `restore-db.sh` - Sicheres Restore mit Rollback-Funktion
  - Detaillierte Dokumentation in `BACKUP.md`

#### Admin Subscription Management
- **Erweiterte Abo-Verwaltung** - Volle Kontrolle über User-Subscriptions
  - Subscription Edit Modal mit Status-Dropdown (expired, trial, active, lifetime)
  - Plan-Dropdown (monthly, annual, lifetime)
  - Expiration Date Picker (datetime-local input)
  - Manuelle Premium-Freischaltung für Accounts
  - Ergänzt bestehende Quick-Actions (Grant Lifetime, Revoke Access)

### 🐛 Behoben

#### Dashboard Activities Display
- **Intelligente Titel-Anzeige** - Letzte Aktivitäten zeigen korrekten Gewinner
  - Zeigt ALLE Matches (nicht nur Main Player)
  - Wenn Main Player gewonnen: "Spiel gewonnen!" 🏆
  - Wenn anderer Spieler gewonnen: "{winnerName} gewonnen" 🏆
  - Kein Gewinner: "Match gespielt" 🎯

#### Audio Checkout Announcement
- **"Game Shot" Ansage nach Checkout** - Fehlende Ankündigung ergänzt
  - Sequentielle Wiedergabe: Score → 400ms Pause → "Game Shot"
  - Async/await für saubere Audio-Abfolge
  - Unterstützt Leg, Set und Match Finishes
  - "Game Shot and the Match" für Match-Abschluss

### 🔧 Geändert

#### Dokumentation
- **CLAUDE.md** - Vollständig aktualisiert mit allen neuen Features
  - User Guide System Dokumentation
  - Training Player Selection Details
  - Database Backup System Anleitung
  - Admin Subscription Management
  - Dashboard Improvements
  - Audio System Enhancements
- **CHANGELOG.md** - Version 0.1.8 mit allen Änderungen

---

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
