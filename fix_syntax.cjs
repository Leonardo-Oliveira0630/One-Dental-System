const fs = require('fs');
let code = fs.readFileSync('pages/admin/DentistsTab.tsx', 'utf-8');

code = code.replace(
`        )}
    </div>
  );
};`,
`        )}`
);

code = code.replace(
`          </div>
  
        {/* MODAL: SUB-DENTISTA */}`,
`          </div>
        )}
  
        {/* MODAL: SUB-DENTISTA */}`
);

fs.writeFileSync('pages/admin/DentistsTab.tsx', code + '\n    </div>\n  );\n};\n');
console.log('Fixed syntax');
