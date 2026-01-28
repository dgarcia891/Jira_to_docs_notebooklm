export function parseADF(node) {
  if (!node) return "";
  let text = "";
  switch (node.type) {
    case "doc":
    case "paragraph":
    case "bulletList":
    case "orderedList":
    case "listItem":
    case "blockquote":
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child) => {
          text += parseADF(child);
        });
        if (node.type !== "doc") text += "\n";
      }
      break;
    case "text":
      text += node.text || "";
      break;
    case "hardBreak":
      text += "\n";
      break;
    case "inlineCard":
    case "blockCard":
    case "embedCard":
      if (node.attrs && node.attrs.url) {
        text += ` [Link: ${node.attrs.url}] `;
      } else {
        text += " [Linked Item] ";
      }
      break;
    case "mention":
      if (node.attrs && node.attrs.text) {
        text += ` ${node.attrs.text} `;
      } else {
        text += " @user ";
      }
      break;
    case "extension":
    case "bodiedExtension":
    case "inlineExtension":
      text += ` [Embedded Content: ${node.attrs?.extensionKey || "Extension"}] `;
      break;
    case "table":
    case "tableRow":
    case "tableHeader":
    case "tableCell":
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child) => {
          text += parseADF(child);
          if (node.type === "tableCell" || node.type === "tableHeader") text += " | ";
        });
        if (node.type === "tableRow") text += "\n";
      }
      break;
    default:
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child) => {
          text += parseADF(child);
        });
      }
      break;
  }
  return text;
}
