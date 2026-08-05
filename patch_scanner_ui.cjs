const fs = require('fs');

let content = fs.readFileSync('components/Scanner.tsx', 'utf8');

content = content.replace(
/\{itemSectorStages\.length === 0 \? \([\s\S]*?\) : \(\s*<div className="space-y-3">\s*<div className="flex-1 pb-2 border-b border-slate-100">\s*<p className="font-bold text-sm text-slate-800">\{jobType\?\.name \|\| 'Item Desconhecido'\}<\/p>\s*<p className="text-xs text-slate-500">Selecione as etapas executadas[\s\S]*?<\/p>\s*<\/div>\s*<div className="space-y-2">\s*\{itemSectorStages\.map\(\(stageName: string\) => \{[\s\S]*?return \([\s\S]*?<\/label>\s*\);\s*\}\)\}\s*<\/div>\s*<\/div>\s*\)/g,
`{/* Base Item Checkbox */}
                                <label className="flex items-center gap-3 cursor-pointer mb-2">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500 border-slate-300"
                                        checked={isItemSelected}
                                        onChange={(e) => {
                                            const newIds = e.target.checked 
                                                ? [...selectedItemIds, item.id] 
                                                : selectedItemIds.filter(id => id !== item.id);
                                            setSelectedItemIds(newIds);
                                            if (currentUserRef.current) {
                                                setCommissionEarned(calculateCommissionForItems(scannedJob, currentUserRef.current, newIds, jobTypesRef.current, activeUserSector, selectedStages));
                                            }
                                        }}
                                    />
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-slate-800">{jobType?.name || 'Item Desconhecido'}</p>
                                        <p className="text-xs text-slate-500">Qtd: {
                                            (currentUser?.sector && item.sectorQuantities && item.sectorQuantities[currentUser.sector]) 
                                                ? item.sectorQuantities[currentUser.sector] 
                                                : item.quantity
                                        }</p>
                                    </div>
                                </label>

                                {/* Stages Checkboxes */}
                                {itemSectorStages.length > 0 && (
                                    <div className="pl-8 space-y-2 border-t border-slate-100 pt-2">
                                        {itemSectorStages.map((stageName: string) => {
                                            const isStageChecked = itemExecutedStages.includes(stageName);
                                            return (
                                                <label key={stageName} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                                                    <input 
                                                        type="checkbox"
                                                        checked={isStageChecked}
                                                        onChange={(e) => {
                                                            const newStages = e.target.checked
                                                                ? [...itemExecutedStages, stageName]
                                                                : itemExecutedStages.filter(s => s !== stageName);
                                                            const updatedStagesMap = { ...selectedStages, [item.id]: newStages };
                                                            setSelectedStages(updatedStagesMap);
                                                            
                                                            if (currentUserRef.current) {
                                                                setCommissionEarned(calculateCommissionForItems(scannedJob, currentUserRef.current, selectedItemIds, jobTypesRef.current, activeUserSector, updatedStagesMap));
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm font-bold text-slate-600">{stageName}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}`
);

fs.writeFileSync('components/Scanner.tsx', content);
