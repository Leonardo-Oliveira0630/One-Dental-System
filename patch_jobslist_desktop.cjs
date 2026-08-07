const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// TH replacement
const targetThead = `<th className="p-4">{isBudgetMode ? 'Data de Criação' : 'Entrega'}</th>
                        {!isBudgetMode && <th className="p-4 text-right">Ações</th>}
                        {isBudgetMode && <th className="p-4 text-right"></th>}`;

const replThead = `<th className="p-4">{isBudgetMode ? 'Data de Criação' : 'Entrega'}</th>
                        {isBudgetMode && <th className="p-4 text-right">Valor Final</th>}
                        {!isBudgetMode && <th className="p-4 text-right">Ações</th>}
                        {isBudgetMode && <th className="p-4 text-right">Ações</th>}`;

content = content.replace(targetThead, replThead);

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched desktop th');
