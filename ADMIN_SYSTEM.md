# 👑 Admin System Documentation

## Overview

Das Admin-System ermöglicht es Administratoren, Benutzer zu verwalten, Abonnements zu ändern und Zugriffe zu gewähren/widerrufen.

## Admin-Konto

### Zugangsdaten
- **Email**: `martin.pfeffer@celox.io`
- **Passwort**: `d8jhFWJ3hErj`
- **Status**: Lifetime Subscription + Admin

### Zugriff
1. Öffne die App: http://localhost:5175
2. Klicke auf "Login"
3. Gib die Zugangsdaten ein
4. Nach dem Login siehst du im Main Menu den Button **"👑 Admin Panel"**

## Admin Panel Features

### 1. User Management
- **Alle Benutzer anzeigen**: Liste aller registrierten Benutzer
- **Filter**: Nach Subscription-Status filtern (All, Lifetime, Active, Trial, Expired)
- **User-Details**: Email, Name, Avatar, Status, Erstellungsdatum

### 2. Subscription Management

#### Lifetime Access gewähren
```
Button: 🌟 Lifetime
```
- Setzt `subscription_status` auf `lifetime`
- Setzt `subscription_plan` auf `lifetime`
- Entfernt `subscription_ends_at`

#### Access widerrufen
```
Button: ❌ Revoke
```
- Setzt `subscription_status` auf `expired`
- Setzt `subscription_ends_at` auf aktuelles Datum

### 3. Admin-Rechte verwalten

#### Admin machen
```
Button: 👑 Make Admin
```
- Setzt `is_admin` auf `1`
- User kann dann auch das Admin Panel sehen

#### Admin-Rechte entfernen
```
Button: 👤 Remove Admin
```
- Setzt `is_admin` auf `0`
- User verliert Zugriff auf Admin Panel

### 4. User löschen
```
Button: 🗑️ Delete
```
- **WARNUNG**: Löscht User permanent inkl. aller Daten!
- Löscht CASCADE:
  - Tenants
  - Players
  - Matches
  - Training Sessions
  - Achievements
  - Personal Bests

## Statistics Dashboard

Das Admin Panel zeigt folgende Statistiken:
- **Total Users**: Gesamtanzahl registrierter Benutzer
- **Active Subs**: Aktive monatliche Abonnements
- **Lifetime**: Lifetime-Abonnements
- **Trial**: Benutzer im Testzeitraum
- **Expired**: Abgelaufene Abonnements

## Demo-Daten

### Generierte Demo-Daten
Das System wurde mit folgenden Demo-Daten gefüllt:

#### Spieler
1. **Max Mustermann** (Avatar: M)
2. **Anna Schmidt** (Avatar: A)
3. **Tom Weber** (Avatar: T)
4. **Lisa Müller** (Avatar: L)

#### Matches
- **20 Demo-Spiele** zwischen den Spielern
- Verteilt über die letzten 20 Tage
- Best-of-3 Legs (501, Double Out)
- Realistische Würfe mit variierender Skill-Level (70-100%)
- Vollständige Statistiken:
  - Averages
  - Checkouts
  - 180s, 171+, 140+, 100+, 60+
  - Heatmap-Daten

### Statistiken testen
1. Gehe zu **"Statistics"** im Main Menu
2. Wähle einen Spieler aus
3. Tabs:
   - **Übersicht**: Gesamtstatistiken
   - **Fortschritt**: Verbesserung über Zeit
   - **Verlauf**: Match History mit Line Charts
   - **Vergleich**: Spieler-Vergleich

### Achievements testen
1. Gehe zu **"Achievements"** im Main Menu
2. Wähle einen Spieler aus
3. Siehe freigeschaltete Achievements basierend auf den Demo-Spielen

### Heatmap testen
1. Gehe zu **"Players"** im Main Menu
2. Klicke auf einen Spieler
3. Scrolle zur **"Dart Throw Heatmap"**
4. Siehe Trefferbereiche visualisiert (Rot = häufig, Blau = selten)

