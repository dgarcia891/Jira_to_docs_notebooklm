---
description: Release Engine (Test -> Bump -> Sync).
---
// turbo
1. Release
npm run release
// turbo
2. Push
git push
// turbo
3. NAS Sync
bash scripts/deploy.sh
