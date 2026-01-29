
## [9.5.26] - 2026-01-29
- Automated release build.

## [9.5.25] - 2026-01-29
- Automated release build.

## [9.5.24] - 2026-01-29
- Automated release build.

## [9.5.23] - 2026-01-29
- Automated release build.

## [9.5.22] - 2026-01-29
- Automated release build.
# Changelog

## [9.5.21] - 2026-01-28
### Fixed
- **Persistent Link UI**: Fixed bug where the "LINKED DOCUMENT" card would show stale or incorrect document info after a successful sync. Added automatic UI refresh on sync completion.
- **Document Name Resolution**: Fixed bug where document names were not correctly resolved when linking an existing document from the "Browse Folders" view.


## [9.5.20] - 2026-01-28
### Fixed
- **Drive Search & Browse**: Unified Drive access to include both files and folders in search results and folder browsing. You can now correctly find and link documents even if they are inside folders, and navigate to folders found via search.


## [9.5.19] - 2026-01-28
### Fixed
- **Drive Visibility**: Fixed critical bug where "Browse Folders" would show "This folder is empty" due to an API message type mismatch.


## [9.5.18] - 2026-01-28
### Fixed
- **State Pollution**: Fixed bug where "Synced" banners would persist across different Jira issues. Added strict key matching to ensure banners only show for the relevant issue.
- **Data Safety**: Implemented automatic cleanup of stale "Pending Link" (selectedDoc) state on popup open to prevent accidental linking of new issues to old documents.
- **Test Stability**: Hardened test setup with robust global chrome mocks.


## [9.5.17] - 2026-01-28
### Added
- **Deployment**: Official version bump for HMR fix and recent UI improvements.


## [9.5.16] - 2026-01-28
### Fixed
- **DevEx**: Added global error boundary in content script to catch and recover from "Extension context invalidated" errors caused by HMR client crashes during development reloads.


## [9.5.15] - 2026-01-27
### Added
- **Deployment**: Official version bump for finalized UI/UX improvements.


## [9.5.14] - 2026-01-27
### Fixed
- **UI Logic**: Eliminated "New Link Pending" and "No document linked" card overlap. Only the most relevant card is now shown.
- **UX Feedback**: Added immediate "Preparing document..." feedback (5% progress) when clicking "Link & Sync" to prevent the UI from appearing stuck at 0% during Doc creation.


## [9.5.13] - 2026-01-27
### Fixed
- **UI Layout**: Fixed excessive whitespace regression in popup by reducing `min-height` to 320px.
- **Banner Persistence**: Fixed "2-click" close bug where the sync success banner would persist across popup sessions. The state is now correctly cleared from storage once consumed.
- **Async Safety**: Added defensive checks for `chrome.storage` API availability in component handlers.


## [9.5.12] - 2026-01-27
### Added
- **Premium UI Refactor**: Fully migrated from in-line styles to Vanilla CSS (`App.css`).
- **Aesthetic Overhaul**: Added hover effects, micro-animations (fade-in, spin), and improved component layout for a more premium experience.
- **Dynamic Naming Truncation**: Suggested document titles are now capped at 200 characters to prevent issues with Google Docs API limits when syncing large Epics.

### Fixed
- **Dead Code Removal**: Cleaned up legacy iteration logic in `docsSync.ts`.
- **Documentation Correction**: Updated `architecture.md` to correctly reflect the Jira REST API v3 as the primary data source.
- **Improved Testing**: Completed regression tests for the "Pending Link Cancel" UI.


## [9.5.11] - 2026-01-28
### Fixed
- **DevEx**: Added a "Safety Loop" in the content script (dev mode only) to auto-reload the page when the extension context is invalidated, preventing HMR client crashes.

## [9.5.10] - 2026-01-28
### Fixed
- **Authentication Resilience**: Upgraded HMR client dependency to fix "Extension context invalidated" errors during development reloads.

## [9.5.9] - 2026-01-28
### Fixed
- **Pending Link UI**: Added a "Cancel" button to the pending link notification, allowing users to dismiss accidental link selections.
- **UI Clarity**: Hidden the "Current Link" box when a "Pending Link" is active to prevent confusion.
- **Sticky Selection**: Explicitly clears `selectedDoc` from storage when cancelled.

