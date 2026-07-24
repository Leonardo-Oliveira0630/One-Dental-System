const fs = require('fs');
let code = fs.readFileSync('pages/clinic/ClinicSettings.tsx', 'utf8');

if(!code.includes('import PricingSection')) {
    code = code.replace("import * as api from '../../services/firebaseService';", "import * as api from '../../services/firebaseService';\nimport PricingSection from '../../components/ui/pricing-section-4';");
    fs.writeFileSync('pages/clinic/ClinicSettings.tsx', code);
    console.log("Patched ClinicSettings");
}
