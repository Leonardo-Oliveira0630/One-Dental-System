import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Calendar, Clock, FileText, Check, AlertTriangle, Printer, Save, 
  Trash2, DollarSign, Sparkles, CheckCircle2, ChevronDown, ChevronUp, 
  Stethoscope, Building2, User, Phone, Mail, ArrowRight, ShieldCheck, 
  CreditCard, Banknote, QrCode, Receipt, CalendarPlus, CheckCircle, 
  AlertCircle, Layers, Tag, Percent, Edit2, FileCheck, RefreshCw, Send,
  Info, Sparkle, HeartPulse, UserCheck, ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  ClinicPatient, ClinicTreatmentPlan, TreatmentProcedure, TreatmentPlanStatus, 
  TreatmentProcedureStatus, TreatmentPriority, Appointment, AppointmentStatus, 
  ClinicService, ClinicPatientFinance, UserRole
} from '../types';
import { Odontogram } from './Odontogram';
import * as api from '../services/firebaseService';

interface TreatmentPlanModalProps {
  patient: ClinicPatient;
  planToEdit?: ClinicTreatmentPlan | null;
  onClose: () => void;
  onSaved?: (savedPlan: ClinicTreatmentPlan) => void;
}

const STATUS_CONFIG: Record<TreatmentPlanStatus, { label: string; bg: string; text: string; border: string }> = {
  RASCUNHO: { label: 'Rascunho', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
  EM_AVALIACAO: { label: 'Em Avaliação', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  AGUARDANDO_ACEITE: { label: 'Aguardando Aceite', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  ACEITO: { label: 'Aceito', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  EM_ANDAMENTO: { label: 'Em Andamento', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  CONCLUIDO: { label: 'Concluído', bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' }
};

const PROCEDURE_STATUS_CONFIG: Record<TreatmentProcedureStatus, { label: string; bg: string; text: string; colorHex: string }> = {
  PLANEJADO: { label: 'Planejado', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', text: 'text-slate-600', colorHex: '#94A3B8' },
  AGUARDANDO: { label: 'Aguardando', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', text: 'text-amber-600', colorHex: '#F59E0B' },
  AGENDADO: { label: 'Agendado', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300', text: 'text-blue-600', colorHex: '#3B82F6' },
  EM_ANDAMENTO: { label: 'Em Andamento', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300', text: 'text-indigo-600', colorHex: '#6366F1' },
  CONCLUIDO: { label: 'Concluído', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', text: 'text-emerald-600', colorHex: '#10B981' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300', text: 'text-rose-600', colorHex: '#EF4444' }
};

const PRIORITY_CONFIG: Record<TreatmentPriority, { label: string; bg: string; text: string }> = {
  BAIXA: { label: 'Baixa', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', text: 'text-slate-500' },
  NORMAL: { label: 'Normal', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', text: 'text-blue-600' },
  ALTA: { label: 'Alta', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', text: 'text-amber-600' },
  URGENTE: { label: 'Urgente', bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300', text: 'text-rose-600' }
};

export const TreatmentPlanModal: React.FC<TreatmentPlanModalProps> = ({
  patient,
  planToEdit,
  onClose,
  onSaved
}) => {
  const { 
    currentUser, 
    currentOrg, 
    clinicDentists, 
    clinicRooms, 
    clinicServices, 
    allUsers, 
    appointments 
  } = useApp();

  // Active Tab inside Treatment Plan Modal
  const [modalSection, setModalSection] = useState<'PLAN' | 'DIAGNOSIS' | 'ODONTOGRAM' | 'BUDGET' | 'ACCEPTANCE' | 'FINANCE'>('PLAN');

  // Main Plan State
  const [planId] = useState<string>(planToEdit?.id || `tp_${Date.now()}`);
  const [planName, setPlanName] = useState<string>(planToEdit?.name || 'Plano de Tratamento — Reabilitação Oral');
  const [dentistId, setDentistId] = useState<string>(planToEdit?.dentistId || clinicDentists[0]?.id || currentUser?.id || '');
  const [dentistName, setDentistName] = useState<string>(planToEdit?.dentistName || clinicDentists[0]?.name || currentUser?.name || 'Cirurgião-Dentista');
  const [planStatus, setPlanStatus] = useState<TreatmentPlanStatus>(planToEdit?.status || 'RASCUNHO');
  const [startDate, setStartDate] = useState<string>(
    planToEdit?.startDate 
      ? new Date(planToEdit.startDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  const [expectedEndDate, setExpectedEndDate] = useState<string>(
    planToEdit?.expectedEndDate 
      ? new Date(planToEdit.expectedEndDate).toISOString().split('T')[0] 
      : ''
  );
  const [generalNotes, setGeneralNotes] = useState<string>(planToEdit?.notes || '');

  // Diagnosis State
  const [diagnosis, setDiagnosis] = useState<string>(planToEdit?.diagnosis || '');
  const [clinicalNotes, setClinicalNotes] = useState<string>(planToEdit?.clinicalNotes || '');
  const [recommendations, setRecommendations] = useState<string>(planToEdit?.recommendations || '');
  const [planPriority, setPlanPriority] = useState<TreatmentPriority>(planToEdit?.priority || 'NORMAL');
  const [diagnosedTeeth, setDiagnosedTeeth] = useState<string[]>(planToEdit?.diagnosedTeeth || []);

  // Odontogram Selection State
  const [selectedOdontoTeeth, setSelectedOdontoTeeth] = useState<string[]>([]);

  // Procedures State
  const [procedures, setProcedures] = useState<TreatmentProcedure[]>(planToEdit?.procedures || []);

  // New Procedure Form State
  const [showAddProcedure, setShowAddProcedure] = useState<boolean>(false);
  const [editingProcId, setEditingProcId] = useState<string | null>(null);
  const [procServiceId, setProcServiceId] = useState<string>('');
  const [procName, setProcName] = useState<string>('');
  const [procCategory, setProcCategory] = useState<string>('Dentística');
  const [procTeeth, setProcTeeth] = useState<string[]>([]);
  const [procQty, setProcQty] = useState<number>(1);
  const [procDentistId, setProcDentistId] = useState<string>(dentistId);
  const [procUnitPrice, setProcUnitPrice] = useState<number>(0);
  const [procDiscountType, setProcDiscountType] = useState<'VALUE' | 'PERCENT'>('VALUE');
  const [procDiscountVal, setProcDiscountVal] = useState<number>(0);
  const [procPriority, setProcPriority] = useState<TreatmentPriority>('NORMAL');
  const [procStatus, setProcStatus] = useState<TreatmentProcedureStatus>('PLANEJADO');
  const [procNotes, setProcNotes] = useState<string>('');
  const [procLabRequired, setProcLabRequired] = useState<boolean>(false);

  // General Discount & Additions
  const [generalDiscountType, setGeneralDiscountType] = useState<'VALUE' | 'PERCENT'>(planToEdit?.discountType || 'VALUE');
  const [generalDiscountVal, setGeneralDiscountVal] = useState<number>(planToEdit?.discountValue || 0);
  const [additionVal, setAdditionVal] = useState<number>(planToEdit?.additionValue || 0);

  // Budget State
  const [budgetValidityDays, setBudgetValidityDays] = useState<number>(planToEdit?.budget?.validityDays || 30);
  const [budgetPaymentMethod, setBudgetPaymentMethod] = useState<any>(planToEdit?.budget?.paymentMethod || 'PIX');
  const [budgetInstallments, setBudgetInstallments] = useState<number>(planToEdit?.budget?.installmentsCount || 1);
  const [budgetDownPayment, setBudgetDownPayment] = useState<number>(planToEdit?.budget?.downPayment || 0);
  const [budgetNotes, setBudgetNotes] = useState<string>(planToEdit?.budget?.notes || '');

  // Acceptance State
  const [acceptanceStatus, setAcceptanceStatus] = useState<'AGUARDANDO_ACEITE' | 'ACEITO' | 'RECUSADO'>(
    planToEdit?.acceptance?.status || 'AGUARDANDO_ACEITE'
  );
  const [acceptedBy, setAcceptedBy] = useState<string>(planToEdit?.acceptance?.acceptedBy || patient.name);
  const [acceptanceNotes, setAcceptanceNotes] = useState<string>(planToEdit?.acceptance?.notes || '');
  const [acceptedAt, setAcceptedAt] = useState<string>(
    planToEdit?.acceptance?.acceptedAt 
      ? new Date(planToEdit.acceptance.acceptedAt).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );

  // Schedule Quick Modal State for a procedure
  const [schedulingProc, setSchedulingProc] = useState<TreatmentProcedure | null>(null);
  const [schedDate, setSchedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [schedTime, setSchedTime] = useState<string>('09:00');
  const [schedDuration, setSchedDuration] = useState<number>(30);
  const [schedRoomId, setSchedRoomId] = useState<string>(clinicRooms[0]?.id || '');
  const [schedDentistId, setSchedDentistId] = useState<string>(dentistId);
  const [schedNotes, setSchedNotes] = useState<string>('');

  // Complete Quick Modal State for a procedure
  const [completingProc, setCompletingProc] = useState<TreatmentProcedure | null>(null);
  const [completeDentistName, setCompleteDentistName] = useState<string>(dentistName);
  const [completeNotes, setCompleteNotes] = useState<string>('');

  // Saving / Printing States
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeneratingFinance, setIsGeneratingFinance] = useState<boolean>(false);
  const [financeSuccessMsg, setFinanceSuccessMsg] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Sync dentist name when dentistId changes
  useEffect(() => {
    const foundDentist = clinicDentists.find(d => d.id === dentistId) || 
                         allUsers.find(u => u.id === dentistId);
    if (foundDentist) {
      setDentistName(foundDentist.name);
    }
  }, [dentistId, clinicDentists, allUsers]);

  // Tooth Colors calculation for Odontogram
  const toothColors = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};

    // 1. Diagnosed teeth without procedure yet
    diagnosedTeeth.forEach(t => {
      map[t] = '#F43F5E'; // Red alert for diagnosed
    });

    // 2. Teeth with planned or ongoing procedures
    procedures.forEach(proc => {
      const color = PROCEDURE_STATUS_CONFIG[proc.status]?.colorHex || '#6366F1';
      proc.teeth.forEach(t => {
        map[t] = color;
      });
    });

    return map;
  }, [diagnosedTeeth, procedures]);

  // Calculations
  const subtotal = useMemo(() => {
    return procedures.reduce((acc, p) => acc + (p.finalPrice || 0), 0);
  }, [procedures]);

  const calculatedDiscount = useMemo(() => {
    if (generalDiscountType === 'PERCENT') {
      return (subtotal * Math.min(100, Math.max(0, generalDiscountVal))) / 100;
    }
    return Math.min(subtotal, Math.max(0, generalDiscountVal));
  }, [subtotal, generalDiscountType, generalDiscountVal]);

  const finalAmount = useMemo(() => {
    const val = subtotal - calculatedDiscount + Number(additionVal || 0);
    return Math.max(0, val);
  }, [subtotal, calculatedDiscount, additionVal]);

  // Installment preview
  const installmentCalc = useMemo(() => {
    const remaining = Math.max(0, finalAmount - (Number(budgetDownPayment) || 0));
    const count = Math.max(1, budgetInstallments);
    const value = remaining / count;
    return { remaining, count, value };
  }, [finalAmount, budgetDownPayment, budgetInstallments]);

  // Execution Stats
  const executionStats = useMemo(() => {
    const total = procedures.length;
    const completed = procedures.filter(p => p.status === 'CONCLUIDO').length;
    const inProgress = procedures.filter(p => p.status === 'EM_ANDAMENTO' || p.status === 'AGENDADO').length;
    const pending = procedures.filter(p => p.status === 'PLANEJADO' || p.status === 'AGUARDANDO').length;
    const canceled = procedures.filter(p => p.status === 'CANCELADO').length;
    const progressPercent = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, inProgress, pending, canceled, progressPercent };
  }, [procedures]);

  // Handle Service Selection in Procedure Form
  const handleSelectService = (serviceId: string) => {
    setProcServiceId(serviceId);
    const s = clinicServices.find(srv => srv.id === serviceId);
    if (s) {
      setProcName(s.name);
      setProcCategory(s.category || 'Dentística');
      setProcUnitPrice(s.price || 0);
      if (s.durationMinutes) {
        setSchedDuration(s.durationMinutes);
      }
    }
  };

  // Open Procedure Form with selected teeth
  const handleOpenAddProcedureWithTeeth = (teeth: string[]) => {
    setEditingProcId(null);
    setProcServiceId('');
    setProcName('');
    setProcCategory('Dentística');
    setProcTeeth(teeth);
    setProcQty(teeth.length > 0 ? teeth.length : 1);
    setProcUnitPrice(0);
    setProcDiscountType('VALUE');
    setProcDiscountVal(0);
    setProcPriority('NORMAL');
    setProcStatus('PLANEJADO');
    setProcNotes('');
    setProcLabRequired(false);
    setShowAddProcedure(true);
  };

  // Save Procedure (Add or Edit)
  const handleSaveProcedure = () => {
    if (!procName.trim()) {
      alert('Por favor, informe o nome do procedimento.');
      return;
    }

    const qty = Math.max(1, procQty);
    const unitPrice = Number(procUnitPrice) || 0;
    const discVal = Number(procDiscountVal) || 0;
    let disc = 0;
    if (procDiscountType === 'PERCENT') {
      disc = (unitPrice * qty * Math.min(100, Math.max(0, discVal))) / 100;
    } else {
      disc = Math.min(unitPrice * qty, discVal);
    }
    const finalPrice = Math.max(0, unitPrice * qty - disc);

    const dentistObj = clinicDentists.find(d => d.id === procDentistId) || 
                       allUsers.find(u => u.id === procDentistId);

    const procObj: TreatmentProcedure = {
      id: editingProcId || `proc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      serviceId: procServiceId || undefined,
      name: procName.trim(),
      category: procCategory,
      teeth: procTeeth,
      quantity: qty,
      dentistId: procDentistId || dentistId,
      dentistName: dentistObj?.name || dentistName,
      unitPrice,
      discountType: procDiscountType,
      discountValue: discVal,
      finalPrice,
      priority: procPriority,
      notes: procNotes.trim() || undefined,
      status: procStatus,
      labRequired: procLabRequired
    };

    if (editingProcId) {
      setProcedures(procedures.map(p => p.id === editingProcId ? { ...p, ...procObj } : p));
    } else {
      setProcedures([...procedures, procObj]);
    }

    setShowAddProcedure(false);
    setEditingProcId(null);
    setSelectedOdontoTeeth([]);
  };

  // Edit existing procedure
  const handleEditProcedure = (proc: TreatmentProcedure) => {
    setEditingProcId(proc.id);
    setProcServiceId(proc.serviceId || '');
    setProcName(proc.name);
    setProcCategory(proc.category || 'Dentística');
    setProcTeeth(proc.teeth || []);
    setProcQty(proc.quantity || 1);
    setProcDentistId(proc.dentistId || dentistId);
    setProcUnitPrice(proc.unitPrice || 0);
    setProcDiscountType(proc.discountType || 'VALUE');
    setProcDiscountVal(proc.discountValue || 0);
    setProcPriority(proc.priority || 'NORMAL');
    setProcStatus(proc.status || 'PLANEJADO');
    setProcNotes(proc.notes || '');
    setProcLabRequired(!!proc.labRequired);
    setShowAddProcedure(true);
  };

  // Delete Procedure
  const handleDeleteProcedure = (procId: string) => {
    if (confirm('Deseja realmente remover este procedimento do plano?')) {
      setProcedures(procedures.filter(p => p.id !== procId));
    }
  };

  // Quick Schedule Procedure
  const handleConfirmSchedule = async () => {
    if (!schedulingProc) return;
    const orgId = currentUser?.organizationId;
    if (!orgId) return;

    setIsSaving(true);
    const dtStr = `${schedDate}T${schedTime}:00`;
    const appDt = new Date(dtStr);

    const newApp: Appointment = {
      id: `app_${Date.now()}`,
      organizationId: orgId,
      dentistId: schedDentistId || dentistId,
      patientId: patient.id,
      patientName: patient.name,
      date: appDt,
      durationMinutes: Number(schedDuration) || 30,
      procedure: schedulingProc.name,
      status: AppointmentStatus.SCHEDULED,
      notes: schedNotes ? `[Plano: ${planName}] ${schedNotes}` : `[Plano: ${planName}] Procedimento: ${schedulingProc.name}`,
      roomId: schedRoomId || undefined
    };

    await api.apiAddAppointment(orgId, newApp);

    // Update procedure status in state
    setProcedures(procedures.map(p => {
      if (p.id === schedulingProc.id) {
        return {
          ...p,
          status: 'AGENDADO',
          appointmentId: newApp.id,
          appointmentDate: appDt,
          appointmentTime: schedTime,
          roomId: schedRoomId
        };
      }
      return p;
    }));

    setIsSaving(false);
    setSchedulingProc(null);
  };

  // Quick Complete Procedure
  const handleConfirmComplete = () => {
    if (!completingProc) return;

    setProcedures(procedures.map(p => {
      if (p.id === completingProc.id) {
        return {
          ...p,
          status: 'CONCLUIDO',
          completedAt: new Date(),
          completedByDentistName: completeDentistName || dentistName,
          completionNotes: completeNotes || undefined
        };
      }
      return p;
    }));

    setCompletingProc(null);
  };

  // Register Acceptance
  const handleRegisterAcceptance = () => {
    setAcceptanceStatus('ACEITO');
    if (planStatus === 'RASCUNHO' || planStatus === 'AGUARDANDO_ACEITE') {
      setPlanStatus('ACEITO');
    }
  };

  // Launch Financial Entries to ClinicPatientFinance
  const handleGenerateFinancialEntries = async () => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;

    setIsGeneratingFinance(true);
    try {
      const now = new Date();
      const entries: ClinicPatientFinance[] = [];

      if (budgetDownPayment > 0) {
        entries.push({
          id: `fin_${Date.now()}_down`,
          patientId: patient.id,
          description: `[Plano: ${planName}] Entrada / Sinal`,
          amount: Number(budgetDownPayment),
          type: 'INCOME',
          status: 'PAID',
          date: now,
          createdAt: now
        });
      }

      if (installmentCalc.remaining > 0 && installmentCalc.count > 0) {
        for (let i = 1; i <= installmentCalc.count; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i);

          entries.push({
            id: `fin_${Date.now()}_inst_${i}`,
            patientId: patient.id,
            description: `[Plano: ${planName}] Parcela ${i}/${installmentCalc.count}`,
            amount: Number(installmentCalc.value.toFixed(2)),
            type: 'INCOME',
            status: 'PENDING',
            date: dueDate,
            createdAt: now
          });
        }
      }

      for (const entry of entries) {
        await api.apiAddPatientFinance(orgId, patient.id, entry);
      }

      setFinanceSuccessMsg(`${entries.length} lançamentos financeiros gerados com sucesso no financeiro do paciente!`);
      setTimeout(() => setFinanceSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Erro ao gerar lançamentos financeiros: ${err.message}`);
    } finally {
      setIsGeneratingFinance(false);
    }
  };

  // Master Save Plan
  const handleSaveTreatmentPlan = async () => {
    const orgId = currentUser?.organizationId;
    if (!orgId) {
      alert('Organização não identificada.');
      return;
    }

    setIsSaving(true);
    try {
      const planPayload: ClinicTreatmentPlan = {
        id: planId,
        organizationId: orgId,
        patientId: patient.id,
        patientName: patient.name,
        name: planName.trim() || 'Plano de Tratamento',
        dentistId,
        dentistName,
        status: planStatus,
        createdAt: planToEdit?.createdAt ? new Date(planToEdit.createdAt) : new Date(),
        updatedAt: new Date(),
        startDate: startDate ? new Date(startDate) : undefined,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : undefined,
        completedAt: planStatus === 'CONCLUIDO' ? new Date() : undefined,
        
        // Diagnosis
        diagnosis: diagnosis.trim() || undefined,
        clinicalNotes: clinicalNotes.trim() || undefined,
        recommendations: recommendations.trim() || undefined,
        priority: planPriority,
        diagnosedTeeth,
        
        // Procedures
        procedures,
        
        // Financials
        subtotal,
        discountType: generalDiscountType,
        discountValue: generalDiscountVal,
        additionValue: additionVal,
        finalAmount,
        
        // Budget
        budget: {
          validityDays: budgetValidityDays,
          validUntil: new Date(Date.now() + budgetValidityDays * 24 * 60 * 60 * 1000),
          paymentMethod: budgetPaymentMethod,
          installmentsCount: budgetInstallments,
          downPayment: budgetDownPayment,
          installmentValue: installmentCalc.value,
          notes: budgetNotes.trim() || undefined,
          generatedAt: new Date(),
          generatedBy: currentUser?.name || 'Administrador'
        },
        
        // Acceptance
        acceptance: {
          status: acceptanceStatus,
          acceptedAt: acceptanceStatus === 'ACEITO' ? new Date(acceptedAt) : undefined,
          acceptedBy: acceptedBy.trim() || patient.name,
          registeredByDentistName: dentistName,
          registeredByUserId: currentUser?.id,
          notes: acceptanceNotes.trim() || undefined
        },
        
        notes: generalNotes.trim() || undefined
      };

      await api.apiSavePatientTreatmentPlan(orgId, patient.id, planPayload);

      if (onSaved) {
        onSaved(planPayload);
      }
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar plano de tratamento: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Print Budget / Treatment Plan Document
  const handlePrintDocument = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 md:left-64 print:left-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 text-slate-800">
      
      {/* PRINT WATERMARK VIEW (HIDDEN ON SCREEN, SHOWN ON PRINT) */}
      <div className="hidden print:block absolute inset-0 bg-white p-10 text-black font-sans leading-normal">
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight">{currentOrg?.name || 'Clínica Odontológica'}</h1>
          <p className="text-xs text-slate-600 font-bold uppercase">Plano de Tratamento Odontológico & Orçamento Clínico</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded border border-slate-200">
          <div>
            <p><strong>Paciente:</strong> {patient.name}</p>
            <p><strong>CPF:</strong> {patient.cpf || 'Não informado'}</p>
            <p><strong>Telefone:</strong> {patient.phone}</p>
          </div>
          <div>
            <p><strong>Plano:</strong> {planName}</p>
            <p><strong>Dentista Responsável:</strong> {dentistName}</p>
            <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Status:</strong> {STATUS_CONFIG[planStatus]?.label}</p>
          </div>
        </div>

        {diagnosis && (
          <div className="mb-6 p-3 bg-slate-50 border rounded text-xs">
            <p className="font-bold uppercase tracking-wider text-slate-700 mb-1">Diagnóstico Clínico:</p>
            <p className="text-slate-800">{diagnosis}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-black text-xs uppercase tracking-wider mb-2 border-b pb-1">Procedimentos Planejados:</h3>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-slate-100 font-bold">
                <th className="p-2">Dente(s)</th>
                <th className="p-2">Procedimento</th>
                <th className="p-2">Categoria</th>
                <th className="p-2">Qtd</th>
                <th className="p-2 text-right">Valor Unit.</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 font-mono font-bold">{p.teeth?.join(', ') || 'Geral'}</td>
                  <td className="p-2 font-bold">{p.name}</td>
                  <td className="p-2 text-slate-600">{p.category || '-'}</td>
                  <td className="p-2">{p.quantity}</td>
                  <td className="p-2 text-right">R$ {p.unitPrice.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold">R$ {p.finalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-1.5 text-xs bg-slate-50 p-4 border rounded">
            <div className="flex justify-between"><span>Subtotal:</span><span>R$ {subtotal.toFixed(2)}</span></div>
            {calculatedDiscount > 0 && (
              <div className="flex justify-between text-rose-700"><span>Desconto:</span><span>- R$ {calculatedDiscount.toFixed(2)}</span></div>
            )}
            {additionVal > 0 && (
              <div className="flex justify-between text-emerald-700"><span>Acréscimos:</span><span>+ R$ {Number(additionVal).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-black text-sm border-t pt-2 mt-2">
              <span>Valor Total:</span>
              <span>R$ {finalAmount.toFixed(2)}</span>
            </div>
            <div className="pt-2 text-[11px] text-slate-600 border-t mt-2">
              <p><strong>Forma de Pagamento:</strong> {budgetPaymentMethod}</p>
              {budgetDownPayment > 0 && <p><strong>Entrada:</strong> R$ {budgetDownPayment.toFixed(2)}</p>}
              {budgetInstallments > 1 && (
                <p><strong>Parcelamento:</strong> {budgetInstallments}x de R$ {installmentCalc.value.toFixed(2)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-20 pt-8 border-t text-center text-xs">
          <div>
            <div className="border-t border-slate-400 w-4/5 mx-auto mb-1"></div>
            <p className="font-bold">{patient.name}</p>
            <p className="text-[10px] text-slate-500 uppercase">Assinatura do Paciente / Responsável</p>
          </div>
          <div>
            <div className="border-t border-slate-400 w-4/5 mx-auto mb-1"></div>
            <p className="font-bold">{dentistName}</p>
            <p className="text-[10px] text-slate-500 uppercase">Cirurgião-Dentista Responsável</p>
          </div>
        </div>
      </div>

      {/* MODAL CONTAINER */}
      <motion.div 
        initial={{ transform: 'scale(0.96)', opacity: 0 }}
        animate={{ transform: 'scale(1)', opacity: 1 }}
        exit={{ transform: 'scale(0.96)', opacity: 0 }}
        className="bg-slate-50 dark:bg-[#0F172A] w-full sm:max-w-7xl h-full sm:h-[92vh] sm:rounded-[36px] flex flex-col shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden print:hidden"
      >
        {/* MODAL HEADER */}
        <div className="bg-white dark:bg-[#1E293B] px-6 sm:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md shadow-teal-500/20 shrink-0">
              <Stethoscope size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <input 
                  type="text" 
                  value={planName} 
                  onChange={e => setPlanName(e.target.value)} 
                  className="text-lg sm:text-xl font-black text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 focus:border-indigo-600 outline-none pb-0.5 max-w-md truncate"
                  placeholder="Nome do Plano de Tratamento"
                />
                
                {/* Status Dropdown */}
                <select
                  value={planStatus}
                  onChange={e => setPlanStatus(e.target.value as TreatmentPlanStatus)}
                  className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border outline-none cursor-pointer ${STATUS_CONFIG[planStatus]?.bg} ${STATUS_CONFIG[planStatus]?.text} ${STATUS_CONFIG[planStatus]?.border}`}
                >
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="EM_AVALIACAO">Em Avaliação</option>
                  <option value="AGUARDANDO_ACEITE">Aguardando Aceite</option>
                  <option value="ACEITO">Aceito</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5 flex items-center gap-2">
                <span>Paciente: <strong className="text-slate-700 dark:text-slate-200">{patient.name}</strong></span>
                <span>•</span>
                <span>Dentista: <strong className="text-slate-700 dark:text-slate-200">{dentistName}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={handlePrintDocument}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              title="Imprimir orçamento e proposta do plano"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleSaveTreatmentPlan}
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Plano'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TOP KPI STRIP & PROGRESS */}
        <div className="bg-slate-100/70 dark:bg-[#131B2A] px-6 sm:px-8 py-3 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider">Procedimentos:</span>
              <span className="font-black text-slate-800 dark:text-white">{executionStats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider">Concluídos:</span>
              <span className="font-black text-emerald-700 dark:text-emerald-300">{executionStats.completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400 uppercase text-[10px] tracking-wider">Em Andamento / Agendados:</span>
              <span className="font-black text-blue-700 dark:text-blue-300">{executionStats.inProgress}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider">Pendentes:</span>
              <span className="font-black text-slate-600 dark:text-slate-300">{executionStats.pending}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider">Subtotal:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {calculatedDiscount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-rose-500 uppercase text-[10px] tracking-wider">Desconto:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">- R$ {calculatedDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <span className="text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider font-black">Valor Final:</span>
              <span className="font-black text-sm text-indigo-900 dark:text-indigo-200">R$ {finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-teal-500 to-indigo-600 h-full transition-all duration-500 rounded-r-full"
            style={{ width: `${executionStats.progressPercent}%` }}
          />
        </div>

        {/* NAVIGATION SECTIONS */}
        <div className="bg-white dark:bg-[#1E293B] border-b border-slate-100 dark:border-slate-800 px-6 sm:px-8 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'PLAN', label: '1. Procedimentos & Plano', icon: <Layers size={14} /> },
            { id: 'ODONTOGRAM', label: '2. Odontograma Visual', icon: <Sparkles size={14} /> },
            { id: 'DIAGNOSIS', label: '3. Diagnóstico Clínico', icon: <HeartPulse size={14} /> },
            { id: 'BUDGET', label: '4. Orçamento & Parcelas', icon: <DollarSign size={14} /> },
            { id: 'ACCEPTANCE', label: '5. Aceite do Paciente', icon: <UserCheck size={14} /> },
            { id: 'FINANCE', label: '6. Integração Financeira', icon: <Receipt size={14} /> }
          ].map(sec => {
            const isActive = modalSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setModalSection(sec.id as any)}
                className={`py-3.5 px-3.5 font-black text-xs uppercase tracking-wider relative transition-colors shrink-0 flex items-center gap-2 ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {sec.icon}
                <span>{sec.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTreatmentSection" 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" 
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* MODAL MAIN SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">

          {/* === SECTION 1: PROCEDURES & PLAN TIMELINE === */}
          {modalSection === 'PLAN' && (
            <div className="space-y-6">
              {/* General Plan Parameters */}
              <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <User size={16} className="text-indigo-600" />
                    Parâmetros Principais do Plano
                  </h3>
                  <span className="text-xs text-slate-500 font-bold">
                    Progresso: {executionStats.completed} de {executionStats.total} ({executionStats.progressPercent.toFixed(1)}%)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Dentista Responsável</label>
                    <select
                      value={dentistId}
                      onChange={e => setDentistId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    >
                      {clinicDentists.map(d => (
                        <option key={d.id} value={d.id}>{d.name} {d.cro ? `(CRO: ${d.cro})` : ''}</option>
                      ))}
                      {clinicDentists.length === 0 && (
                        <option value={currentUser?.id || '1'}>{currentUser?.name || 'Cirurgião-Dentista'}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Data Início Prevista</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Data Conclusão Prevista</label>
                    <input
                      type="date"
                      value={expectedEndDate}
                      onChange={e => setExpectedEndDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Procedures Header with Add Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <Layers size={18} className="text-teal-500" />
                    Procedimentos do Tratamento ({procedures.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Monte as etapas clínicas com seus dentes associados, valores individuais e agendamentos.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleOpenAddProcedureWithTeeth([])}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Plus size={16} />
                    <span>+ Adicionar Procedimento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalSection('ODONTOGRAM')}
                    className="px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-900 flex items-center gap-1.5 transition-colors"
                    title="Adicionar selecionando dentes no odontograma"
                  >
                    <Sparkles size={15} />
                    <span>Via Odontograma</span>
                  </button>
                </div>
              </div>

              {/* Procedures Cards / Table List */}
              {procedures.length === 0 ? (
                <div className="bg-white dark:bg-[#1E293B] p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-3">
                  <Stethoscope size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Nenhum procedimento adicionado ao plano ainda.</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Clique no botão acima ou use o <strong>Odontograma Visual</strong> para selecionar os dentes e prescrever restaurações, próteses, endodontia ou limpezas.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddProcedureWithTeeth([])}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Plus size={15} />
                    <span>Adicionar Primeiro Procedimento</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {procedures.map((proc, index) => {
                    const st = PROCEDURE_STATUS_CONFIG[proc.status] || PROCEDURE_STATUS_CONFIG.PLANEJADO;
                    const pr = PRIORITY_CONFIG[proc.priority] || PRIORITY_CONFIG.NORMAL;

                    return (
                      <div
                        key={proc.id}
                        className="bg-white dark:bg-[#1E293B] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800/60 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        {/* Left Side: Tooth & Name */}
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          {/* Tooth Circle Badge */}
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex flex-col items-center justify-center font-black text-indigo-700 dark:text-indigo-300 shrink-0">
                            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Dente</span>
                            <span className="text-sm font-mono leading-none">
                              {proc.teeth && proc.teeth.length > 0 ? proc.teeth.join(', ') : 'Geral'}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-slate-900 dark:text-white text-sm truncate">
                                {index + 1}. {proc.name}
                              </h4>
                              {proc.category && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                                  {proc.category}
                                </span>
                              )}
                              {proc.labRequired && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase flex items-center gap-1">
                                  <Sparkles size={10} /> LabProx (Prótese)
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-3 flex-wrap">
                              <span>Dentista: <strong className="text-slate-600 dark:text-slate-300">{proc.dentistName || dentistName}</strong></span>
                              <span>•</span>
                              <span>Qtd: <strong>{proc.quantity}x</strong></span>
                              <span>•</span>
                              <span>Unitário: <strong>R$ {proc.unitPrice.toFixed(2)}</strong></span>
                              {proc.discountValue ? (
                                <>
                                  <span>•</span>
                                  <span className="text-rose-600">Desconto: - R$ {(proc.unitPrice * proc.quantity - proc.finalPrice).toFixed(2)}</span>
                                </>
                              ) : null}
                            </p>

                            {proc.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 inline-block">
                                Obs: {proc.notes}
                              </p>
                            )}

                            {proc.appointmentDate && (
                              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1 flex items-center gap-1">
                                <Calendar size={12} /> Agendado para: {new Date(proc.appointmentDate).toLocaleDateString('pt-BR')} às {proc.appointmentTime || '09:00'}
                              </p>
                            )}

                            {proc.completedAt && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Concluído em: {new Date(proc.completedAt).toLocaleDateString('pt-BR')} por {proc.completedByDentistName || dentistName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Status, Price & Action Buttons */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="text-left md:text-right">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${st.bg}`}>
                              {st.label}
                            </span>
                            <p className="font-black text-slate-900 dark:text-white text-base mt-1">
                              R$ {proc.finalPrice.toFixed(2)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Schedule Button */}
                            {proc.status !== 'CONCLUIDO' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSchedulingProc(proc);
                                  setSchedDentistId(proc.dentistId || dentistId);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors"
                                title="Agendar consulta para este procedimento"
                              >
                                <CalendarPlus size={17} />
                              </button>
                            )}

                            {/* Complete Button */}
                            {proc.status !== 'CONCLUIDO' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCompletingProc(proc);
                                  setCompleteDentistName(proc.dentistName || dentistName);
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl transition-colors"
                                title="Marcar procedimento como Concluído"
                              >
                                <CheckCircle size={17} />
                              </button>
                            ) : (
                              <span className="p-2 text-emerald-600 font-black text-xs flex items-center gap-0.5" title="Procedimento finalizado">
                                <Check size={16} />
                              </span>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleEditProcedure(proc)}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors"
                              title="Editar procedimento"
                            >
                              <Edit2 size={16} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteProcedure(proc.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                              title="Remover procedimento"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Financial Overview for the Plan */}
              {procedures.length > 0 && (
                <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Descontos e Acréscimos Gerais</h4>
                    <p className="text-xs text-slate-500">Configure descontos negociados ou acréscimos especiais para o tratamento como um todo.</p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#131B2A] p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Desconto Geral:</span>
                      <select
                        value={generalDiscountType}
                        onChange={e => setGeneralDiscountType(e.target.value as any)}
                        className="p-1 bg-white dark:bg-[#1E293B] border rounded text-xs font-bold"
                      >
                        <option value="VALUE">R$</option>
                        <option value="PERCENT">%</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={generalDiscountVal}
                        onChange={e => setGeneralDiscountVal(Number(e.target.value))}
                        className="w-20 p-1 bg-white dark:bg-[#1E293B] border rounded text-xs font-bold text-right"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#131B2A] p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Acréscimo:</span>
                      <input
                        type="number"
                        min="0"
                        value={additionVal}
                        onChange={e => setAdditionVal(Number(e.target.value))}
                        placeholder="R$ 0,00"
                        className="w-20 p-1 bg-white dark:bg-[#1E293B] border rounded text-xs font-bold text-right"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === SECTION 2: ODONTOGRAM VISUAL === */}
          {modalSection === 'ODONTOGRAM' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <Sparkles size={18} className="text-teal-500" />
                      Odontograma Anatômico Interativo
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Clique sobre os dentes para selecioná-los e prescrever procedimentos diretamente para as peças marcadas.
                    </p>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" /> Planejado</span>
                    <span className="flex items-center gap-1 text-blue-600"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Agendado</span>
                    <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Concluído</span>
                    <span className="flex items-center gap-1 text-rose-600"><span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" /> Diagnóstico</span>
                  </div>
                </div>

                {/* Odontogram Component Integration */}
                <div className="py-6 flex flex-col items-center justify-center overflow-x-auto">
                  <div className="w-full max-w-2xl bg-slate-50 dark:bg-[#131B2A] p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-center shadow-inner">
                    <Odontogram
                      selectedTeeth={selectedOdontoTeeth}
                      onChange={teeth => setSelectedOdontoTeeth(teeth)}
                      toothColors={toothColors}
                      selectionColor="#6366F1"
                    />
                  </div>
                </div>

                {/* Teeth Selection Bar & Fast Prescription Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Dentes Selecionados:</span>
                    {selectedOdontoTeeth.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Nenhum dente selecionado</span>
                    ) : (
                      selectedOdontoTeeth.map(t => (
                        <span key={t} className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-mono font-black text-xs shadow-sm">
                          {t}
                        </span>
                      ))
                    )}
                    {selectedOdontoTeeth.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedOdontoTeeth([])}
                        className="text-xs text-rose-500 hover:underline font-bold ml-2"
                      >
                        Limpar seleção
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={selectedOdontoTeeth.length === 0}
                      onClick={() => handleOpenAddProcedureWithTeeth(selectedOdontoTeeth)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Plus size={16} />
                      <span>Adicionar Procedimento para {selectedOdontoTeeth.length} dente(s)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === SECTION 3: DIAGNOSIS & CLINICAL NOTES === */}
          {modalSection === 'DIAGNOSIS' && (
            <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <HeartPulse size={18} className="text-rose-500" />
                  Diagnóstico Clínico & Avaliação Inicial
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Registre as queixas do paciente, achados clínicos radiográficos e prioridade do caso.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Diagnóstico Geral</label>
                    <textarea
                      rows={4}
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      placeholder="Ex: Cárie oclusal e interproximal dentes 16 e 26, necessidade de reabilitação protética superior, gengivite marginal..."
                      className="w-full p-3 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Prioridade do Tratamento</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'] as TreatmentPriority[]).map(prio => {
                        const isSel = planPriority === prio;
                        const cfg = PRIORITY_CONFIG[prio];
                        return (
                          <button
                            key={prio}
                            type="button"
                            onClick={() => setPlanPriority(prio)}
                            className={`py-2 px-3 rounded-xl text-xs font-black uppercase transition-all border ${
                              isSel 
                                ? `${cfg.bg} ${cfg.text} border-current shadow-sm scale-102` 
                                : 'bg-slate-50 dark:bg-[#131B2A] text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Recomendações e Orientações Terapêuticas</label>
                    <textarea
                      rows={4}
                      value={recommendations}
                      onChange={e => setRecommendations(e.target.value)}
                      placeholder="Ex: Escovação com cerdas macias, uso de fio dental diário, bochechos com clorexidina 0.12% pós-cirurgia..."
                      className="w-full p-3 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Observações Internas / Queixas</label>
                    <input
                      type="text"
                      value={clinicalNotes}
                      onChange={e => setClinicalNotes(e.target.value)}
                      placeholder="Ex: Paciente relata sensibilidade ao frio no 1º quadrante"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === SECTION 4: BUDGET & PAYMENT CONDITIONS === */}
          {modalSection === 'BUDGET' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-500" />
                      Condições de Pagamento & Orçamento
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Simule entradas, parcelamento e defina a validade da proposta comercial.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrintDocument}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-xl font-black text-xs flex items-center gap-1.5"
                  >
                    <Printer size={15} />
                    <span>Imprimir Proposta</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-bold">
                  {/* Payment Method */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Forma de Pagamento Principal</label>
                    <select
                      value={budgetPaymentMethod}
                      onChange={e => setBudgetPaymentMethod(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="PIX">PIX (Chave / QR Code)</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="DINHEIRO">Dinheiro em Espécie</option>
                      <option value="TRANSFERENCIA">Transferência / TED</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>

                  {/* Validity Days */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Validade do Orçamento (Dias)</label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={budgetValidityDays}
                      onChange={e => setBudgetValidityDays(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  {/* Down Payment */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Entrada / Sinal (R$)</label>
                    <input
                      type="number"
                      min="0"
                      value={budgetDownPayment}
                      onChange={e => setBudgetDownPayment(Number(e.target.value))}
                      placeholder="R$ 0,00"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                {/* Installments Simulator Box */}
                <div className="bg-slate-50 dark:bg-[#131B2A] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Simulador de Parcelamento</h4>
                    <span className="text-xs font-black text-indigo-600">Total a Financiar: R$ {installmentCalc.remaining.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Número de Parcelas</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={budgetInstallments}
                          onChange={e => setBudgetInstallments(Number(e.target.value))}
                          className="flex-1 p-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none text-xs font-bold"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24].map(n => (
                            <option key={n} value={n}>{n}x {n === 1 ? '(À vista)' : 'vezes'}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#1E293B] p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block">Condição Calculada</span>
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                        {budgetDownPayment > 0 ? `Entrada de R$ ${budgetDownPayment.toFixed(2)} + ` : ''}
                        {installmentCalc.count}x de R$ {installmentCalc.value.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Budget Notes */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Observações Financeiras</label>
                  <input
                    type="text"
                    value={budgetNotes}
                    onChange={e => setBudgetNotes(e.target.value)}
                    placeholder="Ex: Primeira parcela no início do tratamento, demais a cada 30 dias via cartão de crédito"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* === SECTION 5: PATIENT ACCEPTANCE === */}
          {modalSection === 'ACCEPTANCE' && (
            <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <UserCheck size={18} className="text-teal-500" />
                    Fluxo de Aceite & Termo do Paciente
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Formalize a aceitação do plano pelo paciente ou responsável antes do início dos procedimentos.
                  </p>
                </div>

                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                  acceptanceStatus === 'ACEITO'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : acceptanceStatus === 'RECUSADO'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {acceptanceStatus === 'ACEITO' ? 'Plano Aceito' : acceptanceStatus === 'RECUSADO' ? 'Plano Recusado' : 'Aguardando Aceite'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Status do Aceite</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: 'AGUARDANDO_ACEITE', label: 'Aguardando', color: 'border-amber-400 text-amber-700' },
                        { val: 'ACEITO', label: 'Aceito', color: 'border-emerald-500 text-emerald-700' },
                        { val: 'RECUSADO', label: 'Recusado', color: 'border-rose-400 text-rose-700' }
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => {
                            setAcceptanceStatus(item.val as any);
                            if (item.val === 'ACEITO') {
                              setPlanStatus('ACEITO');
                            }
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-black uppercase transition-all border ${
                            acceptanceStatus === item.val
                              ? `${item.color} bg-slate-50 dark:bg-slate-800 shadow-sm font-black`
                              : 'bg-white dark:bg-[#131B2A] text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Nome do Paciente / Responsável que Aceitou</label>
                    <input
                      type="text"
                      value={acceptedBy}
                      onChange={e => setAcceptedBy(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Data do Aceite</label>
                    <input
                      type="date"
                      value={acceptedAt}
                      onChange={e => setAcceptedAt(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Observações do Aceite</label>
                    <textarea
                      rows={4}
                      value={acceptanceNotes}
                      onChange={e => setAcceptanceNotes(e.target.value)}
                      placeholder="Ex: Paciente aceitou a proposta com parcelamento em 6x e agendou a primeira sessão de limpeza para a próxima terça."
                      className="w-full p-3 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none leading-relaxed"
                    />
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                    <p className="font-black text-xs flex items-center gap-1.5">
                      <ShieldCheck size={16} /> Registro Seguro de Consentimento
                    </p>
                    <p className="text-[11px] font-medium mt-1">
                      Ao registrar o aceite, o sistema atualiza o status do plano e permite gerar os lançamentos financeiros correspondentes na clínica.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === SECTION 6: FINANCIAL INTEGRATION === */}
          {modalSection === 'FINANCE' && (
            <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <Receipt size={18} className="text-teal-500" />
                    Integração com o Financeiro da Clínica
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Conecte o plano de tratamento ao fluxo de caixa da clínica sem retrabalho.
                  </p>
                </div>
              </div>

              {/* Financial Dashboard Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Valor do Tratamento</span>
                  <p className="text-xl font-black text-indigo-950 dark:text-white mt-1">
                    R$ {finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 font-medium">{procedures.length} procedimentos</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Entrada / Sinal</span>
                  <p className="text-xl font-black text-emerald-950 dark:text-white mt-1">
                    R$ {(budgetDownPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 font-medium">À vista</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">Contas a Receber</span>
                  <p className="text-xl font-black text-blue-950 dark:text-white mt-1">
                    R$ {installmentCalc.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-blue-600/80 dark:text-blue-400 font-medium">
                    {installmentCalc.count}x de R$ {installmentCalc.value.toFixed(2)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status do Plano</span>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                    {STATUS_CONFIG[planStatus]?.label}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">Aceite: {acceptanceStatus}</span>
                </div>
              </div>

              {financeSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>{financeSuccessMsg}</span>
                </div>
              )}

              {/* Action Button to launch entries */}
              <div className="bg-slate-50 dark:bg-[#131B2A] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">Gerar Lançamentos no Financeiro do Paciente</h4>
                  <p className="text-xs text-slate-500">
                    Cria automaticamente as parcelas e contas a receber no módulo de financeiro da clínica para controle de quitações.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateFinancialEntries}
                  disabled={isGeneratingFinance || finalAmount <= 0}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <Receipt size={16} />
                  <span>{isGeneratingFinance ? 'Gerando...' : 'Lançar no Financeiro'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-white dark:bg-[#1E293B] px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2">
            <span>{procedures.length} procedimentos</span>
            <span>•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-black">Total: R$ {finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleSaveTreatmentPlan}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Plano de Tratamento'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* === SUB-MODAL: ADD / EDIT PROCEDURE === */}
      {showAddProcedure && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 text-slate-800">
          <div className="bg-white dark:bg-[#1E293B] w-full max-w-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Plus size={18} className="text-teal-600" />
                {editingProcId ? 'Editar Procedimento' : 'Novo Procedimento'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProcedure(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold">
              {/* Quick Service Selector from ClinicServices */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Selecionar do Catálogo de Procedimentos</label>
                <select
                  value={procServiceId}
                  onChange={e => handleSelectService(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">-- Selecionar ou digitar personalizado --</option>
                  {clinicServices.map(srv => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} — R$ {srv.price?.toFixed(2)} ({srv.category || 'Geral'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Nome do Procedimento *</label>
                  <input
                    type="text"
                    required
                    value={procName}
                    onChange={e => setProcName(e.target.value)}
                    placeholder="Ex: Restauração Resina 1 Face"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Categoria</label>
                  <input
                    type="text"
                    value={procCategory}
                    onChange={e => setProcCategory(e.target.value)}
                    placeholder="Ex: Dentística, Prótese..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Teeth & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Dente(s) (separados por vírgula)</label>
                  <input
                    type="text"
                    value={procTeeth.join(', ')}
                    onChange={e => {
                      const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setProcTeeth(list);
                      if (list.length > 0) setProcQty(list.length);
                    }}
                    placeholder="Ex: 16, 26"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={procQty}
                    onChange={e => setProcQty(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Price & Discount */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Valor Unitário (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={procUnitPrice}
                    onChange={e => setProcUnitPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Desconto</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={procDiscountType}
                      onChange={e => setProcDiscountType(e.target.value as any)}
                      className="p-2 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    >
                      <option value="VALUE">R$</option>
                      <option value="PERCENT">%</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={procDiscountVal}
                      onChange={e => setProcDiscountVal(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Prioridade</label>
                  <select
                    value={procPriority}
                    onChange={e => setProcPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Status & Lab Requirement */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Status Inicial</label>
                  <select
                    value={procStatus}
                    onChange={e => setProcStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="PLANEJADO">Planejado</option>
                    <option value="AGUARDANDO">Aguardando</option>
                    <option value="AGENDADO">Agendado</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="CONCLUIDO">Concluído</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={procLabRequired}
                      onChange={e => setProcLabRequired(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Requer Laboratório (Prótese)</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Observações Clínicas do Procedimento</label>
                <input
                  type="text"
                  value={procNotes}
                  onChange={e => setProcNotes(e.target.value)}
                  placeholder="Ex: Cor A2, isolamento absoluto recomendado"
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddProcedure(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveProcedure}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>Salvar Procedimento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === SUB-MODAL: QUICK SCHEDULE APPOINTMENT === */}
      {schedulingProc && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 text-slate-800">
          <div className="bg-white dark:bg-[#1E293B] w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <CalendarPlus size={18} className="text-blue-600" />
                Agendar Consulta
              </h3>
              <button
                type="button"
                onClick={() => setSchedulingProc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-300">
              <p className="font-black">Procedimento: {schedulingProc.name}</p>
              <p className="text-[11px] mt-0.5">Dente(s): {schedulingProc.teeth?.join(', ') || 'Geral'}</p>
            </div>

            <div className="space-y-3 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Data</label>
                  <input
                    type="date"
                    value={schedDate}
                    onChange={e => setSchedDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Horário</label>
                  <input
                    type="time"
                    value={schedTime}
                    onChange={e => setSchedTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Sala</label>
                  <select
                    value={schedRoomId}
                    onChange={e => setSchedRoomId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="">Geral / Sem sala fixa</option>
                    {clinicRooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Duração (Min)</label>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    value={schedDuration}
                    onChange={e => setSchedDuration(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Dentista Responsável</label>
                <select
                  value={schedDentistId}
                  onChange={e => setSchedDentistId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                >
                  {clinicDentists.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Observações do Agendamento</label>
                <input
                  type="text"
                  value={schedNotes}
                  onChange={e => setSchedNotes(e.target.value)}
                  placeholder="Ex: Primeira sessão de preparo"
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSchedulingProc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmSchedule}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <CalendarPlus size={16} />
                <span>Confirmar Agendamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === SUB-MODAL: QUICK COMPLETE PROCEDURE === */}
      {completingProc && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 text-slate-800">
          <div className="bg-white dark:bg-[#1E293B] w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-600" />
                Concluir Procedimento
              </h3>
              <button
                type="button"
                onClick={() => setCompletingProc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-xl text-xs text-emerald-900 dark:text-emerald-300">
              <p className="font-black">Procedimento: {completingProc.name}</p>
              <p className="text-[11px] mt-0.5">Dente(s): {completingProc.teeth?.join(', ') || 'Geral'}</p>
            </div>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Profissional que Executou</label>
                <input
                  type="text"
                  value={completeDentistName}
                  onChange={e => setCompleteDentistName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Notas de Execução Clínica</label>
                <textarea
                  rows={3}
                  value={completeNotes}
                  onChange={e => setCompleteNotes(e.target.value)}
                  placeholder="Ex: Procedimento executado com sucesso sob anestesia local. Oclusão checada e paciente orientado."
                  className="w-full p-3 bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCompletingProc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmComplete}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>Confirmar Conclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
