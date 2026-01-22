# Project Rules & Protocols

This document defines the mandatory processes for developing and maintaining the Jira to NotebookLM Chrome Extension.

## 1. Release Protocol
*   **Strict Versioning:** No new code (features or bug fixes) can be merged or released without a corresponding version bump in `package.json` and `manifest.json`.
*   **Changelog Sync:** Every version bump must have a dedicated entry in `docs/CHANGELOG.md` detailing the changes.
*   **No "Squeezing":** Do not add "just one more fix" to an already-shipped version number. Bump the version.

## 2. Regression Prevention
*   **Consult History:** Before implementing any complex feature or fix, review `docs/CHANGELOG.md` and `BUG_LOG.md` (if available) to ensure we are not repeating past mistakes (e.g., the "410 Gone" vs "POST/GET" endpoint saga).
*   **Document Regressions:** If a regression is discovered, it must be logged immediately in `BUG_LOG.md` with:
    *   The Issue
    *   The Technical Root Cause
    *   The Process Root Cause
    *   The Fix
    *   The Lesson Learned

## 3. Documentation
*   **Living Documents:** `PRD.md`, `task.md`, and `CHANGELOG.md` are living documents. Update them as work progresses, not just at the end.
*   **Bug Log:** Maintain `BUG_LOG.md` as the source of truth for "institutional memory" regarding technical pitfalls.

## 4. Testing
*   **Test-First Mandate:** Every bug fix and new feature MUST be accompanied by a dedicated regression test file in `src/tests/regression/`.
*   **Reproduction First:** For bugs, the test should be created BEFORE the fix to confirm the reproduction of the failure.
*   **Automated Verification:** All regression tests (`npm run test:regression`) must pass before a version is bumped and deployed.
*   **Manual Sanity Check:** In addition to automated tests, perform a manual "sanity check" (sync a real ticket) after any logic change in `content.ts` or `background.ts`.