## [9.5.8] - 2026-01-27
### Fixed
- **Sync Stuck at 0%**: Immediate "Initializing" feedback.
- **Sync Individual for Unlinked Issues**: Improved workflow.
- **Extension Context Invalidated**: Graceful error handling.

## [9.5.3] - 2026-01-27
### Fixed
- **Change Link Workflow**: Explicitly clear `selectedDoc` from storage after a sync operation to prevent "sticky link" behavior where new selections were ignored.
- **Title Formatting**: Updated default document title to "KEY: Title" (e.g., "PROJ-123: Fix Login") instead of just "Title".

## [9.5.3] - 2026-01-27
### Fixed
- **Change Link Workflow**: Explicitly clear `selectedDoc` from storage after a sync operation to prevent "sticky link" behavior where new selections were ignored.
- **Title Formatting**: Updated default document title to "KEY: Title" (e.g., "PROJ-123: Fix Login") instead of just "Title".

## [9.5.2] - 2026-01-27
### Fixed
- **UI Interaction**: Standardized sync button highlights to ensure only one primary action is visible at a time. Defaulted to "Sync Individual" for new issues or single-sync history.

## [9.5.1] - 2026-01-27
### Fixed
- **Service Worker CORS**: Enabled CORS on Vite dev server to allow `chrome-extension://` origins to fetch environment and HMR scripts, resolving registration failures (Status code: 3).

## [9.5.0] - 2026-01-27
### Added
- **Visual Swarm Protocol**: Integrated browser-agent verification requirements for UI tasks.
- **Visual Tooling**: Added `scripts/visual_check.js` and `artifacts/verification/` directory.
- **Swarm Roles**: Defined Architect, Builder, and Photographer roles in `.agent/rules/swarm_roles.md`.
### Changed
- **Identity Upgrade**: Synced system version to `v9.5-CHROME-VISUAL` and updated identity beacons.
- **Core Standards**: Mandated visual proof for UI verification in `.agent/rules/core_standards.md`.
- **Workflow Overhaul**: Updated `/fix` workflow for context-aware logic and visual branching.
- **UI Fix**: Standardized popup button colors to Atlassian Primary Blue (`#0052CC`), resolving inconsistency between individual and bulk sync buttons.

## [7.5.0] - 2026-01-27
### Changed
- **Recall Engine Upgrade**: Overhauled `scripts/consult.cjs` to explicitly target `LESSONS_LEARNED.md`, `BUG_LOG.md`, and `architecture.md` for deeper active recall.
- **Identity Alignment**: Synced internal identity beacon to `v7.5` to match system version and protocol standards.

## [4.8.31] - 2026-01-27
### Fixed
- **Dead Link Cleanup**: Automatically detects and clears cached links to Google Docs that have been deleted or moved to trash, resolving the "Failed to fetch doc (404)" error.
- **Graceful Error Recovery**: Re-links are automatically suggested when a stale document is identified during sync.

## [4.8.30] - 2026-01-26
### Added
- **Per-Page Sync Persistence**: The extension now remembers which sync button ("Sync Individual" or "Sync All") was last used for each specific Jira issue.
- **Improved UI Highlighting**: The active sync method for a page is now clearly highlighted, ensuring visual consistency across different Jira tickets.

## [4.8.29] - 2026-01-26
### Added
- **Authentication Resilience**: Implemented automated token clearing and a single-retry mechanism for all Google API calls. If a session expires or a `401 Unauthorized` occurs, the extension now silently attempts a refresh before failing.
### Changed
- **Proactive Token Refresh**: Reduced the internal token expiry buffer to 50 minutes (from 58 mins) to ensure the extension requests a fresh token *before* the Google 1-hour limit is reached.
- **Improved Silent Refresh**: Hardened the authentication service to clear stale local caches if a silent refresh fails, preventing repetitive login prompts.

## [4.8.28] - 2026-01-23
### Fixed
- **Metadata Cleanup**: Removed duplicate Story Points entries from the synchronized Google Doc.

