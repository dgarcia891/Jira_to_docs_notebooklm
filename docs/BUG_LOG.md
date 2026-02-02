# Bug Log
| ID | Status | Severity | Description | Fix |
|----|--------|----------|-------------|-----|
| BUG-000 | CLOSED | Low | System Initialization | - |

| BUG-SEC-01 | CLOSED | CRITICAL | [Security] innerHTML usage detected in Jira parser (CSP Violation) | Replaced innerHTML with DOMParser for safe, inert parsing. | 2026-01-31 |
| BUG-REG-01 | CLOSED | HIGH     | [Regression] Extension load failure due to bypass of Vite build | Restored `vite build` in package.json and removed legacy scripts. | 2026-02-02 |
| BUG-AUTH-01| CLOSED | HIGH     | [Auth] Frequent re-login required after several hours of inactivity | Implemented proactive 30-min background refresh via `chrome.alarms`. | 2026-02-02 |
