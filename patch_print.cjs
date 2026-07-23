const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `               {/* Bottom Section: Barcode */}
               <div className="h-[12mm] w-full flex flex-col items-center justify-end overflow-hidden mb-1">
                  <div className="flex items-center justify-center scale-x-125 origin-bottom">
                    <Barcode 
                      value={String(printData.job.osNumber || printData.job.id.substring(0,8))} 
                      width={1} 
                      height={40} 
                      displayValue={true}
                      fontSize={12}
                      textMargin={0}
                      margin={0} 
                      format="CODE128" 
                    />
                  </div>
               </div>`;

const replacement = `               {/* Bottom Section: Barcode */}
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
               </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('components/PrintOverlay.tsx', code);
console.log("Patched PrintOverlay.tsx");
