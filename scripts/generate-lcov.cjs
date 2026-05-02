const fs = require('fs');
const path = require('path');

// Read all coverage files
const coverageDir = '.nyc_output';
const files = fs.readdirSync(coverageDir).filter(f => 
    f.endsWith('.json') && 
    !f.includes('processinfo') &&
    fs.statSync(path.join(coverageDir, f)).size > 2
);

let lcovOutput = '';

for (const file of files) {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(coverageDir, file), 'utf8'));
        
        for (const [filePath, coverage] of Object.entries(data)) {
            if (!coverage.statementMap || !coverage.s) continue;
            
            lcovOutput += 'TN:\n';
            lcovOutput += 'SF:' + filePath + '\n';
            
            // Functions
            if (coverage.fnMap && coverage.f) {
                for (const [id, fn] of Object.entries(coverage.fnMap)) {
                    lcovOutput += 'FN:' + (fn.line || fn.loc.start.line) + ',' + (fn.name || 'anonymous') + '\n';
                }
                for (const [id, count] of Object.entries(coverage.f)) {
                    const fnName = coverage.fnMap[id] ? (coverage.fnMap[id].name || 'anonymous') : 'unknown';
                    lcovOutput += 'FNDA:' + count + ',' + fnName + '\n';
                }
                lcovOutput += 'FNF:' + Object.keys(coverage.fnMap).length + '\n';
                lcovOutput += 'FNH:' + Object.values(coverage.f).filter(v => v > 0).length + '\n';
            }
            
            // Statements
            for (const [id, count] of Object.entries(coverage.s)) {
                const stmt = coverage.statementMap[id];
                if (stmt) {
                    lcovOutput += 'DA:' + stmt.start.line + ',' + count + '\n';
                }
            }
            
            const stmts = Object.values(coverage.s);
            lcovOutput += 'LF:' + stmts.length + '\n';
            lcovOutput += 'LH:' + stmts.filter(v => v > 0).length + '\n';
            
            lcovOutput += 'end_of_record\n';
        }
    } catch (e) {
        console.error('Error processing', file, e.message);
    }
}

// Ensure coverage directory exists
if (!fs.existsSync('coverage')) {
    fs.mkdirSync('coverage', { recursive: true });
}

fs.writeFileSync('coverage/lcov.info', lcovOutput);
console.log('Generated coverage/lcov.info');
