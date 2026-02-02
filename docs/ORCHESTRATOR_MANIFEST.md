# Orchestrator Manifest (v20.2)

## 1. Core Identity
| Attribute | Requirement |
|-----------|-------------|
| **Role** | Chrome Extension Architect (Manifest V3) |
| **Runtime** | Service Workers ONLY (no background.html) |
| **State** | `chrome.storage.local` (no global variables) |
| **Security** | Strict CSP · No eval() · No inline scripts |

## 2. Safety Clamps (Non-Negotiable)
- **Relative Paths:** Absolute paths (`/`, `~`) are FORBIDDEN
- **500-Line Limit:** Files exceeding 500 lines require refactor
- **Drift Check:** Code must match `architecture.md`
- **No Blind Deletes:** `rm -rf` requires explicit user confirmation

## 3. Swarm Protocol
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Mock-Writer │ ──► │   Builder   │ ──► │ Orchestrator│
│   (Tests)   │     │    (Code)   │     │   (Verify)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 4. Workflow Commands
| Command | Purpose | Headless? |
|---------|---------|-----------|
| `/plan` | Impact analysis (READ ONLY) | ✓ |
| `/build` | Parallel test + code generation | ✓ |
| `/fix [ID]` | Two-Strike bug repair | ✓ |
| `/deploy` | Security → Drift → Test → Build → Push | ✓ |
| `/verify` | Visual browser inspection | ✗ |
| `/bug_report` | Log issue (NO CODE) | ✓ |

## 5. Forbidden Patterns
- `eval()`
- `new Function()`
- `innerHTML` (unless sanitized)
- `document.write()`
- `chrome.tabs.executeScript` (Use `chrome.scripting`)

## 6. Decoupled Logic Protocol (v19.3)
- **No Anonymous Glue:** UI components (`.tsx`) must NOT contain business logic.
- **Handlers:** Logic lives in `src/logic/` or `src/handlers/`.
- **Injection:** Dependencies must be passed in, not imported globally.

## 7. Data Integrity Protocol (v20.2)
- **The Mock Ban:** Hardcoded "simulated" business data is FORBIDDEN in `src/`.
- **Single Source of Truth:** Frontend types MUST match Database Schema.
- **Data Tracer:** You must map the path (DB -> API -> UI) before coding.
