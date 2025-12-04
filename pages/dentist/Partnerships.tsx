
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Handshake, Plus, Trash2, Loader2, Info } from 'lucide-react';

export const Partnerships = () => {
    const { userConnections, addConnectionByCode } = useApp();
    const [orgCode, setOrgCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await addConnectionByCode(orgCode);
            setOrgCode('');
            alert("Laboratório adicionado com sucesso!");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Laboratórios Parceiros</h1>
                <p className="text-slate-500">Gerencie suas conexões com laboratórios de prótese.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Add Partner */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus className="text-blue-600" size={20} /> Adicionar Novo Laboratório</h3>
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-4 flex gap-2">
                        <Info size={20} className="shrink-0" />
                        <p>Solicite o <strong>Código de Parceria</strong> ao laboratório que deseja conectar. Após adicionar, você poderá enviar trabalhos para eles.</p>
                    </div>
                    <form onSubmit={handleAdd} className="flex gap-2 items-start flex-col">
                        <div className="w-full">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Código do Laboratório</label>
                            <input 
                                value={orgCode}
                                onChange={e => setOrgCode(e.target.value)}
                                placeholder="Ex: org_xyz123"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
                        </div>
                        <button type="submit" disabled={loading || !orgCode} className="w-full mt-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" /> : 'Conectar Laboratório'}
                        </button>
                    </form>
                </div>

                {/* List Partners */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Handshake className="text-teal-600" size={20} /> Minhas Parcerias Ativas</h3>
                    <div className="space-y-3">
                        {userConnections.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 italic">Você ainda não possui laboratórios conectados.</p>
                        ) : (
                            userConnections.map(conn => (
                                <div key={conn.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div>
                                        <span className="font-bold text-slate-800 block">{conn.organizationName}</span>
                                        <span className="text-xs text-slate-500">Conectado em {new Date(conn.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Ativo</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
