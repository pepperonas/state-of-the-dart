# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [0.15.0] - 2026-09-26

The last German on the English screens, and backups that leave the server.

### Changed

- **Achievements are translated**: all 463 names and descriptions. The German
  definitions in `types/achievements.ts` stay the source; translations live
  under `achievement_defs.<id>`, read through `achievementName()` /
  `achievementDescription()`.
- Match exports (CSV, Excel, PDF) follow the app language — they were English
  for everyone. Newly created adaptive bots are named in the active language.
  The admin activity chart's label is translated.

### Fixed

- "Unlock all 464 achievements" — there are 463. The description now fills in
  the real target, which was already computed at runtime.

### Operations

- **The database is now backed up off the server.** It lived in no external
  backup at all: the nightly VPS backup skips `/var/www` as a whole, and the
  only copies were the ones `deploy.sh` makes on the same disk (deleted after
  7 days). It is now a named exception in the VPS backup (off-host to the Time
  Capsule, restore verified) and has a nightly local backup at 03:15.

### Tests

- `achievementDefs.test.ts`: every achievement has both languages, de.json is
  word for word the definitions, no stale ids, the count is real, and no
  component renders achievement text around the helpers.

## [0.14.0] - 2026-09-26

Accessibility and translation — both measured in the running app, both guarded.

### Added

- **Screen readers hear the game**: a polite live region announces every visit
  ("Anna: 100, Rest 401"), busts, leg and match wins and undos. The app had no
  `aria-live` in play at all.
- **Keyboard shortcuts overlay** on `?` (not while typing in a field).
- **`<html lang>` follows the language** — it was hard-coded to `en` while the
  app speaks German by default, so screen readers read German with an English
  voice.
- **48 px touch targets** for every icon button, chip and button (an invisible
  hit area; the visual size is unchanged). Footer links, the volume sliders and
  the achievements filter now meet the WCAG 2.5.8 minimum of 24 px.

### Changed

- **The app is fully translated**: about 1070 hard-coded German strings in 55
  components moved to `de.json`/`en.json` (1628 keys each). English users no
  longer see German on the stats, training, game, account, pricing and landing
  screens or in the user guide. Two hand-written `language === 'de' ?` forks
  are gone. The German legal texts stay German — that version is binding.
- Bot names follow the language; dates use the active locale.
- The user guide is a real dialog now (Escape closes it, focus stays inside).

### Fixed

- **Training statistics crashed** (`ReferenceError`) as soon as a player had
  training sessions — a helper was used before it was defined.
- Clickable rows and images that no keyboard could reach (player list,
  leaderboard, screenshots) are real buttons and links. On phones the player
  list squeezed the name to 2 px beside the action buttons; they now stack.
- Unnamed buttons (account avatar, cricket miss, around-the-clock undo),
  unlabelled volume sliders.

### Tests

- `src/tests/i18n/i18nGuard.test.ts` — no literal text in JSX (TypeScript AST,
  including `cond ? 'a' : 'b'` and readable attributes), no language forks,
  identical keys and placeholders in both languages, every static key exists.
- `src/tests/a11y/clickables.test.ts` — nothing reacts to a click without
  being a control.
- `e2e/a11y.spec.ts` — axe-core (WCAG 2.1 A/AA) on 20 screens plus X01,
  Cricket, Around the Clock and Shanghai in play, touch-target sizes, and the
  live announcement. Every guard has a cross-check against a deliberately
  broken case and was mutation-probed.

## [0.13.0] - 2026-09-26

Material 3 Expressive, consistently — and measured, not eyeballed.

### Fixed — display bugs

- **Eleven classes did nothing**: `text-error-500`/`-400` and `border-error-500`
  (the `error` colour has no number scale) — error text in the admin panel,
  leaderboard and game setup showed in the default colour.
- `dark:` classes in the match details never applied (the app never sets
  `dark`): dark grey text on dark surfaces.
- The loading screen for every lazy route was a legacy glass card with white
  text — white on white in the light theme.
- Unloaded font weights (`font-black`, `font-extrabold`), an undefined
  animation class, a responsive prefix on an M3 type class.
- **Text contrast now meets WCAG AA on eleven screens in both themes**,
  measured in the browser (new `e2e/contrast.spec.ts`). Fixes it forced:
  locked achievement cards and the inactive player card were dimmed with
  `opacity`, which multiplied into every text colour (3.99:1); tier and rarity
  chips painted their colour as text on a 20 % tint of itself (1.05:1 for gold
  in the light theme); the footer version was faded to 3.98:1.

### Changed

- **Charts follow the theme**: a shared `useChartTheme()` feeds the M3 tokens
  into all seven chart files (grid, axes, series, tooltip) — they had
  hard-coded dark greys and a black tooltip.
- **No more browser `alert()`/`confirm()`** (36 calls): an app-wide
  `useFeedback()` gives M3 snackbars and confirm dialogs, translated.
- **Dialogs behave like modals**: focus moves in, Tab stays inside, Escape
  closes, focus returns to the opener, the title labels the dialog. The
  hand-built overlays (Around the Clock, Shanghai, bug report, match details)
  use the shared dialog; the rest got dialog semantics.
- **One loading indicator** (M3 Expressive morphing shape) instead of six
  spinner styles.
