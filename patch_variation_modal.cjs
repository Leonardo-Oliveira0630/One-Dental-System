const fs = require('fs');
let content = fs.readFileSync('pages/store/Catalog.tsx', 'utf-8');

const targetStr1 = `const VariationConfigModal = ({ product, selectedLab, onClose }: { product: JobType; selectedLab: import('../../types').Organization; onClose: () => void; }) => {`;
const replaceStr1 = `const VariationConfigModal = ({ product, selectedLab, localPriceTables, onClose }: { product: JobType; selectedLab: import('../../types').Organization; localPriceTables: any[]; onClose: () => void; }) => {`;

const targetStr2 = `    const calculateFinalUnitPrice = (type: JobType, selectedIds: string[]) => {
        if (!currentUser) {
            let total = type.basePrice;
            selectedIds.forEach(id => {
                type.variationGroups.forEach(g => {
                    const opt = g.options.find(o => o.id === id);
                    if (opt) total += opt.priceModifier;
                });
            });
            return total;
        }
        
        let discountableTotal = type.basePrice;
        let exemptTotal = 0;

        selectedIds.forEach(id => {
            type.variationGroups.forEach(g => {
                const opt = g.options.find(o => o.id === id);
                if (opt) {
                    if (opt.isDiscountExempt) exemptTotal += opt.priceModifier;
                    else discountableTotal += opt.priceModifier;
                }
            });
        });

        let discountRate = 0; 
        const custom = currentUser.customPrices?.find(p => p.jobTypeId === type.id);
        if (custom) {
            if (custom.fixedPrice !== undefined && custom.fixedPrice > 0) {
                discountableTotal = custom.fixedPrice;
            } else if (custom.discountPercent !== undefined) {
                discountRate = custom.discountPercent / 100;
            } else if (custom.price !== undefined) {
                discountableTotal = custom.price;
            }
        } else if (currentUser.globalDiscountPercent) {
            discountRate = currentUser.globalDiscountPercent / 100;
        }

        return (discountableTotal * (1 - discountRate)) + exemptTotal;
    };`;

const replaceStr2 = `    const calculateFinalUnitPrice = (type: JobType, selectedIds: string[]) => {
        if (!currentUser) {
            let total = type.basePrice;
            selectedIds.forEach(id => {
                type.variationGroups.forEach(g => {
                    const opt = g.options.find(o => o.id === id);
                    if (opt) total += opt.priceModifier;
                });
            });
            return total;
        }
        
        let basePrice = type.basePrice;
        let discountRate = 0;
        
        if (currentUser.priceTableId) {
            const table = localPriceTables.find(t => t.id === currentUser.priceTableId);
            if (table && table.prices[type.id]?.basePrice !== undefined) {
                basePrice = table.prices[type.id].basePrice;
            }
        }
        
        if (currentUser.isCustomPricing) {
            const custom = currentUser.customPrices?.find(p => p.jobTypeId === type.id);
            if (custom) {
                if (custom.fixedPrice !== undefined && custom.fixedPrice > 0) {
                    basePrice = custom.fixedPrice;
                    discountRate = 0;
                } else if (custom.discountPercent !== undefined) {
                    discountRate = custom.discountPercent / 100;
                } else if (custom.price !== undefined) {
                    basePrice = custom.price;
                    discountRate = 0;
                }
            } else if (currentUser.globalDiscountPercent) {
                discountRate = currentUser.globalDiscountPercent / 100;
            }
        }

        let discountableTotal = basePrice;
        let exemptTotal = 0;

        selectedIds.forEach(id => {
            type.variationGroups.forEach(g => {
                const opt = g.options.find(o => o.id === id);
                if (opt) {
                    let modifier = opt.priceModifier;
                    if (currentUser.priceTableId) {
                        const table = localPriceTables.find(t => t.id === currentUser.priceTableId);
                        if (table && table.prices[type.id]?.variations?.[opt.id] !== undefined) {
                            modifier = table.prices[type.id].variations[opt.id];
                        }
                    }
                    if (opt.isDiscountExempt) exemptTotal += modifier;
                    else discountableTotal += modifier;
                }
            });
        });

        return (discountableTotal * (1 - discountRate)) + exemptTotal;
    };`;

const targetStr3 = `{configuringProduct && <VariationConfigModal product={configuringProduct} selectedLab={selectedLab} onClose={() => setConfiguringProduct(null)} />}`;
const replaceStr3 = `{configuringProduct && <VariationConfigModal product={configuringProduct} selectedLab={selectedLab} localPriceTables={localPriceTables} onClose={() => setConfiguringProduct(null)} />}`;

content = content.replace(targetStr1, replaceStr1);
content = content.replace(targetStr2, replaceStr2);
content = content.replace(targetStr3, replaceStr3);

fs.writeFileSync('pages/store/Catalog.tsx', content);
console.log('Patched VariationConfigModal in Catalog.tsx');
