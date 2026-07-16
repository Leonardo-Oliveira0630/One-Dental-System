const fs = require('fs');
let code = fs.readFileSync('pages/superadmin/WhatsAppTemplates.tsx', 'utf8');

// Add setDoc and doc import from firebase/firestore if needed, wait, it might not be imported.
// AppContext has db. Let's just use firebaseService or db from firebaseConfig.
// Let's replace the Ycloud Config State comment with the actual state and loading logic.

const replacement = `
  // Ycloud Config State
  const [showApiKey, setShowApiKey] = useState(false);
  const [ycloudApiKey, setYcloudApiKey] = useState("");
  const [ycloudPhone, setYcloudPhone] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  React.useEffect(() => {
    // Load config from Firestore
    import('../../services/firebaseConfig').then(({ db }) => {
      import('firebase/firestore').then(({ getDoc, doc }) => {
        getDoc(doc(db, "secrets", "api_keys")).then(snap => {
          if (snap.exists()) {
            setYcloudApiKey(snap.data()?.YCLOUD_API_KEY || "");
            setYcloudPhone(snap.data()?.YCLOUD_PHONE_NUMBER || "");
          }
        }).catch(err => console.error("Erro ao carregar secrets:", err));
      });
    });
  }, []);

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const { db } = await import('../../services/firebaseConfig');
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, "secrets", "api_keys"), {
        YCLOUD_API_KEY: ycloudApiKey,
        YCLOUD_PHONE_NUMBER: ycloudPhone
      }, { merge: true });
      setMessage({ type: 'success', text: 'Configurações do Ycloud salvas com sucesso!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações do Ycloud.' });
    }
    setIsSavingConfig(false);
  };
`;

code = code.replace(/\/\/ Ycloud Config State[\s\S]*?React\.useEffect\(\(\) => \{\n  \}, \[\]\);/, replacement);

// Now add the UI for the config right before the templates list.
const uiReplacement = `
      {/* Ycloud Global Config */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Configuração Global da API Ycloud</h3>
          <p className="text-xs text-slate-500 mt-1">Configure as chaves de acesso para habilitar o envio real pelo WhatsApp em todo o sistema.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-xs font-black text-slate-500 uppercase tracking-widest">YCLOUD API KEY</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={ycloudApiKey}
                  onChange={e => setYcloudApiKey(e.target.value)}
                  placeholder="Insira a API Key"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-3 text-slate-400 hover:text-blue-600">
                   {showApiKey ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
            <div>
              <label className="block mb-2 text-xs font-black text-slate-500 uppercase tracking-widest">YCLOUD PHONE NUMBER</label>
              <input
                type="text"
                value={ycloudPhone}
                onChange={e => setYcloudPhone(e.target.value)}
                placeholder="Ex: 5511999999999"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
             <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingConfig ? "SALVANDO..." : "SALVAR CONFIGURAÇÃO"}
             </button>
          </div>
        </div>
      </div>

      {/* Templates List */}
`;

code = code.replace(/\{\/\* Templates List \*\/\}/, uiReplacement);

fs.writeFileSync('pages/superadmin/WhatsAppTemplates.tsx', code);
