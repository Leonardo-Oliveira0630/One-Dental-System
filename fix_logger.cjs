const fs = require('fs');

function fixFile(file) {
    let code = fs.readFileSync(file, 'utf8');
    // regex to replace logger.error("some text", e) or logger.warn("some text", e) 
    // with logger.error({ err: e }, "some text")
    
    code = code.replace(/logger\.(error|warn|info)\(\s*(["'`].*?["'`])\s*,\s*([a-zA-Z0-9_]+)\s*\)/g, 'logger.$1({ err: $3 }, $2)');
    
    fs.writeFileSync(file, code);
}

fixFile('context/AppContext.tsx');
fixFile('services/firebaseService.ts');

console.log("Loggers patched");
