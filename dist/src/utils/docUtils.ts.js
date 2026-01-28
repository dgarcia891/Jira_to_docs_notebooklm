export function normalizeDoc(doc) {
  if (!doc) return null;
  return {
    id: doc.id || doc.docId,
    name: doc.name
  };
}
export function formatDate(dateInput) {
  if (!dateInput) return "N/A";
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "N/A";
    const formatted = date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    const tzMatch = date.toString().match(/\(([^)]+)\)$/);
    const tz = tzMatch ? tzMatch[1] : "";
    return tz ? `${formatted} (${tz})` : formatted;
  } catch (e) {
    return "N/A";
  }
}
export function formatWorkItemToText(item) {
  const lines = [];
  lines.push(`ISSUE: ${item.key}: ${item.title}`);
  lines.push(`URL: ${item.url}`);
  lines.push(`STATUS: ${item.status}`);
  lines.push(`TYPE: ${item.type.toUpperCase()}`);
  if (item.priority) lines.push(`PRIORITY: ${item.priority}`);
  if (item.assignee) lines.push(`ASSIGNEE: ${item.assignee}`);
  const metadataItems = [];
  if (item.storyPoints) metadataItems.push(`Story Points: ${item.storyPoints}`);
  if (item.tShirtSize) metadataItems.push(`T-Shirt: ${item.tShirtSize}`);
  if (item.sprints && item.sprints.length > 0) metadataItems.push(`Sprints: ${item.sprints.join(", ")}`);
  if (metadataItems.length > 0) {
    lines.push(`METADATA: ${metadataItems.join(" | ")}`);
  }
  lines.push("\n--- DESCRIPTION ---");
  lines.push(item.description || "No description provided.");
  if (item.comments && item.comments.length > 0) {
    lines.push("\n--- COMMENTS ---");
    item.comments.forEach((c, i) => {
      lines.push(`[${i + 1}] ${c.author}: ${c.body}`);
    });
  }
  if (item.linkedIssues && item.linkedIssues.length > 0) {
    lines.push("\n--- LINKED CONTEXT ---");
    item.linkedIssues.forEach((li) => {
      lines.push(`- ${li.key} (${li.status}): ${li.title}`);
      if (li.rationale) lines.push(`  Rationale: ${li.rationale}`);
    });
  }
  return lines.join("\n");
}
