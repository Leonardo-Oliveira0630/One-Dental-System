const fs = require('fs');
let content = fs.readFileSync('pages/store/Catalog.tsx', 'utf-8');

const targetStr1 = `    const [localJobTypes, setLocalJobTypes] = useState<JobType[]>([]);`;
const replaceStr1 = `    const [localJobTypes, setLocalJobTypes] = useState<JobType[]>([]);
    const [localPriceTables, setLocalPriceTables] = useState<any[]>([]);`;

const targetStr2 = `    useEffect(() => {
        if (!selectedLab?.id) {
            setLocalJobTypes([]);
            setLoadingProducts(false);
            return;
        }`;
const replaceStr2 = `    useEffect(() => {
        if (!selectedLab?.id) {
            setLocalJobTypes([]);
            setLocalPriceTables([]);
            setLoadingProducts(false);
            return;
        }`;

const targetStr3 = `            const unsub = api.subscribeJobTypes(selectedLab.id, (types) => {
                setLocalJobTypes(types);
                setLoadingProducts(false);
            });
            return unsub;`;
const replaceStr3 = `            let unsubTypes = api.subscribeJobTypes(selectedLab.id, (types) => {
                setLocalJobTypes(types);
                setLoadingProducts(false);
            });
            let unsubTables = api.subscribePriceTables(selectedLab.id, (tables) => {
                setLocalPriceTables(tables);
            });
            return () => {
                unsubTypes();
                unsubTables();
            };`;

const targetStr4 = `    const getPrice = (type: JobType) => {
        if (!currentUser) return { price: type.basePrice, isCustom: false };
        const custom = currentUser.customPrices?.find(c => c.jobTypeId === type.id);
        if (custom) {
            if (custom.price !== undefined) return { price: custom.price, isCustom: true };
            if (custom.discountPercent !== undefined) return { price: type.basePrice * (1 - custom.discountPercent / 100), isCustom: true };
        }
        if (currentUser.globalDiscountPercent) return { price: type.basePrice * (1 - currentUser.globalDiscountPercent / 100), isCustom: true };
        return { price: type.basePrice, isCustom: false };
    };`;

const replaceStr4 = `    const getPrice = (type: JobType) => {
        if (!currentUser) return { price: type.basePrice, isCustom: false };
        
        let basePrice = type.basePrice;
        
        if (currentUser.priceTableId) {
            const table = localPriceTables.find(t => t.id === currentUser.priceTableId);
            if (table && table.prices[type.id]?.basePrice !== undefined) {
                basePrice = table.prices[type.id].basePrice;
            }
        }
        
        if (currentUser.isCustomPricing) {
            const custom = currentUser.customPrices?.find(c => c.jobTypeId === type.id);
            if (custom) {
                if (custom.fixedPrice !== undefined && custom.fixedPrice > 0) return { price: custom.fixedPrice, isCustom: true };
                if (custom.price !== undefined) return { price: custom.price, isCustom: true };
                if (custom.discountPercent !== undefined) return { price: basePrice * (1 - custom.discountPercent / 100), isCustom: true };
            }
            if (currentUser.globalDiscountPercent) return { price: basePrice * (1 - currentUser.globalDiscountPercent / 100), isCustom: true };
        }
        
        // If not custom pricing, or custom pricing had no overrides, check if basePrice was changed by table
        if (basePrice !== type.basePrice) {
            return { price: basePrice, isCustom: true }; // Consider table price as custom for display purposes
        }
        
        return { price: type.basePrice, isCustom: false };
    };`;

content = content.replace(targetStr1, replaceStr1);
content = content.replace(targetStr2, replaceStr2);
content = content.replace(targetStr3, replaceStr3);
content = content.replace(targetStr4, replaceStr4);

fs.writeFileSync('pages/store/Catalog.tsx', content);
console.log('Patched Catalog.tsx');
