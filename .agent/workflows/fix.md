name: fix
description: Chrome-specific Test-Driven Fix Loop.
steps:
  - name: Recall
    command: node scripts/consult.js
  - name: Reproduce
    command: npm run test:unit # Must fail first
  - name: Fix
    command: echo "Implementing fix (Check Manifest V3 compliance)..."
  - name: Verify
    command: npm run test:unit
  - name: Silent Learn
    command: echo "Appending solution to docs/LESSONS_LEARNED.md..."
