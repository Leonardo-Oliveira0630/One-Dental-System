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

const balance = checkBraces(code);
console.log("Brace balance:", balance);

if (balance > 0) {
    for (let i = 0; i < balance; i++) {
        code += '}\n';
    }
    fs.writeFileSync('pages/JobsList.tsx', code);
    console.log("Added missing closing braces.");
} else if (balance < 0) {
    console.log("Too many closing braces.");
}
