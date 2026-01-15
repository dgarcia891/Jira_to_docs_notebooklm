# Product Requirements Document: Jira to NotebookLM Connector

**Version:** 1.0
**Created:** 2026-01-15
**Status:** DRAFT
**GitHub:** Local (Pending Remote)

---

## 1. Executive Summary
The **Jira to NotebookLM Connector** is a Chrome Extension that enables product and engineering users to instantly sync Jira issue content into a Google Doc acting as a NotebookLM source. This solves the problem of manual "copy-paste/export-upload" cycles, ensuring NotebookLM always reasons over fresh data.

## 2. Problem Statement
Product and engineering teams using NotebookLM for analysis must constantly re-export and re-upload Jira issues because there is no simple way to sync live tickets into a NotebookLM-friendly document. This manual process is slow, error-prone, and causes NotebookLM to reason over stale data.

## 3. Goals & Success Criteria

### Goals (V1)
- **Individual Use:** "My browser, my Jira access, my Google account."
- **One-Way Push:** Unidirectional sync from Jira to Google Docs.
- **Simplicity:** No shared team configuration or complex backend for V1.

### Success Criteria
| Metric | Target |
|--------|--------|
| **Performance** | Click Sync → Content in Doc < 3 seconds |
| **Reliability** | Parsing success > 95% on standard Issue/Bug/Story types |
| **UX** | "It just works" - Install, Auth, Click Sync, See Data |

## 4. Target Users
- **Primary:** Product Managers, Tech Leads, BAs using Jira Cloud + NotebookLM.
- **Secondary:** Individual Contributors needing to turn Jira tickets into "project docs".
- **Environment:** Jira Cloud, Chrome Browser, Google Workspace.

## 5. Core Features (MVP Scope)

### Feature 1: Jira DOM Extraction
- **ID:** F-001
- **Description:** robustly extract issue data (Key, Summary, Status, Desc, etc.) from the Jira Cloud DOM.
- **Implementation:** Layered strategy (Data attributes -> Semantic fallbacks).
- **Priority:** P0

### Feature 2: Google Authentication & Doc Selection
- **ID:** F-002
- **Description:** Simple OAuth flow via `chrome.identity` to connect Google account and select/create a target "Master Doc".
- **Priority:** P0

### Feature 3: One-Click Sync
- **ID:** F-003
- **Description:** Button injected into Jira UI (or popup) to trigger sync. Pushes formatted content to the selected Google Doc.
- **Priority:** P0

### Feature 4: Idempotent Section Sync
- **ID:** F-004
- **Description:** Intelligent sync that **updates existing sections** instead of appending. The extension searches the Doc for a header matching the Issue Key (e.g., `## PROJ-123: Summary`).
  - **If found:** Replaces the content under that header up to the next header.
  - **If not found:** Appends a new section at the end of the doc.
- **Priority:** P0

## 6. Technical Architecture

### Tech Stack
- **Build:** Vite
- **Framework:** React (Options/Popup), Vanilla JS/TS (Content Script)
- **Manifest:** V3
- **Test:** Vitest (for DOM parsing logic)

### Key Decisions
- **Auth:** `chrome.identity` + Google OAuth 2.0.
- **Sync Logic:** 
  1. Fetch Doc content.
  2. Regex search for `^## {ISSUE_KEY}`.
  3. **Range Replacement** (via `batchUpdate` `deleteContentRange` + `insertText`) to update in-place.
- **Data Model:** Generic `WorkItem` interface to support future sources (Trello, GitHub).

## 7. Future Features (Post-MVP)
| Feature | Priority | Ease of Integration |
|---------|----------|-------------------|
| Batch/Bulk Sync | P1 | High (Reuse pipeline) |
| Two-Way Sync | P2 | Low (Complex) |
| Background Auto-Sync | P2 | Medium |
| Multi-Source (Trello/GitHub) | P2 | High (If generic model used) |

## 8. Constraints & Risks
| Risk | Mitigation |
|------|------------|
| **Jira DOM Changes** | Robust parsing strategies, Unit tests for parsers, "Graceful degradation" fallback. |
| **Google API Quotas** | Single `batchUpdate` per sync action. |
| **Auth Friction** | Minimal scopes, clear UI prompts. |

## 9. Timeline
- **Phase 0:** Setup & Prototype (Current)
- **Phase 1:** Core Parsing & Auth
- **Phase 2:** Sync Logic & Formatting
- **Phase 3:** Polish & Release (MVP)

---
*This document is the source of truth. All changes require update via Change Request.*
