# Charts & Visualizations Documentation

**State of the Dart** bietet umfassende Statistiken mit vielen schönen und aussagekräftigen Charts zur Analyse deiner Dart-Performance.

## 📊 Übersicht der Charts

### Im "Übersicht" Tab

#### 1. ⭐ Performance-Profil (Radar Chart)
**Typ**: Radar/Spider Chart  
**Zweck**: Zeigt dein gesamtes Leistungsprofil auf einen Blick

**Metriken:**
- **Average** - Dein durchschnittlicher Score pro 3 Darts
- **Checkout %** - Deine Erfolgsquote beim Auschecken
- **180s** - Anzahl der maximalen Scores
- **Win Rate** - Deine Siegquote
- **Erfahrung** - Anzahl gespielter Matches

**Visualisierung:**
- 5-eckiges Radar-Diagramm
- Blaue Füllung mit halbtransparenter Fläche
- Alle Werte normalisiert auf 0-100%
- Tooltips zeigen genaue Werte

**Nutzen:**
- Schneller Überblick über Stärken und Schwächen
- Identifiziere Bereiche für Verbesserungen
- Vergleiche dich mit deinem Idealziel

---

#### 2. 🏆 Sieg-Statistik (Pie Chart)
**Typ**: Kreisdiagramm  
**Zweck**: Visualisiert deine Win/Loss-Rate

**Segmente:**
- **Gewonnen** (Grün) - Anzahl gewonnener Matches
- **Verloren** (Rot) - Anzahl verlorener Matches

**Features:**
- Prozentuale Anzeige auf jedem Segment
- Farbcodierung: Grün für Siege, Rot für Niederlagen
- Tooltips mit genauen Zahlen

**Nutzen:**
- Sofortige Erfolgskontrolle
- Motivierende Visualisierung deiner Siege
- Einfach verständliche Darstellung

---

#### 3. 🎯 Score-Verteilung (Horizontal Bar Chart)
**Typ**: Horizontales Balkendiagramm  
**Zweck**: Zeigt die Verteilung deiner hohen Scores

**Kategorien:**
- **180s** (Rot) - Maximale Scores
- **140-179** (Orange) - Sehr hohe Scores
- **100-139** (Gelb) - Hohe Scores
- **60-99** (Grün) - Gute Scores

**Features:**
- Farbverlauf von Rot (höchste) bis Grün
- Anzahl der Scores pro Kategorie
- Tooltips mit Details

**Nutzen:**
- Erkenne deine Score-Stärken
- Siehe Fortschritt in höheren Score-Bereichen
- Identifiziere Konsistenz

---

#### 4. 📊 Monatliche Entwicklung (Composed Chart)
**Typ**: Kombiniertes Flächen- und Liniendiagramm  
**Zweck**: Zeigt deine Performance über Monate hinweg

**Metriken:**
- **Durchschnitt** (Blaue Fläche, linke Y-Achse) - Average pro Monat
- **Win Rate %** (Grüne Linie, rechte Y-Achse) - Siegquote pro Monat

**Features:**
- Zwei Y-Achsen für verschiedene Skalen
- Halbtransparente Flächenfüllung für Average
- Deutliche Linie für Win Rate
- X-Achse zeigt Monate (Jahr Monat)

**Nutzen:**
- Langfristige Trends erkennen
- Saisonale Schwankungen identifizieren
- Korrelation zwischen Average und Erfolg sehen

---

### Im "Fortschritt" Tab

#### 5. 📈 Average-Entwicklung (Line Chart)
**Typ**: Liniendiagramm  
**Zweck**: Zeigt die Entwicklung deines Durchschnitts über alle Matches

**Features:**
- Chronologische Sortierung nach Datum
- Punkte für jedes Match
- Glatte Linie mit Interpolation
- X-Achse: Datum (Tag. Monat)
- Y-Achse: Average-Wert

