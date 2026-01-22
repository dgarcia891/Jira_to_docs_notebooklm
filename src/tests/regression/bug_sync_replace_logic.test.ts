import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocsSyncService } from '../../services/docsSync';
import { WorkItem } from '../../types';

describe('Bug: Sync Replace Logic', () => {
    let service: DocsSyncService;

    beforeEach(() => {
        service = new DocsSyncService();
    });

    it('should NOT match a partial key (e.g. TEST-1 matching TEST-10)', () => {
        const mockDoc = {
            body: {
                content: [
                    {
                        startIndex: 1,
                        endIndex: 20,
                        paragraph: {
                            elements: [{ textRun: { content: 'TEST-10: Important Bug\n' } }],
                            paragraphStyle: { namedStyleType: 'HEADING_1' }
                        }
                    }
                ]
            }
        };

        const range = service.findSectionRange(mockDoc, 'TEST-1');

        // This should be null because TEST-10 is not TEST-1
        expect(range).toBeNull();
    });

    it('should match a key even if it has brackets like [TEST-1]', () => {
        const mockDoc = {
            body: {
                content: [
                    {
                        startIndex: 1,
                        endIndex: 20,
                        paragraph: {
                            elements: [{ textRun: { content: '[TEST-1]: Brackets Case\n' } }],
                            paragraphStyle: { namedStyleType: 'HEADING_1' }
                        }
                    }
                ]
            }
        };

        const range = service.findSectionRange(mockDoc, 'TEST-1');
        expect(range).not.toBeNull();
        expect(range?.startIndex).toBe(1);
    });

    it('should find the correct section for an exact key match even with title context', () => {
        const mockDoc = {
            body: {
                content: [
                    {
                        startIndex: 1,
                        endIndex: 20,
                        paragraph: {
                            elements: [{ textRun: { content: 'TEST-1: Important Bug\n' } }],
                            paragraphStyle: { namedStyleType: 'HEADING_1' }
                        }
                    }
                ]
            }
        };

        const range = service.findSectionRange(mockDoc, 'TEST-1');
        expect(range).not.toBeNull();
        expect(range?.startIndex).toBe(1);
    });

    it('should find the section even if it is NORMAL_TEXT (Style-Agnostic)', () => {
        const mockDoc = {
            body: {
                content: [
                    {
                        startIndex: 50,
                        endIndex: 70,
                        paragraph: {
                            elements: [{ textRun: { content: 'TEST-99: Stray Ticket\n' } }],
                            paragraphStyle: { namedStyleType: 'NORMAL_TEXT' }
                        }
                    }
                ]
            }
        };

        const range = service.findSectionRange(mockDoc, 'TEST-99');
        expect(range).not.toBeNull();
        expect(range?.startIndex).toBe(50);
    });
});
