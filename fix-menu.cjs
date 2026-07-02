const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const regexToReplace = /<button \n            onClick=\{\(\) => setSelectedSupplierId\('ALL'\)\}\n            className=\{\`px-4 py-2 rounded-xl font-bold text-base transition-colors \$\{selectedSupplierId === 'ALL' \? 'bg-\[#15263f\] text-white' : 'text-slate-600 hover:bg-\[#15263f\] hover:text-white'\}\`\}\n          >\n            Home\n          <\/button>/;

const newButton = `<button 
            onClick={() => { setSelectedSupplierId('ALL'); setActiveTab('STORE'); }}
            className={\`px-4 py-2 rounded-xl font-bold text-base transition-colors \${activeTab === 'STORE' && selectedSupplierId === 'ALL' ? 'bg-[#15263f] text-white' : 'text-slate-600 hover:bg-[#15263f] hover:text-white'}\`}
          >
            Home
          </button>
          <button 
            onClick={() => setActiveTab('MY_ORDERS')}
            className={\`px-4 py-2 rounded-xl font-bold text-base transition-colors \${activeTab === 'MY_ORDERS' ? 'bg-[#15263f] text-white' : 'text-slate-600 hover:bg-[#15263f] hover:text-white'}\`}
          >
            Meus Pedidos
          </button>`;

if (store.match(regexToReplace)) {
  store = store.replace(regexToReplace, newButton);
  fs.writeFileSync('pages/store/SupplierStore.tsx', store);
  console.log("Success");
} else {
  console.log("Not found");
}
