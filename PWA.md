# Progressive Web App (PWA) Installation Guide

**State of the Dart** ist als Progressive Web App (PWA) verfügbar und kann auf jedem Gerät installiert werden.

## 🚀 Was ist eine PWA?

Eine Progressive Web App vereint die Vorteile einer Website mit denen einer nativen App:

- 📱 **Installation auf dem Homescreen** - Schneller Zugriff wie bei einer nativen App
- 🔌 **Offline-Funktionalität** - Nutze die App ohne Internetverbindung
- ⚡ **Schnellere Ladezeiten** - Optimiertes Caching für bessere Performance
- 🎨 **Native App-Erfahrung** - Vollbild-Modus ohne Browser-UI
- 💾 **Automatische Updates** - Die App aktualisiert sich automatisch

## 📲 Installation

### Android (Chrome/Edge)

1. Öffne https://stateofthedart.com in Chrome oder Edge
2. **Methode 1**: Tippe auf das Banner "Zum Startbildschirm hinzufügen"
3. **Methode 2**: 
   - Öffne das Browser-Menü (⋮)
   - Wähle "App installieren" oder "Zum Startbildschirm hinzufügen"
   - Bestätige die Installation
4. **Methode 3 (in der App)**:
   - Öffne die App im Browser
   - Gehe zu **Einstellungen** ⚙️
   - Klicke auf **"App installieren"**
   - Folge den Anweisungen

### iOS (Safari)

1. Öffne https://stateofthedart.com in Safari
2. Tippe auf das Teilen-Symbol (Pfeil nach oben) in der unteren Leiste
3. Scrolle nach unten und wähle **"Zum Home-Bildschirm"**
4. Benenne die App und tippe auf **"Hinzufügen"**
5. Die App erscheint nun auf deinem Homescreen

**Hinweis**: iOS unterstützt die automatische PWA-Installation nicht. Verwende die manuelle Methode über Safari.

### Desktop (Windows/Mac/Linux)

#### Chrome, Edge, Brave
1. Öffne https://stateofthedart.com
2. Klicke auf das **Installations-Icon** in der Adressleiste (rechts)
3. Oder: Browser-Menü → "State of the Dart installieren..."
4. **Alternative**: In den App-Einstellungen auf **"App installieren"** klicken

#### Firefox
1. Firefox unterstützt PWA-Installation aktuell nicht direkt
2. Nutze die App im Browser oder verwende Chrome/Edge

## ✅ Nach der Installation

Nach erfolgreicher Installation:

- ✨ Die App startet im **Vollbild-Modus** ohne Browser-Leiste
- 🎯 Ein App-Icon erscheint auf deinem Homescreen/Startmenü
- 🔔 Du erhältst automatisch Updates (im Hintergrund)
- 💾 Alle Daten werden lokal gespeichert (offline verfügbar)
- 🚀 Schnellere Ladezeiten durch Service Worker Caching

## 📊 Features der PWA

### Offline-Funktionalität
- ✅ Alle Spiel-Modi funktionieren offline
- ✅ Statistiken und Historie verfügbar
- ✅ Training und Einstellungen offline nutzbar
- ⚠️ Nur neue Audio-Downloads benötigen Internet

### Caching-Strategie
- **Precache**: ~30MB an App-Assets und häufig genutzten Dateien
- **Runtime Cache**: 
  - Audio-Dateien (30 Tage)
  - Schriftarten (1 Jahr)
- **Smart Updates**: Neue Versionen laden automatisch im Hintergrund

### Datenschutz & Sicherheit
- 🔒 Alle Daten bleiben auf deinem Gerät
- 🔐 Keine Cloud-Synchronisation erforderlich
- 🛡️ HTTPS-Only für sichere Verbindung
- 🎭 Multi-Tenant Isolation für verschiedene Profile

## 🔧 Deinstallation

### Android
1. **Methode 1**: App-Icon lange drücken → "Deinstallieren"
2. **Methode 2**: Einstellungen → Apps → State of the Dart → Deinstallieren

