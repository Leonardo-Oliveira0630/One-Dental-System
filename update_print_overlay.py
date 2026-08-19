import re

with open('components/PrintOverlay.tsx', 'r') as f:
    content = f.read()

old_block = r"""          {printData.mode === 'ROUTE' && printData.routeItems && (
            <div className="h-full flex flex-col">
               <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Roteiro de Entregas</h1>
                    <div className="flex gap-4 mt-1 text-sm font-bold">
                        <span className="flex items-center gap-1 uppercase"><Truck size={16}/> {printData.driver}</span>
                        <span className="flex items-center gap-1 uppercase"><Clock size={16}/> {printData.shift === 'MORNING' ? 'MANHÃ' : 'TARDE'}</span>
                        <span className="flex items-center gap-1 uppercase"><Truck size={16}/> {printData.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                      <p className="font-black text-xl uppercase">{labName}</p>
                      <p className="text-xs">Gerado em: {new Date().toLocaleString()}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  {printData.routeItems.map((item, idx) => (
                    <div key={item.id} className="border-2 border-black p-4 rounded-xl flex gap-4">
                       <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-black text-xl shrink-0">
                          {idx + 1}
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <div>
                                <h3 className="font-black text-lg uppercase leading-none">{item.dentistName}</h3>
                                <p className="text-sm font-bold text-gray-600 mb-2">{item.clinicName || 'Consultório'}</p>
                             </div>
                             <span className="px-2 py-1 bg-gray-200 text-black text-[10px] font-black rounded uppercase">
                                {item.type === 'DELIVERY' ? 'ENTREGA' : 'COLETA'}
                             </span>
                          </div>
                           
                          <div className="flex items-start gap-1 mb-2">
                             <MapPin size={16} className="shrink-0 mt-0.5" />
                             <p className="text-base font-bold leading-tight">{item.address}</p>
                          </div>

                          {item.patientName && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded">
                                <User size={14} className="text-gray-400" />
                                <span className="text-xs font-bold">Paciente: {item.patientName}</span>
                            </div>
                          )}
                       </div>
                       {/* Área para rubrica do cliente */}
                       <div className="w-32 border-l border-dashed border-gray-300 pl-4 flex flex-col justify-end">
                           <div className="border-t border-black w-full mb-1"></div>
                           <p className="text-[8px] text-center uppercase font-bold">Rubrica / Hora</p>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="mt-auto pt-8 text-center border-t border-dashed border-gray-300">
                  <p className="text-xs font-bold uppercase text-gray-500">Documento de uso logístico ProTrack - Boa viagem, motorista!</p>
               </div>
            </div>
          )}"""

new_block = r"""          {printData.mode === 'ROUTE' && printData.routeItems && (
            <div className="h-full flex flex-col">
               <div className="flex justify-between items-center border-b border-black pb-2 mb-4">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight">Roteiro de Entregas</h1>
                    <div className="flex gap-4 mt-1 text-xs font-bold">
                        <span className="flex items-center gap-1 uppercase"><Truck size={14}/> {printData.driver}</span>
                        <span className="flex items-center gap-1 uppercase"><Clock size={14}/> {printData.shift === 'MORNING' ? 'MANHÃ' : 'TARDE'}</span>
                        <span className="flex items-center gap-1 uppercase"><Calendar size={14}/> {printData.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                      <p className="font-black text-sm uppercase">{labName}</p>
                      <p className="text-[10px]">Gerado: {new Date().toLocaleString()}</p>
                  </div>
               </div>

               <div className="w-full">
                   <table className="w-full border-collapse">
                      <thead>
                         <tr className="border-b border-black text-left text-[10px] uppercase">
                            <th className="w-8 py-1">Ord.</th>
                            <th className="py-1">Cliente / Endereço</th>
                            <th className="py-1">Serviços / Observações</th>
                            <th className="w-24 py-1 text-center">Assinatura</th>
                         </tr>
                      </thead>
                      <tbody>
                         {(() => {
                            const groups = new Map<string, typeof printData.routeItems>();
                            const sortedItems = [...printData.routeItems].sort((a, b) => (a.order || 0) - (b.order || 0));
                            sortedItems.forEach(item => {
                               if (!groups.has(item.dentistId)) groups.set(item.dentistId, []);
                               groups.get(item.dentistId)!.push(item);
                            });
                            return Array.from(groups.values()).map((group, idx) => (
                               <tr key={idx} className="border-b border-gray-300">
                                  <td className="py-2 align-top">
                                     <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs">
                                        {idx + 1}
                                     </div>
                                  </td>
                                  <td className="py-2 pr-2 align-top">
                                     <h3 className="font-bold text-[10pt] uppercase leading-tight">{group[0].dentistName}</h3>
                                     <p className="text-[9px] font-bold text-gray-600 leading-tight mb-1">{group[0].clinicName || 'Consultório'}</p>
                                     <p className="text-[9px] leading-tight flex items-start gap-0.5"><MapPin size={10} className="shrink-0 mt-0.5"/> {group[0].address}</p>
                                  </td>
                                  <td className="py-2 pr-2 align-top text-[9px]">
                                     {group.map((item, i) => (
                                         <div key={i} className="mb-1 border border-gray-200 rounded p-1 bg-gray-50">
                                             <div className="font-bold uppercase mb-0.5 flex items-center justify-between">
                                                 <span>{item.type === 'DELIVERY' ? 'ENTREGA' : 'COLETA'}{item.patientName ? ` - ${item.patientName}` : ''}</span>
                                             </div>
                                             {item.observations && <div className="text-[8px] text-gray-600 italic leading-tight">Obs: {item.observations}</div>}
                                         </div>
                                     ))}
                                  </td>
                                  <td className="py-2 align-bottom pb-4">
                                     <div className="w-full border-t border-black pt-0.5">
                                         <p className="text-[7px] text-center uppercase font-bold text-gray-500">Recebedor / Hora</p>
                                     </div>
                                  </td>
                               </tr>
                            ));
                         })()}
                      </tbody>
                   </table>
               </div>

               <div className="mt-auto pt-4 text-center border-t border-dashed border-gray-300">
                  <p className="text-[9px] font-bold uppercase text-gray-500">Documento de uso logístico - Boa viagem, motorista!</p>
               </div>
            </div>
          )}"""

new_content = content.replace(old_block, new_block)

with open('components/PrintOverlay.tsx', 'w') as f:
    f.write(new_content)
