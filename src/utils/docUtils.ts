/**
 * Ensures a document object has consistent properties.
 * Handles migration from 'docId' to 'id'.
 */
export function normalizeDoc(doc: any): { id: string; name: string } | null {
    if (!doc) return null;
    return {
        id: doc.id || doc.docId,
        name: doc.name
    };
}
