/**
 * Active Recall Script (Active Consult)
 * Greps documentation and logs for context.
 */
const { execSync } = require('child_process');
try {
    console.log('--- RECALLING ARCHITECTURE ---');
    console.log(execSync('grep -r "Architecture" docs/ || echo "No architecture docs found"').toString());
    console.log('--- RECALLING RECENT ERRORS ---');
    console.log(execSync('tail -n 20 BUG_LOG.md || echo "No BUG_LOG found"').toString());
} catch (e) { }
