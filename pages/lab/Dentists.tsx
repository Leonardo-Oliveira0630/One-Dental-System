
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { User, UserRole } from '../../types';
import { Stethoscope, Mail, Phone, Search, Building, User as UserIcon, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dentists = () => {
    const { currentOrg, currentUser } = useApp();
    const navigate = useNavigate();
    const [connectedDentists, setConnectedDentists] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchConnectedDentists = async () => {
            if (!currentOrg) return;
            setLoading(true);
            try {
                // Em um sistema real, buscaríamos na coleção de 'connections' onde o organizationId é o do lab
                // Como as conexões estão dentro das subcoleções de clínicas, aqui simulamos buscando todos os clientes
                // No firebaseService.ts idealmente teríamos um indexador inverso.
                const q = query(collection(db, 'users'), where('role', '==', UserRole.CLIENT));
                const snap = await getDocs(q);
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                
                // Nota: Em produção, filtraríamos apenas os que de fato têm conexão com o ID deste lab.
                setConnectedDentists(list);
            } catch (error) {
                console.error("Erro ao carregar dentistas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchConnectedDentists();
    }, [currentOrg]);

    const filtered = connectedDentists.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.clinicName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                <p className="text-slate-500 font-medium">Carregando seus clientes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Meus Clientes (Dentistas)</h1>
                    <p className="text-slate-500">Visualize os dentistas e clínicas conectados ao seu laboratório.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, clínica ou email..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(dentist => (
                    <div key={dentist.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Stethoscope size={28} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-lg truncate" title={dentist.name}>{dentist.name}</h3>
                                <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
                                    <Building size={14} className="shrink-0" />
                                    <span className="truncate">{dentist.clinicName || 'Consultório Particular'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Mail size={16} className="text-slate-400" />
                                <span className="truncate">{dentist.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Phone size={16} className="text-slate-400" />
                                <span>Não informado</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => navigate(`/jobs?dentist=${dentist.id}`)}
                            className="w-full mt-6 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            Ver Pedidos <ArrowRight size={16} />
                        </button>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                        <UserIcon size={48} className="mx-auto mb-4 opacity-20" />
                        <h3 className="font-bold text-lg text-slate-700">Nenhum dentista encontrado</h3>
                        <p>Divulgue seu ID para que novos dentistas possam se conectar.</p>
                        <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-mono text-sm border border-blue-100">
                            ID: {currentOrg?.id}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
