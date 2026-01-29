---
description: Bumps version, builds extension, and pushes to Git.
---
1. Sync & Safety
git pull --rebase origin main || echo "⚠️ No remote found, working locally."

2. Manifest Validation
// turbo
if grep -q '"manifest_version": 2' src/manifest.json; then echo "❌ FAIL: Manifest V2 detected."; exit 1; fi
echo "✅ Manifest V3 Verified."

3. Test Gate
npm run test:unit

4. Version Bump
node scripts/release.js

5. Build
npm run build

6. Git Push
VERSION=$(node -p "require('./package.json').version")
git add .
git commit -m "chore(release): v$VERSION"
git tag "v$VERSION"
git push origin main --tags
echo "🚀 Deployed v$VERSION to Git."
