const fs = require('fs');
let code = fs.readFileSync('pages/superadmin/Dashboard.tsx', 'utf8');

const regex1 = /const \[geminiApiKey, setGeminiApiKey\] = useState\(globalSettings\?\.geminiApiKey \|\| ''\);/;
code = code.replace(regex1, "const [geminiApiKey, setGeminiApiKey] = useState(globalSettings?.geminiApiKey || '');\n    const [ycloudApiKey, setYcloudApiKey] = useState(globalSettings?.ycloudApiKey || '');\n    const [ycloudPhone, setYcloudPhone] = useState(globalSettings?.ycloudPhoneNumber || '');");

const regex2 = /setGeminiApiKey\(globalSettings\.geminiApiKey\);/;
code = code.replace(regex2, "setGeminiApiKey(globalSettings.geminiApiKey);\n            setYcloudApiKey(globalSettings.ycloudApiKey || '');\n            setYcloudPhone(globalSettings.ycloudPhoneNumber || '');");

const regex3 = /geminiApiKey: geminiApiKey\.trim\(\)/;
code = code.replace(regex3, "geminiApiKey: geminiApiKey.trim(),\n                ycloudApiKey: ycloudApiKey.trim(),\n                ycloudPhoneNumber: ycloudPhone.trim()");

const regex4 = /<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">/;
const newCode4 = `<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">YCloud API Key (WhatsApp)</label>
                                <input type="password" value={ycloudApiKey} onChange={e => setYcloudApiKey(e.target.value)} placeholder="API Key da YCloud" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">YCloud Número Padrão</label>
                                <input value={ycloudPhone} onChange={e => setYcloudPhone(e.target.value)} placeholder="Ex: 5511999999999" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium" />
                            </div>`;
code = code.replace(regex4, newCode4);

fs.writeFileSync('pages/superadmin/Dashboard.tsx', code);
console.log('Fixed SA dashboard');
