const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

// Replace the onChange handler for isCustomPricing
content = content.replace(
`                                                checked={isCustomPricing}
                                                onChange={e => setIsCustomPricing(e.target.checked)}`,
`                                                checked={isCustomPricing}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setIsCustomPricing(checked);
                                                    if (checked) {
                                                        const assignedTable = priceTables.find(t => t.id === priceTableId);
                                                        const newCustomPrices = jobTypes.map(type => {
                                                            const existing = customPrices.find(p => p.jobTypeId === type.id);
                                                            if (existing && existing.fixedPrice !== undefined) return existing;
                                                            
                                                            let baseForService = type.basePrice;
                                                            if (assignedTable && assignedTable.prices[type.id]?.basePrice !== undefined) {
                                                                baseForService = assignedTable.prices[type.id].basePrice;
                                                            }
                                                            return {
                                                                jobTypeId: type.id,
                                                                fixedPrice: baseForService
                                                            };
                                                        });
                                                        setCustomPrices(newCustomPrices);
                                                    }
                                                }}`
);

fs.writeFileSync('pages/lab/Dentists.tsx', content);
