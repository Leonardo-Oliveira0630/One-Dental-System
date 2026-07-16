const fs = require('fs');
let code = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const badSnippet = `    const diff = new Date().getTime() - new Date(job.sectorEntryTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let label = '';
    if (hours > 0) label += \`\${hours}h \`;
    label += \`\${minutes}m\`;
    
    return { hours, isAttention: hours >= 18, label };
  };`;

// Try to remove it exactly
if (code.includes(badSnippet)) {
    code = code.replace(badSnippet, '');
    console.log("Removed bad snippet.");
} else {
    console.log("Could not find the exact bad snippet. Trying a looser match...");
    const regex = /const diff = new Date\(\)\.getTime\(\) \- new Date\(job\.sectorEntryTime\)\.getTime\(\);[\s\S]*?return \{ hours, isAttention: hours >= 18, label \};\s*\};/;
    code = code.replace(regex, '');
}

// Ensure the file ends with exactly one `};` (the component closer)
// The file currently might end with `  );\n` because I removed a `}` earlier.
code = code.trimEnd();
if (code.endsWith(');')) {
    code += '\n};\n';
    console.log("Added closing brace at the end.");
} else if (code.endsWith(';')) {
    // If it ends with `);;` or something weird
    let count = 0;
    while(code.endsWith(';')) { code = code.slice(0, -1); count++; }
    if (code.endsWith(')')) {
        code += ';\n};\n';
        console.log("Fixed weird ending and added closing brace.");
    }
} else if (!code.endsWith('};')) {
    code += '\n};\n';
}

fs.writeFileSync('pages/JobsList.tsx', code);
console.log("Done.");
