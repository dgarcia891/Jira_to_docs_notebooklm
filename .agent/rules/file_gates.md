# Chrome File Gates (v14.2)

## ✅ SAFE TO EDIT
*   `src/components/` (Popup/Options UI)
*   `src/logic/` (Business Logic)
*   `src/content/` (Content Scripts)

## ⚠️ RESTRICTED (Architectural Core)
*   `manifest.json`: **READ-ONLY** unless explicitly authorized.
*   `src/background/`: **Service Worker Only**. No DOM access. No persistent variables.

## ❌ FORBIDDEN
*   `src/background/background.html` (Manifest V2 Legacy - DO NOT CREATE)
*   Inline Scripts (CSP Violation)
*   Files > 500 Lines (Refactor Mandatory)
