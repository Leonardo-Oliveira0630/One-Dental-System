const fs = require('fs');
let code = fs.readFileSync('pages/clinic/ClinicSettings.tsx', 'utf8');

// The replacement added an extra `</div>` that unbalances the JSX.
// We need to replace `/>\n                      </div>\n                  )}` with `/>\n                  )}`

code = code.replace("/>\n                      </div>\n                  )}", "/>\n                  )}");

fs.writeFileSync('pages/clinic/ClinicSettings.tsx', code);
console.log("Fixed ClinicSettings");
