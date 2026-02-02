const fs = require('fs');
const path = require('path');

function scan(dir) {
    const files = fs.readdirSync(dir);
    let found = false;
    files.forEach(f => {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            if (scan(fullPath)) found = true;
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Detect suspicious "const data =" patterns with hardcoded IDs
            if (/const\s+\w+\s*=\s*\[\s*\{.*id:/s.test(content) && !fullPath.includes('test')) {
                console.error(`⚠️ POTENTIAL MOCK DATA DETECTED in: ${fullPath}`);
                found = true;
            }
        }
    });
    return found;
}
if (scan('src')) {
    console.log("❌ Mock Data Detected. Use Real DB Data.");
    process.exit(1);
} else {
    console.log("✅ Data Integrity Check Passed.");
}
