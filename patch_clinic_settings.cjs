const fs = require('fs');
let code = fs.readFileSync('pages/clinic/ClinicSettings.tsx', 'utf8');

if (!code.includes('import PricingSection')) {
    code = code.replace("import { Settings, Image as ImageIcon, Save, Loader2, Store, CreditCard, ChevronRight, XCircle, ArrowRight, Upload, AlertCircle, Copy, Check, Info } from 'lucide-react';",
    "import { Settings, Image as ImageIcon, Save, Loader2, Store, CreditCard, ChevronRight, XCircle, ArrowRight, Upload, AlertCircle, Copy, Check, Info } from 'lucide-react';\nimport PricingSection from '../../components/ui/pricing-section-4';");
}

const targetRegex = /<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const replacement = `<PricingSection 
                            plans={allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'CLINIC')}
                            selectedPlanId={activePlan?.id || ''}
                            onSelectPlan={(id) => {
                                if (id !== activePlan?.id) {
                                    handleUpgrade(id);
                                }
                            }}
                            regType="DENTIST"
                            title="Planos para Dentistas"
                            subtitle="Evolua sua clínica com as melhores ferramentas"
                        />
                      </div>`;

if (code.includes('grid grid-cols-1 md:grid-cols-3 gap-6 mb-8')) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('pages/clinic/ClinicSettings.tsx', code);
    console.log("Patched ClinicSettings");
} else {
    console.log("Could not find the target grid in ClinicSettings");
}
