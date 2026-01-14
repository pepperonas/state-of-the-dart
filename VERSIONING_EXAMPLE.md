# Versioning System - Practical Examples

This document demonstrates the custom versioning logic with real examples.

## 🔢 Version Progression Examples

### Example 1: Normal Patch Increments
```
0.0.1 → 0.0.2 → 0.0.3 → 0.0.4 → 0.0.5
```
Each `npm run version:bump` increments the patch number by 1.

### Example 2: Patch 9 → Minor Bump
```
0.0.7 → 0.0.8 → 0.0.9 → 0.1.0
```
When patch reaches 9, the next bump increments minor and resets patch to 0.

### Example 3: Multiple Minor Increments
```
0.0.9 → 0.1.0 → 0.1.1 → 0.1.2 → ... → 0.1.9 → 0.2.0
```
The pattern repeats for each minor version.

### Example 4: Minor 9 → Major Bump
```
0.9.7 → 0.9.8 → 0.9.9 → 1.0.0
```
When minor reaches 9 and patch is also 9, the next bump goes to next major version.

### Example 5: Complete Progression
```
0.0.1  (start)
0.0.2  (patch +1)
0.0.3  (patch +1)
...
0.0.9  (patch = 9)
0.1.0  (minor +1, patch reset)
0.1.1  (patch +1)
...
0.1.9  (patch = 9)
0.2.0  (minor +1, patch reset)
...
0.9.9  (minor = 9, patch = 9)
1.0.0  (major +1, minor & patch reset)
1.0.1  (patch +1)
...
```

## 🛠️ Usage Examples

### Example 1: First Version Bump

**Current State:** `0.0.1`

```bash
$ npm run version:bump
```

**Output:**
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
```

**Result:** `0.0.2`

---

### Example 2: Approaching Minor Bump

**Current State:** `0.0.8`

```bash
$ npm run version:bump
```

**Result:** `0.0.9` (normal patch increment)

```bash
$ npm run version:bump
```

**Output:**
```
ℹ Current version: 0.0.9
⚠ Patch reached 9, bumping minor version
✓ New version: 0.1.0
```

**Result:** `0.1.0` (minor bump triggered)

---

### Example 3: Approaching Major Bump

**Current State:** `0.9.8`

```bash
$ npm run version:bump
```

**Result:** `0.9.9` (normal patch increment)

```bash
$ npm run version:bump
```

**Output:**
```
ℹ Current version: 0.9.9
⚠ Patch reached 9, bumping minor version
⚠ Minor reached 10, bumping major version
✓ New version: 1.0.0
```

**Result:** `1.0.0` (major bump triggered)

---

### Example 4: After Major Bump

**Current State:** `1.0.0`

```bash
$ npm run version:bump
```

**Result:** `1.0.1` (continues normal progression)

## 📝 CHANGELOG Examples

### After Patch Bump (0.0.1 → 0.0.2)

```markdown
## [0.0.2] - 2026-01-14

### Changed
- Version bump from 0.0.1 to 0.0.2
```

### After Minor Bump (0.0.9 → 0.1.0)

```markdown
## [0.1.0] - 2026-01-15

### Changed
- Version bump from 0.0.9 to 0.1.0

### Added
- New training mode: Score Target
- Enhanced statistics dashboard
- CSV export for match history

### Fixed
- Audio playback issue on iOS
- Dartboard touch responsiveness
```

### After Major Bump (0.9.9 → 1.0.0)

```markdown
## [1.0.0] - 2026-02-01 🎉

### 🚀 Major Release - Production Ready!

### Added
- Tournament bracket system
- Real-time multiplayer support
- Cloud sync for profiles
- Cricket game mode
- Advanced achievement system

### Changed
- Complete UI redesign
- Improved performance (50% faster)
- Version bump from 0.9.9 to 1.0.0

### Fixed
- All known bugs resolved
- Security vulnerabilities patched
```

## 🎯 Workflow Examples

### Example: Bug Fix Release

```bash
# 1. Fix the bug in code
# 2. Run tests
npm run test:run

# 3. Bump version
npm run version:bump
# Result: 0.0.1 → 0.0.2

# 4. Update CHANGELOG manually (optional)
# Edit CHANGELOG.md to add:
# ### Fixed
# - Fixed scoring bug in 301 mode

