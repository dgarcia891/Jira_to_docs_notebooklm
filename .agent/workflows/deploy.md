---
description: Release Engine (Test -> Bump -> Sync).
---
// turbo
1. Release
npm run release
// turbo
2. Build
npm run build
// turbo
3. Push
git push
// turbo
4. NAS Sync
bash scripts/deploy.sh
