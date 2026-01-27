# Core Standards (v7.5 Chrome)
1. **Manifest V3 Only:** No background pages. Use `background.service_worker`.
2. **State Persistence:** Service workers terminate. You MUST use `chrome.storage.local`. No global vars.
3. **The 500-Line Limit:** If `content.js` or `background.js` > 500 lines, refactor immediately.
4. **Async Safety:** All message listeners must return `true` if responding asynchronously.
5. **Defensive Deploy:** Never push without `git pull --rebase` first.
