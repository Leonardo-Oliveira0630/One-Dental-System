const fs = require('fs');
let code = fs.readFileSync('pages/clinic/ClinicSettings.tsx', 'utf8');

const stateRegex = /const \[phone, setPhone\] = useState\(currentOrg\?\.phone \|\| currentOrg\?\.whatsapp \|\| ''\);/;
code = code.replace(stateRegex, "const [phone, setPhone] = useState(currentOrg?.phone || currentOrg?.whatsapp || '');\n  const [email, setEmail] = useState(currentOrg?.email || '');");

const updateRegex = /const updatedOrg: Partial<any> = \{\n\s*name: clinicName,/;
code = code.replace(updateRegex, "const updatedOrg: Partial<any> = {\n          name: clinicName,\n          phone,\n          whatsapp: phone,\n          email,");

const renderRegex = /<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CPF ou CNPJ para Faturamento<\/label>/;
const newRender = `<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email da Clínica</label>
                                 <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800" />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">WhatsApp / Telefone</label>
                                 <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800" />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CPF ou CNPJ para Faturamento</label>`;
code = code.replace(renderRegex, newRender);

fs.writeFileSync('pages/clinic/ClinicSettings.tsx', code);
console.log('Fixed ClinicSettings');
