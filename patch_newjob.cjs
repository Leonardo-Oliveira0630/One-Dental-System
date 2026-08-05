const fs = require('fs');
let content = fs.readFileSync('pages/NewJob.tsx', 'utf-8');

const targetStr = `        if (selectedDentistObj.isCustomPricing) {
            // Priority: Explicit Custom Prices
            const custom = selectedDentistObj.customPrices?.find((p: any) => p.jobTypeId === activeJobType.id);
            if (custom) {
                if (custom.fixedPrice !== undefined && custom.fixedPrice > 0) {
                    basePrice = custom.fixedPrice;
                    dentistDiscountRate = 0;
                } else if (custom.discountPercent !== undefined) {
                    dentistDiscountRate = custom.discountPercent / 100;
                } else if (custom.price !== undefined) {
                    basePrice = custom.price;
                    dentistDiscountRate = 0;
                }
            } else if (selectedDentistObj.globalDiscountPercent) {
                // Fallback to Global Discount if custom pricing is ON but no specific price for this jobType
                dentistDiscountRate = selectedDentistObj.globalDiscountPercent / 100;
            }
        }
        if (selectedDentistObj.priceTableId) {
            const table = priceTables.find(t => t.id === selectedDentistObj.priceTableId);
            if (table && table.prices[activeJobType.id]?.basePrice !== undefined) {
                basePrice = table.prices[activeJobType.id].basePrice;
            }
        }`;

const replacementStr = `        if (selectedDentistObj.priceTableId) {
            const table = priceTables.find(t => t.id === selectedDentistObj.priceTableId);
            if (table && table.prices[activeJobType.id]?.basePrice !== undefined) {
                basePrice = table.prices[activeJobType.id].basePrice;
            }
        }
        if (selectedDentistObj.isCustomPricing) {
            // Priority: Explicit Custom Prices
            const custom = selectedDentistObj.customPrices?.find((p: any) => p.jobTypeId === activeJobType.id);
            if (custom) {
                if (custom.fixedPrice !== undefined && custom.fixedPrice > 0) {
                    basePrice = custom.fixedPrice;
                    dentistDiscountRate = 0;
                } else if (custom.discountPercent !== undefined) {
                    dentistDiscountRate = custom.discountPercent / 100;
                } else if (custom.price !== undefined) {
                    basePrice = custom.price;
                    dentistDiscountRate = 0;
                }
            } else if (selectedDentistObj.globalDiscountPercent) {
                // Fallback to Global Discount if custom pricing is ON but no specific price for this jobType
                dentistDiscountRate = selectedDentistObj.globalDiscountPercent / 100;
            }
        }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('pages/NewJob.tsx', content);
console.log('Patched pages/NewJob.tsx calculatedBasePrice');
