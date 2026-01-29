# Chrome Architect Standards (v10.0)

## 1. Manifest V3 Strictness
*   **Service Workers:** You MUST use `background.service_worker`. Background pages are forbidden.
*   **State Persistence:** Service Workers terminate. NEVER rely on global variables. Use `chrome.storage.local`.
*   **Async Messaging:** All `runtime.sendMessage` calls MUST handle `chrome.runtime.lastError` to prevent "Channel closed" errors.

## 2. Security Clamps
*   **CSP Compliance:** No `eval()`, no `new Function()`, no inline scripts.
*   **Remote Code:** No loading scripts from external CDNs (must be bundled).

## 3. The 500-Line Limit
*   **Refactor:** If `content.js` or `service-worker.js` exceeds 500 lines, refactor into modules immediately.
