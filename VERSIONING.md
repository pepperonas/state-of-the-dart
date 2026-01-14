# Versioning System

**State of the Dart** verwendet ein automatisches Versionierungssystem mit benutzerdefinierten Semantic Versioning Regeln.

## 📋 Versioning Schema

### Format
```
MAJOR.MINOR.PATCH
```

Beispiel: `0.0.1`, `0.1.0`, `1.0.0`

### Regeln

1. **Patch Increment** (0.0.1 → 0.0.2)
   - Kleine Änderungen, Bugfixes
   - Incrementiert bei jedem `npm run version:bump`

2. **Minor Increment** (0.0.9 → 0.1.0)
   - Wenn Patch 9 erreicht, wird Minor erhöht
   - Patch wird auf 0 zurückgesetzt
   - Neue Features, größere Änderungen

3. **Major Increment** (0.9.x → 1.0.0)
   - Wenn Minor 9 erreicht (also 0.9.9), wird Major erhöht
   - Minor und Patch werden auf 0 zurückgesetzt
   - Breaking Changes, große Releases

### Beispiel-Sequenz
```
0.0.1 → 0.0.2 → 0.0.3 → ... → 0.0.9 → 0.1.0 → 0.1.1 → ...
→ 0.9.9 → 1.0.0 → 1.0.1 → ...
```

## 🚀 Version Bumping

### Manuelles Bumping

```bash
# Version erhöhen
npm run version:bump

# Aktuelle Version anzeigen
npm run version:show
```

### Was passiert beim Bump?

Das `scripts/bump-version.js` Skript:

1. ✅ Liest aktuelle Version aus `package.json`
2. ✅ Berechnet neue Version nach Regeln
3. ✅ Aktualisiert folgende Dateien:
   - `package.json` - Projekt-Version
   - `public/manifest.json` - PWA Manifest
   - `README.md` - Version Badge
   - `index.html` - JSON-LD softwareVersion
   - `CHANGELOG.md` - Neuer Eintrag
4. ✅ Zeigt Git-Commands für Commit & Tag

### Ausgabe-Beispiel

```
🚀 State of the Dart - Version Bumper

ℹ Current version: 0.0.1
✓ New version: 0.0.2

📝 Updating files...

✓ Updated package.json
✓ Updated public/manifest.json
✓ Updated README.md version badge
✓ Updated index.html version
✓ Updated CHANGELOG.md

✨ Version bump complete!

ℹ Version: 0.0.1 → 0.0.2

Next steps:
  1. Review changes: git diff
  2. Build: npm run build
  3. Commit: git add . && git commit -m "chore: bump version to v0.0.2"
  4. Tag: git tag v0.0.2
  5. Push: git push && git push --tags
```

## 🤖 Automatisches Bumping (GitHub Actions)

### Workflow Trigger

Das Workflow kann manuell über GitHub Actions ausgelöst werden:

1. Gehe zu **Actions** Tab auf GitHub
2. Wähle **Version Management** Workflow
3. Klicke **Run workflow**
4. Wähle `auto` für automatisches Bumping

Der Workflow:
- ✅ Bumped die Version
- ✅ Commited Änderungen
- ✅ Erstellt Git Tag
- ✅ Pushed zu main Branch

## 📝 CHANGELOG Management

### Automatische Einträge

Bei jedem Version Bump wird automatisch ein Eintrag in `CHANGELOG.md` erstellt:

```markdown
## [0.0.2] - 2026-01-14

### Changed
- Version bump from 0.0.1 to 0.0.2
```

### Manuelle Einträge

Du kannst den CHANGELOG manuell erweitern mit:

```markdown
## [0.0.2] - 2026-01-14

### Added
- Neue Feature X
- Neue Feature Y

### Changed
- Verbesserung von Z
- Version bump from 0.0.1 to 0.0.2

### Fixed
- Bug ABC behoben
- Performance-Problem XYZ gelöst
```

### CHANGELOG Kategorien

- **Added** - Neue Features
- **Changed** - Änderungen an bestehenden Features
- **Deprecated** - Bald entfernte Features
- **Removed** - Entfernte Features
- **Fixed** - Bugfixes
- **Security** - Sicherheits-Verbesserungen

## 🔖 Git Tagging

### Manuelle Tags

Nach einem Version Bump:

```bash
# Version bumpen
npm run version:bump

# Änderungen commiten
git add .
git commit -m "chore: bump version to v0.0.2"

# Tag erstellen
git tag v0.0.2

# Pushen
git push origin main
git push origin v0.0.2
```

### Tag Format

- Format: `v{MAJOR}.{MINOR}.{PATCH}`
- Beispiele: `v0.0.1`, `v0.1.0`, `v1.0.0`

### Alle Tags anzeigen

```bash
git tag -l
```

### Tag Details

```bash
git show v0.0.1
```

## 📦 Release Management

### Pre-Release (0.x.x)

