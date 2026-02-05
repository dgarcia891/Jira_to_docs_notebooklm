import { describe, it, expect } from 'vitest';
import { validateProjectVersion } from '../../utils/versionUtils';
import { resolve } from 'path';

describe('Release Protocol Integrity', () => {
    const projectRoot = resolve(__dirname, '../../../');

    it('should have consistent version strings across package.json, manifest.json, and App.tsx', () => {
        const report = validateProjectVersion(projectRoot);

        if (!report.isConsistent) {
            console.error('Version Consistency Errors:', report.errors.join('\n'));
        }

        expect(report.isConsistent).toBe(true);
        expect(report.manifestVersion).toBe(report.appVersion);
    });

    it('should have a corresponding entry in CHANGELOG.md for the current version', () => {
        const report = validateProjectVersion(projectRoot);

        expect(report.changelogEntryFound).toBe(true);
    });
});
