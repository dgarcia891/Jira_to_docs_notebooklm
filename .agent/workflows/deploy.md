name: deploy
description: Sync -> Validate -> Tag -> Push.
steps:
  - name: Sync Remote
    command: git pull --rebase origin main
  - name: Validate Manifest
    command: bash scripts/validate-manifest.sh
  - name: Test Suite
    command: npm test
  - name: Version Bump
    command: node scripts/release.js # Bumps package.json AND manifest.json
  - name: Git Push
    command: git push && git push --tags
