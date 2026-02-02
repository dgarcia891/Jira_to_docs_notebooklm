import { cleanCommentBody } from '../../../src/parsers/jira/utils';

describe('cleanCommentBody', () => {
    let doc: Document;

    beforeEach(() => {
        doc = document;
        document.body.textContent = '';
    });

    it('should sanitize content and not execute scripts (security reproduction)', () => {
        const maliciousHtml = 'Hello <script>alert("XSS")</script><b>World</b>';
        const result = cleanCommentBody(maliciousHtml, doc);
        expect(result).toBe('Hello World');
        expect(result).not.toContain('<script>');
    });

    it('should handle linked issues correctly', () => {
        const html = 'Fixes <a href="https://jira.com/browse/PROJ-123">PROJ-123</a>';
        const result = cleanCommentBody(html, doc);
        expect(result).toBe('Fixes PROJ-123');
    });

    it('should handle complex HTML without security violation (future-proof)', () => {
        const html = '<div><p>Paragraph 1</p><p>Paragraph 2</p></div>';
        const result = cleanCommentBody(html, doc);
        expect(result).toContain('Paragraph 1');
        expect(result).toContain('Paragraph 2');
    });
});
