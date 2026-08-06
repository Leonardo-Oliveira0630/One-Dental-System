const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

const replacement = `    const handleOpenPricing = (client: any) => {
        setSelectedClient({
            id: client.id,
            name: client.name,
            isManual: client.isManual
        });
        setGlobalDiscount(client.globalDiscountPercent || 0);
        setPriceTableId(client.priceTableId || '');
        setClientType(client.clientType || 'CLINICA');
        setIsCustomPricing(client.isCustomPricing || false);
        setIsBlocked(client.isBlocked || false);
        setBillingLimit(client.billingLimit || 0);
        setBlockReason(client.blockReason || '');
        let parsedDate = null;
        if (client.temporaryUnblockUntil) {
            if (typeof client.temporaryUnblockUntil.toDate === 'function') {
                parsedDate = client.temporaryUnblockUntil.toDate();
            } else {
                parsedDate = new Date(client.temporaryUnblockUntil);
            }
            if (parsedDate && isNaN(parsedDate.getTime())) parsedDate = null;
        }
        setTemporaryUnblockUntil(parsedDate);
        
        // Ensure that if isCustomPricing is true, customPrices is fully populated
        let loadedCustomPrices = client.customPrices || [];
        if (client.isCustomPricing) {
            const assignedTable = priceTables.find(t => t.id === client.priceTableId);
            loadedCustomPrices = jobTypes.map(type => {
                const existing = loadedCustomPrices.find(p => p.jobTypeId === type.id);
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
                return { jobTypeId: type.id, fixedPrice: baseForService };
            });
        }
        setCustomPrices(loadedCustomPrices);
    };`;

content = content.replace(/    const handleOpenPricing = \(client: any\) => {[\s\S]*?setCustomPrices\(client\.customPrices \|\| \[\]\);\n    };/, replacement);

fs.writeFileSync('pages/lab/Dentists.tsx', content);
