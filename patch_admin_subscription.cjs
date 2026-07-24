const fs = require('fs');
let code = fs.readFileSync('pages/admin/SubscriptionTab.tsx', 'utf8');

if (!code.includes('import PricingSection')) {
    code = code.replace("import { CreditCard, AlertTriangle, Check, ArrowRight, Smartphone, XCircle, ArrowUpCircle } from 'lucide-react';",
    "import { CreditCard, AlertTriangle, Check, ArrowRight, Smartphone, XCircle, ArrowUpCircle } from 'lucide-react';\nimport PricingSection from '../../components/ui/pricing-section-4';");
}

const targetRegex = /<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">[\s\S]*?<\/div>\s*<\/div>/;

const replacement = `<PricingSection 
            plans={allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'LAB')}
            selectedPlanId={currentOrg?.planId || ''}
            onSelectPlan={(id) => {
              if (id !== currentOrg?.planId) {
                navigate(\`/subscribe?plan=\${id}\`);
              }
            }}
            regType="LAB"
            title="Escolha o melhor plano"
            subtitle="Faça o upgrade do seu laboratório"
          />
        </div>`;

if (code.includes('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('pages/admin/SubscriptionTab.tsx', code);
    console.log("Patched SubscriptionTab");
} else {
    console.log("Could not find the target grid in SubscriptionTab");
}
