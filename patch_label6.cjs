const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `                      <div className="absolute right-0 top-[-2px] flex flex-col items-end shrink-0">
                          <div className="scale-x-[1.7] origin-top-right">
                              <Barcode 
                                value={String(printData.job.osNumber || printData.job.id.substring(0,8))} 
                                width={1} 
                                height={81} 
                                displayValue={false}
                                margin={0} 
                                format="CODE128" 
                              />
                          </div>
                      </div>`;

const replacement = `                      <div className="absolute right-0 top-[-2px] flex flex-col items-end shrink-0">
                          <div className="scale-x-[1.45] origin-top-right">
                              <Barcode 
                                value={String(printData.job.osNumber || printData.job.id.substring(0,8))} 
                                width={1} 
                                height={79} 
                                displayValue={false}
                                margin={0} 
                                format="CODE128" 
                              />
                          </div>
                      </div>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched PrintOverlay.tsx with new label dimensions");
} else {
    console.log("Could not find the target text.");
}
