import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, Info, FileText } from 'lucide-react';

export const TermsPopup = () => {
    const { currentUser, updateUser } = useApp();
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    // If no user, or already accepted, don't show
    if (!currentUser || currentUser.termsAcceptedAt) return null;

    const handleAccept = async () => {
        setLoading(true);
        try {
            await updateUser(currentUser.id, { termsAcceptedAt: new Date().toISOString() });
        } catch (error) {
            console.error("Failed to accept terms:", error);
            alert("Ocorreu um erro ao aceitar os termos. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative animate-in zoom-in duration-200">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <FileText size={32} />
                    </div>
                </div>
                
                <h2 className="text-2xl font-black text-slate-800 tracking-tight text-center mb-2">
                    Atualização dos Termos
                </h2>
                <p className="text-sm text-slate-500 text-center mb-6">
                    Por favor, leia e aceite nossos termos para continuar utilizando a plataforma.
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 space-y-4 max-h-[300px] overflow-y-auto text-sm text-slate-600">
                    <p>
                        Para garantir a melhor experiência e segurança, precisamos que você concorde com nossos Termos de Uso e Política de Privacidade atualizados.
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                        <li>Como coletamos e utilizamos seus dados</li>
                        <li>Direitos e responsabilidades da plataforma</li>
                        <li>Direitos de privacidade do usuário</li>
                    </ul>
                    <div className="flex gap-4 mt-4 font-bold text-blue-600">
                        <a href="#/terms" target="_blank" className="hover:underline">Ler Termos de Uso</a>
                        <a href="#/privacy" target="_blank" className="hover:underline">Ler Política de Privacidade</a>
                    </div>
                </div>

                <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors mb-6">
                    <div className="pt-0.5">
                        <input 
                            type="checkbox" 
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                        Eu li e concordo com os Termos de Uso e Política de Privacidade.
                    </span>
                </label>

                <button 
                    onClick={handleAccept}
                    disabled={!accepted || loading}
                    className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest transition-all"
                >
                    {loading ? 'Confirmando...' : 'ACEITAR E CONTINUAR'}
                </button>
            </div>
        </div>
    );
};
