# Architecture Documentation

## 1. Tech Stack
- **Core Framework**: React 19 + TypeScript (Vite)
- **Extension Framework**: CRXJS (Manifest V3)
- **State Management**: React `useState` + `chrome.storage.local` (Persistence)
- **Styling**: Inline CSS (Standard React style objects)
- **Testing**: Vitest (Infrastructure present, coverage TBD)
- **APIs**:
    - **Google Identity**: OAuth2 (Client-side)
    - **Google Docs API**: Direct REST calls via `fetch`
    - **Jira**: DOM Scraping (No API integration detected)

## 2. Core Data Flow

### A. Data Ingestion (Jira -> Extension)
- **Source**: `src/content.ts`
- **Method**: DOM Scraping (Selectors in `src/parsers/jira.ts` implicitly).
- **Triggers**:
    1. Page Load/Tab Update -> Background detects URL.
    2. Popup Open -> Sends `GET_CURRENT_ISSUE_KEY` / `EXTRACT_ISSUE` to active tab.
- **Epic Bulk Sync**: `src/content.ts` recursively discovers child links from the Epic Activity/Child Issues panel and iterates through them to scrape data.

### B. State Persistence (The "Brain")
- **Storage**: `chrome.storage.local`
- **Key Stores**:
    - `auth_token`: Google OAuth Access Token.
    - `selectedDoc`: Globally selected Global/Master Google Doc.
    - `issueDocLinks`: Map of `{ [JiraKey]: { docId, name } }` (Links specific tickets to specific docs).
    - `syncState`: Progress tracking for Bulk/Epic syncs (shared between Background and Popup).

### C. Data Egress (Extension -> Google Docs)
- **Executor**: `src/background.ts` via `src/services/docsSync.ts`.
- **Method**: Appends text/tables to the Google Doc.
- **Logic**:
    - Checks for existing "Header" for the issue.
    - If found -> Updates/Replaces (Logic to be confirmed).
    - If new -> Appends to the end of the doc.

## 3. Implicit Logic & Constraints
- **"Master Doc" Assumption**: The system heavily relies on a "Link to Doc" model where users manually map a Jira context to a Google Doc.
- **DOM Reliance**: The scraper is fragile to Atlassian UI changes (`data-testid`, `aria-label` strategies used).
- **Session Cookie Dependency**: Epic Bulk Sync relies on the user being logged into Jira in the active tab to fetch child pages.
