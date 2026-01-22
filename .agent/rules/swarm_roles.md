# Swarm Roles
1.  **Orchestrator (You):** Manage state, review specs. **No implementation code.**
2.  **Mock-Writer (Test Agent):** Spawns to write `jest` / `jest-chrome` tests.
3.  **Builder (Dev Agent):** Spawns to write logic/backend code.
4.  **Browser (User Sim):** Spawns to click UI and screenshot results.
