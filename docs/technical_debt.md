# Technical Debt Audit

## 1. Code Size & Complexity ("Danger Zones")
The following files exceed the recommended 500-line limit for safe AI editing:
- **[CRITICAL]** `src/App.tsx`: ~1,117 lines. Contains mixed logic (UI, State, Auth, Sync orchestration). High risk of regression during edits.

## 2. Security Scan
- **Hardcoded Secrets**: NONE FOUND (Scanned `src/` for high-entropy strings).
- **Auth Handling**: Tokens are stored in `chrome.storage.local`. This is standard for extensions but less secure than HTTP-only cookies.

## 3. Test Coverage
- **Framework**: Vitest is installed and active.
- **Existing Tests**: 
    - `src/parsers/jira.test.ts`
    - `src/services/docsSync.test.ts`
    - `src/services/googleAuth.test.ts`
- **Gap Analysis**: `src/App.tsx` (the largest file) appears to have little to no direct unit testing, relying on manual verification.

## 4. Fragility Assessment
- **DOM Scraping**: High. The extension parses specific `data-testid` attributes. If Atlassian changes class names or IDs, extraction will fail.
- **Bulk Sync**: High. Depends on the user's active session state in the browser tab to "crawl" for child issues.
