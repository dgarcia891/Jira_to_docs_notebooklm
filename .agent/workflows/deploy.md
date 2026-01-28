---
description: Sync -> Validate -> Tag -> Push.
---
1. Sync Remote
git pull --rebase origin main
2. Validate Manifest
bash scripts/validate-manifest.sh
3. Test Suite
npm test
4. Version Bump
node scripts/release.js # Bumps package.json AND manifest.json
5. Git Push
git push && git push --tags
