# Landing Page, Navigations-Naht und App-Konsistenz — Plan

Stand der Erhebung: alle 35 Routen aus `src/App.tsx` geprüft, dazu die
Modal-/Overlay-Unterseiten, die keine eigene Route haben.

---

## 1. Befund

### 1.1 Es gibt kein öffentliches Gesicht

`stateofthedart.com/` ist heute `MainMenu` hinter `ProtectedRoute` — wer nicht
angemeldet ist, landet **sofort auf dem Login-Formular**. Die Marketing-Seite
liegt getrennt unter `stateofthedart.celox.io` (`website/`, eigener Vite-Build,
eigenes Design: Indigo/Purple-Verläufe auf Slate, **nicht** das M3-Token-System
der App). Zwischen beiden gibt es nur harte Domainwechsel-Links.

### 1.2 Admin ist an zwei Adressen vergeben und beliebig weitergebbar

| Ort | Inhalt |
|---|---|
| `server/src/config/passport.ts` (3×) | `['martinpaush@gmail.com', 'martin.pfeffer@celox.io']` |
| `server/src/routes/auth.ts` | dieselbe Liste, dupliziert |
| `server/src/database/index.ts` | Master-Admin `martinpaush@gmail.com` |
| `server/src/routes/admin.ts` | `POST /users/:id/make-admin`, `DELETE /users/:id/admin` |
| `src/services/api.ts` | `admin.makeAdmin` / `admin.removeAdmin` |
| `src/components/admin/AdminPanel.tsx` | `handleToggleAdmin` |

Die Liste steht **viermal** im Code. Jeder Admin kann jeden anderen Nutzer zum
Admin machen.

### 1.3 Layout-Inkonsistenzen (alle 35 Routen erhoben)

- **Containerbreite:** acht verschiedene Werte im Einsatz — `2xl, 4xl, 5xl, 6xl,
  7xl`, mehrere Seiten mischen zwei davon in sich selbst
  (`/game` 4xl+7xl, `/stats` 6xl+7xl, `/pricing` 2xl+4xl+6xl).
- **Seitentitel:** `m3-headline-small` (7 Seiten), `m3-headline-medium` (14),
  `m3-display-small` (5 Auth-Seiten), `m3-display-medium` (MainMenu),
  `/admin` hat **gar keinen** Titel im Typenraster.
- **Zurück-Navigation:** 7 Seiten ohne `BackButton` — darunter `/login`,
  `/register`, `/reset-password`, `/verify-email`, `/payment/success`. Bei den
  Auth-Seiten ist es willkürlich: `/forgot-password` und `/resend-verification`
  haben einen, die Geschwisterseiten nicht.
- **Kopfzeilen-Aufbau:** jede Seite baut ihren Kopf von Hand — mal
  `BackButton` im Block darüber, mal `inline` in einer Flex-Zeile, mal mit
  Aktionen rechts, mal ohne.
- `Footer.tsx` wird app-weit aus `App.tsx` gerendert (nicht aus den Seiten) — die erste Erhebung hatte nur `src/components` durchsucht und ihn deshalb fälschlich als ungenutzt gemeldet. Korrigiert.

### 1.4 Alt-Klassen außerhalb des Token-Systems

`glass-card` (GameScreen, TrainingScreen), `text-white` (ATC,
PlayerManagement, AdminPanel), `bg-dark-*`, `text-dark-*`, sowie
`bg-gradient-to-*` in 10 Dateien. Diese Klassen kennen das helle Theme nicht.

### 1.5 i18n ist lückenhaft

17 Komponenten binden `useTranslation` gar nicht ein; weitere Seiten nutzen es,
tragen aber viele deutsche Literale im Markup (UserGuideModal 153,
StatsOverview 48, GameScreen 35 …).

---

## 2. Die Navigations-Naht (die Kernentscheidung)

**`/` ist ein auth-abhängiger Schalter, kein Redirect.**

```
        nicht angemeldet            angemeldet
  /  →  Landing (öffentlich)   |    MainMenu (App-Start)
```

Warum das die richtige Lösung ist:

1. **Kein Bruch für Bestehendes.** Im Code stehen **34** Sprünge auf `/` als
   App-Heimat (`navigate('/')` und harte `window.location.href = '/'` in den
   Spielbildschirmen). Ein Verschieben der App auf `/app` müsste jeden davon
   anfassen — und ein übersehener schickt den Spieler mitten im Match auf die
   Werbeseite. Der Schalter lässt alle 34 unverändert korrekt sein.
2. **Kein Umweg für wiederkehrende Nutzer.** Wer angemeldet ist, sieht die
   Landing nie ungefragt; `stateofthedart.com` öffnet direkt die App.
