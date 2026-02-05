import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface VersionReport {
    packageVersion: string;
    manifestVersion: string;
    appVersion: string;
    changelogEntryFound: boolean;
    isConsistent: boolean;
    errors: string[];
}

export function validateProjectVersion(projectRoot: string): VersionReport {
    const errors: string[] = [];

    // 1. Get package.json version
    const pkgPath = join(projectRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const packageVersion = pkg.version;

    // 2. Get manifest.json version
    const manifestPath = join(projectRoot, 'src/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const manifestVersion = manifest.version;

    // 3. Get App.tsx version
    const appPath = join(projectRoot, 'src/App.tsx');
    const appContent = readFileSync(appPath, 'utf8');
    const appVersionMatch = appContent.match(/v(\d+\.\d+\.\d+)/);
    const appVersion = appVersionMatch ? appVersionMatch[1] : 'NOT_FOUND';

    // Extension Integrity Check: Manifest and App MUST match
    if (manifestVersion !== appVersion) {
        errors.push(`Extension Version Mismatch: manifest.json (${manifestVersion}) != App.tsx (v${appVersion})`);
    }

    // Working Version Relationship (Optional Warning or Informational)
    // In this repo, package.json tracks Orchestrator/Working version, while manifest tracks Product version.
    // We allow them to differ but log it.

    // 4. Check CHANGELOG.md
    const changelogPath = join(projectRoot, 'docs/CHANGELOG.md');
    let changelogEntryFound = false;
    if (existsSync(changelogPath)) {
        const changelogContent = readFileSync(changelogPath, 'utf8');
        // Accept either the working version or the extension version in changelog
        const hasWorkingVersion = changelogContent.includes(`## [${packageVersion}]`);
        const hasExtensionVersion = changelogContent.includes(`## [${manifestVersion}]`);
        changelogEntryFound = hasWorkingVersion || hasExtensionVersion;
    } else {
        errors.push('CHANGELOG.md not found');
    }

    if (!changelogEntryFound) {
        errors.push(`No entry found for version ${packageVersion} or ${manifestVersion} in CHANGELOG.md`);
    }

    return {
        packageVersion,
        manifestVersion,
        appVersion,
        changelogEntryFound,
        isConsistent: errors.length === 0,
        errors
    };
}
