const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `                      <div className="flex flex-col items-end shrink-0 -mt-[4px] mr-[2px]">
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
                      </div>`;

const replacement = `                      <div className="flex flex-col items-end shrink-0 -mt-[4px] mr-[2px]">
                          <div className="scale-x-[1.7] origin-top-right" style={{ marginRight: '5mm' }}>
                              <Barcode 
                                value={String(printData.job.osNumber || printData.job.id.substring(0,8))} 
                                width={1} 
                                height={64} 
                                displayValue={false}
                                margin={0} 
                                format="CODE128" 
                              />
                          </div>
                      </div>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched PrintOverlay.tsx with final label dimensions");
} else {
    console.log("Could not find the target text.");
}