- Version < 1.0.0 = Pre-Release / Beta
- Kann Breaking Changes enthalten
- Nicht für Production empfohlen (aber voll funktionsfähig)

### Stable Release (1.0.0+)

- Version >= 1.0.0 = Stable
- Semantic Versioning strikt befolgt
- Production-ready

### Release Checklist

Vor einem Release:

- [ ] Tests durchführen: `npm run test:run`
- [ ] Build erstellen: `npm run build`
- [ ] Linting: `npm run lint`
- [ ] CHANGELOG aktualisieren
- [ ] Version bumpen: `npm run version:bump`
- [ ] Änderungen reviewen: `git diff`
- [ ] Commiten und taggen
- [ ] Pushen: `git push && git push --tags`
- [ ] Deployment: `./deploy.sh`

## 🔍 Version Info in App

### Anzeige der Version

Die Version wird automatisch in der App angezeigt:

**MainMenu Footer:**
```tsx
<p className="text-xs text-dark-600">
  Version {packageJson.version}
</p>
```

Die Version wird aus `package.json` importiert:
```tsx
import packageJson from '../../package.json';
```

### Meta Tags

Die Version ist auch in den Meta Tags enthalten:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "softwareVersion": "0.0.1",
  ...
}
</script>
```

## 🛠️ Entwickler-Workflow

### Bei neuen Features

1. Feature entwickeln
2. Tests schreiben/anpassen
3. CHANGELOG manuell erweitern (Optional)
4. Version bumpen: `npm run version:bump`
5. Commiten, taggen, pushen

### Bei Bugfixes

1. Bug fixen
2. Tests aktualisieren
3. Version bumpen: `npm run version:bump`
4. Commiten, taggen, pushen

### Bei Breaking Changes

1. Änderungen implementieren
2. CHANGELOG mit "BREAKING CHANGE" markieren
3. Manuell Major Version erhöhen (nur bei 1.0.0+)
4. Commiten, taggen, pushen

## 📊 Version History

### Aktuelle Version anzeigen

```bash
npm run version:show
```

### Version History aus Git

```bash
# Alle Tags anzeigen
git tag -l

# Commits zwischen Versionen
git log v0.0.1..v0.0.2

# Changelog zwischen Versionen
git log v0.0.1..v0.0.2 --oneline
```

## 🔄 CI/CD Integration

### GitHub Actions

Bei jedem Push werden automatisch Tests ausgeführt:
- Unit Tests
- Linting
- Build

Die Version wird NICHT automatisch erhöht, nur manuell über:
- `npm run version:bump` (lokal)
- Workflow Trigger (GitHub Actions)

### Deployment

Nach einem Version Bump und Push:

```bash
# Deployment auf VPS
./deploy.sh
```

Das Deployment-Skript:
1. Pulled neuesten Code
2. Installiert Dependencies
3. Baut Production Build
4. Deployed auf Server

## 📖 Best Practices

### DO ✅

1. **Immer testen vor Version Bump**
   ```bash
   npm run test:run && npm run build
   ```

2. **CHANGELOG aktualisieren**
   - Beschreibe Änderungen aussagekräftig
   - Kategorisiere korrekt (Added, Changed, Fixed, etc.)

3. **Semantic Commits**
   ```bash
   git commit -m "feat: neue Feature-Beschreibung"
   git commit -m "fix: Bugfix-Beschreibung"
   git commit -m "chore: bump version to v0.0.2"
   ```

4. **Tags pushen**
   ```bash
   git push && git push --tags
   ```

### DON'T ❌

1. **Nicht manuell Version in package.json ändern**
   - Benutze immer `npm run version:bump`

2. **Nicht Versions-Tags löschen**
   - Tags sind permanent
   - Nur bei Fehler korrigieren

3. **Nicht mehrere Bumps ohne Commit**
   - Ein Bump = Ein Commit

4. **Nicht Production deployment ohne Tests**
   - Immer Tests laufen lassen

## 🆘 Troubleshooting

### Problem: Skript funktioniert nicht

```bash
# Sicherstellen dass Skript ausführbar ist
chmod +x scripts/bump-version.js

# Node Version überprüfen
node --version  # Should be 18.x or higher
```

### Problem: CHANGELOG wird nicht aktualisiert

```bash
# Manuell CHANGELOG erstellen falls nicht vorhanden
touch CHANGELOG.md

# Skript erneut ausführen
npm run version:bump
```

### Problem: Version in README nicht aktualisiert

- Stelle sicher dass README.md das Version Badge Format hat:
  ```markdown
  ![Version](https://img.shields.io/badge/Version-0.0.1-blue)
  ```

### Problem: Git Tag existiert bereits

```bash
# Tag lokal löschen
git tag -d v0.0.1

# Tag remote löschen (vorsichtig!)
git push origin :refs/tags/v0.0.1
```

## 📚 Ressourcen

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Erstellt**: 2026-01-14  
**Version**: 0.0.1  
**Maintainer**: Martin Pfeffer
