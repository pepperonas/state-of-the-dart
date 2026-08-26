# State of the Dart - Architektur-Dokumentation

> [← Zurück zur README](../README.md) · [Design-System](DESIGN_SYSTEM.md) · [Deployment](DEPLOYMENT_VPS.md)

## 📋 Inhaltsverzeichnis
- [Daten-Architektur](#daten-architektur)
- [Database-First Policy](#database-first-policy)
- [Datenfluss](#datenfluss)
- [API-Endpoints](#api-endpoints)
- [Context-Provider](#context-provider)
- [Offline-Support](#offline-support)
- [Präsentationsschicht](#-präsentationsschicht)

---

## 🏗️ Daten-Architektur

### Grundprinzip: **DATABASE-FIRST**

**WICHTIG**: Alle Daten werden **PRIMÄR in der PostgreSQL/SQLite-Datenbank** gespeichert!

```
┌─────────────────────────────────────────────────────────┐
│                    DATEN-HIERARCHIE                     │
├─────────────────────────────────────────────────────────┤
│  1. PRIMARY SOURCE:   PostgreSQL/SQLite Database (API)  │
│  2. CACHE LAYER:      localStorage (Offline-Support)    │
│  3. UI STATE:         React Context (Volatile)          │
└─────────────────────────────────────────────────────────┘
```

### ❌ ANTI-PATTERN (FALSCH):
```typescript
// FALSCH: Direkt in localStorage schreiben
storage.set('players', players);
storage.set('matches', matches);
```

### ✅ CORRECT PATTERN (RICHTIG):
```typescript
// RICHTIG: Über API schreiben, localStorage ist nur Cache
await api.players.create(player);  // → API → Database
// localStorage wird automatisch als Cache aktualisiert
```

---

## 📊 Database-First Policy

### Regel #1: Schreib-Operationen
**ALLE Schreib-Operationen MÜSSEN über die API zur Datenbank gehen!**

```typescript
// ✅ CREATE
const newPlayer = await api.players.create(playerData);

// ✅ UPDATE
await api.players.update(playerId, updates);

// ✅ DELETE
await api.players.delete(playerId);
```

### Regel #2: Lese-Operationen
**ALLE Lese-Operationen sollten primär die API nutzen!**

```typescript
// ✅ LOAD FROM API
const players = await api.players.getAll();

// ✅ CACHE IN localStorage (optional, für Offline)
storage.set('players-cache', players);

// ⚠️ FALLBACK: localStorage nur wenn API nicht erreichbar
if (!navigator.onLine) {
  const cached = storage.get('players-cache', []);
}
```

### Regel #3: localStorage ist NUR ein Cache
localStorage darf **NIEMALS** die primäre Datenquelle sein!

```typescript
// ❌ FALSCH: localStorage als primäre Quelle
const players = storage.get('players', []);

// ✅ RICHTIG: API als primäre Quelle, localStorage als Cache
const players = await api.players.getAll();
storage.set('players-cache', players); // Cache für Offline
```

---

## 🔄 Datenfluss

### Beim App-Start (Page Load)

```
┌──────────────┐
│  APP START   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  User authenticated? │
├──────────────────────┤
│  YES → Load from API │
│  NO  → Show Login    │
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Load ALL data from API:            │
│  ✓ Players                          │
│  ✓ Player Stats                     │
│  ✓ Player Heatmaps                  │
│  ✓ Matches                          │
│  ✓ Achievements                     │
│  ✓ Settings                         │
└─────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Cache in localStorage (Offline)    │
└─────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Update React Context (UI State)    │
└─────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Render UI                          │
└─────────────────────────────────────┘
```

### Während des Spiels (Match in Progress)

```
┌─────────────────┐
│  User Action    │
│  (Dart thrown)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Update UI State IMMEDIATELY        │
│  (React Context → Fast UI)          │
└─────┬───────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Update localStorage (Backup)       │
└─────┬───────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Sync to API (Background)           │
│  ⚠️ Non-Blocking!                   │
└─────┬───────────────────────────────┘
         │
         ├─── ✅ Success → Continue
         │
         └─── ❌ Failure → Retry Queue
```

### Nach Match-Ende (Match Completed)

```
┌─────────────────┐
│  Match Ende     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Berechne Statistiken               │
│  • Player Stats                     │
│  • Achievements                     │
│  • Heatmap                          │
└─────┬───────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Speichere zu API (CRITICAL)        │
│  ✅ BLOCKING Operation              │
│  ⚠️ User muss warten!               │
└─────┬───────────────────────────────┘
         │
         ├─── ✅ Success → Show Results
         │
         └─── ❌ Failure → Retry + Alert
```

---

## 🔌 API-Endpoints

### Players
```typescript
GET    /api/players              // Get all players
GET    /api/players/:id          // Get single player
POST   /api/players              // Create player
PUT    /api/players/:id          // Update player
DELETE /api/players/:id          // Delete player
GET    /api/players/:id/stats    // Get player stats
POST   /api/players/:id/stats    // Update player stats
GET    /api/players/:id/heatmap  // Get player heatmap
POST   /api/players/:id/heatmap  // Update player heatmap
```

### Matches
```typescript
GET    /api/matches              // Get all matches
GET    /api/matches/:id          // Get single match
POST   /api/matches              // Create match
PUT    /api/matches/:id          // Update match
DELETE /api/matches/:id          // Delete match
POST   /api/matches/:id/complete // Mark match as completed
```

### Achievements
```typescript
GET    /api/achievements                      // Get all achievements (definitions)
GET    /api/achievements/player/:playerId    // Get player achievements
POST   /api/achievements/player/:playerId    // Update player achievements
POST   /api/achievements/unlock              // Unlock achievement
```

### Settings
```typescript
GET    /api/settings              // Get user settings
PUT    /api/settings              // Update user settings
POST   /api/settings/theme        // Update theme
POST   /api/settings/preferences  // Update preferences
```

---

## 🎯 Context-Provider

### PlayerContext
**Verantwortlichkeiten:**
- Lädt alle Player von API beim Start
- Cached Player in localStorage (Offline)
- Synchronisiert Player-Updates zur API
- Verwaltet Heatmap-Daten (API-First!)

```typescript
// ✅ RICHTIG
useEffect(() => {
  const loadPlayers = async () => {
    const response = await api.players.getAll();
    setPlayers(response.players);
    
    // Cache für Offline
    storage.set('players-cache', response.players);
  };
  loadPlayers();
}, [user]);

// ❌ FALSCH
useEffect(() => {
  const players = storage.get('players', []);
  setPlayers(players);
}, []);
```

### GameContext
**Verantwortlichkeiten:**
- Verwaltet aktives Match (UI State)
- Speichert Match nach jedem Wurf (API)
- Markiert Match als completed (API)
- Aktualisiert Player-Stats am Ende (API)

```typescript
// ✅ RICHTIG: Match speichern
const saveMatch = async (match: Match) => {
  // 1. Sofort UI aktualisieren
  setCurrentMatch(match);
  
  // 2. localStorage Backup
  storage.set('current-match-backup', match);
  
  // 3. API Sync (Background)
  try {
    await api.matches.create(match);
    storage.remove('current-match-backup'); // Backup löschen
  } catch (error) {
    // Retry-Queue
    addToRetryQueue('match', match);
  }
};
```

### AchievementContext
**Verantwortlichkeiten:**
- Lädt Achievement-Definitionen von API
- Lädt Player-Achievements von API
- Unlocked neue Achievements über API
- Cached Achievements für Offline

```typescript
// ✅ RICHTIG
const unlockAchievement = async (playerId: string, achievementId: string) => {
  // 1. Optimistic UI Update
  setUnlockedAchievements(prev => [...prev, achievementId]);
  
  // 2. API Call
  try {
    await api.achievements.unlock(playerId, achievementId);
  } catch (error) {
    // Rollback bei Fehler
    setUnlockedAchievements(prev => prev.filter(id => id !== achievementId));
    throw error;
  }
};
```

### SettingsContext
**Verantwortlichkeiten:**
- Lädt User-Settings von API
- Speichert Settings-Changes zur API
- Cached Settings für Offline

```typescript
// ✅ RICHTIG
const updateSetting = async (key: string, value: any) => {
  // 1. Optimistic UI Update
  setSettings(prev => ({ ...prev, [key]: value }));
  
  // 2. API Call
  try {
    await api.settings.update({ [key]: value });
  } catch (error) {
    // Rollback bei Fehler
    setSettings(prev => ({ ...prev, [key]: oldValue }));
    throw error;
  }
};
```

---

## 🔌 Offline-Support

### Strategie: **Cache-First für Lesen, API-First für Schreiben**

```typescript
// Lesen: Cache-First
const loadPlayers = async () => {
  // 1. Zeige Cached-Daten sofort (schnell)
  const cached = storage.get('players-cache', []);
  if (cached.length > 0) {
    setPlayers(cached);
  }
  
  // 2. Versuche API zu laden (aktuell)
  try {
    const response = await api.players.getAll();
    setPlayers(response.players);
    storage.set('players-cache', response.players);
  } catch (error) {
    // Offline? Cache ist bereits angezeigt
    if (!cached.length) {
      showError('Offline - keine Daten verfügbar');
    }
  }
};

// Schreiben: API-First mit Retry-Queue
const createPlayer = async (player: Player) => {
  try {
    await api.players.create(player);
    // Success → Update Cache
    const players = await api.players.getAll();
    storage.set('players-cache', players);
  } catch (error) {
    // Offline? → Retry-Queue
    addToRetryQueue('create-player', player);
    showNotification('Offline - wird synchronisiert wenn online');
  }
};
```

### Retry-Queue für Offline-Aktionen

```typescript
interface RetryQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: Date;
  retries: number;
}

// Background-Sync wenn online
window.addEventListener('online', async () => {
  const queue = storage.get<RetryQueueItem[]>('retry-queue', []);
  
  for (const item of queue) {
    try {
      await retryApiCall(item);
      removeFromQueue(item.id);
    } catch (error) {
      item.retries++;
      if (item.retries > 3) {
        // Nach 3 Fehlversuchen: User benachrichtigen
        showError(`Failed to sync: ${item.type}`);
      }
    }
  }
});
```

---

## 📝 Migrations-Checkliste

### Phase 1: API-Routes erstellen ✅
- [x] Players API
- [x] Matches API
- [x] Achievements API
- [x] Settings API
- [x] Training API
- [x] Heatmap API (inkl. Batch-Endpoint)

### Phase 2: Context-Provider umstellen ✅
- [x] PlayerContext
- [x] GameContext
- [x] AchievementContext
- [x] SettingsContext
- [x] TenantContext

### Phase 3: Komponenten aktualisieren ✅
- [x] GameScreen
- [x] StatsOverview
- [x] Dashboard
- [x] TrainingScreen

### Phase 4: Testing ✅
- [x] Offline-Support testen
- [x] Cache-Invalidierung testen
- [x] Multi-Tenant Bug behoben (ORDER BY last_active)
- [x] WAL-Checkpoint automatisiert

### Phase 5: Dokumentation ✅
- [x] ARCHITECTURE.md erstellt
- [x] README.md aktualisiert
- [x] DEPLOYMENT_VPS.md erstellt
- [x] SECURITY.md erstellt

---

## 🚨 Breaking Changes

### Für Benutzer
- **localStorage-Daten werden migriert**: Beim ersten Login werden alle localStorage-Daten zur API synchronisiert
- **Offline-Modus**: Eingeschränkter Funktionsumfang ohne Internet
- **Multi-Device**: Daten werden automatisch über alle Geräte synchronisiert

### Für Entwickler
- **Keine direkten localStorage-Zugriffe mehr**: Immer über Context-Provider
- **Async/Await überall**: Alle Daten-Operationen sind jetzt asynchron
- **Error-Handling required**: API-Calls können fehlschlagen

---

## 🎨 Präsentationsschicht

Die Datenschicht oben beschreibt, **woher** etwas kommt. Wie es aussieht und sich bewegt,
steht im **[Design-System](DESIGN_SYSTEM.md)** — Token-Layer, Primitiv-Bibliothek, das
hauseigene Icon-Set (die App rendert keine Emoji), der `Select`-Ersatz für natives
`<select>`, `PageShell` und die Motion-Regeln.

Drei Punkte, die auch Datenfluss betreffen und deshalb hier erwähnt gehören:

### Spieler-Reihenfolge ist eine Regel, kein Zufall

`GET /api/players` liefert `ORDER BY created_at DESC`. Diese Reihenfolge ist für die
Oberfläche wertlos — sie stellte ein weggeworfenes `Guest 417`-Profil und jeden Bot über
die Menschen, die die App benutzen. `src/utils/playerOrder.ts` definiert die Regel und
`PlayerContext` wendet sie **einmal** an, damit jede Auswahlliste sie erbt:

1. echte Konten vor Bots und generierten Test-/Gast-Profilen
2. innerhalb einer Gruppe: die meisten Spiele zuerst
3. Name als stabiler Gleichstand-Entscheid

Die Bestenliste übernimmt die Gruppierung, behält aber ihre eigene Metrik-Sortierung
innerhalb jeder Gruppe.

### Avatare sind abwärtskompatibel

Gespeicherte Avatare dürfen weiterhin Emoji aus älteren Profilen sein. `iconForEmoji()`
übersetzt sie beim Rendern in eine Glyphe des Icon-Sets — es gibt **keine** Migration und
nichts geht verloren.

### Was Emoji für die Persistenz bedeuteten

Bot-Namen enthielten früher ein Emoji **im Namen** (`🎯 Bot 1 (…)`). Das landete damit in
der Datenbank, in der Match-Historie und in jedem Export. Namen sind jetzt reiner Text; das
Icon kommt aus dem Avatar-Feld, wo es hingehört.

---

## 📚 Weitere Dokumentation

- [Design-System](DESIGN_SYSTEM.md)
- [API-Dokumentation](../server/README.md)
- [Deployment-Guide](DEPLOYMENT_VPS.md)
- [Changelog](../CHANGELOG.md)

---

> Diese Datei beschreibt die **Daten-Architektur**. Sie trägt bewusst keine Versionsnummer
> mehr: eine handgepflegte Version driftet, und `src/tests/docs/docsSync.test.ts` prüft
> stattdessen laufend, dass die hier dokumentierten `/api/…`-Bereiche echten Route-Modulen
> entsprechen.
