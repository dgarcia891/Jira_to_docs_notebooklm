import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../../parsers/jira/api';

describe('Feature: Epic Child Discovery', () => {
    const mockBaseUrl = 'https://jira.com';
    const mockAuthHeaders = { 'Authorization': 'Basic xxx' };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should construct correct JQL to find children of an Epic', async () => {
        const epicKey = 'EPIC-123';

        // Mock fetch for Jira Search API
        const fetchSpy = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                issues: [
                    { key: 'CHILD-1' },
                    { key: 'CHILD-2' }
                ]
            })
        });
        global.fetch = fetchSpy;

        const children = await api.fetchEpicChildren(epicKey, mockBaseUrl, mockAuthHeaders);

        expect(fetchSpy).toHaveBeenCalled();
        const call = fetchSpy.mock.calls[0];
        expect(call[0]).toContain('/rest/api/3/search/jql');
        const body = JSON.parse(call[1].body);
        expect(body.jql).toContain(`"parent" = ${epicKey}`);
        expect(body.jql).toContain(`"Epic Link" = ${epicKey}`);

        expect(children).toEqual(['CHILD-1', 'CHILD-2']);
    });

    it('should handle errors gracefully when Jira API fails', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 403,
            text: () => Promise.resolve('Forbidden')
        });

        await expect(api.fetchEpicChildren('EPIC-123', mockBaseUrl, mockAuthHeaders))
            .rejects.toThrow('Failed to fetch epic children');
    });
});