# 5. Commit and tag
git add .
git commit -m "fix: scoring calculation in 301 mode"
git tag v0.0.2

# 6. Push
git push && git push --tags

# 7. Deploy
./deploy.sh
```

---

### Example: New Feature Release

```bash
# 1. Develop new feature
# 2. Write tests
# 3. Test everything
npm run test:run && npm run build

# 4. Bump version multiple times as needed
npm run version:bump
# Result: 0.1.5 → 0.1.6

# 5. Update CHANGELOG
# ### Added
# - New training mode: Around the Board
# - Export statistics to PDF

# 6. Commit and tag
git add .
git commit -m "feat: add Around the Board training mode"
git tag v0.1.6

# 7. Push and deploy
git push && git push --tags
./deploy.sh
```

---

### Example: Pre-Release to Stable

```bash
# Current: 0.9.9 (last pre-release)

# 1. Final testing and bug fixes
npm run test:run
npm run lint
npm run build

# 2. Update documentation
# - README.md
# - CHANGELOG.md (comprehensive 1.0.0 notes)

# 3. Bump to 1.0.0
npm run version:bump
# Result: 0.9.9 → 1.0.0 🎉

# 4. Create detailed changelog
# Edit CHANGELOG.md with all features since 0.0.1

# 5. Commit with special message
git add .
git commit -m "chore: release v1.0.0 - Production Ready 🎉"
git tag v1.0.0

# 6. Push and celebrate!
git push && git push --tags
./deploy.sh

# 7. Create GitHub Release with release notes
```

## 🔍 Checking Version Across Files

After a version bump, verify all files are updated:

```bash
# Show current version
npm run version:show

# Check package.json
grep '"version"' package.json

# Check README badge
grep 'Version-' README.md

# Check manifest
grep '"version"' public/manifest.json

# Check index.html
grep 'softwareVersion' index.html

# Check CHANGELOG
head -n 20 CHANGELOG.md
```

## 📊 Version Statistics

After several bumps, you can analyze your version history:

```bash
# Show all version tags
git tag -l

# Count total versions
git tag -l | wc -l

# Show version commits
git log --oneline --grep="bump version"

# Show latest 10 versions
git tag -l | tail -10
```

## 🐛 Common Scenarios & Solutions

### Scenario 1: Accidental Bump

```bash
# If you bumped by mistake and haven't pushed:
git reset --hard HEAD~1
git tag -d v0.0.3
```

### Scenario 2: Skip a Version

```bash
# You can't skip versions with the auto bumper
# But you can manually edit package.json if needed
# (Not recommended!)

# Better: Just bump multiple times
npm run version:bump  # 0.0.5 → 0.0.6
npm run version:bump  # 0.0.6 → 0.0.7
npm run version:bump  # 0.0.7 → 0.0.8
```

### Scenario 3: Hotfix on Old Version

```bash
# Create branch from old tag
git checkout -b hotfix/0.1.5 v0.1.5

# Fix the bug
# Manually set version to 0.1.6 in package.json
# (Don't use bump script on old branch)

# Commit and tag
git commit -m "hotfix: critical bug fix"
git tag v0.1.6-hotfix

# Merge back to main if needed
```

## 📈 Version Timeline Visualization

```
v0.0.1  ─┬─ Initial Release
         │
v0.0.2  ─┼─ Bug fixes
v0.0.3  ─┤
         │
v0.0.9  ─┼─ Last patch in 0.0.x
         │
v0.1.0  ─┼─ Minor bump (new features)
         │
v0.1.9  ─┼─ Last patch in 0.1.x
         │
v0.2.0  ─┼─ Minor bump
         │
v0.9.0  ─┼─ Feature complete
v0.9.9  ─┼─ Release candidate
         │
v1.0.0  ─┴─ 🎉 STABLE RELEASE
```

## 🎓 Key Takeaways

1. **Automatic Increment**: Just run `npm run version:bump`
2. **Smart Logic**: 
   - Patch 9 → Minor +1
   - Minor 9 + Patch 9 → Major +1
3. **All Files Updated**: package.json, manifest, README, HTML, CHANGELOG
4. **Git Workflow**: Bump → Review → Commit → Tag → Push
5. **No Manual Edits**: Let the script handle version numbers
6. **Semantic Commits**: Use conventional commit messages

---

**Questions?** Check [VERSIONING.md](VERSIONING.md) for full documentation.
