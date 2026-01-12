
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DeliveryRoute, RouteItem, Job, ManualDentist, User } from '../../types';
import { 
  Truck, Calendar, Clock, Plus, Printer, Trash2, CheckCircle, 
  MapPin, Search, ChevronRight, X, User as UserIcon, Building, Loader2, Save, GripVertical, Navigation
} from 'lucide-react';
import * as api from '../../services/firebaseService';

export const RoutePlanner = () => {
    const { currentOrg, manualDentists, allUsers, triggerRoutePrint } = useApp();
    
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
    const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
    const [routeItems, setRouteItems] = useState<RouteItem[]>([]);
    const [isAddingPickup, setIsAddingPickup] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [dentistSearch, setDentistSearch] = useState('');

    useEffect(() => {
        if (currentOrg) {
            const unsub = api.subscribeRoutes(currentOrg.id, setRoutes);
            return () => unsub();
        }
    }, [currentOrg]);

    const activeRoute = useMemo(() => {
        return routes.find(r => r.date.toISOString().split('T')[0] === selectedDate && r.shift === selectedShift);
    }, [routes, selectedDate, selectedShift]);

    useEffect(() => {
        if (currentOrg && activeRoute) {
            const unsub = api.subscribeRouteItems(currentOrg.id, activeRoute.id, setRouteItems);
            return () => unsub();
        } else {
            setRouteItems([]);
        }
    }, [currentOrg, activeRoute]);

    const handleCreateRoute = async (driverName: string) => {
        if (!currentOrg || !driverName) return;
        const routeId = `route_${selectedDate}_${selectedShift}_${driverName.replace(/\s+/g, '_')}`;
        await api.apiAddRoute(currentOrg.id, {
            id: routeId,
            organizationId: currentOrg.id,
            date: new Date(selectedDate),
            shift: selectedShift,
            driverName: driverName,
            status: 'OPEN',
            createdAt: new Date()
        });
    };

    const handleAddPickup = async (dentist: any) => {
        if (!activeRoute || !currentOrg) return;
        const address = dentist.address ? `${dentist.address}, ${dentist.number} - ${dentist.city}` : 'Endereço não cadastrado';
        
        const newItem: RouteItem = {
            id: `pickup_${Date.now()}`,
            routeId: activeRoute.id,
            dentistId: dentist.id,
            dentistName: dentist.name,
            clinicName: dentist.clinicName,
            address: address,
            type: 'PICKUP',
            order: routeItems.length + 1
        };

        await api.apiAddRouteItem(currentOrg.id, activeRoute.id, newItem);
        setIsAddingPickup(false);
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!activeRoute || !currentOrg) return;
        await api.apiDeleteRouteItem(currentOrg.id, activeRoute.id, itemId);
    };

    const handleUpdateStatus = async (status: DeliveryRoute['status']) => {
        if (!activeRoute || !currentOrg) return;
        await api.apiUpdateRoute(currentOrg.id, activeRoute.id, { status });
    };

    const filteredDentists = useMemo(() => {
        if (!dentistSearch) return [];
        const combined = [...manualDentists, ...allUsers.filter(u => u.role === 'CLIENT')];
        return combined.filter(d => d.name.toLowerCase().includes(dentistSearch.toLowerCase())).slice(0, 5);
    }, [dentistSearch, manualDentists, allUsers]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Truck className="text-blue-600" /> Roteiros de Entrega</h1>
                    <p className="text-slate-500">Organize as saídas de motoboy e coletas externas.</p>
                </div>
                {activeRoute && (
                    <button 
                        onClick={() => triggerRoutePrint(routeItems, activeRoute.driverName, activeRoute.shift, selectedDate)}
                        className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 hover:bg-slate-800 transition-all"
                    >
                        <Printer size={18} /> IMPRIMIR ROTEIRO
                    </button>
                )}
            </div>

            {/* FILTRO DE DATA E TURNO */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data do Roteiro</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Turno da Rota</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setSelectedShift('MORNING')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedShift === 'MORNING' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Manhã</button>
                        <button onClick={() => setSelectedShift('AFTERNOON')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedShift === 'AFTERNOON' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Tarde</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LISTA DE PARADAS */}
                <div className="lg:col-span-8 space-y-4">
                    {!activeRoute ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                            <Truck size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">Nenhum roteiro para este período</h3>
                            <p className="text-slate-500 mb-6">Inicie uma rota definindo o motorista responsável.</p>
                            <button 
                                onClick={() => {
                                    const name = window.prompt("Nome do Motorista/Motoboy:");
                                    if (name) handleCreateRoute(name);
                                }}
                                className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg"
                            >
                                INICIAR ROTEIRO
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><UserIcon size={20}/></div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-tighter leading-none">Motorista</p>
                                        <p className="font-black text-slate-800 text-lg">{activeRoute.driverName}</p>
                                    </div>
                                </div>
                                <select 
                                    value={activeRoute.status} 
                                    onChange={e => handleUpdateStatus(e.target.value as any)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold border outline-none ${
                                        activeRoute.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                                        activeRoute.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    <option value="OPEN">Aguardando Saída</option>
                                    <option value="IN_TRANSIT">Em Trânsito</option>
                                    <option value="COMPLETED">Rota Concluída</option>
                                </select>
                            </div>

                            <div className="p-4 space-y-3">
                                {routeItems.map((item, idx) => (
                                    <div key={item.id} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all group">
                                        <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-slate-800 truncate">{item.dentistName}</h4>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${item.type === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {item.type === 'DELIVERY' ? 'Entrega' : 'Coleta'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                                                <MapPin size={12} />
                                                <span className="truncate">{item.address}</span>
                                            </div>
                                            {item.patientName && (
                                                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-500">
                                                    <UserIcon size={10} /> Paciente: {item.patientName}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`, '_blank')}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Ver no Mapa"
                                            >
                                                <Navigation size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                title="Remover da Rota"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {routeItems.length === 0 && (
                                    <div className="py-12 text-center text-slate-400 italic">
                                        Roteiro vazio. Adicione trabalhos ou paradas avulsas.
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <button 
                                    onClick={() => setIsAddingPickup(true)}
                                    className="w-full py-3 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20}/> ADICIONAR PARADA AVULSA (COLETA)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* SIDEBAR: INFO & AJUDA */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <Truck size={80} className="absolute -bottom-4 -right-4 opacity-10" />
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2"><Navigation size={20}/> Dica de Logística</h3>
                        <p className="text-sm text-indigo-100 leading-relaxed">
                            Organize o roteiro seguindo a ordem lógica de distância. O motorista verá as paradas na sequência definida por você.
                        </p>
                    </div>
                </div>
            </div>

            {/* MODAL: ADICIONAR COLETA AVULSA */}
            {isAddingPickup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-black text-slate-800">Nova Parada de Coleta</h3>
                            <button onClick={() => setIsAddingPickup(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    placeholder="Buscar dentista..." 
                                    value={dentistSearch}
                                    onChange={e => setDentistSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>

                            <div className="space-y-2">
                                {filteredDentists.map(d => (
                                    <button 
                                        key={d.id} 
                                        onClick={() => handleAddPickup(d)}
                                        className="w-full text-left p-3 hover:bg-slate-50 border rounded-xl flex items-center justify-between group"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-800">{d.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black">{d.city || '---'}</p>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600" />
                                    </button>
                                ))}
                                {dentistSearch && filteredDentists.length === 0 && (
                                    <p className="text-center text-xs text-slate-400 py-4">Nenhum dentista encontrado.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
