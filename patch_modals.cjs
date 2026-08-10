const fs = require('fs');
const glob = require('glob');

const files = glob.sync('pages/**/*.tsx').concat(glob.sync('components/**/*.tsx'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace z-40, z-50, z-[60], z-[80] in 'fixed inset-0' to z-[100]
    const zIndexesToReplace = ['z-40', 'z-50', 'z-\\[50\\]', 'z-\\[60\\]', 'z-\\[70\\]', 'z-\\[80\\]', 'z-60', 'z-[60]'];
    
    zIndexesToReplace.forEach(zIndex => {
        const regex = new RegExp(`className="(?:[^"]*?\\s)?fixed inset-0(?:\\s[^"]*?)?\\s${zIndex}(?:\\s[^"]*?)?"`, 'g');
        content = content.replace(regex, (match) => {
            modified = true;
            return match.replace(new RegExp(`\\b${zIndex}\\b`), 'z-[100]');
        });
        
        // Also look for other orderings like fixed z-50 inset-0
        const regex2 = new RegExp(`className="(?:[^"]*?\\s)?fixed(?:\\s[^"]*?)?\\s${zIndex}(?:\\s[^"]*?)?\\sinset-0(?:\\s[^"]*?)?"`, 'g');
        content = content.replace(regex2, (match) => {
            modified = true;
            return match.replace(new RegExp(`\\b${zIndex}\\b`), 'z-[100]');
        });
    });

    if (modified) {
        fs.writeFileSync(file, content);
        console.log(`Updated z-index in ${file}`);
    }
});
