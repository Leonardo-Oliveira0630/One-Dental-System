const fs = require('fs');
let code = fs.readFileSync('pages/clinic/DentistsManagement.tsx', 'utf8');

code = code.replace(/const \[specialty, setSpecialty\] = useState\(''\);/, "const [specialty, setSpecialty] = useState('');\n  const [phone, setPhone] = useState('');\n  const [email, setEmail] = useState('');");

code = code.replace(/setSpecialty\(dentist\.specialty \|\| ''\);/, "setSpecialty(dentist.specialty || '');\n      setPhone(dentist.phone || dentist.whatsapp || '');\n      setEmail(dentist.email || '');");

code = code.replace(/setSpecialty\(''\);/, "setSpecialty('');\n    setPhone('');\n    setEmail('');");

const updateRegex = /const payload = \{\n\s*name,\n\s*cro,\n\s*specialty,\n\s*\};/;
code = code.replace(updateRegex, "const payload = {\n        name,\n        cro,\n        specialty,\n        phone,\n        whatsapp: phone,\n        email,\n      };");

const renderRegex = /<label className="block text-\[10px\] font-black text-slate-400 uppercase mb-1 ml-1">Especialidade<\/label>\n\s*<input value=\{specialty\} onChange=\{e => setSpecialty\(e\.target\.value\)\} className="w-full px-4 py-2\.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="Ex: Ortodontia" \/>\n\s*<\/div>\n\s*<\/div>/;

const newRender = `<label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Especialidade</label>
                                    <input value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="Ex: Ortodontia" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">WhatsApp / Telefone</label>
                                    <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="(00) 00000-0000" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">E-mail (Opcional)</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="email@exemplo.com" />
                                </div>
                            </div>`;

code = code.replace(renderRegex, newRender);

fs.writeFileSync('pages/clinic/DentistsManagement.tsx', code);
console.log('Fixed DentistsManagement');
