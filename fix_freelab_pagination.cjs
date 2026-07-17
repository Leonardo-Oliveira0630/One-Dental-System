const fs = require('fs');
let code = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// Replace freeLabJobs.map with freeLabJobs.slice
code = code.replace(
    'freeLabJobs.map((job) => {',
    'freeLabJobs.slice(0, visibleCount).map((job) => {'
);

// Add Load More button for freeLabJobs
const freeLabClosingRegex = /\s*\}\)\s*\}\s*<\/tbody>/;
const loadMoreHtml = `
                  })
                )}
                {freeLabJobs.length > visibleCount && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center">
                        <button 
                            onClick={() => setVisibleCount(prev => prev + 20)}
                            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                        >
                            Carregar mais trabalhos
                        </button>
                    </td>
                  </tr>
                )}
              </tbody>`;

if (code.match(freeLabClosingRegex)) {
    code = code.replace(freeLabClosingRegex, loadMoreHtml);
    fs.writeFileSync('pages/JobsList.tsx', code);
    console.log("Updated freeLabJobs pagination");
} else {
    console.log("Could not find freeLabClosingRegex");
}
