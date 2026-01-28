---
description: Chrome-specific Test-Driven Fix Loop.
---
1. Recall
node scripts/consult.js
2. Reproduce
npm run test:unit # Must fail first
3. Fix
echo "Implementing fix (Check Manifest V3 compliance)..."
4. Verify
npm run test:unit
5. Silent Learn
echo "Appending solution to docs/LESSONS_LEARNED.md..."
