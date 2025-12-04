import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Handshake, Plus, Trash2, Loader2, Building, CheckCircle } from 'lucide-react';

export const Partnerships = () => {
    const { userConnections, addConnectionByCode } = useApp();
    const [orgCode, setOrgCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await addConnectionByCode(orgCode);
            setSuccess('Parceria firmada com sucesso!');
            setOrgCode('');
        } catch (err: any) {
            setError(err.message || 'Erro ao adicionar laboratório.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Laboratórios Parceiros</h1>
                <p className="text-slate-500">Gerencie suas conexões com laboratórios de prótese.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Add Partner Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                        <Plus className="text-blue-600"/> Nova Parceria
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Cole o <strong>Código de Parceria (ID)</strong> fornecido pelo laboratório para conectar sua conta.
                    </p>
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div>
                            <input 
                                value={orgCode}
                                onChange={e => setOrgCode(e.target.value)}
                                placeholder="Ex: org_123abc..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>
                        
                        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
                        {success && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-center gap-2"><CheckCircle size={16}/> {success}</div>}

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Conectar Laboratório'}
                        </button>
                    </form>
                </div>

                {/* List Partners Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                        <Handshake className="text-teal-600"/> Minhas Conexões
                    </h3>
                    
                    {userConnections.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                            Nenhuma parceria ativa.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {userConnections.map(conn => (
                                <div key={conn.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                                            <Building size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{conn.organizationName}</p>
                                            <p className="text-xs text-green-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Ativo
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};