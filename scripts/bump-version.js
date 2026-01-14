#!/usr/bin/env node

/**
 * Automatic Version Bumping Script
 * 
 * Rules:
 * - Increments patch version (0.0.1 -> 0.0.2)
 * - When patch reaches 9, increments minor (0.0.9 -> 0.1.0)
 * - When minor reaches 9, increments major (0.9.x -> 1.0.0)
 * 
 * Usage:
 *   npm run version:bump
 *   node scripts/bump-version.js
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Read package.json
function readPackageJson() {
  const packagePath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return { packageJson, packagePath };
}

// Parse version string
function parseVersion(versionString) {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

// Bump version with custom rules
function bumpVersion(currentVersion) {
  const version = parseVersion(currentVersion);
  
  log.info(`Current version: ${currentVersion}`);
  
  // Rule: If patch is 9, bump minor and reset patch to 0
  if (version.patch === 9) {
    version.minor++;
    version.patch = 0;
    log.warning('Patch reached 9, bumping minor version');
    
    // Rule: If minor is 9, bump major and reset minor to 0
    if (version.minor === 10) {
      version.major++;
      version.minor = 0;
      log.warning('Minor reached 10, bumping major version');
    }
  } else {
    // Normal patch increment
    version.patch++;
  }
  
  const newVersion = `${version.major}.${version.minor}.${version.patch}`;
  log.success(`New version: ${newVersion}`);
  
  return newVersion;
}

// Update version in package.json
function updatePackageJson(newVersion) {
  const { packageJson, packagePath } = readPackageJson();
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  log.success('Updated package.json');
}

// Update version in manifest.json
function updateManifest(newVersion) {
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    log.success('Updated public/manifest.json');
  } catch (error) {
    log.warning('Could not update manifest.json (file may not exist)');
  }
}

// Update version in README badge
function updateReadme(newVersion) {
  const readmePath = path.join(__dirname, '../README.md');
  
  try {
    let readme = fs.readFileSync(readmePath, 'utf8');
    
    // Update version badge
    const versionBadgeRegex = /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/Version-[0-9.]+/g;
    readme = readme.replace(
      versionBadgeRegex,
      `![Version](https://img.shields.io/badge/Version-${newVersion}`
    );
    
    fs.writeFileSync(readmePath, readme);
    log.success('Updated README.md version badge');
  } catch (error) {
    log.warning('Could not update README.md');
  }
}

// Update version in index.html meta tags
function updateIndexHtml(newVersion) {
  const indexPath = path.join(__dirname, '../index.html');
  
  try {
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Update softwareVersion in JSON-LD
    const jsonLdRegex = /"softwareVersion":\s*"[0-9.]+"/g;
    html = html.replace(
      jsonLdRegex,
      `"softwareVersion": "${newVersion}"`
    );
    
    fs.writeFileSync(indexPath, html);
    log.success('Updated index.html version');
  } catch (error) {
    log.warning('Could not update index.html');
  }
}

// Generate changelog entry
function generateChangelogEntry(oldVersion, newVersion) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  
  const entry = `
## [${newVersion}] - ${date}

### Changed
- Version bump from ${oldVersion} to ${newVersion}

`;

  return entry;
}

// Update CHANGELOG.md
function updateChangelog(oldVersion, newVersion) {
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  
  try {
    let changelog = '';
    
    if (fs.existsSync(changelogPath)) {
      changelog = fs.readFileSync(changelogPath, 'utf8');
    } else {
      changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }
    
    const entry = generateChangelogEntry(oldVersion, newVersion);
    
    // Insert new entry after the header
    const headerEnd = changelog.indexOf('\n\n') + 2;
    changelog = changelog.slice(0, headerEnd) + entry + changelog.slice(headerEnd);
    
    fs.writeFileSync(changelogPath, changelog);
    log.success('Updated CHANGELOG.md');
  } catch (error) {
    log.warning('Could not update CHANGELOG.md');
  }
}

// Main function
function main() {
  try {
    log.header('🚀 State of the Dart - Version Bumper');
    
    const { packageJson } = readPackageJson();
    const oldVersion = packageJson.version;
    const newVersion = bumpVersion(oldVersion);
    
    log.header('📝 Updating files...');
    
    updatePackageJson(newVersion);
    updateManifest(newVersion);
    updateReadme(newVersion);
    updateIndexHtml(newVersion);
    updateChangelog(oldVersion, newVersion);
    
    log.header('✨ Version bump complete!');
    log.info(`Version: ${colors.yellow}${oldVersion}${colors.reset} → ${colors.green}${newVersion}${colors.reset}`);
    log.info('\nNext steps:');
    log.info('  1. Review changes: git diff');
    log.info('  2. Build: npm run build');
    log.info('  3. Commit: git add . && git commit -m "chore: bump version to v' + newVersion + '"');
    log.info('  4. Tag: git tag v' + newVersion);
    log.info('  5. Push: git push && git push --tags');
    
  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { bumpVersion, parseVersion };
