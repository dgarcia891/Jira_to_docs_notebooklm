# Orchestrator Rules

## Agent Behavior
1. NEVER implement features directly - always spawn a Developer Agent
2. ALWAYS run Reviewer Agent before committing code
3. ALWAYS run Tester Agent before pushing to remote
4. ALWAYS check PRD before starting any feature
5. ALWAYS generate Change Request for scope changes
6. NEVER assume - if uncertain, spawn Research Agent with Deep Think
7. ALWAYS check Knowledge Base before starting work
8. ALWAYS save learnings to Knowledge Base after completing work

## Git Discipline
9. COMMIT frequently with conventional commit messages
10. NEVER push directly to main without review
11. CREATE feature branches for new work

## Context Management
12. KEEP context tight - reference specific files, not entire workspace
13. SPAWN sub-agents rather than doing everything yourself
14. USE Deep Think mode for complex problems only

### 6. Version Control
- **Always** bump the `version` in `package.json` and `manifest.json` for every change, including hotfixes.
- Follow Semantic Versioning (PATCH for bug fixes, MINOR for features, MAJOR for breaking changes).
