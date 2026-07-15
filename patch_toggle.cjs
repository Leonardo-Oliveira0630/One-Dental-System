const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(
  /let basePrice = planData\.price \|\| 99\.00;\n      let wppPrice = planData\.whatsappModulePrice !== undefined \? planData\.whatsappModulePrice : 90\.00;\n      \n      let newValue = basePrice;\n      if \(activate\) \{\n         newValue \+= wppPrice;\n      \}/g,
  `let basePrice = Number(planData.price || 99.00);\n      let wppPrice = Number(planData.whatsappModulePrice !== undefined ? planData.whatsappModulePrice : 90.00);\n      \n      let newValue = basePrice;\n      if (activate) {\n         newValue += wppPrice;\n      }`
);

fs.writeFileSync('functions/src/index.ts', code);