### iOS
1. App-Icon lange drücken → "App entfernen" → "Vom Home-Bildschirm entfernen"

### Desktop (Chrome/Edge)
1. Öffne die installierte App
2. Klicke auf das Drei-Punkte-Menü
3. Wähle "State of the Dart deinstallieren"

## 🆘 Troubleshooting

### "App installieren" Button wird nicht angezeigt

**Mögliche Ursachen:**
1. ✅ App ist bereits installiert
2. 🌐 Du nutzt HTTP statt HTTPS
3. 🔄 Service Worker wurde noch nicht registriert
4. 📱 Browser unterstützt keine PWA-Installation (z.B. Firefox)

**Lösungen:**
- Überprüfe ob die App bereits installiert ist
- Stelle sicher, dass du HTTPS verwendest
- Lade die Seite neu (Strg+F5 / Cmd+R)
- Versuche es in Chrome/Edge/Safari

### App lädt nicht offline

**Lösungen:**
1. Öffne die App einmal online, um den Cache zu füllen
2. Überprüfe die Browser-Cache-Einstellungen
3. Lösche den Cache und lade neu:
   - Chrome: Einstellungen → Datenschutz → Browserdaten löschen
   - Safari: Einstellungen → Safari → Verlauf löschen

### Updates werden nicht angezeigt

**Lösungen:**
1. Schließe die App komplett und öffne sie neu
2. Lösche den Service Worker Cache:
   - Chrome DevTools → Application → Service Workers → Unregister
3. Hard Reload: Strg+Shift+R (Chrome) oder Cmd+Shift+R (Safari)

### iOS: Sounds spielen nicht

**Lösung:**
- iOS erlaubt Audio nur nach Benutzerinteraktion
- Tippe einmal auf "Test Sound" in den Einstellungen
- Sounds funktionieren danach normal

## 📱 Unterschiede: PWA vs. Native App

| Feature | PWA | Native App |
|---------|-----|------------|
| Installation | ✅ Direkt über Browser | ❌ App Store erforderlich |
| Updates | ✅ Automatisch | ❌ Manuell über Store |
| Speicherplatz | ✅ ~30MB | ❌ 50-200MB |
| Offline-Modus | ✅ Vollständig | ✅ Vollständig |
| Performance | ✅ Sehr gut | ✅ Exzellent |
| Plattformen | ✅ Alle (Web) | ❌ Separate Builds |
| Distribution | ✅ URL teilen | ❌ Store-Freigabe |

## 🎯 Vorteile zusammengefasst

### Für Nutzer
- 🚀 **Schneller Start** - App startet in <1 Sekunde
- 📱 **Native Feeling** - Wie eine echte App
- 💾 **Weniger Speicher** - Nur ~30MB statt 100-200MB
- 🔄 **Auto-Updates** - Immer die neueste Version
- 🌐 **Überall verfügbar** - Browser + Installation

### Für Entwickler
- ✅ **Ein Code-Base** - Funktioniert überall
- 🚢 **Schnelle Updates** - Kein Store-Review
- 📊 **Web Analytics** - Standard-Tools nutzbar
- 🔧 **Einfache Wartung** - Zentrale Deployment

## 📚 Weitere Ressourcen

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)

## 🆕 Was ist neu in der PWA-Version?

### Version 1.0.0
- ✅ Vollständige PWA-Unterstützung
- ✅ Offline-Funktionalität
- ✅ Service Worker mit Smart Caching
- ✅ "App installieren" Button in Einstellungen
- ✅ Automatische Update-Benachrichtigungen
- ✅ Optimiertes Caching für Audio-Dateien
- ✅ 1240+ precached Einträge

---

**Viel Spaß mit State of the Dart als PWA! 🎯**

Bei Fragen oder Problemen erstelle ein Issue auf GitHub:  
https://github.com/pepperonas/state-of-the-dart/issues
