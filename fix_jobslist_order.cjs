const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const funcsMatch = content.match(/const getStatusColor = [\s\S]*?const getSectorTimeInfo = [\s\S]*?};/);
if (funcsMatch) {
    const funcsStr = funcsMatch[0];
    content = content.replace(funcsStr, '');
    
    // insert them before isJobOverdue
    content = content.replace(
        'const isJobOverdue = ',
        funcsStr + '\n\n  const isJobOverdue = '
    );
    
    fs.writeFileSync('pages/JobsList.tsx', content);
    console.log('Fixed JobsList order');
} else {
    console.log('Could not find functions');
}