3. **Die PWA bleibt heil.** `start_url` ist `/` und trifft in beiden Zuständen
   das Richtige, ohne Sonderfall im Manifest.
4. **Ein Designsystem.** Die Landing wird aus denselben `--m3-*`-Tokens und
   derselben Motion-Schicht gebaut wie die App — damit ist der Übergang
   Landing → Login → App optisch nahtlos, nicht nur verlinkt.
5. **Die Landing bleibt erreichbar, wenn man angemeldet ist**, über die
   ausdrückliche Route `/willkommen` (aus dem Footer verlinkt).

**Zusätzliche Nähte:**

- Login/Registrierung bekommen „← Zur Startseite“ — heute sind sie Sackgassen.
- Die Landing kennt den Anmeldezustand: der Haupt-Knopf heißt
  „Kostenlos starten“ bzw. „Zur App“.
- Abmelden landet auf `/` und zeigt damit von selbst wieder die Landing.
- `website/` bleibt die SEO-Marketingseite; ihre Links zeigen weiter auf die
  App. (Perspektivisch kann sie auf `/willkommen` umgeleitet werden — nicht
  Teil dieses Plans, weil sie serverseitig gerendertes HTML für Crawler liefert,
  was die SPA-Landing nicht kann.)

---

## 3. Umsetzungsplan

### Phase 1 — Admin nur noch für martinpaush@gmail.com
1. `server/src/config/adminAllowlist.ts` (neu): **eine** Konstante
   `MASTER_ADMIN_EMAIL`, plus `isMasterAdmin(email)`.
2. `passport.ts`, `auth.ts`, `database/index.ts` beziehen daraus —
   `martin.pfeffer@celox.io` entfällt.
3. `POST /users/:id/make-admin` und `DELETE /users/:id/admin` **entfernt**
   (nicht nur gesperrt — eine tote Route ist eine Angriffsfläche weniger).
4. `api.admin.makeAdmin/removeAdmin` und `handleToggleAdmin` samt UI entfernt.
5. Beim Login/Boot wird `is_admin` aus der Adresse **abgeleitet**: nur die
   Master-Adresse bekommt 1, alle anderen werden auf 0 zurückgesetzt. Damit
   heilt sich ein in der DB stehengebliebenes Alt-Admin-Flag von selbst.
6. Tests: Master bleibt Admin, Fremdadresse wird zurückgestuft, die entfernten
   Routen antworten 404.

### Phase 2 — Landing Page
- `src/components/landing/Landing.tsx`, per `React.lazy` geladen (der
  Login-Bundle-Guard in `e2e/smoke.spec.ts` darf nicht reißen).
- Abschnitte: Hero mit Kennzahlen, Spielmodi, Funktionsraster, Training,
  Statistik/Achievements, PWA-Hinweis, Abschluss-CTA, Fuß mit Rechtslinks.
- Nur `--m3-*`-Tokens, `m3-*`-Typenraster, Motion-Klassen aus `motion.css`.
- Routen: `/` (Schalter) und `/willkommen` (immer Landing).

### Phase 3 — `PageShell`: ein Seitenkopf für alle
Statt 30 handgebauter Köpfe **eine** Komponente:

```tsx
<PageShell title="…" width="md" back onBack={…} actions={…}>
```

- Breitenraster auf drei Stufen: `sm` = 640 (Formulare/Dialogseiten),
  `md` = 1024 (Standard), `lg` = 1280 (Tabellen/Dashboards).
- Titel immer `m3-headline-medium`, Abstand Kopf→Inhalt 24 px.
- Zurück-Knopf, Aktionsbereich rechts, Seiten-Entrance `m3-view` inklusive.
- Migration seitenweise; Spielbildschirme behalten ihren eigenen
  In-Game-Kopf (dort ist der Platz knapp und die Aktionen sind speziell).

### Phase 4 — Alt-Klassen und Fuß
- `glass-card`, `text-white`, `bg-dark-*`, `text-dark-*` in den betroffenen
  Dateien durch Token-Klassen ersetzen.
- `Footer` in `PageShell` einhängen, damit er auf jeder Seite gleich sitzt.

### Phase 5 — Abnahme
Unit- + E2E-Suite, Browser-Durchlauf über alle Routen in hellem und dunklem
Theme sowie mit `prefers-reduced-motion`, Kontrastmessung, Produktions-Build.

---

## 3b. Stand der Umsetzung

