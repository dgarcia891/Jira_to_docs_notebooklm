import { JiraParser } from "/src/parsers/jira.ts.js";
console.log("Jira to NotebookLM: Content script loaded");
const parser = new JiraParser();
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXTRACT_ISSUE") {
    handleExtraction().then(sendResponse);
    return true;
  }
  if (message.type === "GET_ISSUE_KEY") {
    handleGetIssueKey().then(sendResponse);
    return true;
  }
  if (message.type === "FETCH_EPIC_BULK") {
    handleEpicBulkFetch(message.payload.epicKey).then(sendResponse);
    return true;
  }
});
async function handleGetIssueKey() {
  try {
    const url = window.location.href;
    if (!parser.canParse(url)) {
      return { error: "Not a supported Jira Issue URL" };
    }
    const match = url.match(/browse\/([A-Z]+-\d+)/);
    const key = match ? match[1] : void 0;
    const summary = document.querySelector("h1")?.innerText || document.title;
    let type = "";
    const issueTypeElement = document.querySelector('[data-testid="issue.views.field.issue-type.common.ui.issue-type-field-view"] [data-testid*="issue-type-icon"]');
    if (issueTypeElement) {
      type = issueTypeElement.textContent?.trim() || "";
    }
    if (!type) {
      const epicImg = document.querySelector('img[alt*="Epic"]');
      if (epicImg) {
        type = "Epic";
      }
    }
    if (!type) {
      const ariaEpic = document.querySelector('[aria-label*="Epic"]');
      if (ariaEpic) {
        type = "Epic";
      }
    }
    if (!type) {
      const typeSpans = document.querySelectorAll('[data-testid*="issue-type"]');
      for (const span of typeSpans) {
        const text = span.textContent?.trim() || "";
        if (text.toLowerCase().includes("epic")) {
          type = "Epic";
          break;
        }
      }
    }
    if (!type) {
      const typeButton = document.querySelector('[data-testid="issue-field-summary.ui.issue-field-summary-inline-edit--trigger"]');
      if (typeButton) {
        const typeTextSpan = typeButton.querySelector('span[data-testid*="issue-type-icon"]');
        if (typeTextSpan) {
          type = typeTextSpan.textContent?.trim() || "";
        } else {
          type = typeButton.textContent?.trim() || "";
        }
      }
    }
    let childKeys = [];
    if (type.toLowerCase().includes("epic") && key) {
      try {
        console.log(`Content: Epic detected (${key}), fetching child keys for dynamic naming...`);
        childKeys = await parser.fetchEpicChildren(key);
      } catch (e) {
        console.warn("Content: Failed to fetch child keys for naming fallback", e);
      }
    }
    return { key, title: summary, type, childKeys };
  } catch (err) {
    return { error: err.message };
  }
}
async function handleExtraction() {
  try {
    const url = window.location.href;
    if (!parser.canParse(url)) {
      return { type: "EXTRACT_ERROR", error: "Not a supported Jira Issue URL" };
    }
    const workItem = await parser.parse(document, url);
    return { type: "EXTRACT_SUCCESS", payload: workItem };
  } catch (err) {
    console.error("Extraction Error:", err);
    return { type: "EXTRACT_ERROR", error: err.message || "Unknown parsing error" };
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function handleEpicBulkFetch(epicKey) {
  try {
    console.log(`Content: Starting Epic bulk fetch for ${epicKey}`);
    const childKeys = await parser.fetchEpicChildren(epicKey);
    const allKeys = [epicKey, ...childKeys];
    console.log(`Content: Found ${childKeys.length} children for Epic ${epicKey}`);
    const items = [];
    for (let i = 0; i < allKeys.length; i++) {
      const key = allKeys[i];
      chrome.runtime.sendMessage({
        type: "EPIC_BULK_PROGRESS",
        payload: { current: i + 1, total: allKeys.length * 2, key }
      }).catch(() => {
      });
      console.log(`Content: Fetching ${key} (${i + 1}/${allKeys.length})`);
      const item = await parser.parseByKey(key);
      items.push(item);
      await sleep(100);
    }
    console.log(`Content: Successfully fetched ${items.length} items`);
    return { type: "EPIC_BULK_SUCCESS", success: true, payload: { epicKey, items } };
  } catch (err) {
    console.error("Content: Epic bulk fetch failed", err);
    return { type: "EPIC_BULK_ERROR", success: false, error: err.message || "Failed to fetch Epic data" };
  }
}
