const fs = require('fs');
let code = fs.readFileSync('pages/RegisterOrganization.tsx', 'utf8');

if (!code.includes('import PricingSection')) {
    code = code.replace("import { CreditCard, Activity, Building, Stethoscope, Store, ChevronRight, CheckCircle, Smartphone, AlertTriangle, ArrowRight, ShieldCheck, Database, FileSpreadsheet, Lock, Users, UploadCloud, ChevronLeft } from 'lucide-react';", 
    "import { CreditCard, Activity, Building, Stethoscope, Store, ChevronRight, CheckCircle, Smartphone, AlertTriangle, ArrowRight, ShieldCheck, Database, FileSpreadsheet, Lock, Users, UploadCloud, ChevronLeft } from 'lucide-react';\nimport PricingSection from '../components/ui/pricing-section-4';");
}

const carouselRegex = /\{displayPlans\.length === 0 \? \([\s\S]*?\{\/\* Coupon Code Section \*\/\}/g;

const carouselReplacement = `{displayPlans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-700 rounded-2xl">
                            <Loader2 className={\`animate-spin mb-2 \${themeText}\`} />
                            <p className="text-sm">Carregando planos para {
                                regType === 'LAB' ? 'Laboratórios' : 
                                regType === 'LAB_OUTSOURCED' ? 'Terceirização' : 
                                regType === 'SUPPLIER' ? 'Fornecedores' : 'Dentistas'
                            }...</p>
                        </div>
                    ) : (
                        <PricingSection 
                            plans={displayPlans}
                            selectedPlanId={planId}
                            onSelectPlan={setPlanId}
                            regType={regType}
                            title="Planos que funcionam para você"
                            subtitle="Escolha o melhor plano para iniciar."
                        />
                    )}

                    {/* Coupon Code Section */}`;

code = code.replace(carouselRegex, carouselReplacement);
fs.writeFileSync('pages/RegisterOrganization.tsx', code);
console.log("Patched RegisterOrganization");
