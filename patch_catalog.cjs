const fs = require('fs');
let code = fs.readFileSync('pages/store/Catalog.tsx', 'utf-8');

const regex = /\/\/ Logic to calculate final price for a product based on user discounts.*?return discountedSum \+ exemptTotal;\s*\};/s;

const newCode = `    // Logic to calculate final price for a product based on user discounts
    const calculateFinalUnitPrice = (type: JobType, selectedIds: string[]) => {
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
        
        if (currentUser.priceTableId && !currentUser.isCustomPricing) {
            const table = localPriceTables.find(t => t.id === currentUser.priceTableId);
            if (table && table.prices[type.id]?.basePrice !== undefined) {
                discountableTotal = table.prices[type.id].basePrice;
            }
        }
        
        let exemptTotal = 0;
        let discountRate = 0;
        
        const custom = currentUser.customPrices?.find(p => p.jobTypeId === type.id);
        
        selectedIds.forEach(id => {
            type.variationGroups.forEach(g => {
                const opt = g.options.find(o => o.id === id);
                if (opt) {
                    let modifier = opt.priceModifier;
                    
                    if (currentUser.isCustomPricing) {
                        if (custom && custom.variations && custom.variations[opt.id] !== undefined) {
                            modifier = custom.variations[opt.id];
                        }
                    } else if (currentUser.priceTableId) {
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

        if (currentUser.isCustomPricing) {
            if (custom) {
                if (custom.fixedPrice !== undefined && custom.fixedPrice > 0) {
                    discountableTotal = custom.fixedPrice;
                    discountRate = 0;
                } else if (custom.discountPercent !== undefined) {
                    discountRate = custom.discountPercent / 100;
                } else if (custom.price !== undefined) {
                    discountableTotal = custom.price;
                    discountRate = 0;
                }
            } else if (currentUser.globalDiscountPercent) {
                discountRate = currentUser.globalDiscountPercent / 100;
            }
        } else if (currentUser.globalDiscountPercent) {
             discountRate = currentUser.globalDiscountPercent / 100;
        }

        const discountedSum = discountableTotal * (1 - discountRate);
        return discountedSum + exemptTotal;
    };`;

code = code.replace(regex, newCode);
fs.writeFileSync('pages/store/Catalog.tsx', code, 'utf-8');
console.log('patched');
