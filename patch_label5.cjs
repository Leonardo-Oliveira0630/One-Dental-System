const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = code.substring(code.indexOf(`          {printData.mode === 'LABEL' && printData.job && (`), code.indexOf(`          {printData.mode === 'ADDRESS_LABEL' && printData.job && (`));

const replacement = `          {printData.mode === 'LABEL' && printData.job && (
            <div 
              className="w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] overflow-hidden flex flex-col bg-white thermal-print py-1 pl-[18px] pr-2" 
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
                        <span className="text-[12px] leading-tight mt-1 font-black">{printData.job.osNumber || printData.job.id.substring(0,8)}</span>
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0 -mt-[4px] mr-[2px]">
                          <div className="scale-x-[1.45] origin-top-right">
                              <Barcode 
                                value={String(printData.job.osNumber || printData.job.id.substring(0,8))} 
                                width={1} 
                                height={58} 
                                displayValue={false}
                                margin={0} 
                                format="CODE128" 
                              />
                          </div>
                      </div>
                  </div>
               </div>
            </div>
          )}\n`;

if (code.includes(target) && target.length > 50) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched PrintOverlay.tsx successfully with new label dimensions");
} else {
    console.log("Could not find the target text.");
}