## [4.8.27] - 2026-01-23
### Added
- **Manual Refresh**: Added a 🔄 button to the header to manually re-scan Jira page info.
### Fixed
- **T-Shirt Size Parsing**: Fixed an issue where T-Shirt sizes stored as arrays in Jira rendered as raw JSON.
### Changed
- **Story Points Prominence**: Moved Story Points to the top of the metadata section for better visibility.

## [4.8.26] - 2026-01-23
### Added
- **Story Points Support**: Extracted and displayed Jira Story Points/Estimates in the metadata section of synced tickets.

## [4.8.25] - 2026-01-23
### Changed
- **Timezone Transparency**: Standardized all date formatting across the extension. All timestamps (Synced, Created, Updated, and Comments) now include a local timezone indicator (e.g., "PST") to clarify discrepancies between Jira's UI and the browser's local time.

## [4.8.24] - 2026-01-22
### Changed
- **Error Logging Refinement**: Suppressed redundant `console.error` logs in the background script for expected lifecycle events (like "Extension updated" messages). This ensures a cleaner developer console while still providing the necessary guidance to the user via the UI.

## [4.8.23] - 2026-01-22
### Added
- **Persistent Progressive Sync**: Implemented a robust progress tracking system that persists across extension popup closures.
    - New animated **Progress Bar** component.
    - Background state management ensures you always see the latest sync status when reopening the extension.
    - Success/Error persistence: If a sync completes while you are away, the result is captured and shown immediately upon your return.

## [4.8.22] - 2026-01-22
### Changed
- **Automated Clone Filtering**: The sync engine now automatically identifies and excludes Jira tickets linked via the "Cloners" relationship type. This removes historical noise and ensuring your synchronized Google Doc is focused solely on current, relevant work items for NotebookLM analysis.

## [4.8.21] - 2026-01-22
### Changed
- **UI Refinement**: Redesigned the popup layout for better ergonomics.
    - Sync buttons ("Sync Individual" and "Sync All") are now horizontally aligned and equal width.
    - Simplified footer: "Change Link" and "Settings" are now consolidated as text links at the bottom.

## [4.8.20] - 2026-01-22
### Added
- **Recursive Deep Context Sync**: Every linked issue now includes its **Full Description**, **Status**, and **All Comments**. This provides a much deeper layer of context for NotebookLM, allowing the AI to understand dependencies without navigation.
### Changed
- **Reverted Item Suppression**: Removed the logic that suppressed descriptions for already-synced items. Redundant data is now preserved as requested to ensure inclusive context for the AI.
- **Removed Deduplication**: Linked keys are no longer deduplicated, ensuring all Jira relationships (Sub-tasks vs Links) are rendered exactly as they appear in the source.

## [4.8.19] - 2026-01-22
### Fixed
- **Linked Issue Deduplication**: Linked tickets and subtasks are now deduplicated before display, ensuring a cleaner linked list in your synced documents.
- **Smart Context Suppression**: When a linked ticket is already synchronized as a full section in the same document, its redundant "Rationale/Context" (based on its latest comment) is suppressed to prevent repetitive text in your NotebookLM source.

## [4.8.18] - 2026-01-22
### Changed
- **Full Wipe & Replace Sync**: Completely refactored the sync engine to follow a "Nuclear Wipe" strategy. Every sync now clears the entire document before inserting gathered data. This eliminates all duplicate entry bugs and ensures your Google Doc is always a clean, up-to-date snapshot of your Jira tickets.
- **Bulk Epic Sync**: Optimized Epic syncing to gather all child tickets first and perform a single, efficient bulk insertion after clearing the document.

## [4.8.17] - 2026-01-22
### Changed
- **Aggressive Sync Replacement**: Removed style restrictions from section detection. The sync service now identifies and replaces previous ticket entries regardless of whether they are formatted as Headings or Normal Text. This ensures a clean "full-replace" behavior and prevents duplicate entries even on manually edited documents.

## [4.8.16] - 2026-01-22
### Fixed
- **Flexible Sync Matching**: Improved the section discovery logic to recognize keys wrapped in brackets or preceded by prefixes (e.g., `[ETBSC-1212]`). This prevents duplicate entries from being created when different Jira header formats are present in the same Google Doc.

