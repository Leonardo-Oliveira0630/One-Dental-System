const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const targetStr = `                                                                {(() => {
                                                                    const assignedTable = priceTables.find(t => t.id === priceTableId);
                                                                    const tablePriceObj = assignedTable?.prices[type.id];
                                                                    const basePriceForService = tablePriceObj?.basePrice !== undefined ? tablePriceObj.basePrice : type.basePrice;
                                                                    return (
                                                                        <p className="text-xs text-slate-400">
                                                                            {assignedTable ? \`Preço Tabela (\${assignedTable.name}): R$ \${basePriceForService.toFixed(2)}\` : \`Preço Padrão: R$ {type.basePrice.toFixed(2)}\`}
                                                                        </p>
                                                                    );
                                                                })()}`;

const replacementStr = `                                                                {(() => {
                                                                    const assignedTable = priceTables.find(t => t.id === priceTableId);
                                                                    const tablePriceObj = assignedTable?.prices[type.id];
                                                                    const basePriceForService = tablePriceObj?.basePrice !== undefined ? tablePriceObj.basePrice : type.basePrice;
                                                                    return (
                                                                        <p className="text-xs text-slate-400">
                                                                            {assignedTable ? \`Preço Tabela (\${assignedTable.name}): R$ \${basePriceForService.toFixed(2)}\` : \`Preço Padrão: R$ \${type.basePrice.toFixed(2)}\`}
                                                                        </p>
                                                                    );
                                                                })()}`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched Dentists.tsx ui string');
