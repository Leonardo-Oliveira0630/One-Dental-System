const fs = require('fs');
let content = fs.readFileSync('pages/Reports.tsx', 'utf8');

content = content.replace(
`                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-3 rounded-l-lg">OS #</th>
                        <th className="p-3">Paciente</th>
                        <th className="p-3">Dentista</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Setor</th>
                        <th className="p-3 rounded-r-lg">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupJobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                          <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                          <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                          <td className="p-3 text-sm text-slate-600">{new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 text-sm text-slate-600">{job.currentSector || 'Recepção'}</td>
                          <td className="p-3 text-xs font-bold text-slate-500">{job.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>`,
`                  <table className="w-full text-left border-collapse">
                    <thead>
                      {reportType === 'DETAILED_ORDERS' ? (
                        <tr className="bg-amber-50 text-amber-700 text-[10px] uppercase tracking-widest font-black">
                          <th className="p-3 rounded-l-lg">OS #</th>
                          <th className="p-3">Caixa</th>
                          <th className="p-3">Dentista</th>
                          <th className="p-3">Paciente</th>
                          <th className="p-3">Serviços</th>
                          <th className="p-3">Valor Serviço</th>
                          <th className="p-3">Total</th>
                          <th className="p-3">Entrada</th>
                          <th className="p-3 rounded-r-lg">Finalização</th>
                        </tr>
                      ) : (
                        <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                          <th className="p-3 rounded-l-lg">OS #</th>
                          <th className="p-3">Paciente</th>
                          <th className="p-3">Dentista</th>
                          <th className="p-3">Data</th>
                          <th className="p-3">Setor</th>
                          <th className="p-3 rounded-r-lg">Status</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupJobs.map(job => {
                        if (reportType === 'DETAILED_ORDERS') {
                          const finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h: any) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';
                          return (
                            <tr key={job.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                              <td className="p-3 font-bold text-slate-700 text-xs">{job.boxNumber || '-'}</td>
                              <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                              <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                              <td className="p-3 text-xs text-slate-600">
                                {job.items.map((item: any, i: number) => {
                                  const jt = jobTypes.find(t => t.id === item.jobTypeId);
                                  return (
                                    <div key={i}>{item.quantity}x {jt ? jt.name : item.name}</div>
                                  );
                                })}
                              </td>
                              <td className="p-3 text-xs text-slate-600">
                                {job.items.map((item: any, i: number) => (
                                  <div key={i}>R$ {((item.price * item.quantity) - (item.appliedDiscount || 0)).toFixed(2)}</div>
                                ))}
                              </td>
                              <td className="p-3 font-bold text-slate-800 text-sm">R$ {job.totalValue.toFixed(2)}</td>
                              <td className="p-3 text-sm text-slate-600">{new Date(job.createdAt).toLocaleDateString('pt-BR')}</td>
                              <td className="p-3 text-sm text-slate-600">{finishDate}</td>
                            </tr>
                          );
                        } else {
                          return (
                            <tr key={job.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                              <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                              <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                              <td className="p-3 text-sm text-slate-600">{new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR')}</td>
                              <td className="p-3 text-sm text-slate-600">{job.currentSector || 'Recepção'}</td>
                              <td className="p-3 text-xs font-bold text-slate-500">{job.status}</td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>`
);

fs.writeFileSync('pages/Reports.tsx', content);
