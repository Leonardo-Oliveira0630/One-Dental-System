const fs = require('fs');
let code = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// 1. Add state for visibleCount
const stateInsertPoint = "const [isProcessing, setIsProcessing] = useState(false);";
const stateCode = `  const [isProcessing, setIsProcessing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);`;
code = code.replace(stateInsertPoint, stateCode);

// 2. Desktop list replacement
const desktopSliceRegex = /\{filteredJobs\.slice\(0, 100\)\.map\(job => \(/g;
code = code.replace(desktopSliceRegex, '{filteredJobs.slice(0, visibleCount).map(job => (');

const desktopWarningRegex = /\{filteredJobs\.length > 100 && \([\s\S]*?\}\)/;
const desktopLoadMoreCode = `{filteredJobs.length > visibleCount && (
                        <tr>
                            <td colSpan={8} className="p-4 text-center">
                                <button 
                                    onClick={() => setVisibleCount(prev => prev + 20)}
                                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                                >
                                    Carregar mais trabalhos
                                </button>
                            </td>
                        </tr>
                    )}`;
code = code.replace(desktopWarningRegex, desktopLoadMoreCode);

// 3. Mobile list replacement
const mobileSliceRegex = /\{filteredJobs\.slice\(0, 50\)\.map\(job => \(/g;
code = code.replace(mobileSliceRegex, '{filteredJobs.slice(0, visibleCount).map(job => (');

const mobileWarningRegex = /\{filteredJobs\.length > 50 && \([\s\S]*?\}\)/;
const mobileLoadMoreCode = `{filteredJobs.length > visibleCount && (
            <div className="p-4 flex justify-center">
                <button 
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                    Carregar mais trabalhos
                </button>
            </div>
        )}`;
code = code.replace(mobileWarningRegex, mobileLoadMoreCode);

// Optional: Reset visible count when filters change?
// Let's add a reset to visibleCount when text search or statuses change
// Wait, doing this via useEffect might be too much, but let's see.

fs.writeFileSync('pages/JobsList.tsx', code);
console.log('Done replacing slices and adding buttons.');
