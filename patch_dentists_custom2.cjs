const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

content = content.replace(
`                                                        const newCustomPrices = jobTypes.map(type => {
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
                                                        });`,
`                                                        const newCustomPrices = jobTypes.map(type => {
                                                            const existing = customPrices.find(p => p.jobTypeId === type.id);
                                                            if (existing && existing.fixedPrice !== undefined) return existing;
                                                            
                                                            let baseForService = type.basePrice;
                                                            if (assignedTable && assignedTable.prices[type.id]?.basePrice !== undefined) {
                                                                baseForService = assignedTable.prices[type.id].basePrice;
                                                            }
                                                            
                                                            if (existing && existing.discountPercent !== undefined) {
                                                                return {
                                                                    ...existing,
                                                                    fixedPrice: baseForService * (1 - existing.discountPercent / 100)
                                                                };
                                                            }
                                                            
                                                            return {
                                                                jobTypeId: type.id,
                                                                fixedPrice: baseForService
                                                            };
                                                        });`
);

fs.writeFileSync('pages/lab/Dentists.tsx', content);
