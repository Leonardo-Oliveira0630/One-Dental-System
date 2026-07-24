const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const targetAddress = `  const dentistCityState = dentist 
    ? \`\${dentist.city || ''}\${dentist.city && dentist.state ? '/' : ''}\${dentist.state || ''}\`
    : onlineDentist 
        ? \`\${onlineDentist.city || ''}\${onlineDentist.city && onlineDentist.state ? '/' : ''}\${onlineDentist.state || ''}\`
        : '';`;

const replacementAddress = `  const dentistCityState = dentist 
    ? \`\${dentist.city || ''}\${dentist.city && dentist.state ? '/' : ''}\${dentist.state || ''}\`
    : onlineDentist 
        ? \`\${onlineDentist.city || ''}\${onlineDentist.city && onlineDentist.state ? '/' : ''}\${onlineDentist.state || ''}\`
        : '';
        
  const dentistFullAddress = dentist 
    ? \`\${dentist.address || ''}, \${dentist.number || ''} \${dentist.complement || ''} - \${dentist.neighborhood || ''} - \${dentist.city || ''}/\${dentist.state || ''} - CEP: \${dentist.cep || ''}\`
    : onlineDentist?.address || '';
    
  const calculateTotal = (job: any) => {
    let total = 0;
    job?.items?.forEach((item: any) => total += (item.price * item.quantity));
    job?.products?.forEach((prod: any) => total += (prod.unitPrice * prod.quantity));
    return total;
  };
`;

if (code.includes(targetAddress)) {
    code = code.replace(targetAddress, replacementAddress);
}

const targetInvoice = `          {printData.mode === 'LABEL' && printData.job && (`
const replacementInvoice = `          {printData.mode === 'INVOICE_SHEET' && printData.job && (
            <div className="h-full flex flex-col text-sm">
              <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                <div className="flex items-center gap-3">
                    {labLogo ? (
                        <div className="w-12 h-12 bg-white flex items-center justify-center rounded overflow-hidden border border-black/10">
                            <img src={labLogo} alt="Lab Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-xl rounded">
                            {labName.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wide leading-none">{labName}</h1>
                        <p className="text-xs">Ficha de Entrega / Fechamento</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <Barcode value={String(printData.job.osNumber || printData.job.id.substring(0,8))} width={2} height={40} displayValue={true} fontSize={14} margin={0} format="CODE128" />
                    <p className="text-[10px] mt-1 text-gray-500">Emissão: {new Date().toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mb-3">
                <div className="flex flex-col gap-2 flex-1">
                    <div className="border border-gray-300 p-2 rounded flex flex-col items-start">
                        <div className="w-full mb-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Dentista / Clínica</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{printData.job.dentistName}</p>
                        </div>
                        <div className="w-full mt-1 pt-1 border-t border-gray-200">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Endereço Completo</p>
                            <p className="text-xs font-bold leading-tight mt-1 text-gray-700 break-words">{dentistFullAddress || '-'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="border border-gray-300 p-2 rounded relative flex-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Paciente</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{printData.job.patientName}</p>
                        </div>
                        <div className="bg-gray-100 p-2 rounded w-24 shrink-0 flex flex-col justify-center items-center">
                            <p className="text-[10px] font-bold text-gray-500 leading-none mb-1">Caixa</p>
                            <p className="font-bold text-lg leading-none">{printData.job.boxNumber || '-'}</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 w-32 shrink-0">
                    <div className="bg-gray-100 p-2 rounded flex-1 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Data Entrada</p>
                        <p className="font-mono text-sm leading-tight mt-0.5">{new Date(printData.job.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-gray-100 p-2 rounded border-2 border-black flex-1 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Data Saída</p>
                        <p className="font-mono text-sm font-bold leading-tight mt-0.5">{new Date(printData.job.dueDate).toLocaleDateString()}</p>
                    </div>
                </div>
              </div>
              
              <div className="mb-3 flex-1 overflow-hidden flex flex-col">
                <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Serviços Executados</h3>
                <div className="overflow-hidden">
                  <table className="w-full text-left text-xs">
                      <thead><tr className="border-b border-gray-300"><th className="py-1 w-12">Qtd</th><th className="py-1">Descrição</th><th className="py-1 w-24 text-right">Valor Unit.</th><th className="py-1 w-24 text-right">Total</th></tr></thead>
                      <tbody className="divide-y divide-gray-200">
                          {printData.job.items.map((item, idx) => (
                              <tr key={\`item-\${idx}\`}><td className="py-1 font-bold align-top text-sm">{item.quantity}x</td><td className="py-1 align-top font-bold text-sm"><div className="line-clamp-2">{formatItemNameWithVariations(item, jobTypes)} {item.selectedTeeth?.length ? \` - Dentes: \${formatTeethRange(item.selectedTeeth)}\` : ''}</div></td><td className="py-1 align-top text-right text-gray-700 text-sm">{(item.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="py-1 align-top font-bold text-right text-sm">{((item.price || 0) * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
                          ))}
                      </tbody>
                  </table>
                </div>
                
                {printData.job.products && printData.job.products.length > 0 && (
                  <div className="mt-2">
                    <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Produtos</h3>
                    <div className="overflow-hidden">
                      <table className="w-full text-left text-xs">
                          <thead><tr className="border-b border-gray-300"><th className="py-1 w-12">Qtd</th><th className="py-1">Descrição</th><th className="py-1 w-24 text-right">Valor Unit.</th><th className="py-1 w-24 text-right">Total</th></tr></thead>
                          <tbody className="divide-y divide-gray-200">
                              {printData.job.products.map((prod, idx) => (
                                  <tr key={\`prod-\${idx}\`}><td className="py-1 font-bold align-top text-sm">{prod.quantity}x</td><td className="py-1 align-top font-bold text-sm"><div className="line-clamp-2">{prod.name}</div></td><td className="py-1 align-top text-right text-gray-700 text-sm">{(prod.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="py-1 align-top font-bold text-right text-sm">{((prod.unitPrice || 0) * prod.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
                              ))}
                          </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-2 border-t-2 border-black flex justify-between items-center shrink-0">
                    <span className="font-black uppercase text-sm">Total do Serviço</span>
                    <span className="font-black text-xl">{calculateTotal(printData.job).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-dashed border-gray-400 shrink-0 text-center">
                  <div className="w-64 border-b border-black mx-auto mb-1"></div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Assinatura do Recebedor</p>
                  <p className="text-[9px] text-gray-400 mt-2">Documento de Entrega - Gerado via LABPROX</p>
              </div>
            </div>
          )}

          {printData.mode === 'LABEL' && printData.job && (`

if (code.includes(targetInvoice)) {
    code = code.replace(targetInvoice, replacementInvoice);
}

fs.writeFileSync('components/PrintOverlay.tsx', code);
console.log("Patched PrintOverlay.tsx");
