const fs = require('fs');
let code = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// Function to check if braces are balanced
function checkBraces(text) {
    let count = 0;
    for (let char of text) {
        if (char === '{') count++;
        if (char === '}') count--;
    }
    return count;
}

let braceCount = checkBraces(code);
console.log("Brace balance:", braceCount);

if (braceCount === -1) {
    console.log("One extra closing brace. Removing the last one.");
    let lastIndex = code.lastIndexOf('}');
    if (lastIndex !== -1) {
        code = code.substring(0, lastIndex) + code.substring(lastIndex + 1);
        fs.writeFileSync('pages/JobsList.tsx', code);
    }
}