- Colours come from the M3 roles: the numbered legacy scales are gone, ranks
  use gold/silver/bronze tokens tuned per theme, selection uses the primary
  ring, scrims use the scrim token.
- Admin panel, guide, settings and training on the M3 type scale (the admin
  panel went from 105 ad-hoc font sizes to 3 responsive ones); an
  `m3-emphasized` style replaces 58 `m3-* font-bold` combinations.
- Route changes fade through (M3).
- New primitives: `TextArea`, `LoadingIndicator`, `useFeedback`.
- The consistency test now also covers `App.tsx` and forbids dead classes,
  theme-blind colours, numbered legacy colours and native dialogs.

## [0.12.0] - 2026-09-26

The app's structure: one tap to play again, a real navigation, and a game
screen that fits a phone.

### Added

- **Home screen rebuilt.** A large "Rematch" button starts the last pairing
  with the last settings in one tap (it took about seven taps plus the
  spinner); a paused game sits right next to it; the other modes and the
  statistics are grouped. Guide and contact moved into the account menu.
- **M3 navigation**: a bottom bar on phones, a rail from tablet width —
  Home, Stats, Awards, Players. Hidden on game screens and public pages.
- **Score strip on phones**: all players' remaining scores in one row. The
  stacked player cards used to push the confirm button below the fold
  (918 px on an 844 px screen); now score, input and confirm fit on one
  screen. Pinned by `e2e/layout.spec.ts` at phone and desktop size.
- **Dart grid input**: a third input mode — S/D/T plus 1–20, 25, Bull and
  Miss, one tap per dart with the exact bed; more accurate than tapping a
  phone-sized dartboard and reachable by keyboard.
- **First-run checklist** on the home screen (profile, opponent, first 501).
- Load errors in Statistics and Dashboard say so and offer a retry — they
  used to look like "no matches yet".
- `SegmentedButton` and `ErrorState` primitives.

### Changed

- Clearer input buttons: numpad `C` clears the typed number, the visit
  actions read "Clear" and "Confirm" (visible on phones too), the dart slots
  are real buttons.
- Floating report buttons moved clear of the navigation bar and grew to 48 px.

## [0.11.0] - 2026-09-26

Using the app at the board: offline, awake, quicker to start, honest at the end.

### Added

- **The app works offline and updates itself.** The built service worker was
  never registered — no offline support, no updates. It is now, with an M3
  snackbar offering a new version; the offer waits while a game is on screen.
- **Install offer** on the home screen after the first finished match. The
  browser's install event is caught at startup instead of only while the
  settings page happened to be open; iOS gets the Share-sheet instructions.
- **The screen stays awake** on every game screen (Wake Lock, re-acquired
  after the tab was hidden).
- **Vibration feedback** on dart entry, confirm, bust and checkout. The
  vibration setting existed before, but nothing ever vibrated.
- **Mute button** in the X01 header; remembered, leaves the saved volumes alone.
- Spinner can be skipped, or a player picked to start.
- Match-end **undo snackbar** (8 s). The confirmation promised an undo the
  screen never showed.
- Winner screen lists **every player** with legs/sets, average, highest and
  180s, and opens this match's details. A rematch lets the other player start.

### Changed

- New games default to **501 double out** (was 301 without); the last
  settings, the last players and the input mode (numpad / quick) are remembered.
- A one-player start reuses one guest profile instead of creating a new
  "Guest 417" every time.
- Leaving a game goes through the router instead of reloading the whole app.
- Footer and floating report buttons are hidden on game screens.
- Online multiplayer is marked **Beta** (live throws are not implemented yet).
- The service worker no longer caches API responses (cached per URL, not per
  account); one web manifest instead of two contradicting ones; no portrait lock.

### Fixed

- "Show checkout hints" did nothing — hints always showed.
- Pressing Enter on a focused button committed a visit twice; Escape cleared
  the visit behind an open dialog; auto-repeat and browser shortcuts reached
  the game.
- Double-in / double-out are proper M3 switches.

## [0.10.0] - 2026-09-26

A correctness release: the numbers the app stores and shows are now right.

### Fixed — data that was lost or wrong

- **Finished matches never stored their winner.** The upsert branch of
  `POST /api/matches` wrote only game type, status and settings: every match
  landed without `winner`, `completed_at` and its final leg, so every
  "matches won" achievement query counted zero. Match persistence now lives in
  `server/services/matchStore.ts` and writes the whole match on every save.
- `highest_score`, `darts_thrown` and `first9_average` were stored as 0 for
  every player (the client sent `matchHighestScore` and never the other two).
- Leg and throw timestamps were written as ISO strings into INTEGER columns.
- `PUT /api/matches/:id` could not clear `winner` / `completed_at`, so an
  undone end of match stayed "won" in the database.
- **Ending, undoing and ending a match again counted it twice** in every
  player's career stats. Stats are counted once per match and rolled back when
  it is reopened; an abandoned match is no longer a played game.
- A corrected visit after an undo was not saved (the save key counted throws).
- Pausing sent two saves at once; the second hit a 409.
- **Heatmaps counted every human dart twice.**
- Saved Around-the-Clock, Shanghai and Cricket games were deleted on every
  reload — the restore ran while the player list was still empty.
