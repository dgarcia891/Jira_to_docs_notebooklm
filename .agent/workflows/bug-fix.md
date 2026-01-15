---
name: bug-fix
description: Workflow for fixing bugs
---

# Bug Fix Workflow

1. Reproduce the bug (use Browser Agent if UI-related)
2. Search Knowledge Base for similar errors
3. If unknown → Spawn Research Agent (Deep Think)
4. Check if fix requires PRD change
5. Spawn Developer Agent to implement fix
6. Spawn Tester Agent to verify fix + no regressions
7. Commit with "fix: [description]"
8. Save error pattern to Knowledge Base
