const fs = require('fs');
let content = fs.readFileSync('pages/lab/Inventory.tsx', 'utf8');

// Replace the overflow on the container
let modified = content.replace(
    `<div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">`,
    `<div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">`
);

// Wrap the table
modified = modified.replace(
    `                            <table className="w-full text-left border-collapse min-w-[800px]">`,
    `                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">`
);

// Close the wrapper div - we need to find where the table ends
const tableEndStr = `                                </tbody>
                            </table>
                        </div>`;

modified = modified.replace(
    `                                </tbody>
                            </table>
                        </div>`,
    `                                </tbody>
                            </table>
                            </div>
                        </div>`
);

fs.writeFileSync('pages/lab/Inventory.tsx', modified);
console.log('Fixed items table overflow');
