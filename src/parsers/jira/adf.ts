/**
 * Parses Atlassian Document Format (ADF) JSON into plain text.
 * Prevents expansion of Smart Cards / Macros.
 */
export function parseADF(node: any): string {
    if (!node) return '';
    let text = '';

    // Handle Node Types
    switch (node.type) {
        case 'doc':
        case 'paragraph':
        case 'bulletList':
        case 'orderedList':
        case 'listItem':
        case 'blockquote':
            if (node.content && Array.isArray(node.content)) {
                node.content.forEach((child: any) => {
                    text += parseADF(child);
                });
                // Append newline after block elements
                if (node.type !== 'doc') text += '\n';
            }
            break;

        case 'text':
            text += node.text || '';
            break;

        case 'hardBreak':
            text += '\n';
            break;

        case 'inlineCard':
        case 'blockCard':
        case 'embedCard':
            // CORE FIX: Return simple link instead of expanded content
            if (node.attrs && node.attrs.url) {
                text += ` [Link: ${node.attrs.url}] `;
            } else {
                text += ' [Linked Item] ';
            }
            break;

        case 'mention':
            if (node.attrs && node.attrs.text) {
                text += ` ${node.attrs.text} `;
            } else {
                text += ' @user ';
            }
            break;

        case 'extension':
        case 'bodiedExtension':
        case 'inlineExtension':
            // Prevent Macros (Filter Results, Roadmap, etc.) from dumping huge content
            text += ` [Embedded Content: ${node.attrs?.extensionKey || 'Extension'}] `;
            break;

        case 'table':
        case 'tableRow':
        case 'tableHeader':
        case 'tableCell':
            if (node.content && Array.isArray(node.content)) {
                node.content.forEach((child: any) => {
                    text += parseADF(child);
                    if (node.type === 'tableCell' || node.type === 'tableHeader') text += ' | ';
                });
                if (node.type === 'tableRow') text += '\n';
            }
            break;

        default:
            // For other nodes, try to traverse content
            if (node.content && Array.isArray(node.content)) {
                node.content.forEach((child: any) => {
                    text += parseADF(child);
                });
            }
            break;
    }
    return text;
}
