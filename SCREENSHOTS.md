<div align="center">

# 📸 State of the Dart — Screenshots

A visual tour of the app · Eine Tour durch die App

[![Back to README](https://img.shields.io/badge/←_Back_to-README-blue)](README.md)
[![Live](https://img.shields.io/badge/🎯_Live-stateofthedart.com-green)](https://stateofthedart.com)

<img src="docs/media/mockup-hero.png" alt="One match on phone, laptop and TV" width="100%" />

</div>

All images are generated from the running app with seeded test data:
`npx playwright test -c tools/screenshots` captures the screens, `node tools/screenshots/compose.mjs`
builds the mockups and the social preview in `docs/media/`.

---

## 🔦 Arena — the game screen

The player at the oche gets the big card: remaining score, checkout route, place in the leg, darts in the leg and the
last visits, with the burning frame. Input and dartboard sit alongside; stats and the live heatmap below.

<div align="center"><img src="docs/media/screens/game-desktop.png" alt="Game screen on a laptop" width="900" /></div>

## 📱 Phone

Input docked in thumb reach, the other players as compact rows, stats and heatmap in a bottom sheet.

<div align="center"><img src="docs/media/screens/game-phone.png" alt="Game screen on a phone" width="320" /></div>

## 📺 TV scoreboard

`/scoreboard` on a second screen follows every visit live — with moments for 180, 100+, bust and won legs.

<div align="center">
  <img src="docs/media/screens/scoreboard-tv.png" alt="TV scoreboard" width="900" />
  <img src="docs/media/screens/scoreboard-180.png" alt="TV scoreboard showing a bust" width="900" />
</div>

## 🎡 Who throws first?

<div align="center"><img src="docs/media/screens/wheel-dialog.png" alt="Wheel for the throw-off" width="420" /></div>

## 📊 Insights and statistics

<div align="center">
  <img src="docs/media/screens/insights.png" alt="Insights below the game: stats, history, chart, heatmap" width="700" />
  <img src="docs/media/screens/stats.png" alt="Statistics" width="900" />
</div>

## 🏠 Home, players, history

<div align="center">
  <img src="docs/media/screens/home.png" alt="Home with one-tap rematch" width="900" />
  <img src="docs/media/screens/players.png" alt="Players" width="900" />
  <img src="docs/media/screens/history.png" alt="Match history" width="900" />
</div>

## 🏆 Achievements, leaderboard, training

<div align="center">
  <img src="docs/media/screens/achievements.png" alt="Achievements" width="900" />
  <img src="docs/media/screens/leaderboard.png" alt="Leaderboard" width="900" />
  <img src="docs/media/screens/training.png" alt="Training modes" width="900" />
</div>

---

<div align="center">

[MIT](LICENSE) — © 2026 Martin Pfeffer | [celox.io](https://celox.io)

</div>
