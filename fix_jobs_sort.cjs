const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(
    `.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())`,
    `.sort((a,b) => {
                                                    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt?.seconds || 0) * 1000 || a.createdAt);
                                                    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt?.seconds || 0) * 1000 || b.createdAt);
                                                    return dateA.getTime() - dateB.getTime();
                                                 })`
);

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched sort');
