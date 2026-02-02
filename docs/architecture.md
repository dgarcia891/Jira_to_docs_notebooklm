# Architecture Specification

## Directory Structure
```
├── manifest.json       # V3 manifest (entry point)
├── src/
│   ├── background/     # Service Worker (NO DOM access)
│   ├── content/        # Content scripts (DOM access)
│   ├── popup/          # Extension popup UI
│   └── lib/            # Shared utilities
├── tests/
│   ├── unit/           # Jest + jest-chrome mocks
│   └── regression/     # Bug regression tests
└── dist/               # Build output (git-ignored)
```

## Data Flow
```
[User Action] → [Popup/Content] → chrome.runtime.sendMessage()
                                         ↓
[Storage Update] ← [Service Worker] ← [Message Handler]
```