## [4.8.15] - 2026-01-22
### Fixed
- **Improved Background Stability**: Added specific error detection for extension lifecycle events. The extension now intelligently suggests a **Page Refresh** when communication with the Jira content script is interrupted due to an update.
- **Robust URL Parsing**: Expanded Jira page detection to officially support **Software Boards and Backlogs** (where the issue key is in a `selectedIssue=` parameter).

## [4.8.14] - 2026-01-22
### Fixed
- **Precise Sync Replacement**: Implemented regex-based key matching in the Google Docs sync service. This fixes a critical bug where tickets with similar keys (e.g., TEST-1 and TEST-10) would collide, causing incorrect section replacements or duplicate entries.

## [4.8.13] - 2026-01-22
### Added
- **Comment Divider**: Added a visual dashed separator between the ticket information and the comments section in the Google Doc sync to improve readability.

## [4.8.12] - 2026-01-22
### Fixed
- **Restored "Sync Epic" Button**: Fixed a bug where the background script was stripping out the issue type metadata, causing the "Sync Epic & Children" button to stay hidden. It now correctly forwards the full issue info to the popup.

## [4.8.11] - 2026-01-22
### Added
- **Agile Parent Verification**: Backfilled regression tests for Epic child discovery logic to ensure cross-ticket relationship extraction (Parents/Children) is stable and functional.

## [4.8.10] - 2026-01-22
### Added
- **Release Protocol Verification**: Implemented a functional `release.cjs` script and a corresponding regression test to ensure version consistency and changelog compliance before every deployment.

## [4.8.9] - 2026-01-22
### Added
- **"Test-First" Protocol**: Formally adopted a mandatory regression testing policy in `PROJECT_RULES.md`.
- **Backfilled Regression Tests**: Created 3 new test suites to cover recent fixes (Link Normalization, Sync Timestamps, and UI Consolidation), ensuring these features remain stable in future versions.
### Refactored
- **Shared Utilities**: Extracted link normalization logic to `src/utils/docUtils.ts` for improved testability.

## [4.8.8] - 2026-01-22
### Fixed
- **Robust Document Link Fix**: Implemented a normalization layer to handle both `id` and `docId` properties in storage. This ensures that the "Open" button in the Linked Document box works correctly for both existing and new links.
- **Defensive Rendering**: Added safety checks in the UI to prevent `undefined` URLs even if storage data is inconsistent.

## [4.8.7] - 2026-01-22
### Changed
- **Link Consolidation**: Removed the redundant "Open Doc" link from the success banner and consolidated all document access into the persistent "Open" button in the Linked Document box.
- **Data Standardization**: Fixed a naming discrepancy between background and frontend data properties to ensure the "Open" button always works correctly.

## [4.8.6] - 2026-01-22
### Fixed
- **Broken Document Link**: Fixed the issue where sync completion links were pointing to `undefined` by ensuring the background script correctly returns the document ID to the UI.

## [4.8.5] - 2026-01-22
### Fixed
- **Restored Document Link**: Added a clickable "Open" link to the Linked Document banner in the popup for quick access to the Google Doc.
- **Success Banner Link**: The sync completion banner now includes a direct link to the synced document.
### Added
- **Sync Timestamp**: Added a `Synced: [Date/Time]` line to the metadata block in the Google Doc to clearly show when content was last updated.

## [4.8.4] - 2026-01-22
### Changed
- **Radical UI Rollback**: Removed all persistent status banners, stage-based progress bars, and complex UI states. Reverted the extension to its most basic functional state (v4.7.0 style).
- **Clean Slate Policy**: Closing the popup now resets all UI states. No more "stuck" syncing indicators from previous sessions.

## [4.8.3] - 2026-01-22
### Changed
- **Classic Sync Restoration**: Reverted the background sync orchestration to "blocking" mode. The popup will now wait for the sync to complete, providing more reliable feedback and avoiding background script context loss.
- **Removed Comment Expansion**: Disabled recursive DOM comment expansion to prevent hangs on complex Jira tickets.

## [4.8.2] - 2026-01-22
### Changed
- **Full Sync Rollback**: Restored the simple `.includes(key)` matching logic for section detection, removing the overly restrictive "Precise Match" logic from v4.8.1.
- **Improved Alignment**: Reaffirmed HEADING_1 as the standard for all synced ticket titles.

