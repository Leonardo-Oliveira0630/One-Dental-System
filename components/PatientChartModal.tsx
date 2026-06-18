import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X, Plus, Calendar, Clock, FileText, Camera, Box, Activity, 
    UploadCloud, Download, Loader2, User, Phone, Mail, 
    Trash2, Heart, AlertTriangle, Printer, Save, Check, Edit2, Notebook, 
    DollarSign, Sparkles, FileSpreadsheet, ChevronRight, RefreshCw, ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
    ClinicPatient, Appointment, ClinicBudget, ClinicPrescription, 
    ClinicClinicalCard, ClinicAnamnesis, ClinicPatientFinance, AppointmentStatus, ClinicService
} from '../types';
import * as api from '../services/firebaseService';

interface PatientChartModalProps {
    patient: ClinicPatient;
    onClose: () => void;
}

type TabType = 'SOBRE' | 'CONSULTAS' | 'FINANCEIRO' | 'ORCAMENTOS' | 'FICHAS' | 'ANEXOS' | 'PRESCRICOES' | 'ANAMNESE' | 'PROTESES';

export const PatientChartModal: React.FC<PatientChartModalProps> = ({ patient, onClose }) => {
    const { 
        currentUser, 
        currentOrg, 
        currentPlan,
        clinicDentists, 
        clinicRooms, 
        clinicServices,
        appointments,
        updateAppointment,
        uploadFile
    } = useApp();

    const isLimited = currentPlan ? !currentPlan.features.hasClinicModule : false;

    const [activeTab, setActiveTab] = useState<TabType>('SOBRE');
    const [patientInfo, setPatientInfo] = useState<ClinicPatient>(patient);

    // Subcollection states
    const [budgets, setBudgets] = useState<ClinicBudget[]>([]);
    const [prescriptions, setPrescriptions] = useState<ClinicPrescription[]>([]);
    const [clinicalCards, setClinicalCards] = useState<ClinicClinicalCard[]>([]);
    const [anamnesisRecords, setAnamnesisRecords] = useState<ClinicAnamnesis[]>([]);
    const [finances, setFinances] = useState<ClinicPatientFinance[]>([]);
    const [patientHistory, setPatientHistory] = useState<any[]>([]);

    // Loading states
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form open states
    const [showEditSobre, setShowEditSobre] = useState(false);
    const [showAddAppointment, setShowAddAppointment] = useState(false);
    const [showAddFinance, setShowAddFinance] = useState(false);
    const [showAddBudget, setShowAddBudget] = useState(false);
    const [showAddClinicalCard, setShowAddClinicalCard] = useState(false);
    const [showAddPrescription, setShowAddPrescription] = useState(false);

    // Edit Patient Info Forms State
    const [phone, setPhone] = useState(patient.phone);
    const [email, setEmail] = useState(patient.email || '');
    const [cpf, setCpf] = useState(patient.cpf || '');
    const [birthDate, setBirthDate] = useState(patient.birthDate || '');
    const [planName, setPlanName] = useState(patient.planName || 'Particular');

    // New Appointment Form State
    const [appDentistId, setAppDentistId] = useState('');
    const [appRoomId, setAppRoomId] = useState('');
    const [appProcedure, setAppProcedure] = useState('');
    const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0]);
    const [appTime, setAppTime] = useState('09:00');
    const [appDuration, setAppDuration] = useState(30);
    const [appNotes, setAppNotes] = useState('');

    // New Finance Form State
    const [finDesc, setFinDesc] = useState('');
    const [finAmount, setFinAmount] = useState<number>(0);
    const [finType, setFinType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [finStatus, setFinStatus] = useState<'PAID' | 'PENDING' | 'OVERDUE'>('PENDING');
    const [finDate, setFinDate] = useState(new Date().toISOString().split('T')[0]);

    // New Budget Form State
    const [budTitle, setBudTitle] = useState('');
    const [budNotes, setBudNotes] = useState('');
    const [budItems, setBudItems] = useState<{ description: string; qty: number; value: number }[]>([]);
    const [newBudItemDesc, setNewBudItemDesc] = useState('');
    const [newBudItemValue, setNewBudItemValue] = useState<number>(0);

    // New Clinical Card State
    const [cardTitle, setCardTitle] = useState('');
    const [cardTooth, setCardTooth] = useState('');
    const [cardNotes, setCardNotes] = useState('');
    const [cardDentist, setCardDentist] = useState('');

    // New Prescription State
    const [presDentist, setPresDentist] = useState('');
    const [presNotes, setPresNotes] = useState('');
    const [presItems, setPresItems] = useState<{ medication: string; instructions: string }[]>([]);
    const [newMedName, setNewMedName] = useState('');
    const [newMedInstructions, setNewMedInstructions] = useState('');

    // Active Print Prescription State
    const [printingPrescription, setPrintingPrescription] = useState<ClinicPrescription | null>(null);

    // Anamnesis Answers State
    const [anamResponses, setAnamResponses] = useState<{ [key: string]: boolean | string }>({
        underTreatment: false,
        hasAllergy: false,
        allergyDetails: '',
        heartIssues: false,
        continuousMed: false,
        medDetails: '',
        isSmoker: false,
        isPregnant: false,
        otherConditions: ''
    });

    // List of predefined Clinical Alerts
    const predefinedAlerts = [
        { name: 'Alergia', color: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' },
        { name: 'Hipertensão', color: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' },
        { name: 'Diabetes', color: 'bg-yellow-50 text-yellow-800 border-yellow-100 hover:bg-yellow-100' },
        { name: 'Cardiopatia', color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' },
        { name: 'Medicação contínua', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
        { name: 'Fumante', color: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100' },
        { name: 'Gestante', color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100' }
    ];

    // Read clinicalAlerts from patient info
    const selectedAlerts = patientInfo.clinicalAlerts || [];

    // Real-time listeners
    useEffect(() => {
        const orgId = currentUser?.organizationId;
        if (!orgId || !patient.id) return;

        // Sync patient details locally if updated in list
        setPatientInfo(patient);

        // Subcollection listeners
        const unsubBudgets = api.subscribePatientBudgets(orgId, patient.id, setBudgets);
        const unsubPrescriptions = api.subscribePatientPrescriptions(orgId, patient.id, setPrescriptions);
        const unsubClinicalCards = api.subscribePatientClinicalCards(orgId, patient.id, setClinicalCards);
        const unsubAnamnesis = api.subscribePatientAnamnesis(orgId, patient.id, (records) => {
            setAnamnesisRecords(records);
            if (records.length > 0) {
                setAnamResponses(records[0].responses);
            }
        });
        const unsubFinance = api.subscribePatientFinance(orgId, patient.id, setFinances);
        const unsubHistory = api.subscribePatientHistory(orgId, patient.id, setPatientHistory);

        return () => {
            unsubBudgets();
            unsubPrescriptions();
            unsubClinicalCards();
            unsubAnamnesis();
            unsubFinance();
            unsubHistory();
        };
    }, [patient, currentUser]);

    // Calculate Age
    const patientAge = useMemo(() => {
        if (!patientInfo.birthDate) return null;
        const birth = new Date(patientInfo.birthDate);
        if (isNaN(birth.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }, [patientInfo.birthDate]);

    // Format registration date
    const formattedRegDate = useMemo(() => {
        const d = new Date(patientInfo.createdAt);
        return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    }, [patientInfo.createdAt]);

    // Handle Clinical Alert toggle
    const handleToggleAlert = async (alertName: string) => {
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        let updatedAlerts = [...selectedAlerts];
        if (updatedAlerts.includes(alertName)) {
            updatedAlerts = updatedAlerts.filter(a => a !== alertName);
        } else {
            updatedAlerts.push(alertName);
        }

        const updated = { ...patientInfo, clinicalAlerts: updatedAlerts };
        setPatientInfo(updated);
        await api.apiUpdatePatient(orgId, patient.id, { clinicalAlerts: updatedAlerts });
    };

    // Save Patient Info modifications (Sobre tab)
    const handleSaveSobre = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        setIsSaving(true);
        const u = { phone, email, cpf, birthDate, planName };
        await api.apiUpdatePatient(orgId, patient.id, u);
        setPatientInfo(prev => ({ ...prev, ...u }));
        setShowEditSobre(false);
        setIsSaving(false);
    };

    // Filter appointments for this patient
    const patientAppointments = useMemo(() => {
        return appointments.filter(a => a.patientId === patient.id)
                           .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments, patient.id]);

    // Schedule Quick Appointment inside patient chart
    const handleScheduleAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        setIsSaving(true);
        const dtStr = `${appDate}T${appTime}:00`;
        const appDt = new Date(dtStr);

        const newAppInfo: Appointment = {
            id: `app_${Date.now()}`,
            organizationId: orgId,
            dentistId: appDentistId || currentUser.id,
            patientId: patient.id,
            patientName: patient.name,
            date: appDt,
            durationMinutes: Number(appDuration),
            procedure: appProcedure || 'Consulta de Rotina',
            status: AppointmentStatus.SCHEDULED,
            notes: appNotes,
            roomId: appRoomId || undefined
        };

        await api.apiAddAppointment(orgId, newAppInfo);
        setIsSaving(false);
        setShowAddAppointment(false);
        // Clear fields
        setAppProcedure('');
        setAppNotes('');
    };

    // Finance Calculations
    const treatmentsCompleted = useMemo(() => {
        // Find completed appointments and retrieve service pricing automatically
        return patientAppointments
            .filter(a => a.status === AppointmentStatus.COMPLETED)
            .map(appt => {
                const service = clinicServices.find(s => s.name === appt.procedure);
                return {
                    id: appt.id,
                    description: `Procedimento: ${appt.procedure}`,
                    amount: service?.price || 0,
                    date: appt.date,
                    type: 'INCOME' as const,
                    status: 'PAID' as const
                };
            });
    }, [patientAppointments, clinicServices]);

    const patientFinanceSummary = useMemo(() => {
        let charged = 0;
        let paid = 0;

        // Auto-charged completed procedures
        treatmentsCompleted.forEach(t => {
            charged += t.amount;
            paid += t.amount; // Assume COMPLETED are processed/paid for clinic billing
        });

        // Manual finance records from subcollection
        finances.forEach(f => {
            if (f.type === 'INCOME') {
                charged += f.amount;
                if (f.status === 'PAID') {
                    paid += f.amount;
                }
            } else {
                charged -= f.amount; // Expenses reduce total charged or represent outlays
            }
        });

        return {
            totalCharged: charged,
            totalPaid: paid,
            debt: charged - paid
        };
    }, [treatmentsCompleted, finances]);

    // Add manual custom finance entry
    const handleAddFinanceEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        setIsSaving(true);
        const newFin: ClinicPatientFinance = {
            id: `fin_${Date.now()}`,
            patientId: patient.id,
            description: finDesc,
            amount: Number(finAmount),
            type: finType,
            status: finStatus,
            date: new Date(finDate),
            createdAt: new Date()
        };

        await api.apiAddPatientFinance(orgId, patient.id, newFin);
        setIsSaving(false);
        setShowAddFinance(false);
        setFinDesc('');
        setFinAmount(0);
    };

    // Budgets CRUD
    const handleAddBudgetItem = () => {
        if (!newBudItemDesc) return;
        setBudItems([...budItems, { description: newBudItemDesc, qty: 1, value: Number(newBudItemValue) }]);
        setNewBudItemDesc('');
        setNewBudItemValue(0);
    };

    const handleRemoveBudgetItem = (index: number) => {
        setBudItems(budItems.filter((_, i) => i !== index));
    };

    const handleSaveBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        setIsSaving(true);
        const total = budItems.reduce((acc, item) => acc + (item.value * item.qty), 0);

        const newBudget: ClinicBudget = {
            id: `bud_${Date.now()}`,
            patientId: patient.id,
            title: budTitle,
            amount: total,
            status: 'PENDING',
            date: new Date(),
            notes: budNotes,
            items: budItems,
            createdAt: new Date()
        };

        await api.apiAddPatientBudget(orgId, patient.id, newBudget);
        setIsSaving(false);
        setShowAddBudget(false);
        setBudTitle('');
        setBudNotes('');
        setBudItems([]);
    };

    const handleUpdateBudgetStatus = async (budgetId: string, newStatus: 'PENDING' | 'APPROVED' | 'REJECTED') => {
        const orgId = currentUser?.organizationId;
        if (!orgId) return;
        const target = budgets.find(b => b.id === budgetId);
        if (target) {
            await api.apiAddPatientBudget(orgId, patient.id, { ...target, status: newStatus });
        }
    };

    // Clinical Card (Fichas) CRUD
    const handleSaveClinicalCard = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        setIsSaving(true);
        const newCard: ClinicClinicalCard = {
            id: `card_${Date.now()}`,
            patientId: patient.id,
            title: cardTitle,
            date: new Date(),
            notes: cardNotes,
            toothNumber: cardTooth || undefined,
            dentistName: cardDentist || currentUser.name || 'Dentista',
            createdAt: new Date()
        };

        await api.apiAddPatientClinicalCard(orgId, patient.id, newCard);
        setIsSaving(false);
        setShowAddClinicalCard(false);
        setCardTitle('');
        setCardTooth('');
        setCardNotes('');
    };

    // Prescriptions CRUD
    const handleAddPrescriptionItem = () => {
        if (!newMedName) return;
        setPresItems([...presItems, { medication: newMedName, instructions: newMedInstructions }]);
        setNewMedName('');
        setNewMedInstructions('');
    };

    const handleRemovePrescriptionItem = (index: number) => {
        setPresItems(presItems.filter((_, i) => i !== index));
    };

    const handleSavePrescription = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        setIsSaving(true);
        const newPres: ClinicPrescription = {
            id: `pres_${Date.now()}`,
            patientId: patient.id,
            dentistName: presDentist || currentUser.name || 'Dentista',
            date: new Date(),
            items: presItems,
            notes: presNotes || undefined,
            createdAt: new Date()
        };

        await api.apiAddPatientPrescription(orgId, patient.id, newPres);
        setIsSaving(false);
        setShowAddPrescription(false);
        setPresDentist('');
        setPresNotes('');
        setPresItems([]);
    };

    const handleTriggerPrint = (prescription: ClinicPrescription) => {
        setPrintingPrescription(prescription);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    // Attachments Handling
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDropUpload = async (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await processUploadedFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await processUploadedFiles(e.target.files);
        }
    };

    const processUploadedFiles = async (files: FileList) => {
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        setIsUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const url = await uploadFile(file);
                
                // Track attachment in Patient History stream as standard
                const recordInfo = {
                    id: `rec_${Date.now()}_${i}`,
                    patientId: patient.id,
                    type: 'SCAN' as const, // Exames / Midias
                    description: `Arquivo de Prontuário Anexado: ${file.name}`,
                    date: new Date(),
                    attachments: [{
                        id: `att_${Date.now()}_${i}`,
                        name: file.name,
                        url,
                        uploadedAt: new Date()
                    }],
                    professionalId: currentUser.id,
                    professionalName: currentUser.name || 'Profissional',
                    createdAt: new Date()
                };
                await api.apiAddPatientHistory(orgId, patient.id, recordInfo);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    // Anamnesis Answers Saving & Smart Suggestion
    const handleSaveAnamnesis = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = currentUser?.organizationId;
        if (!orgId) return;

        setIsSaving(true);

        const newAnam: ClinicAnamnesis = {
            id: `anam_${patient.id}`, // Unique card per patient
            patientId: patient.id,
            updatedAt: new Date(),
            responses: anamResponses
        };

        // Smart alerts compiler: Suggest alerts instantly based on screening answers!
        const autoSuggestedAlerts = [...selectedAlerts];
        
        const mapTrigger = (questionVal: boolean | string, tag: string) => {
            const val = typeof questionVal === 'boolean' ? questionVal : questionVal?.toString().length > 0;
            if (val && !autoSuggestedAlerts.includes(tag)) {
                autoSuggestedAlerts.push(tag);
            } else if (!val && autoSuggestedAlerts.includes(tag)) {
                const index = autoSuggestedAlerts.indexOf(tag);
                if (index > -1) autoSuggestedAlerts.splice(index, 1);
            }
        };

        mapTrigger(anamResponses.hasAllergy, 'Alergia');
        mapTrigger(anamResponses.heartIssues, 'Hipertensão');
        mapTrigger(anamResponses.continuousMed, 'Medicação contínua');
        mapTrigger(anamResponses.isSmoker, 'Fumante');
        mapTrigger(anamResponses.isPregnant, 'Gestante');

        // Persist both records
        await api.apiSavePatientAnamnesis(orgId, patient.id, newAnam);
        await api.apiUpdatePatient(orgId, patient.id, { clinicalAlerts: autoSuggestedAlerts });
        
        // Match local model
        setPatientInfo(prev => ({ ...prev, clinicalAlerts: autoSuggestedAlerts }));

        setIsSaving(false);
        
        // Show success visual trigger
        const timerObj = document.getElementById('anam-success-indicator');
        if (timerObj) {
            timerObj.classList.remove('hidden');
            setTimeout(() => {
                timerObj.classList.add('hidden');
            }, 3000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 text-slate-800" id="patient-chart-modal">
            
            {/* PRINT WATERMARK PRESCRIPTION SCREEN */}
            {printingPrescription && (
                <div className="hidden print:block absolute inset-0 bg-white p-12 text-black font-sans print-prescription-wrapper">
                    <div className="text-center border-b pb-6 mb-8">
                        <h1 className="text-3xl font-black tracking-tight text-slate-800 uppercase">{currentOrg?.name || 'Clínica Sorriso'}</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{((currentOrg as any)?.address && typeof (currentOrg as any).address === 'object' ? (currentOrg as any).address?.city : (currentOrg as any)?.address) || ''} / CRM/CRO - Gestão Odontológica Completa</p>
                    </div>
                    <div className="mb-8 space-y-2">
                        <p className="font-bold text-lg">Prescrição Médica para: <span className="uppercase text-indigo-700">{patient.name}</span></p>
                        <p className="text-sm font-semibold">Data: {new Date(printingPrescription.date).toLocaleDateString()}</p>
                        <p className="text-sm font-semibold">Dentista Responsável: {printingPrescription.dentistName}</p>
                    </div>
                    <div className="border-t border-slate-100 pt-6 space-y-6">
                        <p className="font-black text-xs uppercase tracking-widest text-slate-400">Medicamentos e Instruções:</p>
                        {printingPrescription.items.map((item, index) => (
                            <div key={index} className="pl-4 border-l-4 border-indigo-600 space-y-1">
                                <p className="font-bold text-lg uppercase tracking-tight">{index + 1}. {item.medication}</p>
                                <p className="text-slate-600 text-sm italic font-medium leading-relaxed">{item.instructions}</p>
                            </div>
                        ))}
                    </div>
                    {printingPrescription.notes && (
                        <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <p className="text-xs font-black uppercase text-slate-400 mb-1">Observações:</p>
                            <p className="text-sm text-slate-700 font-medium">{printingPrescription.notes}</p>
                        </div>
                    )}
                    <div className="mt-36 text-center space-y-2 border-t pt-8">
                        <div className="w-64 h-[1px] bg-slate-300 mx-auto"></div>
                        <p className="font-bold text-sm uppercase">{printingPrescription.dentistName}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Assinatura do Profissional</p>
                    </div>
                </div>
            )}

            {/* MODAL MAIN CONTENT CARD */}
            <motion.div 
                initial={{ transform: 'scale(0.95)', opacity: 0 }}
                animate={{ transform: 'scale(1)', opacity: 1 }}
                exit={{ transform: 'scale(0.95)', opacity: 0 }}
                className="bg-slate-50 w-full sm:max-w-6xl h-full sm:h-[90vh] sm:rounded-[36px] flex flex-col shadow-2xl relative border border-slate-100 overflow-hidden print:hidden"
            >
                {/* HEADER AREA */}
                <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 h-14 bg-teal-500 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-teal-100 shrink-0">
                            {patientInfo.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase truncate">{patientInfo.name}</h2>
                                <div className="flex items-center gap-1">
                                    {!isLimited && selectedAlerts.slice(0, 3).map((al, idx) => {
                                        const found = predefinedAlerts.find(p => p.name === al);
                                        return (
                                            <span 
                                                key={idx} 
                                                className={`px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase border shrink-0 ${found ? found.color : 'bg-slate-100 text-slate-500'}`}
                                            >
                                                {al}
                                            </span>
                                        );
                                    })}
                                    {!isLimited && selectedAlerts.length > 3 && (
                                        <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase bg-slate-100 text-slate-500 shrink-0">
                                            +{selectedAlerts.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 font-bold mt-1">
                                {patientAge ? `${patientAge} anos` : 'Idade não informada'} · Paciente desde {formattedRegDate}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                        <button 
                            onClick={onClose}
                            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all active:scale-95"
                            id="close-chart-btn"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* HORIZONTAL TABS SYSTEM */}
                <div className="bg-white border-b border-slate-100 overflow-x-auto scrollbar-none flex gap-1 shrink-0 px-4 md:px-8">
                    {(isLimited ? (['SOBRE', 'PROTESES'] as const) : (['SOBRE', 'CONSULTAS', 'FINANCEIRO', 'ORCAMENTOS', 'FICHAS', 'ANEXOS', 'PRESCRICOES', 'ANAMNESE', 'PROTESES'] as const)).map((tab: TabType) => {
                        const labels: { [key: string]: string } = {
                            SOBRE: 'Sobre',
                            CONSULTAS: 'Consultas',
                            FINANCEIRO: 'Financeiro',
                            ORCAMENTOS: 'Orçamentos',
                            FICHAS: 'Fichas Clínicas',
                            ANEXOS: 'Anexos',
                            PRESCRICOES: 'Prescrições',
                            ANAMNESE: 'Anamnese',
                            PROTESES: 'Histórico de Próteses'
                        };
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-4 font-black text-xs uppercase tracking-wider relative transition-colors shrink-0 ${
                                    isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                                id={`tab-${tab.toLowerCase()}`}
                            >
                                {labels[tab]}
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeChartTabBorder" 
                                        className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" 
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* MODAL MAIN CONTENT PANEL */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    <AnimatePresence mode="wait">
                        
                        {/* TAB: SOBRE PANEL */}
                        {activeTab === 'SOBRE' && (
                            <motion.div key="sobre" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className={`grid grid-cols-1 ${isLimited ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
                                    
                                    {/* DADOS CADASTRAIS CARD */}
                                    <div className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><User size={18}/> Ficha Cadastral</h3>
                                            <button 
                                                onClick={() => setShowEditSobre(!showEditSobre)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                                title="Editar cadastro"
                                            >
                                                <Edit2 size={16}/>
                                            </button>
                                        </div>

                                        {!showEditSobre ? (
                                            <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                                <div><p className="text-[10px] text-slate-400 uppercase font-black mb-1">CPF</p><p className="text-slate-800">{patientInfo.cpf || 'Não informado'}</p></div>
                                                <div><p className="text-[10px] text-slate-400 uppercase font-black mb-1">Telefone</p><p className="text-slate-800">{patientInfo.phone}</p></div>
                                                <div><p className="text-[10px] text-slate-400 uppercase font-black mb-1">Email</p><p className="text-slate-800 truncate">{patientInfo.email || 'Não informado'}</p></div>
                                                <div><p className="text-[10px] text-slate-400 uppercase font-black mb-1">Plano Clínico</p><p className="text-slate-800">{patientInfo.planName || 'Particular'}</p></div>
                                                <div><p className="text-[10px] text-slate-400 uppercase font-black mb-1">Data de Nascimento</p><p className="text-slate-800">{patientInfo.birthDate ? new Date(patientInfo.birthDate).toLocaleDateString() : 'Não informado'}</p></div>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleSaveSobre} className="space-y-4 font-bold text-xs">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 uppercase mb-1 block">Telefone</label>
                                                        <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 uppercase mb-1 block">CPF</label>
                                                        <input value={cpf} onChange={e => setCpf(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 uppercase mb-1 block">Nascimento</label>
                                                        <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 uppercase mb-1 block">Plano</label>
                                                        <input value={planName} onChange={e => setPlanName(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 uppercase mb-1 block">Email</label>
                                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                                </div>
                                                <div className="flex gap-2 justify-end pt-2">
                                                    <button type="button" onClick={() => setShowEditSobre(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancelar</button>
                                                    <button type="submit" disabled={isSaving} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1">
                                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12}/>} Salvar
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                    {/* ALERTA CLINICO AUTOMATICO CARD */}
                                    {!isLimited && (
                                        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-100 shadow-sm space-y-6">
                                            <div>
                                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><AlertTriangle className="text-amber-500" size={18}/> Alertas Clínicos Automáticos</h3>
                                                <p className="text-slate-400 text-xs font-bold mt-1">Marque ou desmarque comorbidades e alertas críticos para esse paciente, ou adicione outros detalhes personalizados (alergias, comorbidades).</p>
                                            </div>

                                            <div className="flex flex-wrap gap-2.5">
                                                {predefinedAlerts.map(alert => {
                                                    const isAttached = selectedAlerts.includes(alert.name);
                                                    return (
                                                        <button
                                                            key={alert.name}
                                                            onClick={() => handleToggleAlert(alert.name)}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                                                isAttached 
                                                                ? alert.color + ' border-transparent shadow-sm'
                                                                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            {isAttached ? <Check size={12}/> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>}
                                                            {alert.name}
                                                        </button>
                                                    );
                                                })}
                                                {selectedAlerts.filter(a => !predefinedAlerts.some(p => p.name === a)).map(customAlert => (
                                                    <button
                                                        key={customAlert}
                                                        onClick={() => handleToggleAlert(customAlert)}
                                                        className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 bg-red-50 text-red-600 border-transparent shadow-sm"
                                                        title="Clique para remover este alerta"
                                                    >
                                                        <Check size={12}/>
                                                        {customAlert}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="border-t border-slate-100 pt-4 space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Adicionar Detalhe Personalizado</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ex: Alergia a Dipirona, Diabetes Tipo 1..." 
                                                        id="new-custom-alert-input"
                                                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-2 focus:ring-indigo-500"
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const target = e.currentTarget;
                                                                const val = target.value.trim();
                                                                if (val) {
                                                                    await handleToggleAlert(val);
                                                                    target.value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={async () => {
                                                            const input = document.getElementById('new-custom-alert-input') as HTMLInputElement;
                                                            const val = input?.value.trim();
                                                            if (val) {
                                                                await handleToggleAlert(val);
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="px-4 py-2 hover:bg-slate-800 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl transition shrink-0"
                                                    >
                                                        Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: CONSULTAS PANEL */}
                        {activeTab === 'CONSULTAS' && (
                            <motion.div key="consultas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Calendar size={18}/> Agendamento do Paciente</h3>
                                    <button 
                                        onClick={() => setShowAddAppointment(!showAddAppointment)}
                                        className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl flex items-center gap-1 hover:bg-indigo-700 transition"
                                    >
                                        <Plus size={14}/> AGENDAR CONSULTA
                                    </button>
                                </div>

                                {showAddAppointment && (
                                    <form onSubmit={handleScheduleAppointment} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Dentista</label>
                                            <select required value={appDentistId} onChange={e => setAppDentistId(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg">
                                                <option value="">Selecione o Profissional</option>
                                                {clinicDentists.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Procedimento</label>
                                            <select required value={appProcedure} onChange={e => setAppProcedure(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg">
                                                <option value="">Selecione o Procedimento</option>
                                                {clinicServices.map(s => <option key={s.id} value={s.name}>{s.name} - R$ {s.price}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Data da Consulta</label>
                                            <input type="date" value={appDate} onChange={e => setAppDate(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Horário</label>
                                            <input type="time" value={appTime} onChange={e => setAppTime(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Observações do Agendamento</label>
                                            <input value={appNotes} onChange={e => setAppNotes(e.target.value)} placeholder="Detalhes de queixa, reconsulta..." className="w-full p-2.5 bg-slate-50 border rounded-lg" />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <button type="submit" disabled={isSaving} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-xs tracking-wider uppercase">
                                                {isSaving ? 'Agendando...' : 'Confirmar'}
                                            </button>
                                            <button type="button" onClick={() => setShowAddAppointment(false)} className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg">Cancelar</button>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-3">
                                    {patientAppointments.map(appt => (
                                        <div key={appt.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-100 transition shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                                    <Calendar size={20}/>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-sm uppercase">{appt.procedure}</h4>
                                                    <p className="text-slate-400 font-bold text-xs mt-1">
                                                        Dentista: {clinicDentists.find(d => d.id === appt.dentistId)?.name || 'Profissional'}
                                                    </p>
                                                    {appt.notes && <p className="text-slate-500 font-medium text-xs mt-2 italic bg-slate-50 inline-block px-3 py-1 rounded-lg">Nota: {appt.notes}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 font-bold text-xs self-stretch md:self-auto justify-between border-t border-slate-50 pt-3 md:pt-0 md:border-0">
                                                <div className="text-right">
                                                    <p className="text-slate-800 font-black">{new Date(appt.date).toLocaleDateString()}</p>
                                                    <p className="text-slate-400 font-bold text-[10px] mt-0.5">{new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                                <select 
                                                    value={appt.status} 
                                                    onChange={async (e) => {
                                                        if (updateAppointment) {
                                                            await updateAppointment(appt.id, { status: e.target.value as AppointmentStatus });
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer border transition-all ${
                                                        appt.status === AppointmentStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        appt.status === AppointmentStatus.SCHEDULED ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                        appt.status === AppointmentStatus.CONFIRMED ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}
                                                >
                                                    <option value={AppointmentStatus.SCHEDULED}>Agendado</option>
                                                    <option value={AppointmentStatus.CONFIRMED}>Confirmado</option>
                                                    <option value={AppointmentStatus.COMPLETED}>Concluído (Fatura)</option>
                                                    <option value={AppointmentStatus.CANCELED}>Cancelado</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}

                                    {patientAppointments.length === 0 && (
                                        <div className="py-12 bg-white text-center text-slate-400 italic rounded-2xl border border-dashed border-slate-200">
                                            Nenhuma consulta registrada para este paciente.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: FINANCEIRO PANEL */}
                        {activeTab === 'FINANCEIRO' && (
                            <motion.div key="financeiro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                
                                {/* SUMMARY PANEL */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cobrado (Cargas)</p>
                                            <p className="text-2xl font-black text-slate-900 mt-1">R$ {patientFinanceSummary.totalCharged.toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><DollarSign size={24}/></div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pago (Quitado)</p>
                                            <p className="text-2xl font-black text-emerald-600 mt-1">R$ {patientFinanceSummary.totalPaid.toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Check size={24}/></div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor / Aberto</p>
                                            <p className={`text-2xl font-black mt-1 ${patientFinanceSummary.debt > 0 ? 'text-red-500' : 'text-slate-400'}`}>R$ {patientFinanceSummary.debt.toLocaleString()}</p>
                                        </div>
                                        <div className={`p-3 rounded-xl ${patientFinanceSummary.debt > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                                            <Clock size={24}/>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><DollarSign size={18}/> Transações Financeiras</h3>
                                    <button 
                                        onClick={() => setShowAddFinance(!showAddFinance)}
                                        className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl flex items-center gap-1 hover:bg-indigo-700 transition"
                                    >
                                        <Plus size={14}/> REGISTRAR LANCE
                                    </button>
                                </div>

                                {showAddFinance && (
                                    <form onSubmit={handleAddFinanceEntry} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Descrição da Transação</label>
                                            <input required value={finDesc} onChange={e => setFinDesc(e.target.value)} placeholder="Ex: Entrada Implante Prótese" className="w-full p-2 bg-slate-50 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Valor (R$)</label>
                                            <input type="number" required value={finAmount} onChange={e => setFinAmount(Number(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Tipo</label>
                                            <select value={finType} onChange={e => setFinType(e.target.value as any)} className="w-full p-2 bg-slate-50 border rounded-lg">
                                                <option value="INCOME">Receita / Crédito (Paciente Paga)</option>
                                                <option value="EXPENSE">Despesa / Ajuste (Reembolso, etc)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Método / Status</label>
                                            <select value={finStatus} onChange={e => setFinStatus(e.target.value as any)} className="w-full p-2 bg-slate-50 border rounded-lg">
                                                <option value="PENDING">Pendente</option>
                                                <option value="PAID">Pago (Liquidado)</option>
                                                <option value="OVERDUE">Atrasado</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Data</label>
                                            <input type="date" value={finDate} onChange={e => setFinDate(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" id="fin-input-date" />
                                        </div>
                                        <div className="flex items-end gap-2 md:col-span-2">
                                            <button type="submit" disabled={isSaving} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-xs tracking-wider uppercase">
                                                {isSaving ? 'Registrando...' : 'Salvar Transação'}
                                            </button>
                                            <button type="button" onClick={() => setShowAddFinance(false)} className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg">Cancelar</button>
                                        </div>
                                    </form>
                                )}

                                {/* LIST TRANSACTIONS */}
                                <div className="space-y-3 font-semibold text-xs">
                                    
                                    {/* Procedimentos Realizados Autos */}
                                    {treatmentsCompleted.map(tc => (
                                        <div key={tc.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center hover:bg-slate-50/20 transition">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">✓</div>
                                                <div>
                                                    <p className="font-bold text-slate-800 uppercase text-xs">{tc.description}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Automático (Consulta Concluída)</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-emerald-600">+ R$ {tc.amount.toLocaleString()}</p>
                                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">{new Date(tc.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Manual Entries subcollection */}
                                    {finances.map(f => (
                                        <div key={f.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center hover:bg-slate-50/20 transition relative group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                                    f.type === 'INCOME' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {f.type === 'INCOME' ? '↓' : '↑'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 uppercase text-xs">{f.description}</p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase mt-0.5 inline-block ${
                                                        f.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                        f.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-red-50 text-red-500 border border-red-100'
                                                    }`}>
                                                        {f.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <p className={`font-black ${f.type === 'INCOME' ? 'text-indigo-600' : 'text-red-500'}`}>
                                                        {f.type === 'INCOME' ? '+' : '-'} R$ {f.amount.toLocaleString()}
                                                    </p>
                                                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{new Date(f.date).toLocaleDateString()}</p>
                                                </div>
                                                <button 
                                                    onClick={() => currentUser?.organizationId && api.apiDeletePatientFinance(currentUser.organizationId, patient.id, f.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition rounded-lg"
                                                    title="Excluir lançamento"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {treatmentsCompleted.length === 0 && finances.length === 0 && (
                                        <div className="py-12 bg-white text-center text-slate-400 italic rounded-2xl border border-dashed border-slate-200">
                                            Nenhum lançamento financeiro registrado.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: ORCAMENTOS PANEL */}
                        {activeTab === 'ORCAMENTOS' && (
                            <motion.div key="orçamentos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><FileSpreadsheet size={18}/> Orçamentos Odontológicos</h3>
                                    <button 
                                        onClick={() => setShowAddBudget(!showAddBudget)}
                                        className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl flex items-center gap-1 hover:bg-indigo-700 transition"
                                    >
                                        <Plus size={14}/> NOVO ORÇAMENTO
                                    </button>
                                </div>

                                {showAddBudget && (
                                    <form onSubmit={handleSaveBudget} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-4 text-xs font-bold">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase mb-1 block">Título do Orçamento</label>
                                                <input required value={budTitle} onChange={e => setBudTitle(e.target.value)} placeholder="Ex: Placa Clareamento + Facetas Resina" className="w-full p-2.5 bg-slate-50 border rounded-lg" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase mb-1 block">Observações do Plano de Tratamento</label>
                                                <input value={budNotes} onChange={e => setBudNotes(e.target.value)} placeholder="Ex: Dividir até 10x sem juros no cartão de crédito" className="w-full p-2.5 bg-slate-50 border rounded-lg" />
                                            </div>
                                        </div>

                                        {/* Dynamic Budget Items List */}
                                        <div className="border border-slate-100 p-4 rounded-xl space-y-3 bg-slate-50/50">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Procedimentos do Orçamento</p>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <select value={newBudItemDesc} onChange={e => setNewBudItemDesc(e.target.value)} className="p-2 bg-white border rounded-lg text-xs">
                                                    <option value="">Selecione o Procedimento</option>
                                                    {clinicServices.map(s => <option key={s.id} value={s.name}>{s.name} (R$ {s.price})</option>)}
                                                    <option value="CUSTOM">Outro serviço (Manual)...</option>
                                                </select>
                                                {newBudItemDesc === 'CUSTOM' ? (
                                                    <input placeholder="Digite o procedimento" onChange={e => setNewBudItemDesc(e.target.value)} className="p-2 bg-white border rounded-lg text-xs" />
                                                ) : null}
                                                <input type="number" placeholder="Valor (R$)" value={newBudItemValue} onChange={e => setNewBudItemValue(Number(e.target.value))} className="p-2 bg-white border rounded-lg text-xs" />
                                                <button type="button" onClick={handleAddBudgetItem} className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs">Adicionar Item</button>
                                            </div>

                                            <div className="space-y-2 mt-4 text-xs">
                                                {budItems.map((item, index) => (
                                                    <div key={index} className="flex justify-between items-center p-2 bg-white rounded-lg border border-slate-100">
                                                        <span>{item.description}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-slate-800">R$ {item.value.toLocaleString()}</span>
                                                            <button type="button" onClick={() => handleRemoveBudgetItem(index)} className="text-red-500 hover:bg-red-50 p-1 rounded-md">Excluir</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 justify-end pt-2">
                                            <button type="button" onClick={() => setShowAddBudget(false)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg">Cancelar</button>
                                            <button type="submit" disabled={isSaving || budItems.length === 0} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg uppercase tracking-wider">
                                                {isSaving ? 'Gerando...' : 'Salvar Orçamento'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* BUDGETS LIST */}
                                <div className="space-y-4">
                                    {budgets.map(bud => (
                                        <div key={bud.id} className="p-5 bg-white border border-slate-100 rounded-2xl space-y-4 hover:border-indigo-100 transition shadow-sm relative group">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-sm uppercase">{bud.title}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Gerado em: {new Date(bud.date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select 
                                                        value={bud.status} 
                                                        onChange={e => handleUpdateBudgetStatus(bud.id, e.target.value as any)}
                                                        className={`p-1 border text-[10px] font-black rounded-lg uppercase bg-slate-50`}
                                                    >
                                                        <option value="PENDING">🕒 Pendente</option>
                                                        <option value="APPROVED">🟢 Aprovado</option>
                                                        <option value="REJECTED">🔴 Rejeitado</option>
                                                    </select>
                                                    <button 
                                                        onClick={() => currentUser?.organizationId && api.apiDeletePatientBudget(currentUser.organizationId, patient.id, bud.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition rounded-lg"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            </div>

                                            {bud.items && bud.items.length > 0 && (
                                                <div className="bg-slate-50/50 p-4 rounded-xl text-xs space-y-2">
                                                    {bud.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between font-medium text-slate-600">
                                                            <span>• {item.description}</span>
                                                            <span className="font-bold">R$ {item.value.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                    <div className="border-t pt-2 mt-2 flex justify-between font-black text-indigo-700">
                                                        <span>TOTAL ESTIMADO:</span>
                                                        <span>R$ {bud.amount.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {bud.notes && <p className="text-slate-500 font-bold text-[10px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100/50">Condições: {bud.notes}</p>}
                                        </div>
                                    ))}

                                    {budgets.length === 0 && (
                                        <div className="py-12 bg-white text-center text-slate-400 italic rounded-2xl border border-dashed border-slate-200">
                                            Nenhum orçamento clínico emitido.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: FICHAS CLINICAS PANEL */}
                        {activeTab === 'FICHAS' && (
                            <motion.div key="fichas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Notebook size={18}/> Evolução Clínica e Prontuários</h3>
                                    <button 
                                        onClick={() => setShowAddClinicalCard(!showAddClinicalCard)}
                                        className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl flex items-center gap-1 hover:bg-indigo-700 transition"
                                    >
                                        <Plus size={14}/> ADICIONAR REGISTRO
                                    </button>
                                </div>

                                {showAddClinicalCard && (
                                    <form onSubmit={handleSaveClinicalCard} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-4 text-xs font-bold">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase mb-1 block">Título do Procedimento</label>
                                                <input required value={cardTitle} onChange={e => setCardTitle(e.target.value)} placeholder="Ex: Raspagem Supra, Restauração Resina" className="w-full p-2 bg-slate-50 border rounded-lg" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase mb-1 block">Elemento / Dente (opcional)</label>
                                                <input value={cardTooth} onChange={e => setCardTooth(e.target.value)} placeholder="Ex: dente 16, bochecha lateral" className="w-full p-2 bg-slate-50 border rounded-lg" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase mb-1 block">Dentista Responsável</label>
                                                <input required value={cardDentist} onChange={e => setCardDentist(e.target.value)} placeholder={currentUser?.name || ''} className="w-full p-2 bg-slate-50 border rounded-lg" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Evolução Clínica / Anotações do Conduta</label>
                                            <textarea required rows={4} value={cardNotes} onChange={e => setCardNotes(e.target.value)} placeholder="Descreva os achados, procedimento realizado, reações ou conduta para o paciente..." className="w-full p-3 bg-slate-50 border rounded-lg font-medium resize-none" />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setShowAddClinicalCard(false)} className="px-3 py-2 bg-slate-100 text-slate-500 rounded-lg">Cancelar</button>
                                            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg">
                                                {isSaving ? 'Registrando...' : 'Confirmar Ficha'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-4 relative before:absolute before:left-7 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                                    {clinicalCards.map(card => (
                                        <div key={card.id} className="flex gap-4 relative animate-in fade-in duration-200">
                                            <div className="w-14 h-14 bg-indigo-50 border-4 border-white text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm z-10">
                                                <Notebook size={20}/>
                                            </div>
                                            <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition relative group">
                                                <div className="flex justify-between items-start mb-3 border-b pb-3 border-slate-50">
                                                    <div>
                                                        <h4 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                                                            {card.title}
                                                            {card.toothNumber && (
                                                                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-[6px] text-[8px] font-black uppercase">
                                                                    Dente: {card.toothNumber}
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Por: {card.dentistName}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs font-black text-slate-700">{new Date(card.date).toLocaleDateString()}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">{new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{card.notes}</p>
                                                
                                                <button 
                                                    onClick={() => currentUser?.organizationId && api.apiDeletePatientClinicalCard(currentUser.organizationId, patient.id, card.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 absolute top-4 right-4 transition"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {clinicalCards.length === 0 && (
                                        <div className="py-12 bg-white text-center text-slate-400 italic rounded-2xl border border-dashed border-slate-200 ml-11">
                                            Nenhum histórico dental cadastrado.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: ANEXOS PANEL */}
                        {activeTab === 'ANEXOS' && (
                            <motion.div key="anexos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Camera size={18}/> Radiografias, Exames e Escaneamento 3D</h3>
                                
                                <div 
                                    onDragOver={handleDragOver}
                                    onDrop={handleDropUpload}
                                    className="border-2 border-dashed border-slate-300 bg-white hover:bg-slate-50 rounded-2xl py-12 px-6 text-center cursor-pointer relative group transition"
                                >
                                    <input type="file" multiple id="modal-patient-files" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-indigo-600 transition">
                                        {isUploading ? (
                                            <Loader2 size={36} className="animate-spin text-indigo-600" />
                                        ) : (
                                            <UploadCloud size={36} />
                                        )}
                                        <p className="font-bold text-sm uppercase">Arraste ou Clique para subir arquivos</p>
                                        <p className="text-xs text-slate-400">Radiografias (.jpg, .png), PDF de exames, ou arquivos STL de escaneamento dental.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                                    {patientHistory.flatMap(h => h.attachments || []).map((att, index) => (
                                        <a 
                                            key={index} 
                                            href={att.url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="bg-white p-4 rounded-xl border border-slate-100 hover:border-indigo-200 transition shadow-sm hover:shadow flex flex-col items-center gap-2 text-center group text-xs font-bold"
                                        >
                                            {att.name.match(/\.(jpg|jpeg|png)$/i) ? (
                                                <img src={att.url} alt={att.name} className="w-full h-24 object-cover rounded-lg" referrerPolicy="no-referrer" />
                                            ) : att.name.toLowerCase().endsWith('.stl') ? (
                                                <div className="w-full h-24 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                    <Box size={28}/>
                                                </div>
                                            ) : (
                                                <div className="w-full h-24 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center">
                                                    <FileText size={28}/>
                                                </div>
                                            )}
                                            <span className="truncate w-full block text-slate-800 uppercase text-[9px] font-black mt-2">{att.name}</span>
                                            <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                                                <Download size={12}/>
                                                <span className="text-[10px]">Baixar</span>
                                            </div>
                                        </a>
                                    ))}

                                    {patientHistory.flatMap(h => h.attachments || []).length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-400 italic">
                                            Nenhum documento anexado.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: PRESCRICOES PANEL */}
                        {activeTab === 'PRESCRICOES' && (
                            <motion.div key="prescrições" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Printer size={18}/> Emissão de Receitas / Prescrições</h3>
                                    <button 
                                        onClick={() => setShowAddPrescription(!showAddPrescription)}
                                        className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl flex items-center gap-1 hover:bg-indigo-700 transition"
                                    >
                                        <Plus size={14}/> NOVA RECEITA
                                    </button>
                                </div>

                                {showAddPrescription && (
                                    <form onSubmit={handleSavePrescription} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-4 text-xs font-bold">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase mb-1 block">Profissional Prescritor</label>
                                                <input required value={presDentist} onChange={e => setPresDentist(e.target.value)} placeholder="Ex: Dr. Leonardo Oliveira" className="w-full p-2.5 bg-slate-50 border rounded-lg" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase mb-1 block">Observações de Administração (opcional)</label>
                                                <input value={presNotes} onChange={e => setPresNotes(e.target.value)} placeholder="Ex: Evitar ingerir bebida alcoólica durante tratamento" className="w-full p-2.5 bg-slate-50 border rounded-lg" />
                                            </div>
                                        </div>

                                        {/* Medication items editor */}
                                        <div className="border border-slate-100 p-4 rounded-xl space-y-3 bg-slate-50/50">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Adicionar Medicamentos</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input placeholder="Nome do Remédio (Ex: Amoxicilina 500mg)" value={newMedName} onChange={e => setNewMedName(e.target.value)} className="p-2 bg-white border rounded-lg" />
                                                <input placeholder="Instruções de Posologia (Ex: Tomar de 8 em 8 horas por 7 dias)" value={newMedInstructions} onChange={e => setNewMedInstructions(e.target.value)} className="p-2 bg-white border rounded-lg" />
                                            </div>
                                            <button type="button" onClick={handleAddPrescriptionItem} className="w-full py-2 bg-indigo-600 text-white font-black rounded-lg text-xs tracking-wider uppercase">Inserir Remedio à Lista</button>
                                            
                                            <div className="space-y-2 mt-4 text-xs font-bold">
                                                {presItems.map((med, index) => (
                                                    <div key={index} className="flex justify-between items-start p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                        <div>
                                                            <p className="text-slate-800 uppercase font-black">{med.medication}</p>
                                                            <p className="text-slate-500 font-medium text-[10px] italic mt-0.5">{med.instructions}</p>
                                                        </div>
                                                        <button type="button" onClick={() => handleRemovePrescriptionItem(index)} className="text-red-500 bg-red-50 px-2 py-1 rounded-md hover:bg-red-100">Remover</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 justify-end pt-2">
                                            <button type="button" onClick={() => setShowAddPrescription(false)} className="px-3 py-2 bg-slate-100 text-slate-500 rounded-lg">Cancelar</button>
                                            <button type="submit" disabled={isSaving || presItems.length === 0} className="px-5 py-2 bg-indigo-600 text-white rounded-lg">
                                                {isSaving ? 'Registrando...' : 'Emitir Prescrição'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-3">
                                    {prescriptions.map(pres => (
                                        <div key={pres.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-100 transition shadow-sm relative group">
                                            <div>
                                                <h4 className="font-black text-slate-800 text-sm uppercase">Prescrição Odontológica</h4>
                                                <p className="text-xs text-slate-400 font-bold mt-1">Sugerido por: {pres.dentistName} · Emitido em: {new Date(pres.date).toLocaleDateString()}</p>
                                                
                                                <div className="mt-3 pl-4 border-l-2 border-indigo-100 space-y-1.5 text-xs text-slate-600 font-medium">
                                                    {pres.items.map((it, idx) => (
                                                        <p key={idx}><span className="font-black text-slate-800">{it.medication}</span> - {it.instructions}</p>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0 self-stretch md:self-auto justify-end">
                                                <button 
                                                    onClick={() => handleTriggerPrint(pres)}
                                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold text-xs flex items-center gap-1 border border-indigo-100 transition"
                                                >
                                                    <Printer size={14}/> Imprimir
                                                </button>
                                                <button 
                                                    onClick={() => currentUser?.organizationId && api.apiDeletePatientPrescription(currentUser.organizationId, patient.id, pres.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition rounded-lg border border-transparent hover:bg-slate-50"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {prescriptions.length === 0 && (
                                        <div className="py-12 bg-white text-center text-slate-400 italic rounded-2xl border border-dashed border-slate-200">
                                            Nenhuma prescrição gerada recentemente.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: ANAMNESE PANEL */}
                        {activeTab === 'ANAMNESE' && (
                            <motion.div key="anamnese" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                <form onSubmit={handleSaveAnamnesis} className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-100 shadow-sm space-y-6 text-xs font-bold leading-none">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-50 leading-tight">
                                        <div>
                                            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Notebook size={18}/> Ficha de Triagem de Anamnese</h3>
                                            <p className="text-slate-400 text-xs font-bold mt-1">Questionário médico do estado de saúde geral do paciente. Alertas clínicos se ajustarão automaticamente.</p>
                                        </div>
                                        <div id="anam-success-indicator" className="hidden px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-center flex items-center gap-1 shadow-sm shrink-0 border border-emerald-100">
                                            <Check size={14}/> Salvo com Sucesso
                                        </div>
                                    </div>

                                    {/* Questions block */}
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/50 transition">
                                            <label className="text-slate-700 font-bold leading-relaxed pr-4">1. O paciente está sob tratamento médico atualmente?</label>
                                            <input 
                                                type="checkbox" 
                                                checked={!!anamResponses.underTreatment} 
                                                onChange={e => setAnamResponses({ ...anamResponses, underTreatment: e.target.checked })} 
                                                className="w-5 h-5 text-indigo-600 rounded bg-slate-100 border-slate-300"
                                            />
                                        </div>
                                        <div className="p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/50 transition space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-slate-700 font-bold leading-relaxed pr-4">2. Possui alergia grave a alguma medicação (Penicilina, iodo, anestésico)?</label>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!anamResponses.hasAllergy} 
                                                    onChange={e => setAnamResponses({ ...anamResponses, hasAllergy: e.target.checked })} 
                                                    className="w-5 h-5 text-indigo-600 rounded bg-slate-100 border-slate-300"
                                                />
                                            </div>
                                            {anamResponses.hasAllergy && (
                                                <input 
                                                    placeholder="Descreva as medicações causadoras de alergias..."
                                                    value={anamResponses.allergyDetails as string || ''}
                                                    onChange={e => setAnamResponses({ ...anamResponses, allergyDetails: e.target.value })}
                                                    className="w-full p-2 bg-white border rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                                />
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/50 transition">
                                            <label className="text-slate-700 font-bold leading-relaxed pr-4">3. Já teve problemas cardíacos severos, sopro, angina ou pressão alta (Hipertensão)?</label>
                                            <input 
                                                type="checkbox" 
                                                checked={!!anamResponses.heartIssues} 
                                                onChange={e => setAnamResponses({ ...anamResponses, heartIssues: e.target.checked })} 
                                                className="w-5 h-5 text-indigo-600 rounded bg-slate-100 border-slate-300"
                                            />
                                        </div>
                                        <div className="p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/50 transition space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-slate-700 font-bold leading-relaxed pr-4">4. Faz uso contínuo de algum medicamento controlado ou anticoagulantes?</label>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!anamResponses.continuousMed} 
                                                    onChange={e => setAnamResponses({ ...anamResponses, continuousMed: e.target.checked })} 
                                                    className="w-5 h-5 text-indigo-600 rounded bg-slate-100 border-slate-300"
                                                />
                                            </div>
                                            {anamResponses.continuousMed && (
                                                <input 
                                                    placeholder="Descreva as medicações de uso contínuo e dosagem..."
                                                    value={anamResponses.medDetails as string || ''}
                                                    onChange={e => setAnamResponses({ ...anamResponses, medDetails: e.target.value })}
                                                    className="w-full p-2 bg-white border rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                                />
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/50 transition">
                                            <label className="text-slate-700 font-bold leading-relaxed pr-4">5. É fumante ativo de cigarros ou vapes?</label>
                                            <input 
                                                type="checkbox" 
                                                checked={!!anamResponses.isSmoker} 
                                                onChange={e => setAnamResponses({ ...anamResponses, isSmoker: e.target.checked })} 
                                                className="w-5 h-5 text-indigo-600 rounded bg-slate-100 border-slate-300"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/50 transition">
                                            <label className="text-slate-700 font-bold leading-relaxed pr-4">6. Está em período de gestação ativa (se aplicável)?</label>
                                            <input 
                                                type="checkbox" 
                                                checked={!!anamResponses.isPregnant} 
                                                onChange={e => setAnamResponses({ ...anamResponses, isPregnant: e.target.checked })} 
                                                className="w-5 h-5 text-indigo-600 rounded bg-slate-100 border-slate-300"
                                            />
                                        </div>
                                        <div className="space-y-1 block mt-2">
                                            <label className="text-[10px] text-slate-400 uppercase font-black">7. Outras Condições Clínicas / Cirurgias Recentes para observação</label>
                                            <textarea 
                                                rows={3} 
                                                value={anamResponses.otherConditions as string || ''} 
                                                onChange={e => setAnamResponses({ ...anamResponses, otherConditions: e.target.value })} 
                                                className="w-full p-3 bg-slate-50 border rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 resize-none" 
                                                placeholder="Descreva asfixia, asma, cirurgia gástrica, implantes metálicos..."
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isSaving} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2">
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
                                        {isSaving ? 'PROCESSANDO...' : 'SALVAR FICHA DE ANAMNESE E AUTODETECTAR ALERTAS'}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* TAB: PROTESES PANEL */}
                        {activeTab === 'PROTESES' && (
                            <motion.div key="proteses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                        <Sparkles size={18}/> Histórico de Próteses e Serviços Laboratoriais
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    {patientHistory.filter(h => h.type === 'PROSTHESIS').map((record) => (
                                        <div key={record.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition relative group">
                                            <div className="flex justify-between items-start mb-3 border-b pb-3 border-slate-50">
                                                <div>
                                                    <h4 className="font-black text-indigo-700 text-sm uppercase flex items-center gap-1.5">
                                                        <ShieldCheck size={16} className="text-indigo-600" />
                                                        Serviço de Prótese Realizado
                                                    </h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                        Laboratório: <span className="text-slate-700 font-black">{record.labName || 'Laboratório Clínico'}</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                        Dentista Solicitante: <span className="text-slate-700 font-black">{record.professionalName || 'Clínica Dentária'}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-black text-slate-700">{new Date(record.date).toLocaleDateString()}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">Sem Custos ao Paciente</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Especificações do Caso</p>
                                                    <p className="text-xs text-slate-700 font-bold capitalize">{record.specs || record.description}</p>
                                                </div>
                                                
                                                {record.attachments && record.attachments.length > 0 && (
                                                    <div className="pt-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Arquivos Enviados (STL / Imagens)</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {record.attachments.map((att: any, idx: number) => (
                                                                <a 
                                                                    key={idx}
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all uppercase"
                                                                >
                                                                    <Download size={10}/> {att.name.length > 20 ? att.name.substring(0, 17) + '...' : att.name}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => currentUser?.organizationId && api.apiDeletePatientHistory(currentUser.organizationId, patient.id, record.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 absolute top-4 right-4 transition"
                                                title="Excluir do Histórico"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    ))}

                                    {patientHistory.filter(h => h.type === 'PROSTHESIS').length === 0 && (
                                        <div className="py-12 bg-white text-center text-slate-400 italic rounded-2xl border border-dashed border-slate-200">
                                            Nenhum serviço de prótese realizado de forma online para este paciente.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
