const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `          {printData.mode === 'LABEL' && printData.job && (
            <div 
              className="w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] overflow-hidden flex flex-col bg-white thermal-print px-2 py-1" 
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: 'black' }}
            > 
               {/* Top Section: Information */}
               <div className="flex-1 flex flex-col justify-start space-y-0.5 mt-0.5">
                  <div className="flex justify-between items-start">
                      <p className="font-bold text-[12px] leading-tight truncate uppercase max-w-[35mm]">{printData.job.patientName}</p>
                      {printData.job.boxNumber && (
                        <p className="font-bold text-[14px] leading-none mb-1">CX: {printData.job.boxNumber}</p>
                      )}
                  </div>
                  <p className="text-[10px] leading-tight truncate uppercase max-w-[35mm]">{printData.job.dentistName}</p>
                  
                  <div className="flex justify-between items-center pr-1">
                      <p className="text-[9px] leading-tight flex flex-col">
                        <span>ENT: {new Date(printData.job.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                        <span className="font-bold">SAI: {new Date(printData.job.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                      </p>
                      {printData.job.items.some(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT') && (
                          <p className="text-[9px] font-black uppercase leading-tight bg-black text-white px-1">
                              {printData.job.items.find(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT')?.nature === 'REPETITION' ? 'REPETIÇÃO' : 'AJUSTE'}
                          </p>
                      )}
                  </div>
               </div>
               {/* Bottom Section: Barcode */}
               <div className="h-[12mm] w-full flex flex-col items-center justify-start overflow-visible -mt-0.5 ml-2">
                  <div className="flex items-center justify-center scale-x-110">
                    <Barcode 
                      value={String(printData.job.osNumber || printData.job.id.substring(0,8))} 
                      width={1} 
                      height={30} 
                      displayValue={true}
                      fontSize={11}
                      textMargin={0}
                      margin={0} 
                      format="CODE128" 
                    />
                  </div>
               </div>
            </div>
          )}`;

const replacement = `          {printData.mode === 'LABEL' && printData.job && (
            <div 
              className="w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] overflow-hidden flex flex-col bg-white thermal-print px-2 py-1 pl-[13px]" 
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: 'black' }}
            > 
               {/* Top Section: Information */}
               <div className="flex-1 flex flex-col justify-start space-y-0.5 mt-0.5">
                  <div className="flex justify-between items-start">
                      <p className="font-bold text-[12px] leading-tight truncate uppercase w-full">{printData.job.patientName}</p>
                  </div>
                  <p className="text-[10px] leading-tight truncate uppercase w-full">{printData.job.dentistName}</p>
                  
                  <div className="flex justify-between items-start pt-1 pr-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] leading-tight">{new Date(printData.job.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(printData.job.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[11px] font-bold leading-tight mt-0.5">{new Date(printData.job.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                        <span className="text-[11px] leading-tight mt-0.5 font-bold">{printData.job.osNumber || printData.job.id.substring(0,8)}</span>
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0 -mt-2">
                          <div className="scale-x-[1.26] origin-top-right">
                              <Barcode 
                                value={String(printData.job.osNumber || printData.job.id.substring(0,8))} 
                                width={1} 
                                height={42} 
                                displayValue={false}
                                margin={0} 
                                format="CODE128" 
                              />
                          </div>
                      </div>
                  </div>
               </div>
            </div>
          )}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched PrintOverlay.tsx successfully");
} else {
    console.log("Could not find the target text.");
}