## [4.8.1] - 2026-01-22
### Changed
- **Restored HEADING_1**: Reverted to H1 styling for ticket titles to restore the preferred Google Docs outline structure.
### Fixed
- **Precise Key Matching**: Fixed a critical bug where the extension would incorrectly match Jira ticket keys sharing a prefix (e.g., PROJ-1 matching PROJ-10). Section detection is now restricted to headers and requires an exact key match or valid separator.

## [4.8.0] - 2026-01-22
### Changed
- **Reverted UI**: Restored the simple progress bar design, removing shimmer animations and bulky stage boxes for a cleaner look.
- **Version Alignment**: Updated manifest and package versions to v4.8.0.
### Fixed
- **Sync Reliability**: Aligned heading levels (`HEADING_2`) between the application and Google Docs API to ensure document sections are correctly detected and updated.
- **Folder Logic**: Fixed document creation to correctly respect the selected subfolder path.

## [4.7.9] - 2026-01-21
### Added
- **Restored Dynamic Progress Bar**: New animated progress bar with shimmer effect and "left to right" movement.
- **Detailed Sync Feedback**: Displays sync Stage (Discovering, Syncing) and Item Key for better transparency.
### Fixed
- **Sync Freeze**: Implemented non-blocking background architecture for `SYNC_EPIC` and `SYNC_CURRENT_PAGE`.
- **UI Persistence**: Smart restoration of status banners, avoiding stale "Syncing" messages.

## [4.7.8] - 2026-01-21
### Fixed
- Fixed "stuck" Syncing UI by ensuring background script error propagation to popup.
- Restored persistent status banners (re-implementing v4.4.0 logic for better UX).
- Improved initial feedback for Epic/Bulk sync "Discovery" phase.

## [4.7.7] - 2026-01-21
### Fixed
- **UI Bug**: Resolved the "Syncing..." status bar appearing prematurely when opening the extension. Added a 1-hour stale state timeout and hardened sync state cleanup logic.

## [4.7.6] - 2026-01-21
### Added
- **Dynamic Doc Naming**: Automatically suggests document titles including child ticket keys when syncing from an Epic page.

## [4.7.5] - 2026-01-20
### Fixed
- **UI Bug**: Resolved a race condition where "Last synced info" would display "none" because the check ran before the Jira Issue Key was fully loaded.
- **Auth Persistence**: Switched to native `chrome.identity.getAuthToken` for authentication. This significantly improves session stability and prevents frequent logouts by leveraging the user's Chrome Profile session.

## [4.7.4] - 2026-01-16
### Fixed
- **UI Bug**: Fixed an issue where "Last synced" would stay as "Never" immediately after creating and syncing a new document. It now correctly refreshes the timestamp instantly.

## [4.7.3] - 2026-01-16
### Changed
- **UX Improvement**: Unified the Bulk Sync progress bar into a single continuous scale (e.g., 1 to 20 instead of 1-10 twice). "Phase 1" covers the first 50% (Discovering), and "Phase 2" covers the remaining 50% (Writing).

## [4.7.2] - 2026-01-16
### Fixed
- **Critical Bug**: Fixed a race condition where clicking "Create & Sync All Children" for a new document would sometimes fail to trigger the bulk sync (syncing only the parent issue).

## [4.7.1] - 2026-01-16
### Changed
- **UX Improvement**: Both sync buttons ("Sync Issue" and "Sync All Children") now always appear for all issue types, eliminating fragile Epic detection. Non-Epics will simply sync themselves when "Sync All Children" is clicked.

## [4.7.0] - 2026-01-16
### Changed
- **UX Improvement**: "Last synced" time is now per-issue. It only shows if the *current* issue has been synced, eliminating confusion when viewing unsynced pages.
- **Bug Fix**: Improved Epic type detection with multiple fallback strategies (img alt, aria-label, data-testid) to ensure the "Sync Epic + Children" button appears reliably.

