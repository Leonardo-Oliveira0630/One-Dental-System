const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const targetBudget = `    const foundBudget = budgets?.find(b => b.id === id);
    if (foundBudget) return { 
        ...foundBudget, 
        isBudget: true, 
        status: foundBudget.status || 'PENDING', 
        osNumber: foundBudget.osNumber || (foundBudget as any).budgetNumber,
        urgency: 'NORMAL',
        history: [],
        sectorMovements: [],
        items: foundBudget.items || [],
        products: foundBudget.products || [],
        createdAt: foundBudget.createdAt || new Date(),
        dueDate: foundBudget.createdAt || new Date(),
    } as any;`;

const replBudget = `    const foundBudget = budgets?.find(b => b.id === id);
    if (foundBudget) {
        let parsedDate = foundBudget.createdAt ? (foundBudget.createdAt instanceof Date ? foundBudget.createdAt : new Date((foundBudget.createdAt.seconds || 0) * 1000 || foundBudget.createdAt)) : new Date();
        if (isNaN(parsedDate.getTime())) parsedDate = new Date();
        return { 
            ...foundBudget, 
            isBudget: true, 
            status: foundBudget.status || 'PENDING', 
            osNumber: foundBudget.osNumber || (foundBudget as any).budgetNumber,
            urgency: 'NORMAL',
            history: [],
            sectorMovements: [],
            items: foundBudget.items || [],
            products: foundBudget.products || [],
            createdAt: parsedDate,
            dueDate: parsedDate,
        } as any;
    }`;

content = content.replace(targetBudget, replBudget);

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched budget timestamp issue');
