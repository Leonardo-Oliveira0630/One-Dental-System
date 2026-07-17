const fs = require('fs');
let code = fs.readFileSync('pages/Profile.tsx', 'utf8');

const regex = /const handleRequestPasswordReset = async \(\) => \{/;

const newCode = `    const [phone, setPhone] = useState(currentUser?.phone || currentUser?.whatsapp || '');
    const [savingPhone, setSavingPhone] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setPhone(currentUser.phone || currentUser.whatsapp || '');
        }
    }, [currentUser]);

    const handleSavePhone = async () => {
        if (!currentUser) return;
        setSavingPhone(true);
        try {
            await api.apiUpdateUser(currentUser.id, { phone: phone.replace(/\\D/g, '') });
            alert("Telefone salvo com sucesso!");
        } catch (err) {
            alert("Erro ao salvar telefone.");
        } finally {
            setSavingPhone(false);
        }
    };

    const handleRequestPasswordReset = async () => {`;

code = code.replace(regex, newCode);

const regex2 = /\{currentUser\.role === UserRole\.CLIENT \? \(/;

const newCode2 = `                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">WhatsApp / Telefone</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="Ex: 11999999999"
                                    className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSavePhone}
                                    disabled={savingPhone}
                                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                                >
                                    {savingPhone ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                        {currentUser.role === UserRole.CLIENT ? (`

code = code.replace(regex2, newCode2);

fs.writeFileSync('pages/Profile.tsx', code);
console.log('Fixed profile');
