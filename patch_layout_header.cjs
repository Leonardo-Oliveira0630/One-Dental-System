const fs = require('fs');
let code = fs.readFileSync('components/Layout.tsx', 'utf8');

if (!code.includes('<ManualScannerInput />')) {
    // We'll insert it right after <JobSearch /> in the desktop header
    code = code.replace(
        '<JobSearch />\n          </div>\n\n          <div className="flex items-center gap-4 shrink-0">',
        `<JobSearch />\n          </div>\n\n          <div className="mr-4 hidden lg:block">\n            <ManualScannerInput />\n          </div>\n\n          <div className="flex items-center gap-4 shrink-0">`
    );
    
    // Insert import if needed, but we'll define ManualScannerInput in Scanner.tsx and export it.
    code = code.replace(
        'import { GlobalScanner } from \'./Scanner\';',
        'import { GlobalScanner, ManualScannerInput } from \'./Scanner\';'
    );

    fs.writeFileSync('components/Layout.tsx', code);
    console.log("Layout header patched with ManualScannerInput");
}
