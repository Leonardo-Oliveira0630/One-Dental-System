const fs = require('fs');
let code = fs.readFileSync('pages/JobsList.tsx', 'utf8');

code = code.replace(
    /                  \}\)\n                \)\}\n\n              <\/tbody>/,
    `                  })
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
              </tbody>`
);

fs.writeFileSync('pages/JobsList.tsx', code);
console.log("Updated freeLabJobs pagination again");