- **Cricket overwrote a running X01 match**, posted itself as an X01 match and
  added a 0-average game to every player. It now keeps its own turn state, and
  confirmed visits can be undone.
- On a shared device the next account inherited the previous one's cache —
  personal bests, achievement progress and the queue of unsynced unlocks,
  which was then sent with the wrong token. The cache is per account now
  (the first account after the update takes over the old shared cache); signing
  out clears the device's running games.
- Achievement progress of several tiers updated in one check was lost; a
  failed load was never retried; failed meta-achievement unlocks were dropped
  instead of queued.
- Two quick settings changes overwrote each other. The dartboard-helper toggle
  was stored in the `enable_achievements_hints` column; it has its own column.
- The offline indicator deleted queued actions without sending them.

### Fixed — game rules

- **Undo in a sets match restored the legs of earlier sets**, so the next leg
  could win a set and the match on the spot. Legs are recounted per set.
- Undo now reaches back across a leg or set boundary and out of a match won by
  a checkout. Undoing the end of a checkout-won match no longer freezes the leg.
- **Double-in** was selectable but never applied. It is now.
- Undo within the one-second auto-advance window lost the darts it had brought
  back. Undo also steps over bot visits instead of letting the bot re-commit
  its old darts; bots clear leftover darts after a pause.
- A bot at the same seat after removing a player never started its turn.
- Leg achievements were only checked for the final leg of a match; a resumed
  match replayed a "leg won" animation.
- The caller announced "you require …" for bots after a resume.
- Knockout tournaments ended without a champion (an extra "final" nobody could
  reach). Brackets now handle any field size with byes; results credit each
  side's own legs.
- Training: Around the Clock, doubles and triples advance once per dart that
  hits in order; Bob's 27 scores the double's value (it added a flat 3 for any
  hit in the segment) and ends on the bull.

### Fixed — stability

- **"Maximum update depth exceeded" in the game screen**: achievement hints
  looped (new object → new callback → effect → setState → render).
- The online server could crash when a player left mid-game; chat accepted any
  room; the client reconnected (and lost its room) on every player update.
  Throws are range-checked and double-out applies online too.
- A corrupt saved match no longer crashes the app on load.

### Changed

- One `evaluateVisit()` (`src/utils/visit.ts`) decides remaining score, bust
  and checkout for the reducer, the game screen and the bot — it replaced six
  hand-written copies.

## [0.9.1] - 2026-08-28

### Fixed

- **E2E suite could never pass in CI** — two separate instances of the same
  ordering bug. Playwright starts `webServer` *before* `globalSetup`, but both
  the frontend build and the database seed lived in `globalSetup`:
  - `vite preview` came up with no `dist/` to serve, so the URL probe timed out
    after 60s;
  - the backend had already opened the database file that the seed then
    `unlink`s, so it kept reading the deleted inode, never saw the test user,
    and every login returned `401`.

  Both steps are now chained into their `webServer` commands, where Playwright
  guarantees the ordering, and `globalSetup` is retired. Neither fault
  reproduced locally, because a stale `dist/` and a leftover `e2e-test.db`
  papered over them; deleting both reproduces CI exactly, and the suite now
  passes 11/11 from a genuinely clean tree.
- Unit-test CI job installed root dependencies only, so the admin usage-stats
  suite could not resolve the backend's `better-sqlite3`. The workflow now
  installs `server/` dependencies too.
- Documentation link check no longer reports generated paths (`server/data/`,
  `dist/`, `coverage/`, `node_modules/`) as dangling — they are legitimately
  named in the docs but absent from a clean checkout, which is exactly what CI is.

## [0.9.0] - 2026-08-28

### 🧪 Test-Ausbau — und ein dabei gefundener Scoring-Bug

#### Behoben
- ⚠️ **`convertScoreToDarts` gab für 36 von 172 werfbaren Scores zu wenig zurück.**
  141 kam als 140 heraus, 146 als 140. Da `CONFIRM_THROW` den Wurf aus der
  Dart-Summe berechnet, **zog das Eintippen von 141 auf dem Numpad nur 140 ab**.
  Ursache: der Greedy-Aufbau verliert bei `Math.floor(x/3)` den Rest und kann
  drei Darts verbrauchen, während noch Punkte offen sind. Neu ist ein exakter
  Zerlegungs-Backstop, der nur einspringt, wenn die Greedy-Variante nicht
  aufgeht — die übrigen 136 Rekonstruktionen sind byte-identisch.

#### Hinzugefügt
- **+180 Tests** (512 → 692), Coverage 22 % → **24 %** Statements und
  69 % → **76 %** Branches. `src/utils/` von 55 % auf **75 %**.
- **Checkout-Tabelle als Property-Test**: jede der ~162 Routen muss exakt auf
  ihren Score summieren, auf einer Doppel enden und in drei Darts passen.
- **X01-Regelwerk** an den Kanten: Bust bei 1, bei Bogey-Zahlen, Double-Out,
  Bull als Doppel, Averages pro Dart statt pro Aufnahme.
- **Game-Reducer**: Zug-Ablauf, Dart-Limit, Undo über mehrere Aufnahmen,
  Bust-Behandlung, Leg- und Match-Abschluss.
- **Offline-Queue**: Retry-Politik (Aufgabe nach 5 Versuchen), TTL-Cache,
  Cache-Fallback bei Netzfehler.
