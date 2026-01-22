# Changelog

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
