import { parseADF } from "/src/parsers/jira/adf.ts.js";
import { cleanCommentBody } from "/src/parsers/jira/utils.ts.js";
import { formatDate } from "/src/utils/docUtils.ts.js";
export async function fetchEpicChildren(epicKey, baseUrl, authHeaders) {
  console.log(`JiraParser: Discovering children for Epic ${epicKey}...`);
  const res = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Atlassian-Token": "no-check",
      "X-Requested-With": "XMLHttpRequest",
      ...authHeaders
    },
    body: JSON.stringify({
      jql: `"parent" = ${epicKey} OR "Epic Link" = ${epicKey} order by created ASC`,
      fields: ["key"],
      maxResults: 100
    })
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`Failed to fetch epic children for ${epicKey} (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return data.issues.map((i) => i.key);
}
export async function fetchLinkedIssueDetails(key, fieldMap, baseUrl, authHeaders) {
  try {
    const fields = ["summary", "description", "status", "priority", "comment", fieldMap["t-shirt size"]].filter(Boolean).join(",");
    const res = await fetch(`${baseUrl}/rest/api/3/issue/${key}?fields=${fields}`, {
      headers: { "Accept": "application/json", ...authHeaders }
    });
    if (!res.ok) return { key, title: "Error fetching", url: `${baseUrl}/browse/${key}` };
    const issue = await res.json();
    const f = issue.fields || {};
    const tsId = fieldMap["t-shirt size"];
    const tShirtSize = tsId ? f[tsId]?.value || f[tsId]?.name || f[tsId] || "" : "";
    const description = f.description ? parseADF(f.description) : "No description provided.";
    const status = f.status?.name || "Unknown";
    const priority = f.priority?.name || "Medium";
    const rawComments = f.comment?.comments || [];
    const processedComments = rawComments.map((c) => {
      let body = "";
      try {
        body = parseADF(c.body);
      } catch (e) {
        body = String(c.body);
      }
      return {
        id: c.id,
        author: c.author?.displayName || "Unknown User",
        body: body.trim(),
        timestamp: formatDate(c.created)
      };
    }).reverse();
    const rationale = processedComments.length > 0 ? extractRationale(rawComments[rawComments.length - 1].body) : "No technical notes recorded.";
    return {
      id: key,
      key,
      title: f.summary || "",
      description,
      status,
      priority,
      comments: processedComments,
      tShirtSize,
      rationale,
      url: `${baseUrl}/browse/${key}`
    };
  } catch (e) {
    return { key, title: "Network Error", url: `${baseUrl}/browse/${key}` };
  }
}
export function extractRationale(body) {
  const text = parseADF(body);
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(0, 2).join(" ") + (lines.length > 2 ? "..." : "");
}
export async function extractComments(baseUrl, authHeaders, document, issueKey) {
  if (!issueKey) return [];
  try {
    console.log(`JiraParser: Fetching comments for ${issueKey} via API...`);
    const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/comment?expand=renderedBody`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        ...authHeaders
      }
    });
    if (!response.ok) {
      console.error(`JiraParser: API Error ${response.status} ${response.statusText}`);
      if (response.status === 401 || response.status === 403) {
        return [{
          id: "error-auth",
          author: "System",
          body: "Error: Could not access Jira API. Please ensure you are logged in.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }];
      }
      return [];
    }
    const data = await response.json();
    if (!data.comments || !Array.isArray(data.comments)) {
      return [];
    }
    const processedComments = data.comments.map((c, index) => {
      let body = "";
      if (c.body && typeof c.body === "object") {
        try {
          body = parseADF(c.body);
        } catch (e) {
          if (c.renderedBody) body = cleanCommentBody(c.renderedBody, document);
        }
      } else if (c.renderedBody) {
        body = cleanCommentBody(c.renderedBody, document);
      } else if (c.body && typeof c.body === "string") {
        body = c.body;
      } else {
        body = "[Content Not Available]";
      }
      const author = c.author?.displayName || "Unknown User";
      const created = formatDate(c.created);
      return {
        id: c.id || `comment-${index}`,
        author,
        body: body.trim(),
        timestamp: created
      };
    }).filter((item) => item !== null);
    return processedComments.reverse();
  } catch (err) {
    console.error("JiraParser: API Fetch Exception", err);
    return [{
      id: "error-exception",
      author: "System",
      body: `Error: API Fetch failed. ${err}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }];
  }
}