| Phase | Stand |
|---|---|
| 1 — Admin nur martinpaush@gmail.com | **fertig**, 7 Tests, Mutationsproben greifen |
| 2 — Landing + Navigations-Naht | **fertig**, 9 Vertrags-Tests, im Browser abgenommen |
| 3 — `PageShell` + Titel/Kopf-Norm | **fertig**: 10 Seiten strukturell auf `PageShell` migriert, die übrigen per Klassen-Angleich auf dieselbe Vier-Stufen-Skala; jede Seite trägt genau eine Stufe und einen `<h1>` auf `m3-headline-medium` — auch im Leerzustand |
| 4 — Alt-Klassen | **fertig**: `glass-card`, `bg-dark-*`, `text-dark-*` app-weit auf 0; dazu die Wurzel gefunden (siehe unten) |
| 5 — Abnahme | **fertig** für den umgesetzten Umfang |

### Wurzelbefund während der Abnahme: das helle Theme war ein zweites Designsystem

Die Alt-Regeln in `index.css` (`.modern-light p`, `.modern-light button`,
`.modern-light button[class*="bg-primary"]` …) zielen auf nackte Elemente und
sind damit **(0,1,1)** — sie schlagen jede Token-Utility, die nur **(0,1,0)** ist.
Im hellen Theme gewann deshalb systematisch die alte Palette: `bg-primary-container`
wurde als `#3b82f6` gerendert, `text-on-primary-container` als `#1a1a1a` — gemessen
**3,4:1**. Der Teilstring-Treffer `[class*="bg-primary"]` verschluckte dabei auch
`bg-primary-container`.

Alle betroffenen Element-Regeln stehen jetzt in `:where()` und tragen damit
Spezifität **0**: weiterhin Rückfallebene für alles ohne Token-Klasse, nie mehr
Übersteuerung. Nach der Umstellung: **0 Kontrastverstöße über 19 Routen × 2 Themes.**

⚠️ Zustands-Regeln brauchen den Zustand **innerhalb** von `:where()` —
`:where(x):hover` ist immer noch (0,1,0) und gewann weiter; erst
`:where(x:hover)` ist wirklich 0.

### Abgeschlossen in der zweiten Runde
- **Breiten:** jede Seite liegt auf genau einer der vier Stufen
  (`2xl/4xl/6xl/7xl`). `5xl` ist weg, kein Bildschirm mischt mehr zwei Stufen.
- **`PageShell`:** 10 Seiten strukturell migriert (Rechtsseiten, Leaderboards,
  Spielerverwaltung, Konto, Trainingsmenü, Fortsetzen, Einstellungen). Die
  Spiel- und Übersichtsbildschirme behalten ihren bespoke Kopf und wurden per
  Klassen-Angleich auf dieselbe Skala gebracht — ein JSX-Umbau hätte dort viel
  Risiko für keinen sichtbaren Gewinn bedeutet.
- **Titel im Leerzustand:** `/stats`, `/achievements` und `/training-stats`
  waren ohne Daten **titellos**. Eine Seite behält ihren Titel unabhängig davon,
  ob sie Daten hat.
- **`/pricing`** war ein Fehlalarm der ersten Erhebung: die drei Breiten sind
  eine Seitenbreite plus zwei Lesebreiten im Inhalt. Der Prüftest schaut jetzt
  nur noch auf den Container direkt in der Vollhöhen-Schale.
- **Verläufe:** die theme-blinden ersetzt (Avatare, Melde-Knopf, Trenner,
  Schimmer). Bewusst geblieben sind die *Theme-Vorschau* in den Einstellungen,
  die *Heatmap-Legende* und das *Sieg-Gold* — dort ist der Verlauf die Aussage.
- **Fünf weitere Alt-Regeln** (`input[type="range"]`, `select option`) hingen
  noch außerhalb von `:where()` — vom eigenen Regressionstest gefunden.
- **`src/tests/consistency/pageConsistency.test.ts`** pinnt den Vertrag:
  Breitenskala (Klassen *und* `PageShell`-Stufen), keine Alt-Klassen, keine
  Alt-Regel ohne `:where()`, keine Admin-Vergabe in der API. Alle Pins per
  Mutation geprüft.

### Weiterhin offen
- Volle i18n-Abdeckung (eigener Track, siehe unten).

## 4. Bewusst nicht in diesem Plan

- **Vollständige i18n-Abdeckung.** 17 Komponenten ohne `useTranslation` und
  mehrere hundert deutsche Literale sind ein eigenes Vorhaben; es gehört nicht
  in denselben Durchgang wie ein Layout-Refactor, weil beides dieselben Dateien
  anfasst und die Prüfbarkeit zerstört. Ist als eigener Track vermerkt.
- **Serverseitiges Rendern der Landing.** Für Suchmaschinen bleibt `website/`
  zuständig.
