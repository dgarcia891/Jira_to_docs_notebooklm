# 🧠 Chrome Dev Lessons

## UI & Branding
- **State Cleanup**: When using persistent storage (like `chrome.storage.local`) for ephemeral user intents (like "Select this doc for the NEXT sync"), always clear the state immediately after consumption to prevent side effects on future actions.
- **Color Consistency**: Always use `#0052CC` for primary Atlassian-style buttons. Avoid using variations like `#0065FF` unless a specific intentional deviation is required (e.g., hover states or distinct action categories).
- **Primary Action Hierarchy**: In UIs with multiple action buttons, ensure only one button is styled as "Primary" (Blue) to guide the user. Use conditional logic to toggle primary states based on the most relevant recent action.
- **Visual Verification**: Use the Visual Swarm protocol (Browser Agent) to verify UI changes that cannot be caught by unit tests.

## Development Environment
- **Vite & Extensions**: When developing Chrome Extensions with Vite, always enable `server.cors: true` and `server.strictPort: true` to prevent CORS blocks and port-mismatch issues during HMR/Service Worker registration.
- **Interface Consistency**: Ensure message payload interfaces (e.g., `id` vs `docId`) match exactly between frontend and background scripts. Missed fields can lead to silent failures where objects exist but properties are undefined.
- **UX/State Dependencies**: When an action (e.g., Sync) depends on a prerequisite state (e.g., Linked Document) that is missing, the UI should guide the user to the prerequisite action (e.g., 'Link & Sync') rather than allowing the action to fail silently or with a generic error.
- **Async State Feedback**: Always trigger a UI state update (e.g., 'Initializing') *before* starting potentially long-running or hanging async operations (like Auth flows) in background scripts. This prevents 'dead clicks' where the UI appears unresponsive.
- **HMR & Extension Context**: The "Extension context invalidated" error in HMR clients is often due to outdated tooling. Upgrading packages like `@crxjs/vite-plugin` to the latest stable version (e.g., v2.3.0+) resolves connection drops during reloads.
### UI Regression Fix (v9.5.13)
- **State Consumed, State Cleared**: When a background process (like Sync) updates a persistent storage key (like activeSyncState), the UI component 'consuming' that state must also clear the storage once the user has been notified. Failing to do so causes 'ghost' notifications on next mount.
- **Mock Safety**: Avoid calling .catch() or .then() on chrome API mocks (like vi.fn()) in tests unless explicitly mocking a Promise. Standard Chrome APIs return undefined in many mock environments, leading to TypeErrors in tests that don't manifest in browser environments (where return is a Promise or a safe callback handler).