## [4.6.0] - 2026-01-16
### Changed
- **UX Improvement**: Replaced the "Also sync children" checkbox with two distinct action buttons when creating a new document for an Epic:
    - "Create & Sync Issue" (blue) - syncs only the current ticket
    - "Create & Sync Epic + All Children" (green) - syncs the epic and all its child tickets

## [4.5.1] - 2026-01-16
### Fixed
- **UI Bug**: Fixed the "My Drive" breadcrumb link. Clicking it now correctly returns to the root folder logic instead of causing a navigation error.

## [4.5.0] - 2026-01-16
### Added
- **UI Feature**: Dynamic buttons. The sync button (Issue or Epic) now highlights blue to indicate the last performed action, making it easier to resume your workflow.
- **UI UX**: Moved "Last synced" time to the bottom footer to ensure it is always visible and never overlapped by other elements.

## [4.4.2] - 2026-01-16
### Fixed
- **UI Bug**: Fixed "undefined issues synced" message.
- **UI Bug**: Fixed invisible "Last synced" time by correcting CSS positioning.
- **Protocol**: Fixed a communication mismatch where successful background syncs were reported as failures.

## [4.4.1] - 2026-01-16
### Fixed
- **Critical**: Fixed "410 Gone" error during Epic sync. Switched back to the required `POST /rest/api/3/search/jql` endpoint with added headers to handle CSRF protection.

## [4.4.0] - 2026-01-16
### Added
- **UX**: Added "Last synced" time indicator (e.g., "5 mins ago") in the popup.
- **UX**: Sync status banners (Success/Error) are now persistent. If you close the popup, the status will remain when you return.
- **UX**: Added tooltips to error banners to show full error details on hover.

## [4.3.9] - 2026-01-16
### Added
- **UX Improvement**: Sync progress is now persistent. If you close the extension popup while a sync is running, the progress bar will be restored when you reopen it.
### Fixed
- **Bug**: Fixed an issue where the "Also sync all child tickets" option wouldn't appear because the Epic type wasn't being detected during instant load.
- **Bug**: Fixed "Failed to fetch epic details" during bulk sync. This was caused by the extension using a method (POST) that is sometimes blocked by Jira's security policy. Switched to a safer (GET) method.

## [4.3.8] - 2026-01-16
### Added
- **Feature**: Added "Also sync all child tickets" checkbox to the "New Master Doc" screen. If detected as an Epic, users can now create the doc and trigger a full bulk sync in one step.

## [4.3.7] - 2026-01-16
### Changed
- **UX Improvements**: 
    - Parallelized initial page checks to reduce popup load time (Instant Load). 
    - Updated Bulk Sync progress bar to explicitly show "Phase 1/2: Discovery" and "Phase 2/2: Writing" to prevent confusion.

## [4.3.6] - 2026-01-16
### Changed
- **Formatting Fix**: Removed raw Markdown syntax (`**`, `###`) from synced content because Google Docs was rendering it as plain text. Now forcing explicit H1 styling for titles and clean plain text for body content to fix the "wonky" formatting.

## [4.3.5] - 2026-01-16
### Changed
- **Formatting**: Converted sub-sections (Description, Linked Context, Comments) from headers to bold text. This cleans up the document outline, showing ONLY ticket titles as navigation items.

## [4.3.4] - 2026-01-16
### Changed
- **Formatting**: Changed synced issue titles to use **H1 (Heading 1)** style instead of H2. This ensures each ticket appears as a top-level item in the Google Docs outline for easier navigation.

## [4.3.3] - 2026-01-16
### Fixed
- **Jira API**: Updated Epic child discovery endpoint to `/rest/api/3/search/jql` to resolve 410 Gone errors on newer Jira Cloud instances.

## [4.3.2] - 2026-01-16
### Fixed
- **Epic Bulk Sync**: Refactored to use Content Script for data fetching, eliminating the need for Jira API credentials (resolves "Failed to fetch epic children" 410 Gone error).
- **Authentication**: improved error handling for Google Auth failures ("Google Docs not authenticated" message).
- **Client ID Config**: Reverted incorrect Client ID change that caused "redirect_uri_mismatch".

## [4.3.0] - 2026-01-15
### Added
- **Epic Bulk Sync (Initial)**: Added ability to sync Epic and all child tickets to a single Google Doc.
