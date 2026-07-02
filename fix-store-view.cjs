const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const anchor = `      {/* Dynamic Header/Banner depending on Selected Supplier to support custom Store settings */}`;
if (store.includes(anchor) && !store.includes('activeTab === \'STORE\' && (')) {
  store = store.replace(anchor, `      {activeTab === 'STORE' && (\n      <>\n${anchor}`);
  
  // Need to find the end of the store view, which is right before `{/* MODALS */}`
  const modalsAnchor = `      {/* MODALS */}`;
  if (store.includes(modalsAnchor)) {
    store = store.replace(modalsAnchor, `      </>\n      )}\n\n${modalsAnchor}`);
  } else {
     console.log("modalsAnchor not found");
  }
}

fs.writeFileSync('pages/store/SupplierStore.tsx', store);