- **Bot-Logik**: Monotonie der Level, gültige Darts über 35 000 Würfe,
  adaptive Level bleiben in ihrem Fenster.
- **Log-Ringpuffer**, **Theme-Wechsel**, **Debug-Export**, sowie die
  **Nutzungs-Aggregation gegen echtes SQLite** samt N+1-Wächter.

#### Geändert
- `collectUsageByUser` liegt jetzt in `server/src/services/usageStats.ts` —
  vorher steckte es in `routes/admin.ts` und war nicht testbar.
- Coverage-Schwellen in `vitest.config.ts` auf die neuen Werte angehoben.


### 📊 Admin: Nutzungs-Übersicht, Bug-Report-Zugang, Filter nach Nutzer

#### Hinzugefügt
- **Aktivitäts-Chart je Nutzer** im Admin Panel — 30-Tage-Balkendiagramm aus
  Matches **und** Trainings-Sessions, dazu die Gesamtzahl. Skaliert auf das
  eigene Maximum der Zeile: die Frage ist „wann war diese Person aktiv", nicht
  „wer ist am aktivsten". Ein ruhiger Tag bleibt als Grundstrich sichtbar.
  Screenreader bekommen die Zahlen im `<title>`, nicht nur ein Bild.
- **Spalte „Zuletzt aktiv"** — relative Angabe, eingefärbt nach Frische
  (grün ≤ 7 Tage, neutral ≤ 30, rot darüber), exaktes Datum im Tooltip.
- **Filter nach Nutzer** in den Tabellen für Bug Reports und Debug Flags.
- **`BugReportButton`** — der 🐞-Knopf unten links, für **jeden angemeldeten
  Nutzer**. Der admin-only Debug-Flag-Knopf sitzt daneben.
- **Tests**: +42 (470 → 512) für `utils/activity.ts`, `utils/reporters.ts` und
  `ActivitySparkline`.

#### Geändert
- `GET /api/admin/users` liefert zusätzlich `last_active`, `match_count`,
  `training_count`, `usage_count` und `activity` (30 Tageswerte, ältester
  zuerst). ⚠️ Zwei gruppierte Queries, **kein N+1** — die Tabelle wächst mit der
  Nutzerzahl.

#### Klarstellung
Bug-Reports standen **schon immer** jedem angemeldeten Nutzer offen
(`/api/bug-reports` trägt nur `authenticateToken`); admin-only sind die **Debug
Flags**. Gefehlt hat nicht die Berechtigung, sondern die Auffindbarkeit: der
Einstieg lag in einem zugeklappten Abschnitt der Einstellungen, während das
Debug-Flag einen Dauerknopf hatte. Beide sind jetzt gleichgestellt.

#### Behoben (Doku)
- Die englische README versprach „**Admin Rights** — Make other users
  administrators". Das geht seit der Allowlist nicht mehr und stand dort
  irreführend; ersetzt durch die tatsächliche Regel.
- Audio-Dateien standen mit „400+" in beiden READMEs — es sind 609.


### 🎨 Material 3 Expressive: eigenes Icon-Set, eigener Select, Spieler-Reihenfolge

Ersetzt die letzten beiden Stellen, an denen die Oberfläche **nicht** vom Design-System
gezeichnet wurde — Plattform-Emoji und das native `<select>` — und behebt eine Fokus-Regel,
die die Form jedes fokussierten Elements veränderte.

#### Hinzugefügt
- **Icon-Set** (`src/components/icons/`): 69 M3-Expressive-Glyphen. Die Geometrie wird von
  `tools/gen-icons.py` **gerechnet**, nicht getippt. `iconForEmoji()` bildet 427 Emoji auf
  Glyphen ab und gibt **nie** `undefined` zurück — genau diese Garantie erlaubt es den
  Aufrufstellen, ihr Emoji ersatzlos zu streichen.
- **`Select`** (`src/components/common/Select.tsx`): ersetzt alle 23 nativen `<select>`.
  Menü per Portal am `<body>` (z-60), generischer Werttyp, APG-Combobox-Tastatur inkl.
  Präfix-Sprung.
- **`AvatarPicker`**: kuratierte Icon-Auswahl statt der ~1900-Emoji-Palette.
- **`src/utils/playerOrder.ts`**: eine Sortierregel, einmal in `PlayerContext` angewandt.
- **Dokumentation**: neues [Design-System](docs/DESIGN_SYSTEM.md); `docsSync`-Testsuite,
  die Badges, Pfade, Links und Kommandos gegen den Code prüft.
- **Tests**: +160 (450 → 452 gesamt) — Icon-Set, `Select`, M3-Primitive, `gameStorage`,
  Heatmap-Mathematik, Spieler-Sortierung, Doku-Abgleich.
- **Coverage**: `@vitest/coverage-v8` ergänzt — `npm run coverage` war seit jeher
  dokumentiert, aber der Provider fehlte, das Kommando schlug immer fehl. Dazu Schwellen in
  `vitest.config.ts`, die Rückschritte scheitern lassen.

#### Geändert
- **Avatare** sind tonale Discs mit Icons. Gespeicherte Emoji-Avatare älterer Profile
  werden beim Rendern übersetzt — keine Migration, kein Datenverlust.
