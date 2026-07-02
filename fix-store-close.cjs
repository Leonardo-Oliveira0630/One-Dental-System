const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const endAnchor = `      {/* Success Modal */}`;
if (store.includes(endAnchor) && !store.includes('      </>\n      )}\n      {/* Success Modal */}')) {
  store = store.replace(endAnchor, `      </>\n      )}\n      ${endAnchor}`);
  fs.writeFileSync('pages/store/SupplierStore.tsx', store);
  console.log("Success");
} else {
  console.log("Not found or already closed");
}
