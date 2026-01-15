---
name: new-feature
description: Workflow for implementing a new feature from PRD
---

# New Feature Workflow

1. Verify feature exists in PRD (docs/PRD.md)
2. If not in PRD → Generate Change Request, STOP
3. Search Knowledge Base for relevant patterns
4. Spawn Developer Agent with:
   - PRD acceptance criteria
   - Relevant Knowledge Base patterns
5. When code complete → Spawn Reviewer Agent
6. When review approved → Spawn Tester Agent
7. When tests pass → Commit and push
8. Update PRD feature status to COMPLETE
9. Save successful patterns to Knowledge Base