- **Achievement- und Bot-Daten** tragen Icon-Namen statt Emoji.
- **Bot-Namen** enthalten kein Emoji mehr. Vorher landete es im Namen und damit in der
  Datenbank, in der Match-Historie und in jedem Export.
- **Textfelder und Select-Trigger** stehen auf 12 px Radius statt der 4 px des
  M3-Standards — neben 16–28-px-Karten und Pill-Buttons las sich 4 px als Fremdkörper.
- **Spielerlisten** sortieren nach Konto-Typ, dann Anzahl Spiele, dann Name.

#### Behoben
- ⚠️ **Der geteilte Fokus-Ring trug `border-radius: inherit`.** Das rundet nicht die
  Kontur — es ersetzt den Radius des fokussierten **Elements** durch den seines Elternteils.
  Da `:focus-visible` als Klasse zählt, war die Regel `(0,1,0)` und gewann den Gleichstand
  gegen `.m3-button`/`.m3-text-field` über die Import-Reihenfolge. Gemessen: Pill-Button
  `9999px → 913px`, Textfeld `12px → 0px` beim Tastaturfokus.
- **Dreifacher Fokus-Ring** am Textfeld (Border + Inset-Shadow + globale Outline) ist jetzt
  **ein** Ring.
- **Typeahead-Anker** wurde bei starkem Neurendern schal — liegt jetzt im Ref.
- **Doku-Fehler**, gefunden von der neuen `docsSync`-Suite: englische README auf Version
  0.8.3 statt 0.8.5, deutsche Fußzeile auf 0.8.4, defektes Hero-Bild in der englischen
  README, Link auf ein nicht existierendes `PWA.md`, zwei tote Links in `ARCHITECTURE.md`,
  deutsche Absätze mitten in der englischen README, „20 Tests"/„294 Tests"-Angaben.


### 🎨 Material 3 Expressive Redesign

Komplette Umstellung der App auf **Material 3 Expressive** — neues Design-Token-Fundament + Primitiv-Bibliothek, alle ~60 Screens migriert.

- **Token-Layer** (`src/styles/m3.css`): vollständige M3-Farbrollen (primary / secondary / **tertiary** = vibrantes Lila als Akzent / error / success + Surface-Container-Stufen + on-colors + outline) für Dark- und Light-Schema, Shape-Scale, 5-stufige Elevation, Motion-Springs/Easing, State-Layer-Opacitäten und die M3-Type-Scale. Eingebunden über `ThemeManager` (Klasse auf `<html>`/`<body>`).
- **Tailwind-Tokens**: `bg-surface*`, `text-on-surface[-variant]`, `bg-*-container`/`text-on-*-container`, bare Roles (`bg-primary`/`bg-success`/`bg-tertiary`…), `border-outline[-variant]`, `rounded-m3-*`, `shadow-m3-1..5`. Type-Scale als CSS-Klassen (`m3-display/headline/title/body/label-*`). Inter-Font via Google Fonts geladen.
- **Primitiv-Bibliothek** (`src/components/common/`): `Button` (7 Varianten, Pill + Press-Shape-Morph + State-Layer), `IconButton`, `Fab`, `Card`, `TextField`, `Switch`, `Chip`, `Dialog`. `BackButton` auf M3 (tonal) umgestellt.
- **Motion** (`src/utils/motion.ts`): M3-Expressive Spring-Configs für framer-motion (Overshoot/Bounce) + Presets (`enterRise`, `staggerChild`, `pressable`, `dialogMotion`).
- **App-Shell-Fix**: Root-Wrapper nutzte ein `dark:`-Gradient, aber das Theme-System setzt `.modern` (nie `.dark`) — alle `dark:`-Varianten waren wirkungslos. Shell jetzt token-basiert (`bg-surface`), `html`/`#root` ebenfalls token-getönt (kein weißer Rand mehr unter Vollbild-Screens).
- Reine Präsentations-Migration: keine Logik-/Handler-/Reducer-Änderungen. Bundle bleibt auf Baseline (~147 KB gz), 294 Tests grün. Game-Logik (Bot-Refs, Undo-Timer, Dispatch-Reihenfolge, Navigation) byte-identisch.

### ✨ Material 3 Expressive Motion (Animationen)

App-weiter Animations-Pass auf Basis des Motion-Systems (`src/utils/motion.ts`). Alles rein präsentational, Bundle weiter auf Baseline (~147 KB gz), 294 Tests grün.

- **Global**: `<MotionConfig reducedMotion="user">` (`App.tsx`) → **jede** framer-motion-Animation respektiert `prefers-reduced-motion`.
- **`AnimatedNumber`** (neues Primitiv): überdämpfte Spring-Zahl-Transition (kein Overshoot/Jitter), reduced-motion-aware — „tallyt" zum neuen Wert.
- **Schnelles Match**: Darts poppen mit Spring in ihre Slots; Numpad-Tasten mit Tap-Feedback (active-scale); Restscore via `AnimatedNumber`; aktiver Spieler federt mit Expressive-Spatial-Spring (statt flachem Tween); Setup-Spielerkarten federn bei Hover/Tap; Winner-Screen (Gold-Panel-Entrance, Trophäen-Pop mit Rotation, gestaffelte Stat-Karten); CheckoutSuggestion gleitet/faded rein.
- **Dashboard**: KPI-Zahlen zählen beim Laden hoch (async) + gestaffelte Karten-Entrance.
- **Listen/Grids**: gestaffelte Entrance auf Achievements, Leaderboard, Global-Leaderboard, Spielerverwaltung, Statistiken, Training-Stats, Match-Historie, Turniere. Große Listen mit gedeckeltem Stagger-Delay (`Math.min(index, 10–12)`).

