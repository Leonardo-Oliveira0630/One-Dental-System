const fs = require('fs');
let code = fs.readFileSync('pages/lab/RoutePlanner.tsx', 'utf8');

code = code.replace(
  /        \/\/ Enviar WhatsApp para todos os casos da rota quando iniciar \(IN_TRANSIT\)\n        if \(status === 'IN_TRANSIT'\) \{\n            for \(const item of routeItems\) \{\n                if \(item\.type === 'DELIVERY' && item\.jobId\) \{\n                    const job = jobs\.find\(j => j\.id === item\.jobId\);\n                    if \(job\) \{\n                        const dentist = manualDentists\.find\(d => d\.id === job\.dentistId\) \|\| allUsers\.find\(u => u\.id === job\.dentistId\);\n                        const dentistPhone = dentist\?\.phone \|\| '';\n                        if \(dentistPhone\) \{\n                            await notifyJobLogistics\(job, 'SHIPPED', dentistPhone, dentist\?\.name \|\| 'Dentista'\)\.catch\(e => console\.warn\(e\)\);\n                        \}\n                    \}\n                \}\n            \}\n        \}/,
  ""
);

fs.writeFileSync('pages/lab/RoutePlanner.tsx', code);