**Farben:**
- Primär-Blau (#0ea5e9) für die Linie
- Punkte hervorgehoben bei Hover

**Nutzen:**
- Sieh deine Verbesserung über Zeit
- Erkenne Trends und Plateaus
- Identifiziere beste und schlechteste Phasen

---

#### 6. 🎯 Checkout-Quote (Line Chart)
**Typ**: Liniendiagramm  
**Zweck**: Visualisiert deine Checkout-Erfolgsrate über Zeit

**Features:**
- Werte von 0-100%
- Grüne Linie (#22c55e)
- Prozentuale Tooltips
- Match-für-Match Verlauf

**Nutzen:**
- Überwache Checkout-Verbesserung
- Erkenne Schwankungen
- Setze dir Ziele für Checkout-Quote

---

#### 7. 🔥 Score-Verteilung pro Match (Stacked Bar Chart)
**Typ**: Gestapeltes Balkendiagramm  
**Zweck**: Zeigt hohe Scores für jedes Match

**Balken:**
- **180s** (Lila) - Maximale Scores
- **140+** (Blau) - Sehr hohe Scores
- **100+** (Grün) - Hohe Scores

**Features:**
- Gestapelte Darstellung pro Match
- Farbkodierung nach Score-Höhe
- Datum auf X-Achse

**Nutzen:**
- Sieh welche Matches besonders stark waren
- Erkenne Muster in deinen High Scores
- Vergleiche Matches direkt

---

#### 8. 🎯 Legs Gewonnen vs. Verloren (Stacked Area Chart)
**Typ**: Gestapeltes Flächendiagramm  
**Zweck**: Zeigt gewonnene und verlorene Legs pro Match

**Bereiche:**
- **Legs Gewonnen** (Grün) - Deine gewonnenen Legs
- **Legs Verloren** (Rot) - Verlorene Legs

**Features:**
- Zwei separate Stacks
- Halbtransparente Füllung
- Klare Trennung zwischen Sieg und Niederlage

**Nutzen:**
- Erkenne enge Matches
- Sieh dominante Siege
- Analysiere Match-Verläufe

---

#### 9. 🚀 Höchste Scores (Composed Chart)
**Typ**: Balken + Liniendiagramm Kombination  
**Zweck**: Vergleicht höchste Scores mit Average

**Elemente:**
- **Höchster Score** (Lila-Pink Gradient Balken) - Bester Score des Matches
- **Durchschnitt** (Blaue Linie) - Average des Matches

**Features:**
- Gradient-Füllung für Balken
- Überlagerung von Balken und Linie
- Y-Achse bis 180 (Maximum)

**Nutzen:**
- Sieh wie nah dein Best am Average ist
- Erkenne Ausreißer und Konsistenz
- Identifiziere Top-Performances

---

#### 10. 📈 Verbesserungs-Trend (Stats Cards)
**Typ**: Statistik-Karten mit Trend-Indikatoren  
**Zweck**: Zeigt Verbesserung zwischen historischen und neuesten Matches

**Metriken:**
- **Average** - Änderung des Durchschnitts
- **Checkout %** - Änderung der Checkout-Quote
- **Spiele** - Anzahl analysierter Matches

**Features:**
- Grüne Pfeile nach oben (↗) bei Verbesserung
- Rote Pfeile nach unten (↘) bei Verschlechterung
- Farbcodierte Werte
- +/- Vorzeichen

**Nutzen:**
- Sofortige Feedback über Fortschritt
- Motivation durch sichtbare Verbesserung
- Realistische Ziele setzen

---

## 🎨 Design-Prinzipien

### Farbschema

**Primärfarben:**
- 🔵 **Blau (#0ea5e9)** - Average, Haupt-Metriken
- 🟢 **Grün (#22c55e)** - Erfolg, Checkout, Siege
- 🔴 **Rot (#ef4444)** - Niederlagen, Verschlechterung
- 🟣 **Lila (#a855f7)** - 180s, High Scores
- 🟠 **Orange (#f97316)** - 140+ Scores
- 🟡 **Gelb (#eab308)** - 100+ Scores

**Hintergrund:**
- Dunkelgrau (#0a0a0a) für Chart-Container
- Halbtransparente Glass-Cards
- Gitterlinien in dezentem Grau (#262626)

### Typography
- **Titel**: Bold, 20-24px, Weiß
- **Labels**: 12px, Grau (#737373)
- **Tooltips**: 12-14px, Weiß auf Dunkel

### Interaktivität
- **Hover Effects**: Größere Punkte, Highlight-Bereiche
- **Tooltips**: Detaillierte Info bei Mouse-Over
- **Responsive**: Alle Charts passen sich an Bildschirmgröße an

---

## 📱 Responsive Verhalten

### Desktop (>1024px)
- Charts in 2-3 Spalten-Layout
- Volle Breite für einzelne große Charts
- Höhe: 300-350px pro Chart

### Tablet (768-1024px)
- Charts in 1-2 Spalten-Layout
- Reduzierte Schriftgrößen
- Höhe: 300px

### Mobile (<768px)
- Charts stapeln sich vertikal
- Touchoptimierte Tooltips
- Höhe: 250-300px
- Schriftgrößen angepasst

---

## 🔧 Technische Details

### Chart Library
**Recharts** (v2.12.0)
- React-native Komponenten
- TypeScript Support
- Responsive Design
- Umfangreiche Anpassungsoptionen

### Chart-Typen verwendet
1. **LineChart** - Trends über Zeit
2. **BarChart** - Kategorische Daten
3. **PieChart** - Anteile und Prozente
4. **RadarChart** - Multi-dimensionale Performance
5. **AreaChart** - Gefüllte Trends
6. **ComposedChart** - Mehrere Chart-Typen kombiniert

### Performance-Optimierung
- **useMemo** für alle Datenberechnungen
- Lazy Loading der Charts-Library (108KB gzipped)
- Effiziente Daten-Transformation
- Konditionelles Rendering (nur wenn Daten vorhanden)

---

## 📊 Datenquellen

### Basis-Daten
Alle Charts basieren auf:
- **Matches** - Gespielte Spiele aus localStorage
- **Player Stats** - Aggregierte Spieler-Statistiken
- **Match Details** - Legs, Throws, Scores pro Match

### Berechnungen

**Average-Entwicklung:**
```typescript
average: player?.matchAverage || 0
```

**Checkout-Prozent:**
```typescript
checkoutPercent: player && player.checkoutAttempts > 0
  ? (player.checkoutsHit / player.checkoutAttempts) * 100
  : 0
```

**Monatliche Aggregation:**
```typescript
monthlyStats[month].avgSum / monthlyStats[month].games
```

**Performance-Radar (normalisiert):**
```typescript
value: (selectedPlayer.stats.averageOverall / maxAvg) * 100
```

---

## 🎯 Best Practices für Nutzer

### Interpretiere deine Charts richtig

1. **Trends über einzelne Werte**
   - Schau auf die Gesamtrichtung, nicht einzelne Ausreißer
   - 3-5 Matches sind zu wenig für aussagekräftige Trends

2. **Kontext beachten**
   - Starke Gegner können deine Stats beeinflussen
   - Trainingsmatch vs. Turnier
   - Tagesform schwankt natürlich

3. **Realistische Ziele**
   - Average-Steigerungen von 2-3 Punkten sind bereits gut
   - Checkout-Quote >40% ist solide
   - 180s kommen mit Erfahrung

4. **Langfristig denken**
   - Monatliche Trends sind aussagekräftiger als einzelne Matches
   - Plateaus sind normal
   - Konsistenz > einzelne Höchstleistungen

---

## 🚀 Zukünftige Chart-Erweiterungen

### Geplante Features (Roadmap)

1. **Player-Vergleich Charts**
   - Vergleiche dich mit anderen Spielern
   - Head-to-Head Statistiken
   - Relative Performance

2. **Heat Maps**
   - Dart-Board Heat Map (wo triffst du am häufigsten?)
   - Zeit-basierte Heat Maps (beste Tageszeit)

3. **Scatter Plots**
   - Average vs. Checkout %
   - Dauer vs. Average
   - 180s vs. Win Rate

4. **Zeitreihen-Analysen**
   - Bewegliche Durchschnitte (5/10/20 Matches)
   - Trend-Linien mit Prognose
   - Saisonalität erkennen

5. **Interactive Filters**
   - Zeitraum-Auswahl
   - Gegner-Filter
   - Match-Typ Filter

---

## 📖 Weitere Ressourcen

- **Recharts Dokumentation**: https://recharts.org/
- **Performance Guide**: [PERFORMANCE.md](PERFORMANCE.md)
- **README**: [README.md](README.md)

---

**Erstellt**: 2026-01-14  
**Version**: 1.0.0  
**Maintainer**: Martin Pfeffer
