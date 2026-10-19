import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DeliveryRoute, RouteItem, Job, ManualDentist, User, Courier, JobStatus } from '../../types';
import { 
  Truck, Calendar, Clock, Plus, Printer, Trash2, CheckCircle, 
  MapPin, Search, ChevronRight, X, User as UserIcon, Building, Loader2, Save, GripVertical, Navigation,
  Phone, Shield, ShieldAlert, Check, ToggleLeft, ToggleRight, UserPlus, ChevronDown, ChevronUp, Settings, ArrowRightLeft
} from 'lucide-react';
import * as api from '../../services/firebaseService';
import { notifyJobLogistics } from '../../services/ycloudService';
import { filterAndSortClients } from '../../utils/stringUtils';
import { getTodayDateStr, normalizeRouteDate, isAfter12PM, createMiddayDate } from '../../utils/dateHelpers';

export const RoutePlanner = () => {
    const { t } = useTranslation();
    const { 
        currentOrg, manualDentists, allUsers, triggerRoutePrint, currentUser,
        couriers, addCourier, updateCourier, deleteCourier, jobs, updateJob, routes
    } = useApp();
    
    const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
    const [selectedShift, setSelectedShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(() => {
        try { return localStorage.getItem('labprox_active_route_id') || null; } catch { return null; }
    });
    const [routeItems, setRouteItems] = useState<RouteItem[]>([]);
    const [isAddingPickup, setIsAddingPickup] = useState(false);
    const [pickupType, setPickupType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
    const [deliverySubtype, setDeliverySubtype] = useState<'MATERIALS' | 'JOB'>('MATERIALS');
    const [pickupObs, setPickupObs] = useState('');
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

    // State for Move Route / Config Modal
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [configGroupItems, setConfigGroupItems] = useState<RouteItem[] | null>(null);
    const [targetMoveRouteId, setTargetMoveRouteId] = useState<string>('');
    const [isMovingItem, setIsMovingItem] = useState(false);
    const [isDeletingRoute, setIsDeletingRoute] = useState(false);
    const [isCreatingMoveRoute, setIsCreatingMoveRoute] = useState(false);
    const [moveRouteCourier, setMoveRouteCourier] = useState('');
    const [moveRouteShift, setMoveRouteShift] = useState<'MORNING' | 'AFTERNOON'>('AFTERNOON');
    const [moveRouteDate, setMoveRouteDate] = useState(getTodayDateStr());

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [editingObservationsId, setEditingObservationsId] = useState<string | null>(null);
    const [observationsText, setObservationsText] = useState('');

    const groupedStops = useMemo(() => {
        const groups = new Map<string, RouteItem[]>();
        const sortedItems = [...routeItems].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        sortedItems.forEach(item => {
            if (!groups.has(item.dentistId)) {
                groups.set(item.dentistId, []);
            }
            groups.get(item.dentistId)!.push(item);
        });
        
        return Array.from(groups.values());
    }, [routeItems]);

    const handleSaveObservations = async (item: RouteItem) => {
        if (!activeRoute || !currentOrg || !canEdit) return;
        await api.apiUpdateRouteItem(currentOrg.id, activeRoute.id, item.id, { observations: observationsText });
        setEditingObservationsId(null);
    };

    const handleMoveGroup = async (idxFrom: number, idxTo: number) => {
        if (!activeRoute || !currentOrg || !canEdit) return;
        if (idxTo < 0 || idxTo >= groupedStops.length) return;

        const newGroups = [...groupedStops];
        const [movedGroup] = newGroups.splice(idxFrom, 1);
        newGroups.splice(idxTo, 0, movedGroup);

        const flattened = newGroups.flat();
        
        const updates = flattened.map((item, index) => {
            if (item.order !== index + 1) {
                return api.apiUpdateRouteItem(currentOrg.id, activeRoute.id, item.id, { order: index + 1 });
            }
            return null;
        }).filter((p): p is Promise<void> => p !== null);

        if (updates.length > 0) {
            await Promise.all(updates);
        }
    };

    const handleDropGroup = async (targetIdx: number) => {
        if (draggedIndex === null || draggedIndex === targetIdx) {
            setDraggedIndex(null);
            return;
        }

        const sourceIdx = draggedIndex;
        setDraggedIndex(null);

        await handleMoveGroup(sourceIdx, targetIdx);
    };

    const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    const canCreate = isAdmin || currentUser?.permissions?.includes('logistics:create');
    const canEdit = isAdmin || currentUser?.permissions?.includes('logistics:edit');
    const canDelete = isAdmin || currentUser?.permissions?.includes('logistics:delete');

    // All routes for the currently selected date and shift
    const shiftRoutes = useMemo(() => {
        return routes.filter(r => {
            const rDateStr = normalizeRouteDate(r.date);
            return rDateStr === selectedDate && r.shift === selectedShift;
        });
    }, [routes, selectedDate, selectedShift]);

    // Active selected route or fallback to open route
    const activeRoute = useMemo(() => {
        if (selectedRouteId) {
            const found = shiftRoutes.find(r => r.id === selectedRouteId);
            if (found) return found;
        }
        return shiftRoutes.find(r => r.status !== 'COMPLETED') || shiftRoutes[0] || null;
    }, [shiftRoutes, selectedRouteId]);

    // Sync selectedRouteId with localStorage
    useEffect(() => {
        if (activeRoute) {
            setSelectedRouteId(activeRoute.id);
            try { localStorage.setItem('labprox_active_route_id', activeRoute.id); } catch (e) {}
        }
    }, [activeRoute?.id]);

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

        const today = getTodayDateStr();

        if (selectedDate < today) {
            alert("Não é possível criar rotas para datas anteriores ao dia vigente.");
            return;
        }

        if (selectedDate === today && selectedShift === 'MORNING' && isAfter12PM()) {
            alert("Após as 12:00, não é possível criar a Rota da Manhã do dia de hoje. Selecione a Rota da Tarde ou um dia futuro.");
            return;
        }

        const routeId = `route_${selectedDate}_${selectedShift}_${driverName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
        await api.apiAddRoute(currentOrg.id, {
            id: routeId,
            organizationId: currentOrg.id,
            date: createMiddayDate(selectedDate),
            shift: selectedShift,
            driverName: driverName,
            status: 'OPEN',
            createdAt: new Date()
        });
        setSelectedRouteId(routeId);
        try { localStorage.setItem('labprox_active_route_id', routeId); } catch (e) {}
        setShowStartRouteModal(false);
        setManualCourierName('');
        setSelectedCourierId('');
    };

    // Available target routes for moving items (excluding current active route, completed routes, and past dates)
    const availableMoveRoutes = useMemo(() => {
        const today = getTodayDateStr();
        return routes.filter(r => {
            if (r.id === activeRoute?.id) return false;
            if (r.status === 'COMPLETED') return false;
            const rDateStr = normalizeRouteDate(r.date);
            if (rDateStr < today) return false; // Exclude past routes
            return true;
        });
    }, [routes, activeRoute?.id]);

    const handleDeleteRoute = async (routeId: string) => {
        if (!currentOrg || !canDelete) return;
        if (!window.confirm(t('routes.confirmDeleteRoute', 'Tem certeza que deseja excluir esta rota de entrega? Todos os serviços vinculados voltarão ao estado pendente.'))) return;
        
        setIsDeletingRoute(true);
        try {
            await api.apiDeleteRoute(currentOrg.id, routeId);
            setSelectedRouteId(null);
            try { localStorage.removeItem('labprox_active_route_id'); } catch (e) {}
        } catch (err) {
            console.error("Erro ao excluir rota:", err);
            alert(t('routes.errorDeleteRoute', 'Erro ao excluir rota.'));
        } finally {
            setIsDeletingRoute(false);
        }
    };

    const handleMoveGroupItems = async () => {
        if (!currentOrg || !activeRoute || !targetMoveRouteId || !configGroupItems || configGroupItems.length === 0) return;
        
        setIsMovingItem(true);
        try {
            await api.apiMoveRouteItems(currentOrg.id, activeRoute.id, targetMoveRouteId, configGroupItems);
            setShowMoveModal(false);
            setConfigGroupItems(null);
            setTargetMoveRouteId('');
            alert(t('routes.moveSuccess', 'Caso/Parada movido para a nova rota com sucesso!'));
        } catch (err) {
            console.error("Erro ao mover caso para outra rota:", err);
            alert(t('routes.moveError', 'Erro ao mover para outra rota.'));
        } finally {
            setIsMovingItem(false);
        }
    };

    const handleQuickCreateAndMove = async () => {
        if (!currentOrg || !activeRoute || !configGroupItems || configGroupItems.length === 0) return;
        const driverName = moveRouteCourier.trim();
        if (!driverName) {
            alert("Informe o nome do motoboy para a nova rota.");
            return;
        }
        const dateStr = moveRouteDate;
        const shift = moveRouteShift;
        const today = getTodayDateStr();

        if (dateStr < today) {
            alert("Não é possível criar rotas em datas anteriores ao dia vigente.");
            return;
        }

        if (dateStr === today && shift === 'MORNING' && isAfter12PM()) {
            alert("Após as 12:00, somente rotas do turno da TARDE podem ser selecionadas para hoje.");
            return;
        }

        setIsMovingItem(true);
        try {
            const newRouteId = `route_${dateStr}_${shift}_${driverName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
            await api.apiAddRoute(currentOrg.id, {
                id: newRouteId,
                organizationId: currentOrg.id,
                date: createMiddayDate(dateStr),
                shift: shift,
                driverName: driverName,
                status: 'OPEN',
                createdAt: new Date()
            });

            await api.apiMoveRouteItems(currentOrg.id, activeRoute.id, newRouteId, configGroupItems);
            setShowMoveModal(false);
            setConfigGroupItems(null);
            setIsCreatingMoveRoute(false);
            setMoveRouteCourier('');
            alert(t('routes.moveSuccess', 'Nova rota criada e caso movido com sucesso!'));
        } catch (err) {
            console.error("Erro ao criar rota e mover:", err);
            alert("Erro ao criar nova rota e mover itens.");
        } finally {
            setIsMovingItem(false);
        }
    };

    const formatDentistAddress = (d: any) => {
        if (!d) return t('routes.addressNotRegistered', 'Endereço não cadastrado');
        const parts: string[] = [];
        if (d.address) {
            let line = d.address;
            if (d.number) line += `, ${d.number}`;
            if (d.complement) line += ` - ${d.complement}`;
            parts.push(line);
        }
        if (d.neighborhood) parts.push(d.neighborhood);
        if (d.city || d.state) parts.push(`${d.city || ''}${d.city && d.state ? '/' : ''}${d.state || ''}`);
        return parts.length > 0 ? parts.join(' - ') : (typeof d.address === 'string' && d.address.trim() ? d.address : t('routes.addressNotRegistered', 'Endereço não cadastrado'));
    };

    const handleAddPickup = async (dentist: any) => {
        if (!activeRoute || !currentOrg || (!canCreate && !canEdit)) return;
        const address = formatDentistAddress(dentist);
        
        let defaultObs = 'Coleta de materiais / moldes';
        if (pickupType === 'DELIVERY') {
            defaultObs = deliverySubtype === 'MATERIALS' ? 'Entrega de materiais / insumos' : 'Entrega de trabalhos finalizados';
        }

        const newItem: RouteItem = {
            id: `stop_${Date.now()}`,
            routeId: activeRoute.id,
            dentistId: dentist.id,
            dentistName: dentist.name,
            clinicName: dentist.clinicName,
            address: address,
            type: pickupType,
            observations: pickupObs.trim() ? pickupObs.trim() : defaultObs,
            order: routeItems.length + 1
        };

        await api.apiAddRouteItem(currentOrg.id, activeRoute.id, newItem);
        setIsAddingPickup(false);
        setPickupObs('');
        setPickupType('PICKUP');
        setDeliverySubtype('MATERIALS');
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!activeRoute || !currentOrg || (!canDelete && !canEdit)) return;
        await api.apiDeleteRouteItem(currentOrg.id, activeRoute.id, itemId);
    };

    const handleUpdateStatus = async (status: DeliveryRoute['status']) => {
        if (!activeRoute || !currentOrg || !canEdit) return;
        await api.apiUpdateRoute(currentOrg.id, activeRoute.id, { status });

        // Se a rota entrou em trânsito ou foi concluída, notificar dentistas dos trabalhos associados
        if (status === 'IN_TRANSIT' || status === 'COMPLETED') {
            const isDelivered = status === 'COMPLETED';
            const action = isDelivered ? 'DELIVERED' : 'SHIPPED';

            // Agrupar itens por dentista
            const itemsByDentist: Record<string, RouteItem[]> = {};
            routeItems.forEach(item => {
                const key = item.dentistId || item.dentistName || 'unknown';
                if (!itemsByDentist[key]) {
                    itemsByDentist[key] = [];
                }
                itemsByDentist[key].push(item);
            });

            for (const [, dItems] of Object.entries(itemsByDentist)) {
                for (const item of dItems) {
                    if (item.jobId) {
                        const job = jobs.find(j => j.id === item.jobId);
                        if (job) {
                            if (isDelivered) {
                                await updateJob(job.id, { status: JobStatus.DELIVERED });
                            } else {
                                const dentist = manualDentists.find(d => d.id === item.dentistId || d.name === item.dentistName) || 
                                                allUsers.find(u => u.id === item.dentistId || u.name === item.dentistName);
                                const rawPhone = dentist?.whatsapp || dentist?.phone || (job as any)?.dentistPhone || (job as any)?.dentistWhatsapp || '';
                                const cleanPhone = rawPhone.replace(/\D/g, '');
                                if (cleanPhone.length >= 8) {
                                    try {
                                        await notifyJobLogistics(job, action, cleanPhone, dentist?.name || item.dentistName || 'Dentista');
                                    } catch (err) {
                                        console.warn("[RoutePlanner] Erro ao notificar saída para entrega:", err);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
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
        if (window.confirm(t('routes.confirmDeleteCourier', 'Deseja realmente remover este motoboy?'))) {
            await deleteCourier(courierId);
        }
    };

    const filteredDentists = useMemo(() => {
        if (!dentistSearch || !dentistSearch.trim()) return [];
        const combined = [...manualDentists, ...allUsers.filter(u => u.role === 'CLIENT')];
        return filterAndSortClients(combined, dentistSearch).slice(0, 8);
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
                        <Truck className="text-blue-600 animate-pulse" /> {t('routes.title', 'Roteiros de Entrega')}
                    </h1>
                    <p className="text-slate-500">{t("routes.subtitle", "Organize as saídas de motoboy e coletas externas em tempo real.")}</p>
                </div>
                {activeRoute && (
                    <button 
                        id="print-route-btn"
                        onClick={() => triggerRoutePrint(routeItems, activeRoute.driverName, activeRoute.shift, selectedDate)}
                        className="px-6 py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 hover:bg-slate-800 transition-all uppercase tracking-widest"
                    >
                        <Printer size={16} /> {t('routes.printRoute', 'IMPRIMIR ROTEIRO')}
                    </button>
                )}
            </div>

            {/* FILTRO DE DATA E TURNO */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 sm:p-6" id="route-filters-card">
                <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t("routes.routeDate", "Data do Roteiro")}</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input id="route-date-input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800" />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t("routes.routeShift", "Turno da Rota")}</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl" id="route-shift-tabs">
                        <button id="shift-morning-btn" onClick={() => setSelectedShift('MORNING')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedShift === 'MORNING' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>{t('routes.morning', 'Manhã')}</button>
                        <button id="shift-afternoon-btn" onClick={() => setSelectedShift('AFTERNOON')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedShift === 'AFTERNOON' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>{t('routes.afternoon', 'Tarde')}</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:p-8">
                {/* LISTA DE PARADAS */}
                <div className="lg:col-span-8 space-y-4" id="routes-stops-container">
                    {/* SELETOR MULTI-ROTAS DO TURNO */}
                    {shiftRoutes.length > 0 && (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3" id="multi-route-selector">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">
                                    Rotas do Turno ({shiftRoutes.length}):
                                </span>
                                {shiftRoutes.map(r => {
                                    const isActive = activeRoute?.id === r.id;
                                    return (
                                        <button
                                            key={r.id}
                                            id={`select-route-tab-${r.id}`}
                                            onClick={() => {
                                                setSelectedRouteId(r.id);
                                                try { localStorage.setItem('labprox_active_route_id', r.id); } catch (e) {}
                                            }}
                                            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                                                isActive
                                                    ? 'bg-slate-900 text-white shadow-md scale-105'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                            }`}
                                        >
                                            <Truck size={14} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                                            <span>{r.driverName}</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                                                r.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                r.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {r.status === 'COMPLETED' ? 'Concluída' : r.status === 'IN_TRANSIT' ? 'Em Rua' : 'Aberta'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {canCreate && (
                                <button
                                    id="add-extra-route-btn"
                                    onClick={() => setShowStartRouteModal(true)}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm uppercase tracking-wider"
                                >
                                    <Plus size={14} /> Nova Rota
                                </button>
                            )}
                        </div>
                    )}

                    {!activeRoute ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center" id="no-route-display">
                            <Truck size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-black text-slate-700">{t("routes.noRoutesTitle", "Nenhum roteiro para este período")}</h3>
                            <p className="text-slate-500 mb-6 text-sm">{t("routes.noRoutesDesc", "Organize as coletas e entregas designando um motoboy.")}</p>
                            <button 
                                id="init-route-btn"
                                onClick={() => {
                                    if (!canCreate && !canEdit) return;
                                    setShowStartRouteModal(true);
                                }}
                                disabled={!canCreate && !canEdit}
                                className={`px-8 py-3.5 font-black text-xs rounded-xl shadow-lg uppercase tracking-wider transition-all transform active:scale-95 ${canCreate || canEdit ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                            >
                                {t('routes.startRoute', 'INICIAR ROTEIRO')}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" id="active-route-manager">
                            <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><UserIcon size={20}/></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t("routes.courierResponsible", "Motoboy Responsável")}</p>
                                        <p className="font-black text-slate-800 text-lg leading-tight mt-1">{activeRoute.driverName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(canCreate || canEdit) && (
                                        <button 
                                            id="header-add-pickup-btn"
                                            onClick={() => setIsAddingPickup(true)}
                                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-full shadow-sm flex items-center gap-1.5 uppercase tracking-wider transition-all shrink-0"
                                            title="Solicitar Parada Avulsa (Coleta / Entrega)"
                                        >
                                            <Plus size={14} />
                                            <span className="hidden sm:inline">Parada Avulsa</span>
                                        </button>
                                    )}

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
                                        <option value="OPEN">{t('routes.statusWaitingDeparture', '📦 Aguardando Saída')}</option>
                                        <option value="IN_TRANSIT">{t('routes.statusInTransit', '🛵 Em Trânsito / Rua')}</option>
                                        <option value="COMPLETED">{t('routes.statusCompleted', '✅ Rota Concluída')}</option>
                                    </select>

                                    {canDelete && (
                                        <button
                                            id="delete-active-route-btn"
                                            onClick={() => handleDeleteRoute(activeRoute.id)}
                                            disabled={isDeletingRoute}
                                            className="px-3 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                                            title="Excluir Rota"
                                        >
                                            {isDeletingRoute ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            <span className="hidden sm:inline">Excluir Rota</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 space-y-3" id="stops-inner-list">
                                {groupedStops.map((group, idx) => (
                                    <div 
                                        key={`group-${idx}`}
                                        draggable={canEdit}
                                        onDragStart={(e) => {
                                            if (canEdit) {
                                                setDraggedIndex(idx);
                                                e.dataTransfer.effectAllowed = 'move';
                                            } else {
                                                e.preventDefault();
                                            }
                                        }}
                                        onDragOver={(e) => {
                                            if (canEdit) {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                            }
                                        }}
                                        onDrop={() => {
                                            if (draggedIndex !== null && canEdit) {
                                                handleDropGroup(idx);
                                            }
                                        }}
                                        className={`flex flex-col gap-3 p-4 bg-white border rounded-2xl hover:border-blue-200 transition-all group shadow-sm/5 hover:shadow-md ${
                                            draggedIndex === idx ? 'opacity-40 border-dashed border-blue-300 bg-slate-50' : 'border-slate-100'
                                        }`} 
                                        id={`route-stop-group-${idx}`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 w-full">
                                            {/* REORDER CONTROLS (DRAG HANDLE AND MOVEMENT BUTTONS) */}
                                            {canEdit && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <div 
                                                        className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors"
                                                        title={t('routes.dragToReorder', 'Arrastar para reordenar')}
                                                    >
                                                        <GripVertical size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <button
                                                            onClick={() => handleMoveGroup(idx, idx - 1)}
                                                            disabled={idx === 0}
                                                            className={`p-0.5 rounded hover:bg-slate-100 transition-colors ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                                                            title={t('routes.moveUp', 'Mover para cima')}
                                                        >
                                                            <ChevronUp size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMoveGroup(idx, idx + 1)}
                                                            disabled={idx === groupedStops.length - 1}
                                                            className={`p-0.5 rounded hover:bg-slate-100 transition-colors ${idx === groupedStops.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                                                            title={t('routes.moveDown', 'Mover para baixo')}
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
                                                <h4 className="font-extrabold text-slate-800 truncate text-sm md:text-base">{group[0].dentistName}</h4>
                                                <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{group[0].address}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {canEdit && (
                                                    <button 
                                                        id={`config-group-btn-${idx}`}
                                                        onClick={() => {
                                                            setConfigGroupItems(group);
                                                            setTargetMoveRouteId('');
                                                            setShowMoveModal(true);
                                                        }}
                                                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all flex items-center gap-1 font-extrabold text-xs border border-indigo-100 shadow-sm"
                                                        title="Configurações da Parada (Mover para outra Rota)"
                                                    >
                                                        <Settings size={14} className="text-indigo-600" />
                                                        <span>Config</span>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(group[0].address)}`, '_blank')}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title={t('routes.viewOnMap', 'Ver no Mapa')}
                                                >
                                                    <Navigation size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Group Items */}
                                        <div className="pl-[3.25rem] space-y-2 mt-2">
                                            {group.map(item => (
                                                <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${item.type === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {item.type === 'DELIVERY' ? t('routes.deliveryBadge', 'Entrega') : t('routes.pickupBadge', 'Coleta')}
                                                            </span>
                                                            {item.patientName && (
                                                                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                                    <UserIcon size={12} /> {t('routes.patientLabel', 'Paciente:')} {item.patientName}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {canEdit && (
                                                                <button 
                                                                    id={`config-item-btn-${item.id}`}
                                                                    onClick={() => {
                                                                        setConfigGroupItems([item]);
                                                                        setTargetMoveRouteId('');
                                                                        setShowMoveModal(true);
                                                                    }}
                                                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all flex items-center gap-1 text-[10px] font-extrabold border border-indigo-100"
                                                                    title="Config / Mover este serviço"
                                                                >
                                                                    <Settings size={12} /> Config
                                                                </button>
                                                            )}
                                                            {(canDelete || canEdit) && (
                                                                <button 
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                                                                    title={t('routes.removeService', 'Remover Serviço')}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Observations */}
                                                    <div className="mt-3 border-t border-slate-200 pt-3">
                                                        {editingObservationsId === item.id ? (
                                                            <div className="flex flex-col gap-2">
                                                                <textarea
                                                                    value={observationsText}
                                                                    onChange={(e) => setObservationsText(e.target.value)}
                                                                    placeholder={t('routes.deliveryNotesPlaceholder', 'Observações de entrega...')}
                                                                    className="w-full text-xs p-2 border rounded-lg resize-none h-16 font-medium text-slate-700 focus:border-indigo-400 outline-none"
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => setEditingObservationsId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700">{t('common.cancel', 'Cancelar')}</button>
                                                                    <button onClick={() => handleSaveObservations(item)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">{t('common.save', 'Salvar')}</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-start justify-between gap-2 group/obs cursor-pointer" onClick={() => { setEditingObservationsId(item.id); setObservationsText(item.observations || ''); }}>
                                                                <p className={`text-xs font-medium ${item.observations ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                                                                    {item.observations || t('routes.addDeliveryNotes', 'Adicionar observações de entrega...')}
                                                                </p>
                                                                <span className="opacity-0 group-hover/obs:opacity-100 text-xs text-indigo-500 font-bold whitespace-nowrap">{t("common.edit", "Editar")}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {routeItems.length === 0 && (
                                    <div className="py-12 text-center text-slate-400 italic text-sm" id="empty-stops-placeholder">
                                        {t('routes.emptyStops', 'Nenhum serviço incluído nesta rota. Adicione através da lista de trabalhos finalizados ou use o botão de coleta avulsa abaixo.')}
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
                                        <Plus size={18}/> {t('routes.singleStopBtn', 'PARADA AVULSA (SOLICITAR COLETA)')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SIDEBAR: CADASTRO E GERENCIAMENTO DE MOTOBOYS */}
                <div className="lg:col-span-4 space-y-6" id="route-planner-sidebar">
                    {/* GERENCIAMENTO DE MOTOBOYS CARD */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-6" id="courier-manager-card">
                        <div className="flex justify-between items-center pb-2 border-b border-rose-50/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <Truck size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm md:text-base leading-none">{t("routes.couriers", "Motoboys")}</h3>
                                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">{t("routes.registeredCouriers", "Entregadores cadastrados")}</span>
                                </div>
                            </div>
                            {canCreate && (
                                <button 
                                    id="add-new-courier-trigger"
                                    onClick={() => setShowCourierForm(!showCourierForm)}
                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center"
                                    title={t('routes.newRegistration', 'Cadastrar Entregador')}
                                >
                                    {showCourierForm ? <X size={16} /> : <UserPlus size={16} />}
                                </button>
                            )}
                        </div>

                        {/* FORMULÁRIO DE CADASTRO */}
                        {showCourierForm && (
                            <form id="new-courier-form" onSubmit={handleAddCourierSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">{t("routes.newRegistration", "Novo Cadastro")}</h4>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('routes.fullNameRequired', 'Nome completo *')}</label>
                                    <input 
                                        id="courier-name-input"
                                        type="text" 
                                        required
                                        placeholder={t('routes.fullNamePlaceholder', 'Ex: Carlos Silva')}
                                        value={courierName}
                                        onChange={e => setCourierName(e.target.value)}
                                        className="w-full text-xs font-bold px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('routes.phoneWhatsapp', 'Celular / WhatsApp')}</label>
                                        <input 
                                            id="courier-phone-input"
                                            type="text" 
                                            placeholder={t('routes.phonePlaceholder', '(11) 99999-9999')}
                                            value={courierPhone}
                                            onChange={e => setCourierPhone(e.target.value)}
                                            className="w-full text-xs font-bold px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('routes.vehiclePlate', 'Moto / Placa')}</label>
                                        <input 
                                            id="courier-vehicle-input"
                                            type="text" 
                                            placeholder={t('routes.vehiclePlaceholder', 'Titan 160 / ABC1234')}
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
                                    {t('routes.saveRegistration', 'SALVAR CADASTRADO')}
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
                                                {courier.active ? t('routes.active', 'Ativo') : t('routes.inactive', 'Inativo')}
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
                                                title={courier.active ? t('routes.deactivateDelivery', 'Desativar entrega') : t('routes.activateDelivery', 'Ativar entrega')}
                                            >
                                                {courier.active ? <ToggleRight size={22} className="text-blue-600" /> : <ToggleLeft size={22} className="text-slate-400" />}
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button 
                                                id={`delete-courier-btn-${courier.id}`}
                                                onClick={() => handleDeleteCourier(courier.id)}
                                                className="p-1 px-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title={t('routes.removeCourier', 'Remover entregador')}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {couriers.length === 0 && (
                                <div className="text-center py-8 text-slate-400 italic text-xs" id="empty-couriers-display">
                                    {t('routes.noRegisteredCouriers', 'Nenhum entregador cadastrado para este laboratório.')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-indigo-950 rounded-3xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden" id="logistics-tips-sidebar">
                        <Truck size={80} className="absolute -bottom-4 -right-4 opacity-10" />
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2"><Navigation size={20}/> {t('routes.logisticsTip', 'Dica de Logística')}</h3>
                        <p className="text-sm text-indigo-100 leading-relaxed font-bold">
                            {t('routes.logisticsTipDesc', 'Ordene as paradas para otimizar os custos de transporte do seu laboratório. Cada parada pode ser facilmente visualizada no Waze ou Google Maps correspondente pelo entregador.')}
                        </p>
                    </div>
                </div>
            </div>

            {/* MODAL: INICIAR ROTEIRO */}
            {showStartRouteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" id="start-route-modal">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-4 sm:p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-5 border-b pb-4">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <Truck size={18} className="text-blue-600"/> {t('routes.startNewRoute', 'Iniciar Novo Roteiro')}
                            </h3>
                            <button id="close-start-route-modal" onClick={() => setShowStartRouteModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t("routes.selectRegisteredCourier", "Selecione o Motoboy Cadastrado")}</label>
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
                                        {t('routes.noActiveCouriersWarning', '⚠️ Nenhum motoboy ativo cadastrado. Cadastre um entregador no painel lateral à direita ou digite um nome abaixo para uso esporádico.')}
                                    </p>
                                )}
                            </div>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink mx-4 text-xs font-black text-slate-400 uppercase tracking-wider">{t('common.or', 'OU')}</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t("routes.sporadicCourierName", "Nome do Entregador Esporádico")}</label>
                                <div className="flex gap-2">
                                    <input 
                                        id="manual-courier-name-input"
                                        type="text" 
                                        placeholder={t('routes.sporadicCourierPlaceholder', 'Ex: Carlos Temporário')}
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
                                        {t('routes.startBtn', 'INICIAR')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ADICIONAR PARADA AVULSA (COLETA / ENTREGA) */}
            {isAddingPickup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" id="add-pickup-modal">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-4 sm:p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                                <Building size={18} className="text-blue-600"/> {t('routes.singleStopPickup', 'Parada Avulsa (Coleta / Entrega)')}
                            </h3>
                            <button id="close-pickup-modal-btn" onClick={() => setIsAddingPickup(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo da Parada Avulsa</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => { setPickupType('PICKUP'); setDeliverySubtype('MATERIALS'); }} 
                                        className={`p-3 rounded-2xl font-extrabold text-xs flex flex-col items-center justify-center gap-1 border transition-all text-center ${pickupType === 'PICKUP' ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-102' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        <span className="text-sm">📦 Coleta</span>
                                        <span className={`text-[10px] ${pickupType === 'PICKUP' ? 'text-amber-100' : 'text-slate-400'}`}>Materiais / Moldes</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { setPickupType('DELIVERY'); setDeliverySubtype('MATERIALS'); }} 
                                        className={`p-3 rounded-2xl font-extrabold text-xs flex flex-col items-center justify-center gap-1 border transition-all text-center ${pickupType === 'DELIVERY' && deliverySubtype === 'MATERIALS' ? 'bg-cyan-600 text-white border-cyan-600 shadow-md scale-102' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        <span className="text-sm">🚚 Entrega</span>
                                        <span className={`text-[10px] ${pickupType === 'DELIVERY' && deliverySubtype === 'MATERIALS' ? 'text-cyan-100' : 'text-slate-400'}`}>Materiais / Insumos</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { setPickupType('DELIVERY'); setDeliverySubtype('JOB'); }} 
                                        className={`p-3 rounded-2xl font-extrabold text-xs flex flex-col items-center justify-center gap-1 border transition-all text-center ${pickupType === 'DELIVERY' && deliverySubtype === 'JOB' ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        <span className="text-sm">💼 Entrega</span>
                                        <span className={`text-[10px] ${pickupType === 'DELIVERY' && deliverySubtype === 'JOB' ? 'text-blue-100' : 'text-slate-400'}`}>Trabalhos Finalizados</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações (Opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder={pickupType === 'PICKUP' ? 'Ex: Coleta de moldes ou trabalhos de prova' : (deliverySubtype === 'MATERIALS' ? 'Ex: Entrega de gessos, ligas, fios ou insumos' : 'Ex: Entrega de caso/prótese pronta')} 
                                    value={pickupObs} 
                                    onChange={e => setPickupObs(e.target.value)} 
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>

                            <div className="relative pt-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selecione o Dentista / Consultório</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input 
                                        id="pickup-dentist-search-input"
                                        placeholder={t('routes.searchDentistByName', 'Buscar dentista por nome...')} 
                                        value={dentistSearch}
                                        onChange={e => setDentistSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-slate-50" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="pickup-dentists-list">
                                {filteredDentists.map(d => (
                                    <button 
                                        key={d.id} 
                                        id={`select-pickup-dentist-${d.id}`}
                                        onClick={() => handleAddPickup(d)}
                                        className="w-full text-left p-3.5 hover:bg-blue-50/30 border border-slate-100 rounded-2xl flex items-center justify-between group transition-all"
                                    >
                                        <div>
                                            <p className="font-extrabold text-slate-800 text-sm">{d.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight">{d.clinicName || t('routes.clinicNotSpecified', 'Clínica não informada')} • {d.city || '---'}</p>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600" />
                                    </button>
                                ))}
                                {dentistSearch && filteredDentists.length === 0 && (
                                    <p className="text-center text-xs text-slate-400 py-6 italic" id="pickup-no-results">{t("routes.noClinicFound", "Nenhum consultório ou dentista encontrado.")}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING FIXED BUTTON: ADICIONAR PARADA AVULSA */}
            {(activeRoute && (canCreate || canEdit)) && (
                <button 
                    id="floating-add-pickup-btn"
                    onClick={() => setIsAddingPickup(true)}
                    className="fixed bottom-6 right-6 z-40 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-full shadow-2xl flex items-center gap-2 uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border-2 border-white"
                    title="Solicitar Parada Avulsa (Coleta/Entrega)"
                >
                    <Plus size={18} />
                    <span>PARADA AVULSA</span>
                </button>
            )}

            {/* MODAL: MOVER CASO / PARADA PARA OUTRA ROTA (CONFIG) */}
            {showMoveModal && configGroupItems && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" id="move-route-modal">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-5 border-b pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                                        {t('routes.configModalTitle', 'Configurações da Parada')}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400">Mover para outra rota de entrega</p>
                                </div>
                            </div>
                            <button 
                                id="close-move-modal-btn"
                                onClick={() => { setShowMoveModal(false); setConfigGroupItems(null); }} 
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Summary of items being moved */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('routes.selectedStopLabel', 'Parada / Caso Selecionado:')}</p>
                                <p className="font-extrabold text-slate-800 text-sm">{configGroupItems[0]?.dentistName}</p>
                                {configGroupItems[0]?.address && (
                                    <p className="text-xs text-slate-500 font-medium">{configGroupItems[0]?.address}</p>
                                )}
                                <div className="pt-2 flex flex-wrap gap-1.5">
                                    {configGroupItems.map(it => (
                                        <span key={it.id} className="text-[10px] font-extrabold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 shadow-sm flex items-center gap-1">
                                            <span className={`w-2 h-2 rounded-full ${it.type === 'DELIVERY' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                                            {it.type === 'DELIVERY' ? 'Entrega' : 'Coleta'} {it.patientName ? `(${it.patientName})` : ''}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Target Route Selection */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                                        {t('routes.selectDestinationRoute', 'Selecione a Rota de Destino:')}
                                    </label>
                                    {canCreate && (
                                        <button 
                                            type="button"
                                            onClick={() => setIsCreatingMoveRoute(!isCreatingMoveRoute)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                        >
                                            {isCreatingMoveRoute ? '✕ Ver Rotas Existentes' : '+ Criar Nova Rota'}
                                        </button>
                                    )}
                                </div>

                                {isCreatingMoveRoute ? (
                                    <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3 animate-in zoom-in-95 duration-150">
                                        <p className="text-xs font-black text-indigo-900 uppercase tracking-wider">Criar Nova Rota e Mover</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Data</label>
                                                <input 
                                                    type="date" 
                                                    min={getTodayDateStr()} 
                                                    value={moveRouteDate} 
                                                    onChange={e => setMoveRouteDate(e.target.value)} 
                                                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Turno</label>
                                                <select 
                                                    value={moveRouteShift} 
                                                    onChange={e => setMoveRouteShift(e.target.value as any)} 
                                                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="MORNING" disabled={moveRouteDate === getTodayDateStr() && isAfter12PM()}>
                                                        Manhã {moveRouteDate === getTodayDateStr() && isAfter12PM() ? '(Encerrada)' : ''}
                                                    </option>
                                                    <option value="AFTERNOON">Tarde</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Motoboy / Entregador</label>
                                            {couriers && couriers.filter(c => c.active).length > 0 ? (
                                                <select 
                                                    value={moveRouteCourier} 
                                                    onChange={e => setMoveRouteCourier(e.target.value)} 
                                                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="">-- Selecione o Motoboy --</option>
                                                    {couriers.filter(c => c.active).map(c => (
                                                        <option key={c.id} value={c.name}>{c.name} {c.vehicle ? `(${c.vehicle})` : ''}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    placeholder="Nome do motorista..." 
                                                    value={moveRouteCourier} 
                                                    onChange={e => setMoveRouteCourier(e.target.value)} 
                                                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            )}
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={handleQuickCreateAndMove}
                                            disabled={!moveRouteCourier.trim() || isMovingItem}
                                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                                        >
                                            {isMovingItem ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                            <span>Criar Rota e Mover Imediatamente</span>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {availableMoveRoutes.length > 0 ? (
                                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="move-target-routes-list">
                                                {availableMoveRoutes.map(r => {
                                                    const rDateStr = normalizeRouteDate(r.date);
                                                    const isToday = rDateStr === getTodayDateStr();
                                                    return (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            id={`target-route-btn-${r.id}`}
                                                            onClick={() => setTargetMoveRouteId(r.id)}
                                                            className={`w-full text-left p-3.5 border rounded-2xl transition-all flex items-center justify-between ${
                                                                targetMoveRouteId === r.id
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                                    : 'bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-800'
                                                            }`}
                                                        >
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <Truck size={14} className={targetMoveRouteId === r.id ? 'text-indigo-200' : 'text-indigo-600'} />
                                                                    <p className="font-extrabold text-sm">{r.driverName}</p>
                                                                    {isToday && (
                                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                                            targetMoveRouteId === r.id ? 'bg-indigo-500 text-white' : 'bg-emerald-100 text-emerald-800'
                                                                        }`}>
                                                                            Hoje
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className={`text-[10px] font-bold mt-1 ${targetMoveRouteId === r.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                                    Data: {rDateStr.split('-').reverse().join('/')} • Turno: {r.shift === 'MORNING' ? 'Manhã' : 'Tarde'}
                                                                </p>
                                                            </div>
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                                                                targetMoveRouteId === r.id
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-indigo-50 text-indigo-700'
                                                            }`}>
                                                                {targetMoveRouteId === r.id ? 'Selecionada' : 'Mover p/ aqui'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-bold space-y-2" id="no-destination-routes-warning">
                                                <p>⚠️ Nenhuma outra rota ativa encontrada para o dia vigente ou datas futuras.</p>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsCreatingMoveRoute(true)}
                                                    className="w-full mt-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all"
                                                >
                                                    + Criar Rota da Tarde de Hoje e Mover
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {!isCreatingMoveRoute && (
                                <div className="pt-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowMoveModal(false); setConfigGroupItems(null); }}
                                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl hover:bg-slate-200 transition-all uppercase tracking-wider"
                                    >
                                        {t('common.cancel', 'Cancelar')}
                                    </button>
                                    <button
                                        type="button"
                                        id="confirm-move-route-btn"
                                        onClick={handleMoveGroupItems}
                                        disabled={!targetMoveRouteId || isMovingItem}
                                        className="flex-1 py-3 bg-indigo-600 text-white font-black text-xs rounded-xl hover:bg-indigo-700 disabled:opacity-40 uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all"
                                    >
                                        {isMovingItem ? <Loader2 size={16} className="animate-spin"/> : <ArrowRightLeft size={16}/>}
                                        {t('routes.confirmMoveBtn', 'MOVER CASO')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
