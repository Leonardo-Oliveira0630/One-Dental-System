const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add state for supplier categories
const stateRegex = /const \[cart, setCart\] = useState<SupplierCartItem\[\]>\(\[\]\);/;
const supplierCatState = `  const [supplierCategories, setSupplierCategories] = useState<any[]>([]);
  const [selectedInternalCategory, setSelectedInternalCategory] = useState<string | null>(null);

  // Fetch supplier categories
  useEffect(() => {
    if (selectedSupplierId && selectedSupplierId !== 'ALL') {
      const fetchCats = async () => {
        try {
          const snap = await getDocs(collection(db, \`organizations/\${selectedSupplierId}/inventoryCategories\`));
          setSupplierCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error('Error fetching categories', e);
        }
      };
      fetchCats();
    } else {
      setSupplierCategories([]);
      setSelectedInternalCategory(null);
    }
  }, [selectedSupplierId]);

  const [cart, setCart] = useState<SupplierCartItem[]>([]);`;

content = content.replace(stateRegex, supplierCatState);

// 2. Modify the products filtering logic to also filter by `selectedInternalCategory`
// Currently:
//    // Apply category filter
//    if (selectedMarketplaceCategoryId) {
//      currentFiltered = currentFiltered.filter(item => 
//        item.product.marketplaceCategoryIds?.includes(selectedMarketplaceCategoryId)
//      );
//    }
const filterRegex = /\/\/ Apply category filter[\s\S]*?if \(selectedMarketplaceCategoryId\) \{[\s\S]*?currentFiltered\.filter\(item =>[\s\S]*?item\.product\.marketplaceCategoryIds\?\.includes\(selectedMarketplaceCategoryId\)[\s\S]*?\);[\s\S]*?\}/;
const newFilter = `// Apply category filter
    if (selectedMarketplaceCategoryId) {
      currentFiltered = currentFiltered.filter(item => 
        item.product.marketplaceCategoryIds?.includes(selectedMarketplaceCategoryId)
      );
    }
    
    // Apply internal category filter (for single supplier view)
    if (selectedInternalCategory) {
      currentFiltered = currentFiltered.filter(item => item.product.categoryId === selectedInternalCategory);
    }`;
content = content.replace(filterRegex, newFilter);

fs.writeFileSync(filePath, content);
console.log("Updated state in SupplierStore.tsx");
