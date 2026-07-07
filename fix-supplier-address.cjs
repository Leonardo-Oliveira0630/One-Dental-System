const fs = require('fs');

const file = 'pages/supplier/Settings.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('const [address, setAddress] = useState(')) {
    // Add address states
    const states = `const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');`;
    content = content.replace(/const \[cep, setCep\] = useState\(''\);/, states);

    const loader = `setCep(currentOrg.cep || '');
      setAddress(currentOrg.address || '');
      setNumber(currentOrg.number || '');
      setComplement(currentOrg.complement || '');
      setNeighborhood(currentOrg.neighborhood || '');
      setCity(currentOrg.city || '');
      setState(currentOrg.state || '');`;
    content = content.replace(/setCep\(currentOrg\.cep \|\| ''\);/, loader);

    const saver = `cep,
        address,
        number,
        complement,
        neighborhood,
        city,
        state`;
    content = content.replace(/cep\n      \}\);/, saver + "\n      });");

    const fieldsToAdd = `
              {/* Address section */}
              <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-200">
                <h4 className="font-bold text-sm text-slate-900 mb-4">Endereço de Origem (Para cálculo de frete)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      onChange={e => setCep(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rua / Logradouro</label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 123"
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Ex: Sala 2"
                      value={complement}
                      onChange={e => setComplement(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Ex: Centro"
                      value={neighborhood}
                      onChange={e => setNeighborhood(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      placeholder="Ex: SP"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 uppercase text-center"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>`;

    // Remove the simple cep field we added before
    const oldCepField = `              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP de Origem (Para cálculo de frete)</label>
                <input
                  type="text"
                  placeholder="EX: 01001-000"
                  value={cep}
                  onChange={e => setCep(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-mono placeholder-slate-700"
                />
              </div>`;
              
    content = content.replace(oldCepField, fieldsToAdd);
    fs.writeFileSync(file, content);
  }
}
