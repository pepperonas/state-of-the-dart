# 🎨 Design-System

> Material 3 Expressive — Tokens, Primitive, Icons und die Regeln, die sie zusammenhalten.
>
> [← Zurück zur README](../README.md) · [Architektur](ARCHITECTURE.md)

---

## 📋 Inhaltsverzeichnis

1. [Token-Layer](#-token-layer)
2. [Primitiv-Bibliothek](#-primitiv-bibliothek)
3. [Das Icon-Set](#-das-icon-set)
4. [Select — der einzige Dropdown](#-select--der-einzige-dropdown)
5. [Seitenrahmen: PageShell](#-seitenrahmen-pageshell)
6. [Motion](#-motion)
7. [Spezifitäts-Fallen](#️-spezifitäts-fallen)
8. [Was Tests festnageln](#-was-tests-festnageln)

---

## 🎯 Token-Layer

`src/styles/m3.css` ist die **einzige Quelle** für Farbe und Form: vollständige M3-Farbrollen
(primary / secondary / **tertiary** = vibrantes Lila als Akzent / error / success), die
Surface-Container-Stufen, on-colors, outline, Shape-Scale, fünfstufige Elevation,
State-Layer-Opacitäten und die Type-Scale — je einmal für Dark (`:root` / `.modern`) und
Light (`.modern-light`). `ThemeManager` setzt die Klasse auf `<html>` **und** `<body>`.

Eingebunden wird die Datei in `main.tsx` **nach** `index.css`, damit Komponenten-Selektoren
Gleichstände gegen die alte `.modern-light`-Ebene gewinnen.

**Tailwind-Utilities** sind token-gedeckt und damit theme-fähig:
`bg-surface[-container[-low|-high|-highest]]`, `text-on-surface[-variant]`,
`bg-{primary|secondary|tertiary|success|error}-container` + `text-on-*-container`,
`border-outline[-variant]`, `rounded-m3-{xs|sm|md|lg|xl|2xl|full}`, `shadow-m3-{1..5}`.

> ⚠️ Die **Type-Scale** (`m3-display-*`, `m3-headline-*`, `m3-title-*`, `m3-body-*`,
> `m3-label-*`) sind **normale CSS-Klassen**, keine Tailwind-Utilities. Responsive Präfixe
> wie `md:m3-title-large` funktionieren deshalb **nicht**.

### Shape-Scale

| Token | Wert | Verwendung |
|---|---|---|
| `--m3-shape-xs` | 4 px | (nicht mehr verwendet — zu hart für diese App) |
| `--m3-shape-sm` | 8 px | Menü-Einträge |
| `--m3-shape-md` | 12 px | **Textfelder, Select-Trigger, Menüs** |
| `--m3-shape-lg` | 16 px | Karten |
| `--m3-shape-xl` | 28 px | Dialoge, große Karten |
| `--m3-shape-full` | ∞ | Buttons, Chips |

> ⚠️ Eingaben stehen bewusst auf **12 px**, nicht auf den 4 px des M3-Standards. Diese App
> ist M3 *Expressive*: neben 16–28-px-Karten und Pill-Buttons las sich ein 4-px-Feld als
> hart eingesetzter Fremdkörper.

---

## 🧩 Primitiv-Bibliothek

`src/components/common/` — Barrel: `src/components/common/index.ts`.
**Diese Primitive haben Vorrang vor selbstgebautem Markup.** Jedes trägt einen
M3-State-Layer (`.m3-state-layer`) und Token-Farben.

| Komponente | Kurzbeschreibung |
|---|---|
| `Button` | `variant`: `filled\|tonal\|accent\|elevated\|outlined\|text\|danger\|success`, `size`, `fullWidth`, `icon`, `loading`. Pille, Ecken-Morph beim Druck. |
| `IconButton` | `variant`: `standard\|filled\|tonal\|outlined`. **`label` ist Pflicht** (a11y). |
| `Fab` | Regulärer/erweiterter FAB (`icon`, `label?`, `color`, `size`). |
| `Card` | `variant`: `filled\|elevated\|outlined`, `interactive` für Hover/Press. |
| `TextField` | Outlined-Feld mit `label`, führendem `icon`, `error`. |
| `Switch` | `role="switch"`-Button (**kein** `<input type=checkbox>`) — Zustand über `aria-checked`. |
| `Chip` | Filter-/Assist-Chip (`selected`, `icon`). |
| `Dialog` | Scrim + Spring-Container. Schließt auf Scrim-Klick und Escape. |
| `Select` | **Der einzige Dropdown der App** → [eigener Abschnitt](#-select--der-einzige-dropdown). |
| `BackButton` | Kanonischer Zurück-Button. `inline` für Header-Zeilen. |
| `PageShell` | Seitenrahmen → [eigener Abschnitt](#-seitenrahmen-pageshell). |
| `AnimatedNumber` | Überdämpfte Spring-Zahl, reduced-motion-fähig. |
| `ErrorBoundary` | Fängt Render-Fehler; die globalen `window.error`-Handler tun das **nicht**. |

---

## ✨ Das Icon-Set

`src/components/icons/` — **die App rendert keine Emoji.**

```tsx
import { Icon, iconForEmoji } from '../icons';

<Icon name="trophy" size={24} />
<Icon name={iconForEmoji(player.avatar)} size={26} />
<Icon name="warning" size={20} label="Warnung" />   {/* mit Label = für Screenreader sichtbar */}
```

### Warum kein Emoji

Ein Emoji ist eine **Schriftart**, keine Grafik:

- Dieselbe Glyphe ist Apples glänzendes 3-D auf dem iPhone, Googles flache Formen auf dem
  Tablet und eine monochrome Kontur unter Windows — **derselbe Spieler sah auf drei Geräten
  anders aus**.
- Emoji ignorieren `currentColor` und folgten damit **nie** dem Hell-/Dunkel-Theme.
- Sie lassen sich nicht auf ein 24-px-Raster ausrichten.

Vorher standen ~250 verschiedene Emoji in der Oberfläche, in den 463 Achievements und in
einer Avatar-Palette mit ~1900 Einträgen.

### Aufbau

| Datei | Inhalt |
|---|---|
| `paths.ts` | 69 Glyphen als Pfaddaten + `IconName`-Union |
| `Icon.tsx` | Renderer: 24×24-Viewbox, `currentColor`, `fill-rule="evenodd"` |
| `emojiMap.ts` | `iconForEmoji()` — 427 Emoji → Icon-Namen, plus Fallback-Heuristik |
| `index.ts` | Barrel |
| `../../tools/gen-icons.py` | **Der Generator** |

> ⚠️ **Die Geometrie wird gerechnet, nicht getippt.** Kreise sind wirklich rund, Polygone
> trigonometrisch, Radien konsistent. Handgeschriebene Bezier-Daten sind nicht
> reviewbar und driften. **Wer eine Glyphe ändern will, ändert den Generator** und lässt
> ihn neu laufen:
>
> ```bash
> python3 tools/gen-icons.py   # schreibt die Geometrie neu
> ```

### `iconForEmoji()` schlägt nie fehl

Die Funktion gibt **niemals** `undefined` zurück:

1. Ist der Wert bereits ein Icon-Name → unverändert zurück (Datendateien dürfen beide Formen tragen).
2. Variationsselektoren und Hauttöne werden entfernt, dann in der Tabelle nachgeschlagen.
3. Bei ZWJ-Sequenzen zählt die erste Glyphe.
4. Sonst entscheidet der Unicode-Block (Flaggen → `flag`, Gesichter → `user`, Tiere → `sprout`, …).
5. Zuletzt `target`, das Wahrzeichen der App.

**Genau diese Garantie** erlaubt es den Aufrufstellen, ihr Emoji ersatzlos zu streichen.
Ohne sie müsste jede Stelle ein Emoji als Rückfallebene behalten — und damit wäre die
Plattform-Glyphe wieder auf dem Schirm.

### Wo Icon-Namen in den Daten stehen

`achievements.ts` (463 Einträge), `botLogic.ts` und die Avatar-Paletten tragen **Namen**.
**Gespeicherte Nutzer-Avatare dürfen weiterhin Emoji sein** — ältere Profile werden beim
Rendern übersetzt, es geht nichts verloren.

### ⚠️ Fallen

**Löcher sind echte Löcher** (`fill-rule="evenodd"`), nie eine in der Hintergrundfarbe
übermalte Form — das funktioniert nur auf einem der beiden Themes.

Aber evenodd schneidet in beide Richtungen: **zwei sich überlappende Formen ergeben ein
Loch, keine Vereinigung.** Genau daran sind `hash`, `globe` und `board` zuerst als
Schachbrettmuster gerendert. Formen, die sich vereinigen sollen, dürfen sich **nicht**
überlappen; nur Ring-und-Loch-Konstruktionen dürfen das.

**Canvas:** `SpinnerWheel` zeichnet auf ein `<canvas>`, wo kein React-`<svg>` hingeht — es
schiebt dieselben Pfaddaten durch `new Path2D(...)` und zeigt damit exakt dieselbe Glyphe.

---

## 🔽 `Select` — der einzige Dropdown

```tsx
<Select<number>
  value={itemsPerPage}
  onChange={(n) => setItemsPerPage(n)}
  options={[10, 20, 50].map((n) => ({ value: n, label: String(n) }))}
  size="sm"
  inline
  aria-label="Einträge pro Seite"
/>
```

**Natives `<select>` ist verboten** — ein Consistency-Test lässt den Build scheitern, wenn
eines zurückkehrt.

### Warum

Der native Popup wird vom **Betriebssystem** gezeichnet. Er ignorierte damit jedes Token,
blieb plattformgrau in Plattform-Schriftgröße, war im hellen Theme nur mit einem eigenen
`select option`-Override lesbar und konnte weder Avatar noch farbige Status-Pille tragen.

### Zwei tragende Entscheidungen

**1. Das Menü hängt per Portal am `<body>` (z-60).** Es muss dort hängen: die
Admin-Status-Wähler sitzen in `overflow-x-auto`-Tabellen, mehrere Selects sitzen in
`Dialog`, dessen Scrim ein eigener Stacking-Context ist. Inline gerendert würde die Liste
abgeschnitten oder unter dem Dialog gemalt — die beiden Stellen, denen der native Popup
immer entkommen ist. Daher `position: fixed` plus Messung statt `absolute`.

**2. `value` ist generisch, kein String.** Das native Element stringifiziert alles, weshalb
die Aufrufstellen `parseInt(e.target.value)` brauchten — ein stilles `NaN` in Wartestellung.
`onChange` gibt den Wert im Originaltyp zurück.

### Tastatur (APG-Combobox)

| Taste | Wirkung |
|---|---|
| `↓` `↑` `Enter` `Space` | Öffnen |
| `↓` `↑` | Aktive Zeile bewegen (übersprungene `disabled`-Einträge) |
| `Home` `End` | An den Anfang/das Ende |
| `Enter` `Space` | Übernehmen |
| `Escape` | Schließen **ohne** zu übernehmen |
| `Tab` | Verlassen — heißt „weg", nicht „auswählen" |
| Buchstaben | Präfix-Sprung; nach Ablauf des Puffers springt derselbe Buchstabe weiter |

Der Fokus bleibt am Trigger, die aktive Zeile wird über `aria-activedescendant` benannt.

---

## 📄 Seitenrahmen: `PageShell`

Ein Screen sagt, **was** er ist — nicht, wie breit er sein soll.

```tsx
<PageShell title="Spieler" width="md" onBack={() => navigate('/')}>…</PageShell>
```

| Stufe | Breite | Verwendung |
|---|---|---|
| `sm` | 672 px | Formulare, einspaltige Dialog-Seiten |
| `md` | 896 px | Standard für Inhaltsseiten |
| `lg` | 1152 px | Karten-Raster, Übersichten |
| `xl` | 1280 px | Breite Tabellen, das Spielbrett |

Der Titel ist **immer** `m3-headline-medium` — die Ebene, auf die 14 von 27 Screens schon
konvergiert waren. Das Audit davor fand acht verschiedene Container-Breiten, vier
Titel-Ebenen und sieben Screens ganz ohne Rückweg.

---

## 🎬 Motion

`src/styles/motion.css` ist die einzige Quelle für **Bewegung**, so wie `m3.css` die für
Farbe und Form ist. `src/utils/motion.ts` liefert die framer-motion-Springs.

Regeln, an die sich Ergänzungen halten müssen:

- Nur `transform` und `opacity` animieren — nie `width`/`height`/`top`/`left` in einer Schleife.
- Entrance-Animationen nutzen `animation-fill-mode: backwards`, **nie** `both`. `backwards`
  hält den Startframe während der Verzögerung und gibt das Element danach zurück — so kann
  nichts unsichtbar oder unklickbar hängenbleiben.
- Jede Animation ist über ein Token erreichbar. Keine magischen Zahlen.
- Die App ist in `<MotionConfig reducedMotion="user">` gewickelt: **jede** framer-Animation
  respektiert `prefers-reduced-motion` automatisch.

---

## ⚠️ Spezifitäts-Fallen

Diese drei haben jeweils echte Fehler verursacht. Sie stehen hier, damit sie nicht
wiederkehren.

### 1. `:where(x):hover` ist **nicht** spezifitätsfrei

`:where()` trägt null Spezifität — aber der **Zustand außerhalb** zählt. `:where(.x):hover`
ist `(0,1,0)` und schlägt damit die Utility-Klasse eines Aufrufers. Der Zustand muss
**hinein**: `:where(.x:hover)`.

### 2. Zero-Specificity verliert gegen Tailwinds Preflight

`:where(.m3-select-trigger)` ist `(0,0,0)` und verliert gegen Tailwinds
`button { background-color: transparent }` bei `(0,0,1)` — der Trigger hatte **gar keinen
Hintergrund**. Die Lösung führt mit dem Element: `button:where(.m3-select-trigger)` ist
`(0,0,1)`, schlägt Preflight über die Reihenfolge (diese Datei wird nach Tailwind geladen)
und verliert weiterhin gegen ein `.bg-error-container` des Aufrufers bei `(0,1,0)` — was
genau der Zweck ist (die farbigen Admin-Status-Pillen behalten ihre Farbe).

### 3. `border-radius: inherit` in einem Fokus-Ring rundet nicht die Kontur

Es ersetzt den Radius des **fokussierten Elements** durch den seines Elternteils. Weil
`:focus-visible` als Klasse zählt, war die Regel `(0,1,0)` — Gleichstand mit `.m3-button`
und `.m3-text-field`, entschieden über die Import-Reihenfolge. Gemessen: ein Pill-Button
ging beim Tastaturfokus von `9999px` auf `913px`, ein Textfeld von `12px` auf `0px`.
Moderne Browser zeichnen die Kontur ohnehin entlang der eigenen Ecken — dort gehört
**kein** `border-radius` hin.

---

## 🧪 Was Tests festnageln

| Suite | Sichert |
|---|---|
| `src/tests/icons/iconSet.test.tsx` | Pfad-Validität, `currentColor`, keine `id`s, echte Löcher, `iconForEmoji` löst immer auf, jedes Achievement nennt ein existierendes Icon — **und ein Scan, der rot wird, sobald ein Emoji in gerenderten Code zurückkehrt** |
| `src/tests/components/Select.test.tsx` | Tastatur, Portal, Typeahead, Platzhalter-Verhalten |
| `src/tests/components/primitives.test.tsx` | Contract jedes Primitivs (Varianten, `disabled`, a11y-Namen) |
| `src/tests/consistency/pageConsistency.test.ts` | Seitenbreiten, Titel-Ebene, kein natives `<select>`, die drei Spezifitäts-Regeln oben |
| `src/tests/docs/docsSync.test.ts` | Dass **diese** Dokumentation nicht driftet |

```bash
npm run test:run -- src/tests/icons src/tests/consistency src/tests/docs
```
