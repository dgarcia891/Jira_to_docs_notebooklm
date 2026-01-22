# Change Request: Dynamic Doc Naming (CR-001)

## Status
- **Date:** 2026-01-21
- **Author:** Antigravity
- **Status:** APPROVED (Implicit by User Request)

## Description
Modify the document creation logic to allow for dynamic naming based on the parent and child issue keys. This improves visibility and searchability in NotebookLM when dealing with Epics and their children.

## Proposed Changes
### Functional Changes
- When the extension is opened on an Epic page, it should fetch the keys of all child tickets.
- The "New Document" name field should be pre-populated with the format: `[ParentKey], [ChildKey1], [ChildKey2]...`.
- If the title becomes excessively long, it should be truncated with `...` (Standard Google Docs behavior).

### Technical Changes
- **`src/content.ts`**: Update `handleGetIssueKey` to fetch child keys for Epics.
- **`src/App.tsx`**: Update `checkCurrentPageLink` to handle the broad list of keys and update the title state.

## Impact
- **UI**: The title field in the "Create Doc" screen will now show multiple keys for Epics.
- **Performance**: A slight delay (approx 500ms) on Epic pages to fetch the JQL results.
