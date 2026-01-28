import { parseADF } from "/src/parsers/jira/adf.ts.js";
import * as utils from "/src/parsers/jira/utils.ts.js";
import * as api from "/src/parsers/jira/api.ts.js";
export class JiraParser {
  canParse(url) {
    const jiraUrlPattern = /atlassian\.net\/(browse\/|jira\/software\/.*(selectedIssue=|issues\/))/;
    return jiraUrlPattern.test(url);
  }
  baseUrlOverride = null;
  jiraEmail = null;
  jiraApiToken = null;
  setCredentials(email, apiToken) {
    this.jiraEmail = email;
    this.jiraApiToken = apiToken;
  }
  setBaseUrl(url) {
    try {
      const parsed = new URL(url);
      this.baseUrlOverride = `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
      this.baseUrlOverride = null;
    }
  }
  getApiUrl(path) {
    if (this.baseUrlOverride) return `${this.baseUrlOverride}${path}`;
    return path;
  }
  getBaseUrl() {
    return this.baseUrlOverride || "";
  }
  getAuthHeaders() {
    if (this.jiraEmail && this.jiraApiToken) {
      const credentials = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
      return { "Authorization": `Basic ${credentials}` };
    }
    return {};
  }
  async parse(document, url) {
    this.setBaseUrl(url);
    let key = utils.extractKeyFromUrl(url);
    if (!key) {
      const keyEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"] a');
      key = keyEl?.textContent?.trim() || "";
    }
    if (!key) throw new Error("Could not extract Issue Key");
    return this.parseByKey(key, document);
  }
  async parseByKey(key, document) {
    console.log(`JiraParser: Fetching issue ${key} data via API...`);
    let fieldMap = {};
    try {
      const fieldRes = await fetch(this.getApiUrl("/rest/api/3/field"), {
        headers: { "Accept": "application/json", ...this.getAuthHeaders() }
      });
      if (fieldRes.ok) {
        const fieldsArr = await fieldRes.json();
        fieldsArr.forEach((fld) => {
          fieldMap[fld.name.toLowerCase()] = fld.id;
        });
      }
    } catch (e) {
      console.warn("JiraParser: Field discovery failed", e);
    }
    const response = await fetch(this.getApiUrl(`/rest/api/3/issue/${key}`), {
      method: "GET",
      headers: { "Accept": "application/json", ...this.getAuthHeaders() }
    });
    if (!response.ok) {
      throw new Error(`JiraParser: API Error ${response.status} fetching issue ${key}`);
    }
    const issue = await response.json();
    const f = issue.fields || {};
    const getCustom = (searchNames) => {
      const normalizedNames = searchNames.map((n) => n.toLowerCase());
      const matchedIds = normalizedNames.map((name) => fieldMap[name]).filter((id) => id !== void 0);
      for (const id of matchedIds) {
        let val = f[id];
        if (val !== void 0 && val !== null) {
          if (Array.isArray(val) && val.length > 0) {
            val = val[0];
          }
          if (typeof val === "object") {
            if (val.value) return val.value;
            if (val.name) return val.name;
            return JSON.stringify(val);
          }
          if (String(val).trim() !== "") return String(val);
        }
      }
      return "N/A";
    };
    const typeRaw = f.issuetype?.name || "other";
    const type = utils.mapType(typeRaw);
    const url = `${this.getBaseUrl() || window.location.origin}/browse/${key}`;
    const comments = await api.extractComments(this.getBaseUrl(), this.getAuthHeaders(), document || null, key);
    let tShirtSize = getCustom(["t-shirt size", "tshirt", "sizing", "size", "et - size"]);
    if (tShirtSize === "N/A") {
      const customFields = Object.keys(f).filter((k) => k.startsWith("customfield_"));
      for (const cf of customFields) {
        const val = f[cf];
        if (val && typeof val === "object" && val.value && /^(XS|S|M|L|XL|XXL)$/i.test(val.value)) {
          tShirtSize = val.value;
          break;
        }
      }
    }
    if (tShirtSize === "N/A" && comments.length > 0) {
      const sizeRegex = /estimated as (XS|S|M|L|XL|XXL)/i;
      for (const c of comments) {
        const match = c.body.match(sizeRegex);
        if (match) {
          tShirtSize = match[1].toUpperCase();
          break;
        }
      }
    }
    let linkedIssues = [];
    const links = f.issuelinks || [];
    const subtasks = f.subtasks || [];
    const targetKeys = [
      ...links.filter((l) => l.type?.name !== "Cloners").map((l) => (l.outwardIssue || l.inwardIssue)?.key),
      ...subtasks.map((st) => st.key)
    ].filter(Boolean).slice(0, 10);
    if (targetKeys.length > 0) {
      linkedIssues = await Promise.all(targetKeys.map((k) => api.fetchLinkedIssueDetails(k, fieldMap, this.getBaseUrl(), this.getAuthHeaders())));
    }
    return {
      id: key,
      source: "jira",
      key,
      title: f.summary || "",
      description: utils.cleanDescription(f.description ? parseADF(f.description) : ""),
      status: f.status?.name || "Pending",
      type,
      priority: f.priority?.name || "Medium",
      assignee: utils.cleanAssignee(f.assignee?.displayName || "Unassigned"),
      reporter: f.reporter?.displayName || "Unknown",
      labels: f.labels || [],
      url,
      comments,
      createdDate: f.created,
      updatedDate: f.updated,
      sprints: f[fieldMap["sprint"]]?.map((s) => s.name) || [],
      tShirtSize,
      storyPoints: getCustom(["story points", "story point estimate", "point estimate", "points"]),
      workType: getCustom(["work type", "work item type"]),
      businessTeam: getCustom(["requesting business team", "team"]),
      businessObjective: getCustom(["business objective", "goal", "business value"]),
      impact: getCustom(["et - impact", "impact", "level", "severity", "class"]),
      linkedIssues: linkedIssues.filter(Boolean),
      metadata: f
    };
  }
  async fetchEpicChildren(epicKey) {
    return api.fetchEpicChildren(epicKey, this.getBaseUrl(), this.getAuthHeaders());
  }
}