## Backend API Endpoints

### Admin Routes (Protected)
Alle Admin-Routen erfordern:
- `Authorization: Bearer <JWT_TOKEN>`
- User muss `is_admin = 1` haben

```
GET    /api/admin/users                    - Get all users
GET    /api/admin/stats                    - Get admin statistics
PATCH  /api/admin/users/:userId/subscription - Update subscription
POST   /api/admin/users/:userId/grant-lifetime - Grant lifetime access
POST   /api/admin/users/:userId/revoke     - Revoke access
DELETE /api/admin/users/:userId            - Delete user
POST   /api/admin/users/:userId/make-admin - Make user admin
DELETE /api/admin/users/:userId/admin      - Remove admin status
```

## Database Schema

### Users Table (erweitert)
```sql
CREATE TABLE users (
  ...
  is_admin INTEGER DEFAULT 0,  -- NEU: Admin-Flag
  ...
);
```

## Scripts

### Admin-Konto erstellen
```bash
cd server
npm run create:admin
```

### Demo-Daten generieren
```bash
cd server
npm run seed:demo
```

### Datenbank zurücksetzen
```bash
cd server
rm database.sqlite
npm run create:admin
npm run seed:demo
```

## Security

### Admin-Zugriff schützen
- Admin-Routen sind durch `requireAdmin` Middleware geschützt
- Frontend prüft `user.isAdmin` vor Anzeige des Admin Panels
- JWT-Token enthält User-ID und wird bei jeder Request validiert

### Best Practices
1. **Niemals** Admin-Passwörter im Code committen
2. Verwende starke Passwörter für Admin-Konten
3. Ändere Admin-Passwörter regelmäßig
4. Logge alle Admin-Aktionen (TODO: Audit Log)

## Troubleshooting

### Admin Panel nicht sichtbar
- Prüfe ob User `is_admin = 1` in der Datenbank hat
- Logout und erneut Login
- Browser-Cache leeren

### Backend-Fehler
```bash
# Server-Logs prüfen
cd server
npm run build
npm start
```

### Datenbank-Fehler
```bash
# Datenbank neu initialisieren
cd server
rm database.sqlite
npm run create:admin
npm run seed:demo
```

## Nächste Schritte

### Geplante Features
- [ ] Audit Log für Admin-Aktionen
- [ ] Bulk-Operationen (mehrere User auf einmal bearbeiten)
- [ ] Export von User-Daten (GDPR)
- [ ] Email-Benachrichtigungen bei Admin-Aktionen
- [ ] Erweiterte Filter und Suche
- [ ] User-Aktivitäts-Timeline

## Testing Checklist

### ✅ Backend
- [x] Admin-Konto erstellt
- [x] Demo-Daten generiert
- [x] Server läuft auf Port 3001
- [x] Health Check funktioniert
- [x] Admin API Endpoints verfügbar

### ✅ Frontend
- [x] Login mit Admin-Konto
- [x] Admin Panel Button im Main Menu
- [x] Admin Panel UI lädt
- [x] User-Liste wird angezeigt
- [x] Statistiken werden angezeigt
- [x] Filter funktionieren

### 🔄 Manuelle Tests (TODO)
- [ ] Lifetime Access gewähren
- [ ] Access widerrufen
- [ ] User zum Admin machen
- [ ] Admin-Rechte entfernen
- [ ] User löschen
- [ ] Statistiken prüfen
- [ ] Achievements prüfen
- [ ] Heatmap prüfen
- [ ] Match History prüfen

## Support

Bei Fragen oder Problemen:
1. Prüfe die Logs: `server/logs/` (falls konfiguriert)
2. Prüfe Browser Console (F12)
3. Prüfe Backend-Logs im Terminal
4. Erstelle ein Issue auf GitHub

---

**Version**: 1.0.0  
**Letzte Aktualisierung**: 15.01.2026  
**Autor**: AI Assistant
