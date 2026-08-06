const fs = require('fs');
const glob = require('glob');

const files = glob.sync('pages/**/*.tsx').concat(glob.sync('components/**/*.tsx'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace padding classes that might be too big on mobile
    content = content.replace(/className="([^"]*)p-8/g, (match, p1) => {
        if (!p1.includes('sm:p-8') && !p1.includes('md:p-8') && !p1.includes('lg:p-8')) {
            modified = true;
            return `className="${p1}p-4 sm:p-8`;
        }
        return match;
    });

    content = content.replace(/className="([^"]*)p-6/g, (match, p1) => {
        if (!p1.includes('sm:p-6') && !p1.includes('md:p-6') && !p1.includes('lg:p-6')) {
            modified = true;
            return `className="${p1}p-4 sm:p-6`;
        }
        return match;
    });
    
    // Check for fixed w-something that breaks on mobile, maybe w-96 to w-full sm:w-96
    content = content.replace(/className="([^"]*)w-96([^"]*)"/g, (match, p1, p2) => {
        if (!p1.includes('sm:w-96') && !p2.includes('sm:w-96') && !p1.includes('max-w') && !p2.includes('max-w')) {
            modified = true;
            return `className="${p1}w-full sm:w-96 max-w-[calc(100vw-2rem)]${p2}"`;
        }
        return match;
    });

    if (modified) {
        fs.writeFileSync(file, content);
        console.log(`Made responsive changes in ${file}`);
    }
});
