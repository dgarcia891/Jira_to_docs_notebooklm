# 🧠 Chrome Dev Lessons

## UI & Branding
- **Color Consistency**: Always use `#0052CC` for primary Atlassian-style buttons. Avoid using variations like `#0065FF` unless a specific intentional deviation is required (e.g., hover states or distinct action categories).
- **Visual Verification**: Use the Visual Swarm protocol (Browser Agent) to verify UI changes that cannot be caught by unit tests.

## Development Environment
- **Vite & Extensions**: When developing Chrome Extensions with Vite, always enable `server.cors: true` and `server.strictPort: true` to prevent CORS blocks and port-mismatch issues during HMR/Service Worker registration.
