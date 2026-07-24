const fs = require('fs');
let code = fs.readFileSync('pages/admin/SubscriptionTab.tsx', 'utf8');

if(!code.includes('import PricingSection')) {
    code = code.replace("import * as api from '../../services/firebaseService';", "import * as api from '../../services/firebaseService';\nimport PricingSection from '../../components/ui/pricing-section-4';");
    fs.writeFileSync('pages/admin/SubscriptionTab.tsx', code);
    console.log("Patched SubscriptionTab");
}
