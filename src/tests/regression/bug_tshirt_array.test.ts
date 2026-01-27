import { describe, it, expect } from 'vitest';
import { JiraParser } from '../../parsers/jira';

describe('Bug Fix: T-Shirt Array Parsing', () => {
    it('should extract the value from a T-Shirt size stored as an array of objects', async () => {
        // Mock the field map and issue response
        // In reality, getCustom uses fieldMap and the issue fields

        // We'll test the getCustom logic by proxying through a JiraParser-like structure
        // or just testing the parser's behavior with mocked fetch

        const parser = new JiraParser();
        parser.setBaseUrl('https://test.atlassian.net');
        parser.setCredentials('test@example.com', 'token');

        // Mock field discovery and issue fetch
        global.fetch = (url: any) => {
            if (url.toString().includes('/rest/api/3/field')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { id: 'customfield_10001', name: 'T-Shirt Size' }
                    ])
                } as any);
            }
            if (url.toString().includes('/rest/api/3/issue/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        fields: {
                            summary: 'Test Issue',
                            status: { name: 'Done' },
                            issuetype: { name: 'Task' },
                            customfield_10001: [
                                { value: 'S', id: '10490' }
                            ]
                        }
                    })
                } as any);
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
        };

        const result = await parser.parseByKey('TEST-1');
        expect(result.tShirtSize).toBe('S');
    });
});
