import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraParser } from '../jira';
import * as api from '../jira/api';

vi.mock('../jira/api', () => ({
    fetchLinkedIssueDetails: vi.fn(),
    extractComments: vi.fn().mockResolvedValue([]),
}));

describe('Feature: Clone Link Filtering', () => {
    let parser: JiraParser;

    beforeEach(() => {
        parser = new JiraParser();
        vi.clearAllMocks();
        // Mock success for field discovery
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([])
        });
    });

    it('should filter out links with type.name "Cloners"', async () => {
        const mockIssue = {
            fields: {
                summary: 'Main Issue',
                issuelinks: [
                    {
                        type: { name: 'Relates' },
                        outwardIssue: { key: 'REL-1' }
                    },
                    {
                        type: { name: 'Cloners' },
                        outwardIssue: { key: 'CLONE-1' }
                    }
                ],
                subtasks: [{ key: 'SUB-1' }],
                status: { name: 'Open' },
                issuetype: { name: 'Story' }
            }
        };

        // Override fetch for the issue itself
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes('/issue/TEST-1')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockIssue
                });
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await parser.parseByKey('TEST-1');

        // Verify that fetchLinkedIssueDetails was called for REL-1 and SUB-1, but NOT CLONE-1
        expect(api.fetchLinkedIssueDetails).toHaveBeenCalledWith('REL-1', expect.any(Object), expect.any(String), expect.any(Object));
        expect(api.fetchLinkedIssueDetails).toHaveBeenCalledWith('SUB-1', expect.any(Object), expect.any(String), expect.any(Object));
        expect(api.fetchLinkedIssueDetails).not.toHaveBeenCalledWith('CLONE-1', expect.any(Object), expect.any(String), expect.any(Object));
    });
});
