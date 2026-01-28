import { describe, it, expect } from 'vitest';
import { formatWorkItemToText } from '../../utils/docUtils';
import { WorkItem } from '../../types';

describe('Feature: Copy to Clipboard Utility', () => {
    it('should format a complete WorkItem correctly for clipboard', () => {
        const mockItem: WorkItem = {
            id: 'PROJ-123',
            key: 'PROJ-123',
            title: 'Implement Clipboard Button',
            description: 'This is a long description about the implementation.',
            status: 'In Progress',
            type: 'task',
            priority: 'High',
            assignee: 'David Garcia',
            url: 'https://jira.example.com/browse/PROJ-123',
            source: 'jira',
            labels: ['feature', 'ui'],
            storyPoints: '3',
            tShirtSize: 'M',
            comments: [
                { id: '1', author: 'Bot', body: 'First comment' },
                { id: '2', author: 'Dev', body: 'Looks good' }
            ],
            linkedIssues: [
                { id: '456', key: 'PROJ-456', title: 'Dependency', status: 'Done', url: '', rationale: 'Must be done first' }
            ]
        };

        const result = formatWorkItemToText(mockItem);

        expect(result).toContain('ISSUE: PROJ-123: Implement Clipboard Button');
        expect(result).toContain('STATUS: In Progress');
        expect(result).toContain('Story Points: 3');
        expect(result).toContain('T-Shirt: M');
        expect(result).toContain('--- DESCRIPTION ---');
        expect(result).toContain('long description about the implementation');
        expect(result).toContain('--- COMMENTS ---');
        expect(result).toContain('[1] Bot: First comment');
        expect(result).toContain('--- LINKED CONTEXT ---');
        expect(result).toContain('PROJ-456 (Done): Dependency');
        expect(result).toContain('Rationale: Must be done first');
    });

    it('should handle missing optional fields gracefully', () => {
        const minimalItem: WorkItem = {
            id: 'MIN-1',
            key: 'MIN-1',
            title: 'Minimal',
            description: '',
            status: 'Todo',
            type: 'bug',
            url: 'https://jira/MIN-1',
            source: 'jira',
            labels: [],
            comments: []
        };

        const result = formatWorkItemToText(minimalItem);
        expect(result).toContain('ISSUE: MIN-1: Minimal');
        expect(result).not.toContain('PRIORITY:');
        expect(result).not.toContain('--- COMMENTS ---');
        expect(result).toContain('No description provided.');
    });
});
