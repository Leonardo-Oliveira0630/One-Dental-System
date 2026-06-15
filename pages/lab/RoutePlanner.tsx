import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DeliveryRoute, RouteItem, Job, ManualDentist, User, Courier } from '../../types';
import { 
  Truck, Calendar, Clock, Plus, Printer, Trash2, CheckCircle, 
  MapPin, Search, ChevronRight, X, User as UserIcon, Building, Loader2, Save, GripVertical, Navigation,
  Phone, Shield, ShieldAlert, Check, ToggleLeft, ToggleRight, UserPlus, ChevronUp, ChevronDown
} from 'lucide-react';
import * as api from '../../services/firebaseService';

export const RoutePlanner = () => {
    const { 
        currentOrg, manualDentists, allUsers, triggerRoutePrint, currentUser,
        couriers, addCourier, updateCourier, deleteCourier
    } = useApp();
    
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
    const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
    const [routeItems, setRouteItems] = useState<RouteItem[]>([]);
    const [isAddingPickup, setIsAddingPickup] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [dentistSearch, setDentistSearch] = useState('');

    // State for Courier Management
    const [showCourierForm, setShowCourierForm] = useState(false);
    const [courierName, setCourierName] = useState('');
    const [courierPhone, setCourierPhone] = useState('');
    const [courierVehicle, setCourierVehicle] = useState('');
    const [isSavingCourier, setIsSavingCourier] = useState(false);

    // State for Starting Route Modal
    const [showStartRouteModal, setShowStartRouteModal] = useState(false);
    const [selectedCourierId, setSelectedCourierId] = useState('');
    const [manualCourierName, setManualCourierName] = useState('');

    // State for Drag & Drop Route Items
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleMoveItem = async (idxFrom: number, idxTo: number) => {
        if (!activeRoute || !currentOrg || !canEdit) return;
        if (idxTo < 0 || idxTo >= routeItems.length) return;

        const newRouteItems = [...routeItems];
        const [movedItem] = newRouteItems.splice(idxFrom, 1);
        newRouteItems.splice(idxTo, 0, movedItem);

        const updates = newRouteItems.map((item, index) => {
            if (item.order !== index + 1) {
                return api.apiUpdateRouteItem(currentOrg.id, activeRoute.id, item.id, { order: index + 1 });
            }
            return null;
        }).filter((p): p is Promise<void> => p !== null);

        if (updates.length > 0) {
            await Promise.all(updates);
        }
    };

    const handleDropItem = async (targetIdx: number) => {
        if (draggedIndex === null || draggedIndex === targetIdx) {
            setDraggedIndex(null);
            return;
        }

        const sourceIdx = draggedIndex;
        setDraggedIndex(null);

        if (!activeRoute || !currentOrg || !canEdit) return;

        const newRouteItems = [...routeItems];
        const [movedItem] = newRouteItems.splice(sourceIdx, 1);
        newRouteItems.splice(targetIdx, 0, movedItem);

        const updates = newRouteItems.map((item, index) => {
            if (item.order !== index + 1) {
                return api.apiUpdateRouteItem(currentOrg.id, activeRoute.id, item.id, { order: index + 1 });
            }
            return null;
        }).filter((p): p is Promise<void> => p !== null);

        if (updates.length > 0) {
            await Promise.all(updates);
        }
    };

    const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    const canCreate = isAdmin || currentUser?.permissions?.includes('logistics:create');
    const canEdit = isAdmin || currentUser?.permissions?.includes('logistics:edit');
    const canDelete = isAdmin || currentUser?.permissions?.includes('logistics:delete');

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
        if (!currentOrg || !driverName || (!canCreate && !canEdit)) return;
        const routeId = `route_${selectedDate}_${selectedShift}_${driverName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
        await api.apiAddRoute(currentOrg.id, {
            id: routeId,
            organizationId: currentOrg.id,
            date: new Date(selectedDate),
            shift: selectedShift,
            driverName: driverName,
            status: 'OPEN',
            createdAt: new Date()
        });
        setShowStartRouteModal(false);
        setManualCourierName('');
        setSelectedCourierId('');
    };

    const handleAddPickup = async (dentist: any) => {
        if (!activeRoute || !currentOrg || (!canCreate && !canEdit)) return;
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
        if (!activeRoute || !currentOrg || (!canDelete && !canEdit)) return;
        await api.apiDeleteRouteItem(currentOrg.id, activeRoute.id, itemId);
    };

    const handleUpdateStatus = async (status: DeliveryRoute['status']) => {
        if (!activeRoute || !currentOrg || !canEdit) return;
        await api.apiUpdateRoute(currentOrg.id, activeRoute.id, { status });
    };

    const handleAddCourierSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courierName.trim()) return;
        setIsSavingCourier(true);
        try {
            await addCourier({
                name: courierName.trim(),
                phone: courierPhone.trim() || undefined,
                vehicle: courierVehicle.trim() || undefined,
                active: true
            });
            setCourierName('');
            setCourierPhone('');
            setCourierVehicle('');
            setShowCourierForm(false);
        } catch (error) {
            console.error("Error creating courier:", error);
        } finally {
            setIsSavingCourier(false);
        }
    };

    const handleToggleCourierActive = async (courier: Courier) => {
        if (!canEdit) return;
        await updateCourier(courier.id, { active: !courier.active });
    };

    const handleDeleteCourier = async (courierId: string) => {
        if (!canDelete) return;
        if (window.confirm("Deseja realmente remover este motoboy?")) {
            await deleteCourier(courierId);
        }
    };

    const filteredDentists = useMemo(() => {
        if (!dentistSearch) return [];
        const combined = [...manualDentists, ...allUsers.filter(u => u.role === 'CLIENT')];
        return combined.filter(d => d.name.toLowerCase().includes(dentistSearch.toLowerCase())).slice(0, 5);
    }, [dentistSearch, manualDentists, allUsers]);

    // Active couriers helper
    const activeCouriers = useMemo(() => {
        return couriers.filter(c => c.active);
    }, [couriers]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500" id="route-planner-section">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2" id="route-planner-title">
                        <Truck className="text-blue-600 animate-pulse" /> Roteiros de Entrega
                    </h1>
                    <p className="text-slate-500">Organize as saídas de motoboy e coletas externas em tempo real.</p>
                </div>
                {activeRoute && (
                    <button 
                        id="print-route-btn"
                        onClick={() => triggerRoutePrint(routeItems, activeRoute.driverName, activeRoute.shift, selectedDate)}
                        className="px-6 py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 hover:bg-slate-800 transition-all uppercase tracking-widest"
                    >
                        <Printer size={16} /> IMPRIMIR ROTEIRO
                    </button>
                )}
            </div>

            {/* FILTRO DE DATA E TURNO */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6" id="route-filters-card">
                <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data do Roteiro</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input id="route-date-input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800" />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Turno da Rota</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl" id="route-shift-tabs">
                        <button id="shift-morning-btn" onClick={() => setSelectedShift('MORNING')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedShift === 'MORNING' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Manhã</button>
                        <button id="shift-afternoon-btn" onClick={() => setSelectedShift('AFTERNOON')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedShift === 'AFTERNOON' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Tarde</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LISTA DE PARADAS */}
                <div className="lg:col-span-8 space-y-4" id="routes-stops-container">
                    {!activeRoute ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center" id="no-route-display">
                            <Truck size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-black text-slate-700">Nenhum roteiro para este período</h3>
                            <p className="text-slate-500 mb-6 text-sm">Organize as coletas e entregas designando um motoboy.</p>
                            <button 
                                id="init-route-btn"
                                onClick={() => {
                                    if (!canCreate && !canEdit) return;
                                    setShowStartRouteModal(true);
                                }}
                                disabled={!canCreate && !canEdit}
                                className={`px-8 py-3.5 font-black text-xs rounded-xl shadow-lg uppercase tracking-wider transition-all transform active:scale-95 ${canCreate || canEdit ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                            >
                                INICIAR ROTEIRO
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" id="active-route-manager">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><UserIcon size={20}/></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Motoboy Responsável</p>
                                        <p className="font-black text-slate-800 text-lg leading-tight mt-1">{activeRoute.driverName}</p>
                                    </div>
                                </div>
                                <select 
                                    id="route-status-select"
                                    value={activeRoute.status} 
                                    onChange={e => handleUpdateStatus(e.target.value as any)}
                                    disabled={!canEdit}
                                    className={`px-4 py-2 rounded-full text-xs font-black border outline-none cursor-pointer transition-all ${
                                        !canEdit ? 'opacity-60 cursor-not-allowed' : ''
                                    } ${
                                        activeRoute.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                                        activeRoute.status === 'IN_TRANSIT' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}
                                >
                                    <option value="OPEN">📦 Aguardando Saída</option>
                                    <option value="IN_TRANSIT">🛵 Em Trânsito / Rua</option>
                                    <option value="COMPLETED">✅ Rota Concluída</option>
                                </select>
                            </div>

                            <div className="p-5 space-y-3" id="stops-inner-list">
                                {routeItems.map((item, idx) => (
                                    <div 
                                        key={item.id} 
                                        draggable={canEdit}
                                        onDragStart={() => setDraggedIndex(idx)}
                                        onDragOver={(e) => {
                                            if (draggedIndex !== null && canEdit) {
                                                e.preventDefault();
                                            }
                                        }}
                                        onDrop={() => {
                                            if (draggedIndex !== null && canEdit) {
                                                handleDropItem(idx);
                                            }
                                        }}
                                        className={`flex items-center gap-3 sm:gap-4 p-4 bg-white border rounded-2xl hover:border-blue-200 transition-all group shadow-sm/5 hover:shadow-md ${
                                            draggedIndex === idx ? 'opacity-40 border-dashed border-blue-300 bg-slate-50' : 'border-slate-100'
                                        }`} 
                                        id={`route-stop-${item.id}`}
                                    >
                                        {/* REORDER CONTROLS (DRAG HANDLE AND MOVEMENT BUTTONS) */}
                                        {canEdit && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <div 
                                                    className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors"
                                                    title="Arrastar para reordenar"
                                                >
                                                    <GripVertical size={16} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <button
                                                        onClick={() => handleMoveItem(idx, idx - 1)}
                                                        disabled={idx === 0}
                                                        className={`p-0.5 rounded hover:bg-slate-100 transition-colors ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                                                        title="Mover para cima"
                                                    >
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveItem(idx, idx + 1)}
                                                        disabled={idx === routeItems.length - 1}
                                                        className={`p-0.5 rounded hover:bg-slate-100 transition-colors ${idx === routeItems.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                                                        title="Mover para baixo"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-extrabold text-slate-800 truncate text-sm md:text-base">{item.dentistName}</h4>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${item.type === 'DELIVERY' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                                    {item.type === 'DELIVERY' ? 'Entrega' : 'Coleta'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{item.address}</span>
                                            </div>
                                            {item.patientName && (
                                                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-bold text-slate-500">
                                                    <UserIcon size={10} /> Paciente: {item.patientName}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                id={`maps-stop-btn-${item.id}`}
                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`, '_blank')}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Ver no Mapa"
                                            >
                                                <Navigation size={18} />
                                            </button>
                                            { (canDelete || canEdit) && (
                                                <button 
                                                    id={`delete-stop-btn-${item.id}`}
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Remover da Rota"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {routeItems.length === 0 && (
                                    <div className="py-12 text-center text-slate-400 italic text-sm" id="empty-stops-placeholder">
                                        Nenhum serviço incluído nesta rota. Adicione através da lista de trabalhos finalizados ou use o botão de coleta avulsa abaixo.
                                    </div>
                                )}
                            </div>

                            { (canCreate || canEdit) && (
                                <div className="p-4 bg-slate-50 border-t border-slate-100" id="adding-pickup-action-container">
                                    <button 
                                        id="add-pickup-btn"
                                        onClick={() => setIsAddingPickup(true)}
                                        className="w-full py-3.5 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-extrabold text-xs hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-sm"
                                    >
                                        <Plus size={18}/> PARADA AVULSA (SOLICITAR COLETA)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SIDEBAR: CADASTRO E GERENCIAMENTO DE MOTOBOYS */}
                <div className="lg:col-span-4 space-y-6" id="route-planner-sidebar">
                    {/* GERENCIAMENTO DE MOTOBOYS CARD */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6" id="courier-manager-card">
                        <div className="flex justify-between items-center pb-2 border-b border-rose-50/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <Truck size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm md:text-base leading-none">Motoboys</h3>
                                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Entregadores cadastrados</span>
                                </div>
                            </div>
                            {canCreate && (
                                <button 
                                    id="add-new-courier-trigger"
                                    onClick={() => setShowCourierForm(!showCourierForm)}
                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center"
                                    title="Cadastrar Entregador"
                                >
                                    {showCourierForm ? <X size={16} /> : <UserPlus size={16} />}
                                </button>
                            )}
                        </div>

                        {/* FORMULÁRIO DE CADASTRO */}
                        {showCourierForm && (
                            <form id="new-courier-form" onSubmit={handleAddCourierSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Novo Cadastro</h4>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome completo *</label>
                                    <input 
                                        id="courier-name-input"
                                        type="text" 
                                        required
                                        placeholder="Ex: Carlos Silva"
                                        value={courierName}
                                        onChange={e => setCourierName(e.target.value)}
                                        className="w-full text-xs font-bold px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Celular / WhatsApp</label>
                                        <input 
                                            id="courier-phone-input"
                                            type="text" 
                                            placeholder="(11) 99999-9999"
                                            value={courierPhone}
                                            onChange={e => setCourierPhone(e.target.value)}
                                            className="w-full text-xs font-bold px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Moto / Placa</label>
                                        <input 
                                            id="courier-vehicle-input"
                                            type="text" 
                                            placeholder="Titan 160 / ABC1234"
                                            value={courierVehicle}
                                            onChange={e => setCourierVehicle(e.target.value)}
                                            className="w-full text-xs font-bold px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <button 
                                    id="save-courier-btn"
                                    type="submit" 
                                    disabled={isSavingCourier}
                                    className="w-full py-2 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-700 flex items-center justify-center gap-1 tracking-wider uppercase shadow shadow-blue-200"
                                >
                                    {isSavingCourier ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    SALVAR CADASTRADO
                                </button>
                            </form>
                        )}

                        {/* LISTA DE MOTOBOYS CADASTRADOS */}
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1" id="couriers-rendered-list">
                            {couriers.map(courier => (
                                <div key={courier.id} className="p-3.5 border rounded-2xl bg-white hover:bg-slate-50 transition-all flex items-center justify-between gap-3 shadow-sm" id={`courier-item-${courier.id}`}>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">{courier.name}</p>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${courier.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {courier.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-500 font-bold">
                                            {courier.phone && (
                                                <span className="flex items-center gap-1 text-slate-500">
                                                    <Phone size={10} className="text-gray-400"/> {courier.phone}
                                                </span>
                                            )}
                                            {courier.vehicle && (
                                                <span className="bg-slate-100 px-1 py-0.5 rounded text-[10px] text-slate-600">
                                                    {courier.vehicle}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {canEdit && (
                                            <button 
                                                id={`toggle-courier-btn-${courier.id}`}
                                                onClick={() => handleToggleCourierActive(courier)}
                                                className={`p-1.5 rounded-lg transition-all ${courier.active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                title={courier.active ? "Desativar entrega" : "Ativar entrega"}
                                            >
                                                {courier.active ? <ToggleRight size={22} className="text-blue-600" /> : <ToggleLeft size={22} className="text-slate-400" />}
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button 
                                                id={`delete-courier-btn-${courier.id}`}
                                                onClick={() => handleDeleteCourier(courier.id)}
                                                className="p-1 px-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remover entregador"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {couriers.length === 0 && (
                                <div className="text-center py-8 text-slate-400 italic text-xs" id="empty-couriers-display">
                                    Nenhum entregador cadastrado para este laboratório.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-indigo-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden" id="logistics-tips-sidebar">
                        <Truck size={80} className="absolute -bottom-4 -right-4 opacity-10" />
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2"><Navigation size={20}/> Dica de Logística</h3>
                        <p className="text-sm text-indigo-100 leading-relaxed font-bold">
                            Ordene as paradas para otimizar os custos de transporte do seu laboratório. Cada parada pode ser facilmente visualizada no Waze ou Google Maps correspondente pelo entregador.
                        </p>
                    </div>
                </div>
            </div>

            {/* MODAL: INICIAR ROTEIRO */}
            {showStartRouteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" id="start-route-modal">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-5 border-b pb-4">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <Truck size={18} className="text-blue-600"/> Iniciar Novo Roteiro
                            </h3>
                            <button id="close-start-route-modal" onClick={() => setShowStartRouteModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Selecione o Motoboy Cadastrado</label>
                                {activeCouriers.length > 0 ? (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="active-couriers-select-list">
                                        {activeCouriers.map(c => (
                                            <button 
                                                key={c.id}
                                                id={`courier-select-btn-${c.id}`}
                                                onClick={() => {
                                                    setSelectedCourierId(c.id);
                                                    setManualCourierName('');
                                                    handleCreateRoute(c.name);
                                                }}
                                                className="w-full text-left p-3 border rounded-xl hover:bg-blue-50/50 hover:border-blue-400 font-extrabold text-slate-800 text-xs sm:text-sm flex justify-between items-center group transition-all"
                                            >
                                                <span>{c.name} {c.vehicle ? `(${c.vehicle})` : ''}</span>
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 p-3 rounded-xl font-bold" id="no-active-couriers-warning">
                                        ⚠️ Nenhum motoboy ativo cadastrado. Cadastre um entregador no painel lateral à direita ou digite um nome abaixo para uso esporádico.
                                    </p>
                                )}
                            </div>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink mx-4 text-xs font-black text-slate-400 uppercase tracking-wider">OU</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Entregador Esporádico</label>
                                <div className="flex gap-2">
                                    <input 
                                        id="manual-courier-name-input"
                                        type="text" 
                                        placeholder="Ex: Carlos Temporário"
                                        value={manualCourierName}
                                        onChange={e => {
                                            setManualCourierName(e.target.value);
                                            setSelectedCourierId('');
                                        }}
                                        className="flex-1 text-xs font-bold px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <button 
                                        id="submit-manual-driver-btn"
                                        onClick={() => {
                                            if (manualCourierName.trim()) handleCreateRoute(manualCourierName.trim());
                                        }}
                                        disabled={!manualCourierName.trim()}
                                        className="px-4 bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-slate-800 tracking-wider disabled:opacity-40 uppercase"
                                    >
                                        INICIAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ADICIONAR COLETA AVULSA */}
            {isAddingPickup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" id="add-pickup-modal">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                                <Building size={18} className="text-blue-600"/> Parada Avulsa (Coleta)
                            </h3>
                            <button id="close-pickup-modal-btn" onClick={() => setIsAddingPickup(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    id="pickup-dentist-search-input"
                                    placeholder="Buscar dentista por nome..." 
                                    value={dentistSearch}
                                    onChange={e => setDentistSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-slate-50" 
                                />
                            </div>

                            <div className="space-y-2" id="pickup-dentists-list">
                                {filteredDentists.map(d => (
                                    <button 
                                        key={d.id} 
                                        id={`select-pickup-dentist-${d.id}`}
                                        onClick={() => handleAddPickup(d)}
                                        className="w-full text-left p-3.5 hover:bg-blue-50/20 border border-slate-100 rounded-2xl flex items-center justify-between group transition-all"
                                    >
                                        <div>
                                            <p className="font-extrabold text-slate-800 text-sm">{d.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight">{d.clinicName || 'Clínica não informada'} • {d.city || '---'}</p>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600" />
                                    </button>
                                ))}
                                {dentistSearch && filteredDentists.length === 0 && (
                                    <p className="text-center text-xs text-slate-400 py-6 italic" id="pickup-no-results">Nenhum consultório ou dentista encontrado.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
