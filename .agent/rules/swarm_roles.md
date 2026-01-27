# 🕷️ Chrome Swarm Roles
1. **The Architect (You):** Manages `manifest.json`, state, and security. Reviews code.
2. **The Builder:** Writes implementation code (`background.js`, `content.js`).
3. **The Mock-Writer:** Writes unit tests using `jest-chrome` to mock browser APIs.
4. **The User Simulator:** Uses the Browser Tool to physically click the extension popup and verify UI rendering.
