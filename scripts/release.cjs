const fs = require('fs');
const path = require('path');

/**
 * Validates project version consistency before release.
 */
function validateRelease() {
    console.log("🚀 Starting Release Validation Protocol...");

    const projectRoot = path.resolve(__dirname, '..');
    const errors = [];

    // 1. package.json
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const version = pkg.version;
    console.log(`Checking version: ${version}`);

    // 2. manifest.json
    const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/manifest.json'), 'utf8'));
    if (manifest.version !== version) {
        errors.push(`❌ manifest.json version (${manifest.version}) does not match package.json (${version})`);
    }

    // 3. App.tsx
    const appContent = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
    const appMatch = appContent.match(/v(\d+\.\d+\.\d+)/);
    const appVersion = appMatch ? appMatch[1] : null;
    if (appVersion !== version) {
        errors.push(`❌ App.tsx display version (v${appVersion}) does not match package.json (${version})`);
    }

    // 4. CHANGELOG.md
    const changelog = fs.readFileSync(path.join(projectRoot, 'docs/CHANGELOG.md'), 'utf8');
    if (!changelog.includes(`## [${version}]`)) {
        errors.push(`❌ docs/CHANGELOG.md missing entry for [${version}]`);
    }

    if (errors.length > 0) {
        console.error("\n🛑 RELEASE VALIDATION FAILED:");
        errors.forEach(e => console.error(e));
        process.exit(1);
    }

    console.log("\n✅ Release Validation Successful! All versions match and CHANGELOG is updated.");
}

validateRelease();