### 🐞 Fixes (Redesign-Nacharbeiten)

- **State-Layer vs. absolute Kinder**: `.m3-state-layer > * { position: relative }` überschrieb (gleiche Spezifität, später geladen) Tailwinds `.absolute` → absolut positionierte Kinder (z. B. das MainMenu „10"-Badge auf der *Spiel-fortsetzen*-Kachel) wurden zu `position: relative` + `flex` und zogen sich auf volle Breite. Fix: Selektor in `:where(.m3-state-layer) > *` gewrappt (Spezifität 0) → Positions-Utilities am Kind gewinnen, statischer Content wird weiterhin über das Overlay gehoben. Global für alle Karten/Buttons/Chips.
- **Zurück-Button-Abstand vereinheitlicht**: `BackButton` umschließt sich im Block-Modus (Default) mit `mb-6`, sodass der Abstand zur Überschrift auf allen Screens gleich ist; Flex-Header-Zeilen nutzen den neuen `inline`-Prop (kein Wrapper, Abstand kommt von der Zeile). Vorher: Standalone-Buttons ohne Abstand, Header-Zeilen mit `mb-6` → inkonsistent.

### 🐛 Bugfixes (Code-Review)

Echte Bugs aus einem Code-Review behoben (Stabilität, Scoring, Sync). Build auf Baseline (~148 KB gz), 294 Tests grün, Frontend- + Server-tsc sauber.

- **Error Boundary**: Top-Level-`ErrorBoundary` umschließt `<App>` (`main.tsx`). Vorher führte jeder Render-Fehler (kaputtes `JSON.parse` bei Match-Reconstruction, fehlgeschlagener Lazy-Chunk) zum **Weißen Bildschirm** ohne Recovery — jetzt M3-Recovery-Screen mit Neu-laden/Hauptmenü.
- **Session-Ablauf**: `apiClient` hängt jetzt den HTTP-`status` an geworfene Errors und feuert bei **401 auf authentifizierte Requests** ein globales `auth:unauthorized`-Event → `AuthContext` loggt aus + leitet zum Login. Vorher konnte das Token mitten in der Session ablaufen und **alle** Schreibvorgänge schlugen still fehl.
- **GameContext 409-Erkennung war tot**: prüfte das nicht existierende `.response.status` → griff nie. Liest jetzt `err.status` → kein POST-Thrash mehr beim Match-Anlegen.
- **ScoreInput Keyboard-Stale-Closure**: `editingDartIndex` fehlte in den Effect-Deps → Keyboard-Enter im Edit-Modus konnte den falschen Zweig treffen. Dep ergänzt.
- **ATC/Shanghai Undo**: `restoringRef` blieb auf `true` hängen, wenn eine Runde mit < 3 Darts wiederhergestellt wurde → der nächste echte 3-Dart-Wurf wurde nicht auto-bestätigt. Flag wird jetzt nur bei vollem 3-Dart-Restore gesetzt.
- **Bot-Bust-Logik**: berücksichtigt jetzt auch Bogey-Zahlen (169/168/166/165/163/162/159) wie `isBust()` → Bot stellt sich nicht mehr auf einen unmöglichen Finish, den das Spiel dann als Bust voidet.
- **Heatmap-Streuung deterministisch**: `Math.random()` in einem `useMemo` (unrein) ließ die Punkte bei jedem Re-Render neu „springen" → jetzt seed-basierter PRNG (`segment+multiplier+i`).
- **Achievement-Zeitstempel** (Server): Unlock-Upsert nutzt `ON CONFLICT … COALESCE(unlocked_at, …)` statt `INSERT OR REPLACE` → der ursprüngliche `unlocked_at` wird beim Re-Sync nicht mehr auf „jetzt" überschrieben. *(Server-Change — geht erst mit dem nächsten Server-Deploy live.)*

**Bewusst aufgeschoben (kein Crash-Bug):** Offline-Schreibqueue ist toter Code (Banner „lokal gespeichert" stimmt nicht — Feature-/UX-Entscheidung); Set-Modus ist latent kaputt (kein UI, `setsToWin` hart auf 1).

### 🔊 Audio

#### Leg/Match-Ansage war pseudo-"global gezählt"
- `audioSystem.announceCheckout` bekam bisher den **Checkout-Score** als ersten Parameter und spielte daraus `gameshot/legs/{N}.mp3` ab — diese Dateien sagen aber "and the **Nth** leg", nicht den Score. Resultat: 100-Checkout → "and the **100th** leg".
- Parameter umbenannt zu `legOrSetNumber`. `GameContext` übergibt jetzt die Leg-Sequenz innerhalb des aktuellen Matches (`updatedMatch.legs.length`) bzw. die Set-Sequenz.
- Für `'match'` wird die Nummer komplett ignoriert — nur `texts/gameshotandthematch.mp3` läuft (vorher zusätzlich ein redundantes `gameshot.mp3`).
- Fallback: fehlt `legs/{N}.mp3` (z. B. N > 30), läuft die generische `texts/gameshot.mp3`.

#### Bust mit Score-Ansage
- `announceBust(thrownScore?)`: spielt jetzt zuerst die geworfene Summe (`caller/{N}.mp3`) und dann `caller/0.mp3` ("No score"). Vorher war der Wurfwert auf Bust akustisch verschluckt.

### 🎯 X01-Eingabe

#### Numpad Enter = Wurf bestätigen
- Im Numpad-Modus: Zahl tippen + Enter füllt die Dart-Slots **und** commitet den Wurf in einem Schritt. Vorher: Enter + extra OK-Klick.
- Edit-Modus (Slot anklicken) bleibt unverändert — Enter heisst dort "Set" und ersetzt nur den ausgewählten Dart.
- Race-Sicher implementiert via `pendingConfirm`-State + `useEffect` auf `currentThrow.length` (kein `setTimeout(0)`-Hack).

#### ScoreInput über dem Dartboard
- Numpad-Eingabe steht jetzt zuoberst in der Mittel-Spalte. Dartboard-Helper rutscht unter Checkout-Suggestion.

### 🌐 Infrastruktur

#### nginx-Cache-Header für stateofthedart.com
- Bisherige Config hatte 3 widersprüchliche `Cache-Control`-Header für JS/CSS und gar keinen für `index.html` → Browser cachte HTML mit alten Asset-Hashes → 404s auf gelöschte Chunks nach Deploy.
- Neue Regel:
  - `/assets/*` (hashed) → `public, max-age=31536000, immutable`
  - `/index.html` und `/` → `no-cache, no-store, must-revalidate`
  - `/sw.js` und `workbox-*.js` → `no-cache`
- Damit holt der Browser nach jedem Deploy frisches HTML mit korrekten Asset-Refs.

### ⚡ Performance

#### Initial Bundle (gz): 198 KB → 147 KB (-26 %)
- `xlsx`, `jspdf`, `jspdf-autotable` werden dynamisch geladen — Settings + StatsOverview ziehen nicht mehr 688 KB transitiv
- `html2canvas` (71 KB gz) jetzt on-demand beim Bug-Report / Debug-Flag
- `canvas-confetti` zentralisiert in `src/utils/celebration.ts` (lazy)
- `react-confetti` via `React.lazy` + `<Suspense>` (lädt nur beim Sieg)

#### Recharts on-Demand
- `GameScreen` lädt **108 KB gz Recharts nicht mehr eager** — Chart erscheint erst beim Toggle "Wurf-Statistik" via neues `ThrowChart.tsx`
- `MatchHistoryPage`: gleiches Pattern via `MatchChart.tsx`, Chunk -45 % (27.4 → 14.95 KB)

#### PWA Precache: 33 MB → 3.7 MB (-89 %)
- `.mp3` aus `globPatterns` entfernt — Audio läuft weiter über `runtimeCaching` (CacheFirst, 30 Tage)

#### React-Memo-Pässe
- `Dartboard`, `PlayerScore` mit `React.memo`
- `GameScreen` Handler (`handleDartHit`, `handleRemoveDart`, `handleClearThrow`) mit `useCallback`
- `dartboardHighlights` als stabile `useMemo`-Referenz
- `AchievementsScreen`: inline `renderAchievementCard` → `React.memo`'d `AchievementCard` (463 Karten skippen Re-Render bei stabilen Props)

### 🧪 Testing

#### Playwright E2E Framework (`e2e/`)
- 10 Tests / ~26 s end-to-end gegen `vite preview` + isoliertes Backend (`server/data/e2e-test.db`)
- `global-setup` rebuildet Frontend mit `VITE_API_URL=http://localhost:3001` und seedet Test-User + Tenant
- Workers serial, Service Worker geblockt (verfälscht Network-Assertions)
- CI-Workflow `.github/workflows/e2e.yml` mit HTML-Report-Artifact (7 Tage)
- Regression-Guards: Asset-Count-Limit + No-Heavy-Chunks-Eager schützen die Bundle-Wins

### 🔧 Geändert
- Vitest excludiert `e2e/**` (Playwright owns es)
- `npm run test:e2e` / `:ui` / `:report` Scripts hinzugefügt
- `ANALYZE=true npm run build` emittet `dist/bundle-stats.html` (`rollup-plugin-visualizer`)
- `server/dist/` aus Git entfernt (Build-Artefakte gehören nicht ins Repo)
- Achievement-Count-Test korrigiert (463 statt 464)

### 🎨 UI-Konsistenz

#### `<BackButton>` Component (`src/components/common/BackButton.tsx`)
- 29 inline `<button>+<ArrowLeft>+t('common.back')` Blöcke ersetzt durch einheitliche Komponente
- Single Source of Truth für den Style — keine zukünftige Drift mehr möglich
- Props: `onClick`, optional `label` (default: `t('common.back')`), `inline` für zentrierte Layouts
- 2 OnlineMultiplayer-Outlier (`text-gray-400`-Style statt glass-card) auf Konvention korrigiert
- Netto: 29 Dateien, **+120 / -247 Zeilen** (Deduplizierung)
- Ausnahme: ATC/Shanghai/Cricket In-Game-Back-Buttons (`px-3 py-2`) bleiben inline — bewusst kompakter

#### Token-Normalisierung `green-*` → `success-*`
- `PlayerScore` active ring: `ring-green-500` → `ring-success-500`
- ATC Hit-Indicator + Completed-Slot-Badge: `green-500/*` → `success-500/*`
- Status-Badges ("resolved") bleiben raw green — semantisch korrekt

## [0.3.1] - 2026-02-01

### 🐛 Behoben

#### Navigation "Zurück zum Hauptmenü" aus laufendem Spiel
- **Weißer Bildschirm beim Pausieren** - ERR_INSUFFICIENT_RESOURCES behoben
  - Problem: `window.location.href` verursachte vollständigen Page-Reload
  - Alle Lazy-Loaded Chunks wurden gleichzeitig geladen → Browser-Ressourcen erschöpft
  - Lösung: Verwendung von `window.location.href = '/'` mit deaktiviertem Rate-Limiting
  - Debug-Logs hinzugefügt für Troubleshooting

#### Infinite Loop in AchievementContext
- **Hunderte API-Requests pro Sekunde** - Race Condition behoben
  - Problem: `loadedPlayers` State wurde async aktualisiert
  - Mehrere API-Calls starteten bevor der erste fertig war
  - Lösung: Verwendung von `useRef` statt `useState` für Loading-Tracking
  - Refs werden synchron aktualisiert → keine Race Conditions mehr

#### Rate Limiter Skip-Logik
- **Auth-Routes wurden nicht übersprungen** - Pfad-Prüfung korrigiert
  - Problem: Skip-Funktion prüfte `/api/auth/` statt `/auth/`
  - Bei Mount auf `/api/` ist `req.path` relativ (z.B. `/auth/me`)
  - Lösung: Prüfung auf `/auth/` und `/matches` für relative Pfade

#### Rate Limiter temporär deaktiviert
- **429 Too Many Requests** verhinderte normale App-Nutzung
  - Rate Limiter komplett deaktiviert für Debugging
  - Nginx Rate-Limiting kann bei Bedarf aktiviert werden
  - TODO: Re-enable mit besserer Konfiguration

### 🔧 Geändert

#### AuthContext
- **Kein Logout mehr bei 429 Errors** - Nur bei echten Auth-Fehlern (401, 403)
  - Rate-Limit oder Netzwerk-Fehler entfernen Token nicht mehr
  - Bessere Fehlerbehandlung mit Status-Code-Prüfung

#### GameContext
- **Verhindert doppelte Match-Save-Requests** beim Pausieren
  - `matchSavingRef` verhindert parallele Speicher-Operationen
  - Besseres Error-Handling für 429-Responses

## [0.3.0] - 2026-02-01

### ✨ Neue Features

#### 🕐 Around the Clock Spielmodus
- Triff Zahlen 1-20 der Reihe nach
- Optional mit Bull (25) als Finale
- Konfigurierbare Optionen:
  - Doubles erlaubt
  - Triples erlaubt
  - Bull ein/ausschließen
- Live-Timer und Dart-Zähler
- Fortschrittsanzeige mit farbigen Markern
- Mehrspieler-Unterstützung (1-4 Spieler)

#### ⚡ Shanghai Spielmodus
- Bonus-Runden-basierter Spielmodus
- Jede Runde zielt auf eine bestimmte Zahl (z.B. 1-7, 1-20)
- Punktesystem:
  - Single = Zahl × 1
  - Double = Zahl × 2
  - Triple = Zahl × 3
- **SHANGHAI** (Single + Double + Triple derselben Zahl) = Sofortiger Sieg!
- Konfigurierbare Startnummer (1, 5, 10, 15)
- Konfigurierbare Rundenanzahl (5, 7, 10, 15, 20)
- Live-Rangliste mit Medaillen

#### 🌐 Online Multiplayer
- WebSocket-basierte Echtzeit-Kommunikation (Socket.IO)
- Lobby-System:
  - Räume erstellen (öffentlich/privat)
  - Räume beitreten
  - Spielerliste in Echtzeit
- Raum-Einstellungen:
  - Startscore (301, 501, 701)
  - Legs zum Gewinnen
  - Privat/Öffentlich
- In-Game Features:
  - Live-Chat
  - Echtzeit-Spielstand
  - Host-Kontrolle
- Bis zu 4 Spieler pro Raum

#### 🤖 Verbesserte Bot-KI
- Neue Bot-Persönlichkeiten:
  - 🔥 Aggressiv - Hohes Risiko, hohe Belohnung
  - 🛡️ Defensiv - Konsistente Punktzahl
  - ⚖️ Ausgewogen - Allrounder
  - 💎 Nervenstark - Beste Leistung unter Druck
- Persönlichkeits-Modifikatoren:
  - Triple-Bonus
  - Checkout-Bonus
  - Druck-Modifikator
  - Konsistenz-Varianz

### 🔧 Technische Änderungen
- Socket.IO Integration im Backend
- Neuer WebSocket-Port für Echtzeit-Kommunikation
- Bot-Logik mit Spielstilen erweitert

### 📦 Neue Abhängigkeiten
- `socket.io` (Backend)
- `socket.io-client` (Frontend)

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
