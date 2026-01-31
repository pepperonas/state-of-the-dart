# State of the Dart - B2B Konzept für Bars & Lokale

**Version**: 1.0  
**Datum**: 2026-01-16  
**Status**: Konzeptphase

---

## 📋 Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Zielgruppe](#zielgruppe)
3. [Anwendungsfälle](#anwendungsfälle)
4. [Technische Architektur](#technische-architektur)
5. [User-Rollen & Zugriffsrechte](#user-rollen--zugriffsrechte)
6. [Setup & Onboarding](#setup--onboarding)
7. [Hardware-Empfehlungen](#hardware-empfehlungen)
8. [Features für Locations](#features-für-locations)
9. [Gast-Experience](#gast-experience)
10. [Betreiber-Dashboard](#betreiber-dashboard)
11. [Pricing-Modelle](#pricing-modelle)
12. [Marketing & Branding](#marketing--branding)
13. [Turniere & Events](#turniere--events)
14. [Analytics & Reporting](#analytics--reporting)
15. [Integration & API](#integration--api)
16. [Multi-Location Support](#multi-location-support)
17. [Rollout-Plan](#rollout-plan)
18. [Wettbewerbsvorteile](#wettbewerbsvorteile)

---

## 🎯 Executive Summary

**State of the Dart** wird zur **führenden Dart-Management-Plattform für Gastronomiebetriebe**.

### Vision
Jede Bar mit Dartboard wird zum modernen Dart-Hub mit:
- Automatischer Spielverwaltung
- Location-spezifischen Leaderboards
- Gast-Engagement durch Gamification
- Event-Management für Turniere
- Analytics für Betreiber

### USP (Unique Selling Proposition)
> "Verwandle deine Dartscheibe in ein interaktives Entertainment-Center - ohne zusätzliche Hardware."

---

## 🎪 Zielgruppe

### Primäre Zielgruppen

#### 1. **Sports Bars & Pubs**
- 1-4 Dartboards
- 50-200 Gäste/Woche
- Fokus auf Stammkundenbindung
- Wöchentliche Dart-Nights

#### 2. **Dart-Clubs & Vereine**
- 4-8 Dartboards
- Liga-Betrieb
- Training & Turniere
- Mitgliederverwaltung

#### 3. **Entertainment-Center**
- 8+ Dartboards
- Hoher Durchlauf
- Casual Gamer
- Event-Spaces

#### 4. **Hotel-Bars & Resorts**
- 1-2 Dartboards
- Internationale Gäste
- Premium-Experience
- Multi-Language Support

### Sekundäre Zielgruppen

- Bowling-Center (Dart als Zusatzangebot)
- Studentenkneipen (Preis-sensitiv)
- Gaming-Cafés (Diversifikation)
- Corporate Event-Spaces (Team-Building)

---

## 💼 Anwendungsfälle

### Use Case 1: **Walk-In Gast**

```
1. Gast kommt in die Bar
2. Scannt QR-Code am Dartboard
3. Erstellt Quick-Account (nur Name)
4. Startet Match gegen Freund
5. Spiel wird automatisch getrackt
6. Am Ende: Ergebnisse + Location-Leaderboard
7. Optional: Vollständige Registrierung für Stammkunden
```

**Vorteil**: Keine Barriere, sofortiger Start

### Use Case 2: **Stammkunde**

```
1. Stammkunde hat bereits Account
2. Check-In per NFC/QR am Board
3. Automatische Erkennung
4. Persönliche Stats werden aktualisiert
5. Punkte sammeln für Loyalty-Programm
6. Teilnahme an Location-Challenges
```

**Vorteil**: Personalisierte Experience, Retention

### Use Case 3: **Turnier-Abend**

```
1. Betreiber erstellt Turnier im Dashboard
2. Gäste registrieren sich per QR
3. Automatisches Bracket-System
4. Live-Ergebnisse auf Bar-TV
5. Automatische Siegerehrung
6. Social Media Export
```

**Vorteil**: Kein manueller Aufwand, professionell

### Use Case 4: **Liga-Spiel**

```
1. Heim-Team vs. Auswärts-Team
2. Beide Teams nutzen selbe App
3. Match wird für Liga-Wertung erfasst
4. Automatische Meldung an Verband
5. Stats für alle Spieler
```

**Vorteil**: Digitale Liga-Verwaltung

---

## 🏗️ Technische Architektur

### Location-basiertes Tenant-System

```
┌─────────────────────────────────────────────────────────┐
│                  CLOUD PLATFORM                         │
│  (stateofthedart.com)                                   │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Bar A   │  │ Bar B   │  │ Bar C   │
│ Tenant  │  │ Tenant  │  │ Tenant  │
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     ├─ Board 1   ├─ Board 1   ├─ Board 1
     ├─ Board 2   ├─ Board 2   ├─ Board 2
     └─ Board 3   └─ Board 3   ├─ Board 3
                               └─ Board 4
```

### Multi-Tenant Architektur

#### Datenbank-Schema Erweiterung

```sql
-- Locations (Bars, Pubs, Clubs)
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  timezone TEXT,
  type TEXT, -- 'bar', 'club', 'entertainment', 'hotel'
  subscription_plan TEXT,
  subscription_status TEXT,
  qr_code_url TEXT,
  nfc_enabled BOOLEAN DEFAULT 0,
  logo_url TEXT,
  theme_colors TEXT, -- JSON
  created_at INTEGER,
  owner_user_id TEXT
);

-- Dartboards pro Location
CREATE TABLE dartboards (
  id TEXT PRIMARY KEY,
  location_id TEXT,
  name TEXT, -- "Board 1", "Main Stage", etc.
  qr_code_url TEXT,
  nfc_tag_id TEXT,
  status TEXT, -- 'active', 'maintenance', 'reserved'
  position INTEGER, -- Reihenfolge in Location
  tablet_id TEXT, -- Zugeordnetes Tablet
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Location-spezifische Leaderboards
CREATE TABLE location_leaderboards (
  id TEXT PRIMARY KEY,
  location_id TEXT,
  period TEXT, -- 'daily', 'weekly', 'monthly', 'alltime'
  player_id TEXT,
  rank INTEGER,
  points INTEGER,
  games_played INTEGER,
  win_rate REAL,
  average REAL,
  updated_at INTEGER,
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Guest Accounts (temporär)
CREATE TABLE guest_players (
  id TEXT PRIMARY KEY,
  location_id TEXT,
  display_name TEXT,
  session_token TEXT,
  created_at INTEGER,
  expires_at INTEGER, -- Auto-Delete nach 24h
  converted_to_user_id TEXT, -- Wenn registriert
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Location Events & Turniere
CREATE TABLE location_events (
  id TEXT PRIMARY KEY,
  location_id TEXT,
  name TEXT,
  type TEXT, -- 'tournament', 'league', 'special'
  status TEXT, -- 'scheduled', 'active', 'completed'
  start_time INTEGER,
  end_time INTEGER,
  max_participants INTEGER,
  entry_fee REAL,
  prize_pool TEXT, -- JSON
  rules TEXT, -- JSON
  bracket TEXT, -- JSON
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Check-Ins (für Loyalty)
CREATE TABLE player_checkins (
  id TEXT PRIMARY KEY,
  player_id TEXT,
  location_id TEXT,
  dartboard_id TEXT,
  checked_in_at INTEGER,
  checked_out_at INTEGER,
  games_played INTEGER,
  points_earned INTEGER,
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Loyalty Points
CREATE TABLE loyalty_points (
  player_id TEXT,
  location_id TEXT,
  total_points INTEGER DEFAULT 0,
  tier TEXT, -- 'bronze', 'silver', 'gold', 'platinum'
  visits_count INTEGER DEFAULT 0,
  last_visit INTEGER,
  PRIMARY KEY (player_id, location_id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);
```

### Infrastruktur

```
┌──────────────────────────────────────────────────────┐
│  FRONTEND (PWA)                                      │
│  - Web-App für Tablets/Mobile                       │
│  - Location-spezifisches Branding                   │
│  - Offline-Capable                                   │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ HTTPS/WSS
                   │
┌──────────────────▼───────────────────────────────────┐
│  BACKEND API                                         │
│  - Node.js + Express                                 │
│  - Multi-Tenant Support                              │
│  - Real-Time via WebSockets                          │
│  - Location-basierte Authentifizierung               │
└──────────────────┬───────────────────────────────────┘
                   │
                   │
┌──────────────────▼───────────────────────────────────┐
│  DATABASE (PostgreSQL/SQLite)                        │
│  - Tenant-Isolation                                  │
│  - Location-Daten                                    │
│  - Player-Stats                                      │
│  - Leaderboards                                      │
└──────────────────────────────────────────────────────┘
```

---

## 👥 User-Rollen & Zugriffsrechte

### 1. **Location Owner** (Betreiber)

**Rechte:**
- ✅ Vollzugriff auf Location-Dashboard
- ✅ Dartboard-Verwaltung
- ✅ Event-Erstellung
- ✅ Statistiken & Analytics
- ✅ Branding-Anpassungen
- ✅ Preisgestaltung
- ✅ Staff-Verwaltung

**Typische Aktionen:**
- Turnier erstellen
- Leaderboard zurücksetzen
- Promo-Codes generieren
- Berichte exportieren

### 2. **Location Staff** (Personal)

**Rechte:**
- ✅ Dartboard-Status ändern
- ✅ Spieler auschecken
- ✅ Basic Support
- ✅ Event-Teilnehmer registrieren
- ❌ Keine Abrechnungen
- ❌ Keine Branding-Änderungen

**Typische Aktionen:**
- Gast beim Check-In helfen
- Board für Wartung sperren
- Turnier starten

### 3. **Registered Player** (Stammkunde)

**Rechte:**
- ✅ Vollständiges Profil
- ✅ Stats über alle Locations
- ✅ Global Leaderboard
- ✅ Achievements
- ✅ Turnier-Teilnahme
- ✅ Loyalty-Points sammeln
- ✅ Favoriten-Locations

**Typische Aktionen:**
- Check-In per NFC/QR
- Stats einsehen
- An Turnieren teilnehmen
- Freunde challengen

### 4. **Guest Player** (Laufkundschaft)

**Rechte:**
- ✅ Quick-Match spielen
- ✅ Basic Stats (Session only)
- ✅ Location Leaderboard sehen
- ❌ Kein Global Leaderboard
- ❌ Keine Achievements
- ❌ Keine Loyalty Points

**Typische Aktionen:**
- Schnell Spiel starten
- Gegen Freunde spielen
- Ergebnisse ansehen

---

## 🚀 Setup & Onboarding

### Phase 1: Location Registration (5 Min)

```
1. Betreiber besucht: stateofthedart.com/business
2. Registrierung:
   - Location Name
   - Adresse
   - Anzahl Dartboards
   - Kontaktdaten
3. Plan auswählen (14 Tage kostenlos)
4. Zahlung (Stripe)
5. Zugang zum Dashboard
```

### Phase 2: Setup-Wizard (10 Min)

```
┌────────────────────────────────────────┐
│  SETUP WIZARD                          │
├────────────────────────────────────────┤
│                                        │
│  Schritt 1: Location Details          │
│  ✓ Name, Logo, Farben                 │
│                                        │
│  Schritt 2: Dartboards                │
│  ✓ Anzahl, Namen (Board 1, 2, 3...)   │
│  ✓ QR-Codes generieren                │
│                                        │
│  Schritt 3: Staff Accounts            │
│  ✓ Personal einladen                   │
│                                        │
│  Schritt 4: Branding                  │
│  ✓ Logo hochladen                      │
│  ✓ Theme-Farben                        │
│  ✓ Custom Domain (optional)            │
│                                        │
│  Schritt 5: Marketing                 │
│  ✓ QR-Codes drucken                    │
│  ✓ Willkommens-Screen                  │
│  ✓ Promotion Materials                 │
│                                        │
└────────────────────────────────────────┘
```

### Phase 3: Hardware Setup (15 Min)

```
Pro Dartboard:

1. Tablet montieren (neben Board)
2. QR-Code ausdrucken & aufkleben
3. Tablet-App öffnen: app.stateofthedart.com
4. Location-Code eingeben
5. Board zuweisen (Board 1, 2, 3...)
6. Test-Spiel
7. Done! ✅
```

### Phase 4: Launch (1 Tag)

```
1. Staff Training (30 Min)
   - Demo-Durchlauf
   - FAQ durchgehen
   - Support-Kontakte

2. Soft Launch (Abend 1)
   - Nur mit Freunden testen
   - Feedback sammeln

3. Grand Opening (Tag 2)
   - Social Media Post
   - In-House Promotion
   - Erste Gäste onboarden
```

---

## 🖥️ Hardware-Empfehlungen

### Minimal Setup (Budget)

```
Pro Dartboard:
• 1x Tablet (10") - iPad oder Android
  Empfehlung: Amazon Fire HD 10 (~€150)
• 1x Tablet-Halterung mit Ladefunktion (~€30)
• 1x QR-Code Aufkleber (gratis von uns)
• 1x NFC-Tag (optional) (~€2)

Total: ~€180 pro Board
```

### Standard Setup (Empfohlen)

```
Pro Dartboard:
• 1x iPad 10.9" (~€400)
• 1x Wand-Halterung mit Stromversorgung (~€50)
• 1x QR-Code Acryl-Schild (~€20)
• 1x NFC-Tag (~€2)
• 1x HDMI-Kabel für TV-Anzeige (optional) (~€15)

Total: ~€470 pro Board
```

### Premium Setup (High-End)

```
Pro Dartboard:
• 1x iPad Pro 12.9" (~€1000)
• 1x Designer-Halterung (~€100)
• 1x LED-beleuchteter QR-Stand (~€50)
• 1x NFC-Reader (~€30)
• 1x 4K TV für Live-Stats (~€400)
• 1x Sound-System für Announcer (~€200)

Total: ~€1780 pro Board
```

### Location-Wide Empfehlung

```
Zusätzlich:
• 1x WiFi Access Point (stabil!) (~€100)
• 1x Manager-Tablet für Dashboard (~€300)
• 1x TV für Leaderboard/Bracket (~€400)
• Optional: Drucker für Turnier-Zertifikate (~€100)

Total: ~€900 einmalig
```

---

## 🎮 Features für Locations

### 1. **Location Leaderboard**

#### Daily Leaderboard
```
🏆 DAILY CHAMPIONS - [Bar Name]

#1  Max Müller      287 pts   8 Spiele
#2  Anna Schmidt    245 pts   6 Spiele
#3  Tom Weber       198 pts   5 Spiele
#4  Lisa Müller     156 pts   4 Spiele
#5  Peter Klein     143 pts   4 Spiele

Zurücksetzung: Täglich um 00:00 Uhr
```

#### Weekly Leaderboard
```
📅 WOCHE 3 - Januar 2026

#1  Tom Weber       1,240 pts   24 Spiele
#2  Max Müller      1,105 pts   19 Spiele
#3  Anna Schmidt      987 pts   18 Spiele

Prize Pool: 3x Freigetränke
```

#### Monthly Champions
```
👑 JANUAR CHAMPIONS

🥇 Tom Weber      - 5,432 pts
🥈 Max Müller     - 4,987 pts
🥉 Anna Schmidt   - 4,654 pts

Prize: Turnier-Freikarten
```

#### All-Time Legends
```
⭐ ALL-TIME LEGENDS

#1  Tom Weber      - 45,321 pts   328 Spiele
    Member since: Jan 2026
    
#2  Max Müller     - 38,654 pts   245 Spiele
    Member since: Jan 2026
```

### 2. **Smart Check-In System**

#### QR-Code Check-In
```
┌─────────────────────────────────────┐
│  Scanne QR-Code am Board           │
│                                     │
│      ████████████████████           │
│      ██ ▄▄▄▄▄ █ █▀█ ▄▄▄▄▄ ██        │
│      ██ █   █ █▄▀ ▀ █   █ ██        │
│      ██ █▄▄▄█ █▀ █▄ █▄▄▄█ ██        │
│      ██▄▄▄▄▄▄▄█▄▀▄█▄▄▄▄▄▄▄██        │
│      ██ ▄▀▄  ▄ ▄▀▀▄ ▀▄▀ ▄ ██        │
│      ████████████████████████        │
│                                     │
│  [Bar Name] - Board 1              │
└─────────────────────────────────────┘

→ Automatischer Check-In
→ Board wird für dich reserviert
→ Stats werden getrackt
```

#### NFC Check-In (für Stammkunden)
```
1. Stammkunde erhält NFC-Karte/Chip
2. Karte an Board halten
3. Automatische Erkennung
4. "Willkommen zurück, Max!"
5. Spiel starten
```

### 3. **Location-spezifisches Branding**

#### Custom Theme
```javascript
{
  "locationId": "bar-zur-sonne",
  "branding": {
    "primaryColor": "#FF6B00",
    "secondaryColor": "#FFD700",
    "logo": "https://cdn.../logo.png",
    "backgroundImage": "https://cdn.../bg.jpg",
    "welcomeMessage": "Willkommen in der Bar zur Sonne!",
    "slogan": "Wo Champions geboren werden"
  }
}
```

#### Splash Screen
```
┌──────────────────────────────────────────┐
│                                          │
│          [LOCATION LOGO]                 │
│                                          │
│       🎯 BAR ZUR SONNE 🎯               │
│                                          │
│    "Wo Champions geboren werden"         │
│                                          │
│                                          │
│    ┌─────────────────────────┐          │
│    │  🎮 Spiel starten       │          │
│    └─────────────────────────┘          │
│                                          │
│    ┌─────────────────────────┐          │
│    │  📊 Leaderboard         │          │
│    └─────────────────────────┘          │
│                                          │
│    ┌─────────────────────────┐          │
│    │  🏆 Turniere             │          │
│    └─────────────────────────┘          │
│                                          │
│                                          │
│    WiFi: BarZurSonne                     │
│    Passwort: darts2026                   │
│                                          │
└──────────────────────────────────────────┘
```

### 4. **TV-Display Mode**

Großer TV zeigt Live:
- Aktuelles Spiel (Live-Scores)
- Leaderboard (rotierend)
- Upcoming Matches
- Turnier-Bracket
- Werbung (Location-Angebote)

```
┌────────────────────────────────────────────────────────┐
│  🎯 LIVE MATCH                    Board 2              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Max Müller          vs.          Anna Schmidt        │
│     501                               501              │
│      ↓                                 ↓               │
│     180                               345              │
│                                                        │
│  Average: 105.3                   Average: 98.7       │
│  180s: 2                          180s: 1              │
│                                                        │
├────────────────────────────────────────────────────────┤
│  🏆 TODAY'S LEADERBOARD                                │
│  #1  Tom Weber      287 pts                           │
│  #2  Max Müller     245 pts    ← PLAYING NOW          │
│  #3  Anna Schmidt   198 pts    ← PLAYING NOW          │
└────────────────────────────────────────────────────────┘
```

---

## 🎊 Gast-Experience

### Workflow für Erstbesucher

```
1. QR-Code scannen
   ↓
2. Landing Page:
   "Willkommen bei [Bar Name]!"
   ↓
3. Quick Start:
   ┌─────────────────────────────┐
   │  Wie möchtest du spielen?   │
   ├─────────────────────────────┤
   │  🎮 Als Gast spielen        │ ← Schnell
   │  (Nur Name erforderlich)    │
   │                             │
   │  👤 Account erstellen       │ ← Stats behalten
   │  (Email + Passwort)         │
   └─────────────────────────────┘
   ↓
4. Name eingeben: "Max"
   ↓
5. Gegner auswählen:
   - Gegen Freund (vor Ort)
   - Gegen Computer
   - Training
   ↓
6. Spieleinstellungen:
   - 501, 301, Cricket
   - Best of 3, 5, 7
   - Double Out
   ↓
7. SPIEL STARTEN! 🎯
```

### Während des Spiels

```
Features:
✅ Auto-Calculation (kein Rechnen)
✅ Checkout-Vorschläge
✅ Live-Statistiken
✅ Voice-Announcer (optional)
✅ Animations bei 180/Checkout
✅ Undo-Funktion
✅ Pause-Möglichkeit
```

### Nach dem Spiel

```
┌─────────────────────────────────────────┐
│  🏆 MATCH BEENDET!                      │
├─────────────────────────────────────────┤
│                                         │
│  Gewinner: Max Müller                   │
│  Score: 3-1                             │
│                                         │
│  📊 Deine Stats:                        │
│  • Average: 78.5                        │
│  • 180s: 2                              │
│  • Höchster Checkout: 121               │
│  • Checkout-Quote: 45%                  │
│                                         │
│  🏅 Location Ranking:                   │
│  Du bist jetzt #12 im Daily Board!      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  📸 Teilen auf Social Media       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  🎮 Revanche spielen              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  💾 Account erstellen & Stats     │  │
│  │     behalten                       │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Account-Upgrade Prompt

```
Nach 3 Spielen als Gast:

┌─────────────────────────────────────────┐
│  🌟 Du wirst immer besser!              │
├─────────────────────────────────────────┤
│                                         │
│  Erstelle einen Account und:            │
│                                         │
│  ✅ Behalte alle deine Stats            │
│  ✅ Sammle Achievements                 │
│  ✅ Tritt dem Global Leaderboard bei    │
│  ✅ Sammle Loyalty Points               │
│  ✅ Nimm an Turnieren teil              │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Account erstellen (kostenlos)    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Später                                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📊 Betreiber-Dashboard

### Main Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  🏠 BAR ZUR SONNE - Dashboard                     👤 Admin      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📊 HEUTE                                                      │
│  ┌────────────┬────────────┬────────────┬────────────┐        │
│  │ 24 Spiele  │ 18 Gäste   │ 156 €      │ 3.2h Ø    │        │
│  │ gespielt   │ aktiv      │ Umsatz*    │ pro Gast   │        │
│  └────────────┴────────────┴────────────┴────────────┘        │
│  *geschätzt basierend auf Spieldauer                          │
│                                                                │
│  🎯 DARTBOARDS STATUS                                          │
│  ┌────────────────────────────────────────────────────┐       │
│  │  Board 1  ●AKTIV      Max vs. Anna  |  45 min     │       │
│  │  Board 2  ●AKTIV      Tom vs. Lisa  |  23 min     │       │
│  │  Board 3  ○FREI       Verfügbar                   │       │
│  └────────────────────────────────────────────────────┘       │
│                                                                │
│  📈 DIESE WOCHE                                                │
│  ┌────────────────────────────────────────────────────┐       │
│  │  Mo   ████████ 32 Spiele                           │       │
│  │  Di   ██████ 24 Spiele                             │       │
│  │  Mi   ████████ 35 Spiele                           │       │
│  │  Do   ████████████ 48 Spiele                       │       │
│  │  Fr   ██████████████████ 78 Spiele  ← Peak         │       │
│  │  Sa   ███████████████████ 82 Spiele  ← Peak        │       │
│  │  So   ████████████ 56 Spiele                       │       │
│  └────────────────────────────────────────────────────┘       │
│                                                                │
│  🏆 TOP PLAYERS DIESE WOCHE                                    │
│  #1  Tom Weber      1,240 pts   24 Spiele                     │
│  #2  Max Müller     1,105 pts   19 Spiele                     │
│  #3  Anna Schmidt     987 pts   18 Spiele                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Quick Actions

```
┌─────────────────────────────────────────┐
│  QUICK ACTIONS                          │
├─────────────────────────────────────────┤
│  🏆 Turnier erstellen                   │
│  📢 Ankündigung posten                  │
│  🎁 Promo-Code generieren               │
│  📊 Bericht exportieren                 │
│  🎨 Branding bearbeiten                 │
│  👥 Staff verwalten                     │
│  💳 Abrechnung ansehen                  │
└─────────────────────────────────────────┘
```

### Analytics-Seite

```
DETAILLIERTE ANALYTICS

📅 Zeitraum: Letzte 30 Tage

NUTZUNG:
• Gesamtspiele: 856
• Unique Players: 124
• Wiederkehrende Gäste: 67 (54%)
• Durchschn. Spieldauer: 28 Min
• Peak-Zeit: Fr/Sa 20:00-23:00

ENGAGEMENT:
• Account-Registrierungen: 23
• Turnier-Teilnahmen: 45
• Social Shares: 67
• Check-Ins: 234

UMSATZ-POTENTIAL:
• Geschätzte Getränke während Dart: 2,340 €
• Ø Umsatz pro Dartspieler: 18.87 €
• ROI: 312% (App-Kosten vs. Mehr-Umsatz)

VERGLEICH:
• +45% mehr Dart-Nutzung vs. vor App
• +23% längere Aufenthaltsdauer
• +67% mehr Stammkunden
```

---

## 💰 Pricing-Modelle

### Für Locations

#### 1. **STARTER** - Einzelne Bar
```
49 € / Monat

✅ 1-2 Dartboards
✅ Unbegrenzte Spiele
✅ Location Leaderboards
✅ Basic Analytics
✅ Email Support
✅ Standard Branding
✅ QR-Codes

14 Tage kostenlos testen
```

#### 2. **PROFESSIONAL** - Aktive Bar
```
99 € / Monat

✅ 3-5 Dartboards
✅ Unbegrenzte Spiele
✅ Advanced Analytics
✅ Turniere & Events (unbegrenzt)
✅ Custom Branding
✅ TV Display Mode
✅ Loyalty System
✅ Priority Support
✅ API-Zugang

Beliebteste Wahl ⭐
```

#### 3. **ENTERPRISE** - Club/Center
```
249 € / Monat

✅ 6+ Dartboards
✅ Multi-Location Support
✅ Dedizierter Account Manager
✅ Custom Features
✅ White-Label Option
✅ Advanced API
✅ SLA Garantie
✅ Onboarding vor Ort
✅ Marketing-Materials

Für Dart-Clubs & Center
```

#### 4. **CHAIN** - Mehrere Locations
```
Individuelles Angebot

✅ Zentrale Verwaltung
✅ Cross-Location Leaderboards
✅ Franchise-Management
✅ Bulk-Rabatte
✅ Custom Development

Kontakt: sales@stateofthedart.com
```

### Zusatz-Optionen

```
ADD-ONS:

📱 Premium-Hardware-Paket
   → iPad + Halterung + NFC
   → 399 € einmalig pro Board

📺 TV-Display Lizenz
   → 19 € / Monat zusätzlich
   → Pro TV-Screen

🎨 Custom Design
   → 199 € einmalig
   → Vollständiges Rebranding

📊 Advanced Analytics
   → 29 € / Monat zusätzlich
   → Deep-Dive Reports

🎓 Staff Training (vor Ort)
   → 199 € einmalig
   → 2h Training Session
```

### Für Spieler (Optional)

```
PREMIUM PLAYER ACCOUNT

9.99 € / Monat oder 89 € / Jahr

✅ Spiele überall ohne Werbung
✅ Advanced Stats & Analytics
✅ Video-Replays
✅ Priority Turnier-Anmeldung
✅ Exclusive Achievements
✅ Custom Avatar
✅ Ad-Free Experience

KOSTENLOS für Spieler wenn:
• Location hat Premium-Plan
• Mindestens 5 Besuche/Monat
```

---

## 🎨 Marketing & Branding

### Location Marketing Kit

Bei Anmeldung erhält jede Location:

```
📦 WELCOME KIT

Physisch (per Post):
□ 10x QR-Code Aufkleber (wasserfest)
□ 5x QR-Code Acryl-Schilder
□ 2x Poster A3 "Powered by State of the Dart"
□ 50x Flyer für Gäste
□ 1x Dartboard-Schablone für QR-Platzierung

Digital (Download):
□ Logo-Dateien (verschiedene Größen)
□ Social Media Templates
□ Instagram/Facebook Post-Vorlagen
□ Story-Templates
□ Ankündigungs-Email Template
□ Tischaufsteller Template
□ TV-Slides für Werbung
□ Staff-Schulungs-Video
```

### Launch Campaign Vorschläge

#### Social Media Posts

**Ankündigung:**
```
🎯 NEUE DART-EXPERIENCE! 🎯

Ab sofort könnt ihr bei uns Dart spielen wie die Profis!

✨ Automatische Score-Berechnung
📊 Live-Statistiken
🏆 Tägliche Leaderboards
🎮 Turniere & Events

Einfach QR-Code am Board scannen und los geht's!

📍 [Location Name]
🕐 Dart Happy Hour: Mo-Fr 17-19 Uhr

#Darts #StateoOfTheDart #[LocationName]
```

**Leaderboard Highlight:**
```
👑 DIESE WOCHE'S CHAMPION 👑

Tom Weber dominiert mit 1,240 Punkten!
24 Spiele, 89.3 Average, 45x 180s 🔥

Kannst du ihn schlagen? 🎯

[Screenshot des Leaderboards]

Komm vorbei und zeig was du drauf hast!
```

#### In-House Promotion

**Tischaufsteller:**
```
┌─────────────────────────────────────┐
│                                     │
│  🎯 NEU BEI UNS! 🎯                │
│                                     │
│  PROFESSIONELLES                    │
│  DART-TRACKING                      │
│                                     │
│  • Scanne QR-Code                   │
│  • Spiele wie ein Profi             │
│  • Sieh deine Live-Stats            │
│  • Tritt dem Leaderboard bei        │
│                                     │
│  [QR CODE]                          │
│                                     │
│  Probier's aus! →                   │
│                                     │
└─────────────────────────────────────┘
```

### Turniere als Marketing-Tool

```
MONTHLY CHAMPIONSHIP

Jeden letzten Freitag im Monat:
• Open Tournament (max 16 Spieler)
• Entry Fee: 10 €
• Prize Pool: 400 € + Sachpreise
• Professional Setup
• Live-Stream auf Facebook

→ Zieht neue Gäste an
→ Schafft Community
→ Generiert Content für Social Media
```

---

## 🏆 Turniere & Events

### Turnier-Typen

#### 1. **Quick Tournament** (2-3 Stunden)
```
Format: Single Elimination
Teilnehmer: 8-16
Entry: Kostenlos oder 5-10 €
Prize: Freigetränke, Gutscheine

Perfekt für: Spontane Dart-Nights
```

#### 2. **Weekly League** (8 Wochen)
```
Format: Round Robin + Playoffs
Teilnehmer: 12-20
Entry: 15 € Saisongebühr
Prize: Geldpreis + Trophy

Perfekt für: Stammkunden-Bindung
```

#### 3. **Championship** (1 Tag)
```
Format: Double Elimination
Teilnehmer: 32-64
Entry: 20-50 €
Prize: Großer Prize Pool

Perfekt für: Marketing-Event
```

### Turnier-Management Dashboard

```
┌────────────────────────────────────────────────────────┐
│  🏆 TURNIER ERSTELLEN                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Name: *                                               │
│  [Freitags-Champion Cup                           ]   │
│                                                        │
│  Datum & Zeit: *                                       │
│  [29.01.2026] [19:00]                                  │
│                                                        │
│  Format: *                                             │
│  [▼ Single Elimination                            ]   │
│     - Single Elimination                               │
│     - Double Elimination                               │
│     - Round Robin                                      │
│     - Swiss System                                     │
│                                                        │
│  Max. Teilnehmer: *                                    │
│  [16] Spieler                                          │
│                                                        │
│  Entry Fee:                                            │
│  [10] € (optional)                                     │
│                                                        │
│  Spiel-Format:                                         │
│  [▼ 501, Best of 3                                ]   │
│                                                        │
│  Prize Pool:                                           │
│  1. Platz: [100 €                                 ]   │
│  2. Platz: [50 €                                  ]   │
│  3. Platz: [30 €                                  ]   │
│                                                        │
│  Registrierung:                                        │
│  ☑ Online-Anmeldung                                    │
│  ☑ Walk-In erlaubt                                     │
│  ☐ Nur für Members                                     │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  Turnier erstellen & veröffentlichen         │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Automatisches Bracket-System

```
SINGLE ELIMINATION BRACKET (16 Spieler)

RUNDE 1         VIERTELFINALE    HALBFINALE    FINALE

Max M.    ─┐
            ├─→ Max M.    ─┐
Tom W.    ─┘              │
                          ├─→ Max M.    ─┐
Anna S.   ─┐              │              │
            ├─→ Anna S.   ─┘              │
Lisa M.   ─┘                              │
                                          ├─→ Max M. 🏆
Peter K.  ─┐                              │
            ├─→ Peter K.  ─┐              │
John D.   ─┘              │              │
                          ├─→ Eva B.    ─┘
Eva B.    ─┐              │
            ├─→ Eva B.    ─┘
...       ─┘

[Automatisch generiert]
[Live-Updates nach jedem Match]
[Anzeige auf TV-Screen]
```

---

## 📈 Analytics & Reporting

### KPIs für Location-Betreiber

#### Nutzungs-Metriken
```
WÖCHENTLICHER REPORT

Dart-Aktivität:
• Spiele: 234 (↑ 12% vs. letzte Woche)
• Unique Players: 89 (↑ 8%)
• Neue Registrierungen: 12
• Durchschn. Spielzeit: 32 Min

Auslastung:
• Board 1: 67% (Mo-So)
• Board 2: 54%
• Board 3: 31%
• Peak-Zeiten: Fr/Sa 20-23h

Engagement:
• Turnier-Teilnahmen: 16
• Social Shares: 23
• App-Öffnungen: 456
```

#### Umsatz-Impact
```
GESCHÄTZTER UMSATZ-IMPACT

Basierend auf durchschn. Aufenthaltsdauer:

• Dart-Spieler: 89 Personen
• Ø Aufenthalt: 2.4 Stunden
• Ø Konsumation: 3.2 Getränke
• Geschätzter Mehr-Umsatz: 2,140 €

Vergleich ohne App:
• Ø Aufenthalt: 1.6 Stunden
• Mehr-Umsatz durch längeren Aufenthalt: +45%

ROI: 4.3x (App-Kosten vs. Mehr-Umsatz)
```

### Export-Funktionen

```
VERFÜGBARE REPORTS:

□ Täglicher Summary (PDF/Excel)
□ Wöchentliche Analytics (PDF/Excel)
□ Monatliche Deep-Dive (PDF)
□ Spieler-Liste (CSV)
□ Leaderboard History (CSV)
□ Turnier-Ergebnisse (PDF)
□ Custom Report (auf Anfrage)

Automatischer Email-Versand:
☑ Montags 9:00 Uhr
```

---

## 🔌 Integration & API

### Verfügbare Integrationen

#### 1. **Social Media**
```
• Automatische Posts bei Turnieren
• Leaderboard-Updates auf Facebook/Instagram
• Player Achievements shareable
• Live-Scores auf Social
```

#### 2. **POS-Systeme**
```
• Lightspeed
• Shopify POS
• Square
• Custom Integration via API

Funktionen:
- Automatische Rechnung bei Check-Out
- Loyalty-Points → Rabatte
- Spielzeit → Konsum-Tracking
```

#### 3. **Booking-Systeme**
```
• OpenTable
• Resy
• Custom Booking

Dartboard-Reservierung:
- Online buchbar
- Zeitslots
- Anzahlung (optional)
```

### REST API für Entwickler

```javascript
// Location API
GET    /api/locations/{id}
GET    /api/locations/{id}/leaderboard
GET    /api/locations/{id}/dartboards
POST   /api/locations/{id}/checkin

// Match API
GET    /api/matches?location={id}
POST   /api/matches
GET    /api/matches/{id}/live

// Event API
GET    /api/events?location={id}
POST   /api/events
PUT    /api/events/{id}/register

// Analytics API
GET    /api/analytics/location/{id}
GET    /api/analytics/location/{id}/report
```

### Webhooks

```
Verfügbare Events:

• match.started
• match.completed
• player.checkin
• leaderboard.updated
• tournament.started
• tournament.completed
• achievement.unlocked

Beispiel Webhook Payload:
{
  "event": "match.completed",
  "timestamp": "2026-01-16T20:45:30Z",
  "location_id": "bar-zur-sonne",
  "data": {
    "match_id": "abc123",
    "winner": {
      "id": "player-123",
      "name": "Max Müller",
      "average": 78.5
    },
    "duration": 1834,
    "dartboard": "board-1"
  }
}
```

---

## 🏢 Multi-Location Support

### Für Location-Ketten

#### Zentrale Verwaltung
```
CHAIN DASHBOARD

┌────────────────────────────────────────────────────┐
│  🏢 DART LOUNGE KETTE                              │
│  4 Locations, 18 Dartboards                        │
├────────────────────────────────────────────────────┤
│                                                    │
│  📊 GESAMT-ÜBERSICHT                               │
│  • Heute: 156 Spiele über alle Locations          │
│  • Diese Woche: 1,234 Spiele                       │
│  • Active Players: 456                             │
│                                                    │
│  🏪 LOCATIONS                                      │
│                                                    │
│  Berlin Mitte        ●●●●● 5 Boards   87% aktiv   │
│  Hamburg Reeperbahn  ●●●   3 Boards   65% aktiv   │
│  München Schwabing   ●●●●  4 Boards   92% aktiv   │
│  Köln Altstadt       ●●●●● 5 Boards   78% aktiv   │
│                                                    │
│  🏆 CHAIN-WIDE LEADERBOARD                         │
│  #1  Max (Berlin)     4,567 pts                    │
│  #2  Tom (Hamburg)    4,123 pts                    │
│  #3  Anna (München)   3,987 pts                    │
│                                                    │
│  🎪 UPCOMING CHAIN EVENTS                          │
│  • Chain Championship (Berlin) - 12. Feb          │
│  • Inter-Location Battle - 19. Feb                │
│                                                    │
└────────────────────────────────────────────────────┘
```

#### Cross-Location Features

**1. Chain-Wide Leaderboard**
```
Spieler können in allen Locations Punkte sammeln:
• Einheitliches Player-Profil
• Gesamt-Ranking
• Location-spezifische Stats
• Rewards nutzbar in allen Locations
```

**2. Location-Battles**
```
Berlin vs. Hamburg
- Teams pro Location
- Wöchentliche Matches
- Cross-Location Rivalität
- Gewinner-Location erhält Trophy
```

**3. Chain Championship**
```
Jährliches Großevent:
- Top 32 Spieler aus allen Locations
- Zentrale Location
- Großer Prize Pool
- Marketing-Event
```

---

## 🚀 Rollout-Plan

### Phase 1: PILOT (Monat 1-2)
```
Ziel: 5-10 Test-Locations

Locations:
• 2-3 Sport-Bars (verschiedene Größen)
• 1-2 Dart-Clubs
• 1 Entertainment-Center

Aktivitäten:
□ Beta-Testing mit echten Gästen
□ Feedback sammeln
□ Features optimieren
□ Hardware-Setup verfeinern
□ Dokumentation erstellen

KPIs:
• Tech-Stabilität: >99%
• User-Satisfaction: >4.5/5
• Support-Anfragen: <2/Tag/Location
```

### Phase 2: REGIONAL LAUNCH (Monat 3-6)
```
Ziel: 50 Locations in 1-2 Städten

Fokus:
• Berlin + Hamburg
• Aggressive lokale Marketing
• Community-Building
• Erste Turniere

Aktivitäten:
□ Sales-Team aufbauen
□ Onboarding-Prozess skalieren
□ Regional Marketing
□ Press/PR Launch
□ Erste Chain-Events

KPIs:
• 50 aktive Locations
• 5,000 registered Players
• 50,000 Spiele/Monat
```

### Phase 3: NATIONAL ROLLOUT (Monat 7-12)
```
Ziel: 200+ Locations deutschlandweit

Expansion:
• Alle großen Städte
• Ketten-Akquise
• White-Label für große Clubs
• Franchise-Modell

Aktivitäten:
□ National Sales
□ National Marketing Campaign
□ Partnerships (Dart-Verbände)
□ First National Championship

KPIs:
• 200 Locations
• 50,000 Players
• 500,000 Spiele/Monat
• €200k ARR
```

### Phase 4: INTERNATIONAL (Jahr 2)
```
Ziel: Expansion EU + UK

Markets:
• UK (größter Dart-Markt)
• Niederlande
• Österreich
• Schweiz

Aktivitäten:
□ Lokalisierung (Sprachen)
□ Country-Manager
□ Legal/Compliance
□ International Partnerships

KPIs:
• 1,000 Locations (gesamt)
• 200,000 Players
• €1M ARR
```

---

## 💪 Wettbewerbsvorteile

### vs. Traditionelle Dart-Boards

```
TRADITIONAL DARTBOARD:
❌ Manuelles Score-Schreiben
❌ Fehleranfällig
❌ Keine Stats
❌ Keine Leaderboards
❌ Kein Community-Building
❌ Keine Event-Management

STATE OF THE DART:
✅ Automatische Score-Berechnung
✅ 100% akkurat
✅ Detaillierte Stats für jeden
✅ Dynamische Leaderboards
✅ Built-in Community
✅ Turnier-Management integriert
✅ Location-Branding
✅ Analytics für Betreiber
```

### vs. Elektronische Dartboards

```
ELEKTRONISCHE BOARDS:
💰 Hohe Anschaffungskosten (3,000-10,000 €)
⚠️ Wartungsintensiv
⚙️ Proprietäre Systeme
❌ Kein Smartphone-Integration
❌ Limitierte Features
❌ Nicht erweiterbar

STATE OF THE DART:
💰 Niedrige Kosten (180-500 € Setup)
✅ Wartungsarm (nur Tablet)
🔓 Offenes System
📱 Smartphone-First
✅ Ständig neue Features
✅ Cloud-basiert, immer aktuell
✅ Funktioniert mit jedem Board
```

### vs. Andere Apps

```
ANDERE DART-APPS:
• Fokus auf B2C (Einzelspieler)
• Keine Location-Features
• Kein Betreiber-Dashboard
• Keine Hardware-Integration
• Keine Turniere
• Keine Analytics

STATE OF THE DART:
• B2B-First mit B2C-Bridge
• Location-spezifische Features
• Vollständiges Betreiber-Dashboard
• Hardware-Ready (Tablets, NFC, QR)
• Professional Tournament System
• Advanced Analytics
• White-Label Option
```

---

## 📞 Support & Service

### Support-Kanäle

```
FÜR LOCATION-BETREIBER:

📧 Email: support@stateofthedart.com
📞 Hotline: +49 (0) 30 1234 5678
💬 Live-Chat: Im Dashboard (9-18 Uhr)
📱 WhatsApp Business: +49 176 1234 5678

SLA (Professional & Enterprise):
• Response: <2h (Geschäftszeiten)
• Resolution: <24h für kritische Issues
• Verfügbarkeit: >99.5%

FÜR ENDKUNDEN (SPIELER):

💬 In-App Support Chat
📧 help@stateofthedart.com
📖 Hilfe-Center: help.stateofthedart.com
```

### Onboarding-Support

```
PROFESSIONAL & ENTERPRISE PLANS:

✅ Dedicated Onboarding Manager
✅ Setup-Call (45 Min)
✅ Hardware-Beratung
✅ Staff Training (Remote)
✅ Marketing-Materials Setup
✅ 30 Tage enger Support

ENTERPRISE ZUSÄTZLICH:

✅ Vor-Ort Installation (optional)
✅ Custom Training Session
✅ Quarterly Business Review
✅ Dedicated Account Manager
```

---

## 📄 Legal & Compliance

### Datenschutz (GDPR)

```
✅ DSGVO-konform
✅ Server in EU (Deutschland)
✅ Datensparsamkeit (Guest Accounts)
✅ Transparente Datenschutzerklärung
✅ Einfache Daten-Löschung
✅ Cookie-Consent
✅ Keine Weitergabe an Dritte
```

### AGB für Locations

```
• Monatliche Kündigung
• Keine Setup-Gebühren
• Faire Nutzungsbedingungen
• Kein Vendor Lock-In
• Daten-Export jederzeit möglich
```

---

## 🎯 Next Steps für Interessenten

### Location-Betreiber

```
1. DEMO ANFORDERN
   → demo.stateofthedart.com
   → 15 Min Live-Demo per Video-Call

2. KOSTENLOSER TEST
   → 14 Tage voll funktionsfähig
   → Keine Kreditkarte erforderlich
   → Persönlicher Setup-Support

3. LAUNCH
   → Hardware aufstellen
   → Staff schulen
   → Gäste informieren
   → Loslegen!

KONTAKT:
📧 sales@stateofthedart.com
📞 +49 (0) 30 1234 5678
🌐 stateofthedart.com/business
```

### Investoren / Partner

```
Wir suchen:
• Strategic Partners (Dart-Verbände, Brauereien)
• Hardware-Partner (Tablet-Hersteller)
• Location-Ketten (Pilot-Programm)
• Investoren (Seed-Runde geplant Q2/2026)

KONTAKT:
📧 partnerships@stateofthedart.com
```

---

## 📊 Financial Projections

### Revenue Forecast (Year 1)

```
KONSERVATIVE SCHÄTZUNG:

Monat 6:  50 Locations × 99 €/Mo  = 4,950 € MRR
Monat 12: 200 Locations × 99 €/Mo = 19,800 € MRR

Jahresumsatz: ~120,000 €

OPTIMISTISCHE SCHÄTZUNG:

Monat 6:  100 Locations × 120 €/Mo = 12,000 € MRR
Monat 12: 400 Locations × 120 €/Mo = 48,000 € MRR

Jahresumsatz: ~300,000 €

Zusatz-Revenue:
• Hardware-Verkauf: ~30,000 €
• Premium-Accounts: ~10,000 €
• Custom Development: ~20,000 €

Total Year 1: 150,000 - 360,000 €
```

### Break-Even Analysis

```
KOSTEN (Monatlich):

• Entwicklung: 5,000 €
• Server/Infrastructure: 500 €
• Support: 2,000 €
• Marketing: 3,000 €
• Operations: 1,500 €

Total: 12,000 € / Monat

Break-Even: 121 Locations (bei 99 €/Mo)

Erwartung: Monat 8-10
```

---

## 🎬 Zusammenfassung

**State of the Dart für B2B** transformiert jede Bar mit Dartboard in einen modernen Entertainment-Hub.

### Für Locations:
✅ Mehr Gäste-Engagement
✅ Längere Aufenthaltsdauer
✅ Höherer Umsatz
✅ Professionelles Image
✅ Community-Building
✅ Event-Management

### Für Gäste:
✅ Kein Rechnen mehr
✅ Professionelle Stats
✅ Faire Competition
✅ Achievements & Rewards
✅ Social Experience

### Für Betreiber:
✅ Niedrige Setup-Kosten
✅ Einfache Integration
✅ Sofortiger ROI
✅ Ständig neue Features
✅ Full Support

---

**Bereit durchzustarten?**

🚀 **Demo anfragen**: demo@stateofthedart.com  
📞 **Anrufen**: +49 (0) 30 1234 5678  
🌐 **Website**: stateofthedart.com/business

---

*Version 1.0 - Januar 2026*  
*© State of the Dart - Made in Germany 🇩🇪*
