const fs = require('fs');
let code = fs.readFileSync('pages/JobsList.tsx', 'utf8');

function checkBraces(text) {
    let count = 0;
    for (let char of text) {
        if (char === '{') count++;
        if (char === '}') count--;
    }
    return count;
}

console.log("Brace balance:", checkBraces(code));
