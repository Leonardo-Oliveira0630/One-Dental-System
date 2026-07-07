const fs = require('fs');

const file = 'pages/supplier/Settings.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  // We need to add cep field where frenet is
  const beforeFrenet = `              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Token Frenet (Cotação de Frete)</label>`;
  
  if (!content.includes('const [cep, setCep] = useState(')) {
    content = content.replace(/const \[frenetToken, setFrenetToken\] = useState\(''\);/, "const [frenetToken, setFrenetToken] = useState('');\n  const [cep, setCep] = useState('');");
    content = content.replace(/setFrenetToken\(currentOrg\.frenetToken \|\| ''\);/, "setFrenetToken(currentOrg.frenetToken || '');\n      setCep(currentOrg.cep || '');");
    content = content.replace(/frenetToken\n      \}\);/, "frenetToken,\n        cep\n      });");
    
    const fieldsToAdd = `              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP de Origem (Para cálculo de frete)</label>
                <input
                  type="text"
                  placeholder="EX: 01001-000"
                  value={cep}
                  onChange={e => setCep(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-mono placeholder-slate-700"
                />
              </div>\n` + beforeFrenet;
    
    content = content.replace(beforeFrenet, fieldsToAdd);
    fs.writeFileSync(file, content);
  }
}
