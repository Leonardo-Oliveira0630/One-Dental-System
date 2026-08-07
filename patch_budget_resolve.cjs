const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const oldResolve = `    const foundBudget = budgets?.find(b => b.id === id);
    if (foundBudget) return { ...foundBudget, isBudget: true, status: foundBudget.status || 'PENDING', osNumber: foundBudget.osNumber || (foundBudget as any).budgetNumber };`;

const newResolve = `    const foundBudget = budgets?.find(b => b.id === id);
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

content = content.replace(oldResolve, newResolve);
fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched budget resolve');
