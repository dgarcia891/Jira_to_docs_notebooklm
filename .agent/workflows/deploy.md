---
name: deploy
description: Secure Release Pipeline (v20.2)
---
1. Security & Integrity Gate
   node scripts/security_scan.cjs
   node scripts/drift_check.cjs
   node scripts/detect_mocks.cjs
   // turbo

2. Test Gate
   npm run test:unit
   // turbo

3. Release
   node scripts/release.js patch
   git push origin main
   // turbo

4. Completion
   echo "✅ Deployed. Run /verify for visual audit."
   // turbo