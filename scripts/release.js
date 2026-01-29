const fs = require('fs');
const { execSync } = require('child_process');

try {
    // 1. Read Files
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const manifest = JSON.parse(fs.readFileSync('src/manifest.json', 'utf8')); // Adjusted path to src/manifest.json based on project structure

    // 2. Increment Version (Patch)
    const parts = pkg.version.split('.').map(Number);
    parts[2] += 1; // Increment PATCH version (parts[2]), not MINOR (parts[1]) for safety default
    const newVersion = parts.join('.');

    console.log(`⬆️  Bumping version: ${pkg.version} -> ${newVersion}`);

    // 3. Update State
    pkg.version = newVersion;
    manifest.version = newVersion;

    // 4. Write Back
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4)); // 4 spaces indent
    fs.writeFileSync('src/manifest.json', JSON.stringify(manifest, null, 4));

    // 5. Update Changelog
    const date = new Date().toISOString().split('T')[0];
    const logEntry = `\n## [${newVersion}] - ${date}\n- Automated release build.\n`;
    if (fs.existsSync('docs/CHANGELOG.md')) { // Adjusted path to docs/CHANGELOG.md
        const currentLog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');
        fs.writeFileSync('docs/CHANGELOG.md', logEntry + currentLog);
    } else {
        fs.writeFileSync('docs/CHANGELOG.md', "# Changelog\n" + logEntry);
    }

    console.log("✅ Version bumped successfully.");
} catch (e) {
    console.error("❌ Error during release:", e.message);
    process.exit(1);
}
