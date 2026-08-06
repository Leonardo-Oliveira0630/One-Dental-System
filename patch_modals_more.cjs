const fs = require('fs');
const glob = require('glob');

const files = glob.sync('pages/**/*.tsx').concat(glob.sync('components/**/*.tsx'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace z-[60], z-[70], z-[80], z-60, z-70, z-80, z-90 in 'fixed ' to z-[100]
    const zIndexesToReplace = ['z-40', 'z-50', 'z-\\[50\\]', 'z-\\[60\\]', 'z-\\[70\\]', 'z-\\[80\\]', 'z-60', 'z-70', 'z-[60]', 'z-80'];
    
    zIndexesToReplace.forEach(zIndex => {
        const regex = new RegExp(`className="(?:[^"]*?\\s)?fixed(?:\\s[^"]*?)?\\s${zIndex}(?:\\s[^"]*?)?"`, 'g');
        content = content.replace(regex, (match) => {
            modified = true;
            return match.replace(new RegExp(`\\b${zIndex}\\b`), 'z-[100]');
        });
    });

    if (modified) {
        fs.writeFileSync(file, content);
        console.log(`Updated z-index in ${file}`);
    }
});
