import re

with open('pages/lab/RoutePlanner.tsx', 'r') as f:
    content = f.read()

# Using regex to replace everything between {routeItems.map and {routeItems.length === 0
pattern = re.compile(r"\{routeItems\.map\(\(item, idx\) => \(\s*<div.*?</div>\s*</div>\s*\)\)\} \n", re.DOTALL)
new_map = r"""{groupedStops.map((group, idx) => (
                                    <div 
                                        key={`group-${idx}`}
                                        draggable={canEdit}
                                        onDragStart={(e) => {
                                            if (canEdit) {
                                                setDraggedIndex(idx);
                                                e.dataTransfer.effectAllowed = 'move';
                                            } else {
                                                e.preventDefault();
                                            }
                                        }}
                                        onDragOver={(e) => {
                                            if (canEdit) {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                            }
                                        }}
                                        onDrop={() => {
                                            if (draggedIndex !== null && canEdit) {
                                                handleDropGroup(idx);
                                            }
                                        }}
                                        className={`flex flex-col gap-3 p-4 bg-white border rounded-2xl hover:border-blue-200 transition-all group shadow-sm/5 hover:shadow-md ${
                                            draggedIndex === idx ? 'opacity-40 border-dashed border-blue-300 bg-slate-50' : 'border-slate-100'
                                        }`} 
                                        id={`route-stop-group-${idx}`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 w-full">
                                            {/* REORDER CONTROLS (DRAG HANDLE AND MOVEMENT BUTTONS) */}
                                            {canEdit && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <div 
                                                        className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors"
                                                        title="Arrastar para reordenar"
                                                    >
                                                        <GripVertical size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <button
                                                            onClick={() => handleMoveGroup(idx, idx - 1)}
                                                            disabled={idx === 0}
                                                            className={`p-0.5 rounded hover:bg-slate-100 transition-colors ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                                                            title="Mover para cima"
                                                        >
                                                            <ChevronUp size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMoveGroup(idx, idx + 1)}
                                                            disabled={idx === groupedStops.length - 1}
                                                            className={`p-0.5 rounded hover:bg-slate-100 transition-colors ${idx === groupedStops.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                                                            title="Mover para baixo"
                                                        >
                                                            <ChevronDown size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-extrabold text-slate-800 truncate text-sm md:text-base">{group[0].dentistName}</h4>
                                                <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{group[0].address}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button 
                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(group[0].address)}`, '_blank')}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Ver no Mapa"
                                                >
                                                    <Navigation size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Group Items */}
                                        <div className="pl-[3.25rem] space-y-2 mt-2">
                                            {group.map(item => (
                                                <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${item.type === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {item.type === 'DELIVERY' ? 'Entrega' : 'Coleta'}
                                                            </span>
                                                            {item.patientName && (
                                                                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                                    <UserIcon size={12} /> Paciente: {item.patientName}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {(canDelete || canEdit) && (
                                                            <button 
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                                                                title="Remover Serviço"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Observations */}
                                                    <div className="mt-3 border-t border-slate-200 pt-3">
                                                        {editingObservationsId === item.id ? (
                                                            <div className="flex flex-col gap-2">
                                                                <textarea
                                                                    value={observationsText}
                                                                    onChange={(e) => setObservationsText(e.target.value)}
                                                                    placeholder="Observações de entrega..."
                                                                    className="w-full text-xs p-2 border rounded-lg resize-none h-16 font-medium text-slate-700 focus:border-indigo-400 outline-none"
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => setEditingObservationsId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                                                                    <button onClick={() => handleSaveObservations(item)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Salvar</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-start justify-between gap-2 group/obs cursor-pointer" onClick={() => { setEditingObservationsId(item.id); setObservationsText(item.observations || ''); }}>
                                                                <p className={`text-xs font-medium ${item.observations ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                                                                    {item.observations || 'Adicionar observações de entrega...'}
                                                                </p>
                                                                <span className="opacity-0 group-hover/obs:opacity-100 text-xs text-indigo-500 font-bold whitespace-nowrap">Editar</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
"""

start_str = "                                {routeItems.map((item, idx) => ("
end_str = "                                ))} "

content_parts = content.split(start_str)
if len(content_parts) > 1:
    end_parts = content_parts[1].split("                                ))} \n")
    if len(end_parts) > 1:
        new_content = content_parts[0] + "                                " + new_map + end_parts[1]
        with open('pages/lab/RoutePlanner.tsx', 'w') as f:
            f.write(new_content)
        print("Success")
    else:
        print("End pattern not found")
else:
    print("Start pattern not found")
