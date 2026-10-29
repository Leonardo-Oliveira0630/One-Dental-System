import logger from "../utils/logger";

import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole, JobItem, LabRating, Job, DeliveryRoute, Attachment, JobNature, JobItemExecution, SectorMovement, CommissionStatus, JobProduct, PermissionKey } from '../types';
import { 
  ArrowLeft, Calendar, Stethoscope, User, Clock, MapPin, Camera as CameraIcon,
  FileText, DollarSign, CheckCircle, AlertTriangle, AlertCircle,
  Printer, Box, Layers, ListChecks, Bell, Edit, Save, X, Plus, Trash2, Settings,
  LogIn, LogOut, Flag, CheckSquare, File as FileIcon, Download, Loader2, CreditCard, ExternalLink, Copy, Check, Star, UploadCloud, ChevronDown, CheckCircle2, Truck, Navigation, RotateCcw, MessageCircle, MessageSquare, Lock, Crown, FileCode, FileSpreadsheet, FileWarning, XCircle, ArrowLeftCircle, ScanBarcode, Briefcase, Search, ArrowRightCircle, RefreshCw, Edit3, Package, Smartphone, Sliders,
  Eye, Edit2, LayoutGrid, List as ListIcon, Image as ImageLucide, Pin, StickyNote
} from 'lucide-react';
import { CreateAlertModal } from '../components/AlertSystem';
import { ChatSystem } from '../components/ChatSystem';
import { CaseApprovalSystem } from '../components/CaseApprovalSystem';
import { AttachmentPreviewModal, handleDownloadFile } from '../components/AttachmentPreviewModal';
import { calculateItemCommission } from '../utils/commissionUtils';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { formatTeethRange } from '../utils/toothUtils';
import { smartCompress } from '../services/compressionService';
import * as api from '../services/firebaseService';
import * as firestorePkg from 'firebase/firestore';
import { Odontogram } from '../components/Odontogram';
import { db } from '../services/firebaseConfig';
import { getCarrierBadgeConfig } from '../services/frenetService';
import { LabServiceReviewModal } from '../components/LabServiceReviewModal';
import { WebcamModal } from '../components/WebcamModal';
import { capturePhotoWithNativePreference, isMobileDevice } from '../utils/cameraUtils';
import { filterAndSortClients, filterAndSortProducts, matchesSearchQuery, normalizeText } from '../utils/stringUtils';

const { doc, onSnapshot, deleteField, collection, getDocs } = firestorePkg as any;
import { getTodayDateStr, normalizeRouteDate, isAfter12PM, createMiddayDate } from '../utils/dateHelpers';

const STLViewer = React.lazy(() => import('../components/STLViewer').then(module => ({ default: module.STLViewer })));

export const parseDateSafely = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val.seconds) return new Date(val.seconds * 1000);
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    return null;
};

export const getNaturePrefix = (nature?: string) => {
    if (!nature) return '';
    const n = String(nature).toUpperCase();
    if (n === 'REPETITION' || n === 'REPETICAO' || n === 'REPETIÇÃO') return '(R) ';
    if (n === 'ADJUSTMENT' || n === 'AJUSTE') return '(A) ';
    return '';
};

export const formatItemNameWithVariations = (item: JobItem, jobTypes: any[]) => {
    const jt = jobTypes.find(t => t.id === item.jobTypeId);
    if (!jt || ((!jt.variationGroups || jt.variationGroups.length === 0) && (!jt.variations || jt.variations.length === 0))) return item.name;
    const groups = (jt.variationGroups && jt.variationGroups.length > 0) ? jt.variationGroups : [{ id: 'default', name: 'Opções', options: jt.variations || [] }];
    
    const parts: string[] = [];
    item.selectedVariationIds?.forEach(optId => {
        for (const group of groups) {
            const opt = group.options.find((o: any) => o.id === optId);
            if (opt) {
                if (group.selectionType === 'TEXT' && item.variationValues?.[optId]) {
                    parts.push(`${group.name}: ${item.variationValues[optId]}`);
                } else {
                    parts.push(opt.name); // only include option name directly for brevity, or `group.name: opt.name`
                }
            }
        }
    });
    
    if (parts.length > 0) {
        return `${item.name} - ${parts.join(' - ')}`;
    }
    return item.name;
};

const parseSafeDate = (d: any) => {
    if (!d) return null;
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    if (typeof d === 'object' && typeof d.toDate === 'function') return d.toDate();
    if (typeof d === 'object' && d.seconds !== undefined) return new Date(d.seconds * 1000);
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
};

export const calculateItemPriceWithDentist = (
  jobType: any | undefined,
  selectedVariationIds: string[],
  dentist: any | null,
  priceTables: any[]
) => {
  if (!jobType) return 0;
  
  let basePrice = jobType.basePrice || 0;
  let dentistDiscountRate = 0;
  
  if (dentist) {
      if (dentist.priceTableId) {
          const table = priceTables.find(t => t.id === dentist.priceTableId);
          if (table && table.prices?.[jobType.id]?.basePrice !== undefined && table.prices[jobType.id].basePrice !== null && !isNaN(table.prices[jobType.id].basePrice)) {
              basePrice = Number(table.prices[jobType.id].basePrice);
          }
      }
      if (dentist.isCustomPricing) {
          const custom = dentist.customPrices?.find((p: any) => p.jobTypeId === jobType.id);
          if (custom) {
              if (custom.fixedPrice !== undefined && custom.fixedPrice !== null && !isNaN(custom.fixedPrice) && Number(custom.fixedPrice) >= 0) {
                  basePrice = Number(custom.fixedPrice);
                  dentistDiscountRate = 0;
              } else if (custom.discountPercent !== undefined && custom.discountPercent !== null && !isNaN(custom.discountPercent)) {
                  dentistDiscountRate = Number(custom.discountPercent) / 100;
              } else if (custom.price !== undefined && custom.price !== null && !isNaN(custom.price) && Number(custom.price) > 0) {
                  basePrice = Number(custom.price);
                  dentistDiscountRate = 0;
              } else if (dentist.globalDiscountPercent !== undefined && dentist.globalDiscountPercent !== null && !isNaN(dentist.globalDiscountPercent)) {
                  dentistDiscountRate = Number(dentist.globalDiscountPercent) / 100;
              }
          } else if (dentist.globalDiscountPercent !== undefined && dentist.globalDiscountPercent !== null && !isNaN(dentist.globalDiscountPercent)) {
              dentistDiscountRate = Number(dentist.globalDiscountPercent) / 100;
          }
      } else if (dentist.globalDiscountPercent !== undefined && dentist.globalDiscountPercent !== null && !isNaN(dentist.globalDiscountPercent)) {
          dentistDiscountRate = Number(dentist.globalDiscountPercent) / 100;
      }
  }

  let discountableSum = basePrice;
  let exemptSum = 0;
  
  selectedVariationIds.forEach(selectedId => {
    jobType.variationGroups?.forEach((group: any) => {
      const option = group.options.find((opt: any) => opt.id === selectedId);
      if (option) {
          let modifier = option.priceModifier || 0;
          let isCustomFixedVariation = false;
          
          if (dentist) {
              if (dentist.priceTableId) {
                  const table = priceTables.find(t => t.id === dentist.priceTableId);
                  if (table && table.prices?.[jobType.id]?.variations?.[option.id] !== undefined && table.prices[jobType.id].variations[option.id] !== null && !isNaN(table.prices[jobType.id].variations[option.id])) {
                      modifier = Number(table.prices[jobType.id].variations[option.id]);
                  }
              }
              if (dentist.isCustomPricing) {
                  const custom = dentist.customPrices?.find((p: any) => p.jobTypeId === jobType.id);
                  if (custom && custom.variations && custom.variations[option.id] !== undefined && custom.variations[option.id] !== null && !isNaN(custom.variations[option.id])) {
                      modifier = Number(custom.variations[option.id]);
                      isCustomFixedVariation = true;
                  }
              }
          }

          if (isCustomFixedVariation || option.isDiscountExempt) {
              exemptSum += modifier;
          } else {
              discountableSum += modifier;
          }
      }
    });
  });

  return (discountableSum * (1 - dentistDiscountRate)) + exemptSum;
};

export const JobDetails = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { jobs, budgets, updateJob, updateJobType, triggerPrint, currentUser, jobTypes, sectors, uploadFile, addJobToRoute, currentOrg, activeOrganization, allUsers, manualDentists, priceTables, inventoryItems, updateInventoryItem, couriers, onlineRequisitions, currentPlan, updateOnlineRequisition, boxColors, routes } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'HISTORY' | 'CHAT' | 'PRODUCTION'>('SUMMARY');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [allAttachmentsForPreview, setAllAttachmentsForPreview] = useState<Attachment[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDentistId, setEditDentistId] = useState('');
  const [editDentistName, setEditDentistName] = useState('');
  const [editSubDentistName, setEditSubDentistName] = useState('');
  const [dentistSearchQuery, setDentistSearchQuery] = useState('');
  const [showDentistSuggestions, setShowDentistSuggestions] = useState(false);
  const [selectedDentistObj, setSelectedDentistObj] = useState<any>(null);
  
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [editingExecution, setEditingExecution] = useState<{
      item: JobItem,
      sector: string,
      stageName?: string,
      userId: string,
      entryTime: string,
      exitTime: string,
      originalExecution?: JobItemExecution | null,
      originalMovement?: SectorMovement | null
  } | null>(null);

  const { commissions, addCommissionRecord, deleteCommissionRecord, updateCommissionRecord, commissionGroups } = useApp();
  const labUsers = useMemo(() => allUsers.filter(u => u.role !== UserRole.CLIENT), [allUsers]);

  const [showRouteModal, setShowRouteModal] = useState(false);
  const [isCasesDropdownOpen, setIsCasesDropdownOpen] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [editingCommentAttId, setEditingCommentAttId] = useState<string | null>(null);
  const [commentDraftText, setCommentDraftText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [attachmentViewFilter, setAttachmentViewFilter] = useState<'ALL' | 'IMAGE' | 'STL' | 'DOC'>('ALL');

  const formatAttachmentDateTime = (dateVal?: any) => {
    if (!dateVal) return '';
    const d = dateVal instanceof Date 
      ? dateVal 
      : dateVal?.seconds 
        ? new Date(dateVal.seconds * 1000) 
        : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const dateStr = d.toLocaleDateString('pt-BR');
    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} às ${timeStr}`;
  };
  const [expandedItemIdx, setExpandedItemIdx] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemEditTeethInput, setItemEditTeethInput] = useState('');
  const [itemEditForm, setItemEditForm] = useState<{
    quantity: number | string;
    nature?: 'NORMAL' | 'REPETITION' | 'ADJUSTMENT';
    price: number | string;
    appliedDiscount: number | string;
    appliedDiscountFixed: number | string;
    discountType: 'PERCENTAGE' | 'FIXED';
    appliedPriceTable: string;
    commissionDisabled: boolean;
    isInternalStep: boolean;
    selectedVariationIds: string[];
    variationValues: Record<string, string>;
    sectorCommissionDisabled: Record<string, boolean>;
    selectedTeeth: string[];
    color: string;
    priceAdjustmentType?: 'DISCOUNT' | 'SURCHARGE';
    appliedSurcharge?: number | string;
    appliedSurchargeFixed?: number | string;
  }>({ quantity: 1, nature: 'NORMAL', price: 0, appliedDiscount: 0, appliedDiscountFixed: 0, priceAdjustmentType: 'DISCOUNT', appliedSurcharge: 0, appliedSurchargeFixed: 0, discountType: 'PERCENTAGE', appliedPriceTable: 'Padrão', commissionDisabled: false, isInternalStep: false, selectedVariationIds: [], variationValues: {}, sectorCommissionDisabled: {}, selectedTeeth: [], color: '' });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [freeLabEditingNotes, setFreeLabEditingNotes] = useState(false);
  const [freeLabNotesText, setFreeLabNotesText] = useState('');
  const [isSyncingTracking, setIsSyncingTracking] = useState(false);
  const [trackingSyncMsg, setTrackingSyncMsg] = useState<string | null>(null);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [newTrackingCode, setNewTrackingCode] = useState('');
  const [newShippingCarrier, setNewShippingCarrier] = useState('');

  const handleSyncJobFrenetTracking = async () => {
    if (!job?.trackingCode) return;
    setIsSyncingTracking(true);
    setTrackingSyncMsg(null);
    try {
      const res = await api.apiTrackFrenetShipping({
        trackingCode: job.trackingCode,
        frenetToken: currentOrg?.frenetToken,
        jobId: job.id
      });
      if (res.success) {
        setTrackingSyncMsg('Rastreamento atualizado com sucesso!');
      } else {
        setTrackingSyncMsg(res.error || 'Nenhuma atualização recente no momento.');
      }
    } catch (e: any) {
      setTrackingSyncMsg('Erro ao consultar Frenet: ' + (e.message || 'Falha de conexão'));
    } finally {
      setIsSyncingTracking(false);
      setTimeout(() => setTrackingSyncMsg(null), 5000);
    }
  };

  const handleSaveJobShipping = async () => {
    if (!job) return;
    setIsUpdatingStatus(true);
    try {
      await updateJob(job.id, {
        trackingCode: newTrackingCode.trim(),
        shippingCarrier: newShippingCarrier.trim(),
        shippingMethod: newShippingCarrier ? 'FRENET' : job.shippingMethod
      });
      setIsEditingShipping(false);
      alert('Dados de rastreamento salvos com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar dados de envio.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Stage Config Modal State
  const [stageConfigItem, setStageConfigItem] = useState<JobItem | null>(null);
  const [expandedStageSectors, setExpandedStageSectors] = useState<Record<string, boolean>>({});
  const [tempItemStages, setTempItemStages] = useState<Record<string, string[]>>({});
  const [tempStageQuantities, setTempStageQuantities] = useState<Record<string, Record<string, number>>>({});
  const [newStageInputs, setNewStageInputs] = useState<Record<string, string>>({});

  const handleOpenStageConfig = (item: JobItem) => {
    setStageConfigItem(item);
    setNewStageInputs({});
    const jt = jobTypes.find(t => t.id === item.jobTypeId);
    const itemStages = item.sectorStages || {};
    const jtStages = jt?.sectorStages || {};
    const initialStages: Record<string, string[]> = {};
    const initialQuantities: Record<string, Record<string, number>> = {};
    const itemQty = item.quantity || 1;

    sectors.forEach(s => {
      let rawList: string[] = [];
      if (itemStages[s.name] !== undefined) {
        rawList = itemStages[s.name];
      } else if (jtStages[s.name] !== undefined) {
        rawList = jtStages[s.name];
      } else {
        rawList = s.stages || [];
      }

      const list = rawList.filter(stg => typeof stg === 'string' && stg.trim() !== '');

      if (list.length > 0) {
        initialStages[s.name] = list;
        initialQuantities[s.name] = {};
        const secQty = (item.sectorQuantities && item.sectorQuantities[s.name] !== undefined)
          ? item.sectorQuantities[s.name]
          : itemQty;
        list.forEach(stg => {
          const rawQ = item.stageQuantities?.[s.name]?.[stg];
          if (rawQ !== undefined && rawQ > 0) {
            initialQuantities[s.name][stg] = rawQ;
          } else {
            initialQuantities[s.name][stg] = secQty;
          }
        });
      }
    });

    setTempItemStages(initialStages);
    setTempStageQuantities(initialQuantities);
    const initialExpanded: Record<string, boolean> = {};
    sectors.forEach(s => {
      if ((s.stages && s.stages.length > 0) || (initialStages[s.name] && initialStages[s.name].length > 0)) {
        initialExpanded[s.name] = true;
      }
    });
    setExpandedStageSectors(initialExpanded);
  };

  const handleAddCustomStage = (sectorName: string) => {
    const stageName = (newStageInputs[sectorName] || '').trim();
    if (!stageName) return;

    const current = tempItemStages[sectorName] || [];
    if (current.includes(stageName)) {
      alert("Esta etapa já foi adicionada a este setor.");
      return;
    }

    const secQty = (stageConfigItem?.sectorQuantities && stageConfigItem.sectorQuantities[sectorName] !== undefined)
      ? stageConfigItem.sectorQuantities[sectorName]
      : (stageConfigItem?.quantity || 1);

    const next = [...current, stageName];
    setTempItemStages(prev => ({ ...prev, [sectorName]: next }));
    setTempStageQuantities(prev => ({
      ...prev,
      [sectorName]: {
        ...(prev[sectorName] || {}),
        [stageName]: secQty
      }
    }));
    setNewStageInputs(prev => ({ ...prev, [sectorName]: '' }));
  };

  const handleSaveStageConfig = async () => {
    if (!stageConfigItem || !job) return;
    setIsUpdatingStatus(true);
    try {
      const sanitizedStages: Record<string, string[]> = {};
      const sanitizedQuantities: Record<string, Record<string, number>> = {};

      Object.entries(tempItemStages).forEach(([sec, stgs]) => {
        const valid = stgs.filter(s => typeof s === 'string' && s.trim() !== '');
        if (valid.length > 0) {
          sanitizedStages[sec] = valid;
          sanitizedQuantities[sec] = tempStageQuantities[sec] || {};
        }
      });

      const updatedItems = job.items.map((i: any) => {
        if (i.id === stageConfigItem.id) {
          return {
            ...i,
            sectorStages: sanitizedStages,
            stageQuantities: sanitizedQuantities
          };
        }
        return i;
      });

      const jType = jobTypes.find(t => t.id === stageConfigItem.jobTypeId);
      if (jType && updateJobType) {
        const configuredSectors = Object.keys(sanitizedStages);
        let newAllowed = jType.allowedSectors || [];
        if (newAllowed.length > 0) {
          newAllowed = Array.from(new Set([...newAllowed, ...configuredSectors]));
        }
        await updateJobType(jType.id, { 
          sectorStages: sanitizedStages,
          allowedSectors: newAllowed.length > 0 ? newAllowed : undefined
        });
      }

      await updateJob(job.id, { items: updatedItems });
      await recalculateAllCommissions(updatedItems, job.itemExecutions || []);
      setStageConfigItem(null);
      alert("Etapas do serviço salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar etapas do serviço:", err);
      alert("Erro ao salvar etapas do serviço.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Rejection/Cancellation Modal States
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionTargetStatus, setRejectionTargetStatus] = useState<JobStatus | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [isRejectionRequisition, setIsRejectionRequisition] = useState(false);

  const handleConfirmRejectionStatus = async () => {
    if (!currentUser || !job) return;
    if (!rejectionReasonText.trim()) {
      alert("Por favor, informe a justificativa da recusa/cancelamento.");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      if (isRejectionRequisition) {
        // Rejecting a pending pseudo requisition
        const reqId = id?.replace('pseudo_req_', '');
        if (reqId) {
          await updateOnlineRequisition(currentUser?.organizationId || '', reqId, {
            status: 'REJECTED',
            rejectionReason: rejectionReasonText.trim()
          });
          alert("Requisição recusada com sucesso.");
          setShowRejectionModal(false);
          setRejectionReasonText('');
          navigate('/incoming-requisitions');
        }
      } else {
        // Rejecting a normal job
        await updateJob(job.id, {
          status: rejectionTargetStatus || JobStatus.REJECTED,
          rejectionReason: rejectionReasonText.trim(),
          rejectedAt: new Date(),
          history: [...(job.history || []).filter(Boolean), {
            id: `hist_stat_${Date.now()}`,
            timestamp: new Date(),
            action: `Trabalho Recusado/Cancelado. Motivo: ${rejectionReasonText.trim()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            sector: currentUser.sector || 'Geral'
          }]
        });
        alert("Trabalho recusado/cancelado com sucesso.");
        setShowRejectionModal(false);
        setRejectionReasonText('');
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao realizar a operação.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAcceptRequisitionFromDetails = () => {
    if (!isPseudo || !currentUser) return;
    const reqId = id?.replace('pseudo_req_', '');
    const req = (onlineRequisitions || []).find(x => x.id === reqId);
    if (!req) return;

    let items: JobItem[] = [];
    if (req.items && req.items.length > 0) {
        items = req.items.map((reqItem, idx) => {
            const service = jobTypes.find(t => t.id === reqItem.serviceId);
            const basePrice = service ? service.basePrice : 0;
            return {
              id: `item_${Date.now()}_${idx}`,
              jobTypeId: reqItem.serviceId,
              name: reqItem.serviceName,
              quantity: reqItem.quantity && reqItem.quantity > 0 ? reqItem.quantity : 1,
              price: basePrice,
              nature: 'NORMAL',
              selectedVariationIds: reqItem.selectedVariationIds || [],
              selectedTeeth: reqItem.selectedTeeth || [],
              sectorStages: service?.sectorStages ? JSON.parse(JSON.stringify(service.sectorStages)) : undefined,
              stageQuantities: service?.stageQuantities ? JSON.parse(JSON.stringify(service.stageQuantities)) : undefined
            };
        });
    } else {
        const service = jobTypes.find(t => t.id === req.serviceId);
        const basePrice = service ? service.basePrice : 0;
        items = [{
          id: `item_${Date.now()}`,
          jobTypeId: req.serviceId,
          name: req.serviceName,
          quantity: req.quantity && req.quantity > 0 ? req.quantity : 1,
          price: basePrice,
          nature: 'NORMAL',
          selectedVariationIds: req.selectedVariationIds || [],
          selectedTeeth: req.selectedTeeth || [],
          sectorStages: service?.sectorStages ? JSON.parse(JSON.stringify(service.sectorStages)) : undefined,
          stageQuantities: service?.stageQuantities ? JSON.parse(JSON.stringify(service.stageQuantities)) : undefined
        }];
    }

    navigate('/new-job', {
      state: {
        patientName: req.patientName,
        dentistId: req.dentistId,
        dentistManualId: req.dentistManualId,
        dentistName: req.dentistName,
        items: items,
        notes: req.notes || '',
        origin: 'ONLINE_REQUISITION',
        requisitionId: req.id,
        attachments: req.attachments || []
      }
    });
  };

  const handleRejectRequisitionFromDetails = () => {
    setIsRejectionRequisition(true);
    setRejectionTargetStatus(null);
    setRejectionReasonText('');
    setShowRejectionModal(true);
  };
  
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const handleTakePhotoClick = async () => {
    await capturePhotoWithNativePreference(
      (file) => {
        setSelectedFiles(prev => [...prev, file]);
      },
      () => {
        setIsWebcamOpen(true);
      }
    );
  };

  const [routeInfo, setRouteInfo] = useState<DeliveryRoute | null>(null);
  const [routeDriver, setRouteDriver] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [routeShift, setRouteShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [routeDate, setRouteDate] = useState(getTodayDateStr());
  const [routeObservations, setRouteObservations] = useState('');

  const [showCancelDeliveryModal, setShowCancelDeliveryModal] = useState(false);
  const [cancelDeliveryReason, setCancelDeliveryReason] = useState('');
  const [isCancellingDelivery, setIsCancellingDelivery] = useState(false);

  const [isHeaderStatusMenuOpen, setIsHeaderStatusMenuOpen] = useState(false);
  const [isActionStatusMenuOpen, setIsActionStatusMenuOpen] = useState(false);

  const todayStr = useMemo(() => getTodayDateStr(), []);
  const isPast12PM = useMemo(() => isAfter12PM(), []);

  // Rule 8.5: After 12:00 PM on today's date, automatically force AFTERNOON shift
  useEffect(() => {
    if (routeDate === todayStr && isPast12PM && routeShift === 'MORNING') {
        setRouteShift('AFTERNOON');
    }
  }, [routeDate, todayStr, isPast12PM, routeShift]);

  // Active open routes for selected date
  const openRoutesForShift = useMemo(() => {
    if (!routes || !Array.isArray(routes)) return [];
    return routes.filter(r => {
      const rDateStr = normalizeRouteDate(r.date);
      return rDateStr === routeDate && r.status !== 'COMPLETED';
    });
  }, [routes, routeDate]);

  const [showReturnModal, setShowReturnModal] = useState(false);

  const isPseudo = id?.startsWith('pseudo_req_');
  
  const resolvedJob = useMemo(() => {
    if (isPseudo) {
      const reqId = id?.replace('pseudo_req_', '');
      const r = (onlineRequisitions || []).find(x => x.id === reqId);
      if (r) {
        return {
          id: `pseudo_req_${r.id}`,
          osNumber: 'REQ-' + r.id.substring(0, 5).toUpperCase(),
          patientName: r.patientName,
          dentistId: r.dentistManualId || r.dentistId,
          dentistName: r.dentistName,
          status: (r.status === 'PENDING' ? 'PENDING_REQUISITION' : 'REJECTED_REQUISITION') as any,
          urgency: 'NORMAL',
          items: [{
            id: `pseudo_item_${r.id}`,
            jobTypeId: r.serviceId,
            name: r.serviceName,
            quantity: r.quantity || 1,
            price: 0,
            selectedVariationIds: r.selectedVariationIds || []
          }],
          history: [],
          createdAt: r.createdAt instanceof Date ? r.createdAt : (r.createdAt ? new Date((r.createdAt as any).seconds * 1000 || r.createdAt) : new Date()),
          dueDate: r.createdAt instanceof Date ? r.createdAt : (r.createdAt ? new Date((r.createdAt as any).seconds * 1000 || r.createdAt) : new Date()),
          totalValue: 0,
          notes: r.notes || '',
          origin: 'ONLINE_REQUISITION',
          attachments: r.attachments || [],
          isPseudo: true,
          labName: r.labName || 'Laboratório',
          rejectionReason: r.rejectionReason,
          sentAt: r.sentAt instanceof Date ? r.sentAt : (r.sentAt ? new Date((r.sentAt as any).seconds * 1000 || r.sentAt) : (r.createdAt instanceof Date ? r.createdAt : (r.createdAt ? new Date((r.createdAt as any).seconds * 1000 || r.createdAt) : new Date()))),
          acceptedAt: r.acceptedAt instanceof Date ? r.acceptedAt : (r.acceptedAt ? new Date((r.acceptedAt as any).seconds * 1000 || r.acceptedAt) : undefined),
          rejectedAt: r.rejectedAt instanceof Date ? r.rejectedAt : (r.rejectedAt ? new Date((r.rejectedAt as any).seconds * 1000 || r.rejectedAt) : undefined)
        } as any;
      }
    }
    const foundJob = jobs.find(j => j.id === id);
    if (foundJob) return foundJob;
    const foundBudget = budgets?.find(b => b.id === id);
    if (foundBudget) {
        let parsedDate = foundBudget.createdAt ? (foundBudget.createdAt instanceof Date ? foundBudget.createdAt : new Date(((foundBudget.createdAt as any).seconds || 0) * 1000 || foundBudget.createdAt)) : new Date();
        if (isNaN(parsedDate.getTime())) parsedDate = new Date();
        return { 
            ...foundBudget, 
            isBudget: true, 
            status: foundBudget.status || 'PENDING', 
            osNumber: foundBudget.osNumber || (foundBudget as any).budgetNumber,
            urgency: 'NORMAL',
            history: [],
            sectorMovements: [],
            items: foundBudget.items || [],
            products: foundBudget.products || [],
            createdAt: parsedDate,
            dueDate: parsedDate,
        } as any;
    }
    return undefined;
  }, [id, isPseudo, jobs, budgets, onlineRequisitions]);

  const job = resolvedJob;

  const currentDentistObj = useMemo(() => {
    if (!job?.dentistId) return null;
    return allUsers.find(u => u.id === job.dentistId) || manualDentists.find(d => d.id === job.dentistId) || null;
  }, [job?.dentistId, allUsers, manualDentists]);

  const clientAddressFormatted = useMemo(() => {
    if (!currentDentistObj) return '';
    const parts: string[] = [];
    if (currentDentistObj.address) {
      let line = currentDentistObj.address;
      if (currentDentistObj.number) line += `, ${currentDentistObj.number}`;
      if (currentDentistObj.complement) line += ` - ${currentDentistObj.complement}`;
      parts.push(line);
    }
    if (currentDentistObj.neighborhood) parts.push(currentDentistObj.neighborhood);
    if (currentDentistObj.city || currentDentistObj.state) {
      parts.push(`${currentDentistObj.city || ''}${currentDentistObj.city && currentDentistObj.state ? '/' : ''}${currentDentistObj.state || ''}`);
    }
    if (currentDentistObj.cep) parts.push(`CEP: ${currentDentistObj.cep}`);
    return parts.length > 0 ? parts.join(' - ') : (typeof currentDentistObj.address === 'string' ? currentDentistObj.address : '');
  }, [currentDentistObj]);

  const handleReturnAction = (action: 'PROSSEGUIMENTO' | 'AJUSTE' | 'REPETICAO') => {
    if (!job) return;
    
    // Auto-generate next sequence for OS
    const baseOs = (job.osNumber || 'RET').split('-')[0];
    const baseJobs = jobs.filter(j => String(j.osNumber || '').startsWith(baseOs));
    let nextSeq = 1;
    baseJobs.forEach(j => {
        const jOs = String(j.osNumber || '');
        if (jOs.includes('-')) {
            const seq = parseInt(jOs.split('-')[1]);
            if (!isNaN(seq) && seq >= nextSeq) {
                nextSeq = seq + 1;
            }
        } else {
            if (nextSeq === 1) nextSeq = 2;
        }
    });
    const nextOsNumber = job.isBudget ? job.osNumber : `${baseOs}-${nextSeq}`;

    if (action === 'PROSSEGUIMENTO') {
        navigate('/new-job', {
            state: {
                entryType: job.isBudget ? 'NEW' : 'CONTINUATION',
                fromBudget: job.isBudget ? job : undefined,
                patientName: job.patientName,
                dentistId: job.dentistId,
                dentistName: job.dentistName,
                subDentistName: job.subDentistName,
                osNumber: nextOsNumber,
                items: job.isBudget ? job.items : undefined,
                products: job.isBudget ? job.products : undefined,
                attachments: job.isBudget ? job.attachments : undefined,
                notes: job.notes
            }
        });
    } else {
        const newItems = job.items.map((item: any) => ({
            ...item,
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
            nature: action === 'AJUSTE' ? ('ADJUSTMENT' as JobNature) : ('REPETITION' as JobNature),
            commissionDisabled: true
        }));
        
        navigate('/new-job', {
            state: {
                entryType: 'CONTINUATION',
                patientName: job.patientName,
                dentistId: job.dentistId,
                dentistName: job.dentistName,
                subDentistName: job.subDentistName,
                osNumber: nextOsNumber,
                items: newItems,
                notes: job.notes
            }
        });
    }
  };
  
  useEffect(() => {
      if (job?.routeId && currentOrg) {
          const routeRef = doc(db, 'organizations', currentOrg.id, 'routes', job.routeId);
          const unsub = onSnapshot(routeRef, (snap: any) => {
              if (snap.exists()) {
                  const data = snap.data();
                  setRouteInfo({
                      id: snap.id,
                      ...data,
                      date: data.date?.toDate ? data.date.toDate() : data.date
                  } as DeliveryRoute);
              }
          }, (error: any) => {
              console.error("Error fetching route info:", error);
          });
          return () => unsub();
      } else {
          setRouteInfo(null);
      }
  }, [job?.routeId, currentOrg]);

  const isFreeLab = currentOrg?.orgType === 'LAB' && (currentPlan?.id === 'free_lab' || currentPlan?.features?.isLabFreeStoreOnly === true);
  const [editingCaseNotes, setEditingCaseNotes] = useState(false);
  const [caseNotesText, setCaseNotesText] = useState('');
  const [newCommentInput, setNewCommentInput] = useState('');

  useEffect(() => {
    if (job) {
      setCaseNotesText(job.caseNotes || '');
    }
  }, [job]);

  const handleAddQuickComment = async () => {
    if (!newCommentInput.trim() || !job) return;
    setIsUpdatingStatus(true);
    try {
      const formattedDate = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const author = currentUser?.name || 'Sistema';
      const commentText = newCommentInput.trim();
      const commentEntry = `${job.notes && job.notes.trim() ? '\n' : ''}[${formattedDate} - ${author}]: ${commentText}`;
      const updatedNotes = (job.notes ? job.notes.trim() : '') + commentEntry;

      await updateJob(job.id, {
        notes: updatedNotes,
        history: [...(job.history || []).filter(Boolean), {
          id: `hist_comment_${Date.now()}`,
          timestamp: new Date(),
          action: `Comentário/Nota adicionado ao caso: "${commentText}"`,
          userId: currentUser?.id || 'sys',
          userName: author
        }]
      });
      setNewCommentInput('');
    } catch (err) {
      alert("Erro ao adicionar comentário ao caso.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  const isManager = currentUser?.role === UserRole.MANAGER;
  const isCollaboratorRole = currentUser?.role !== UserRole.CLIENT && currentUser?.role !== UserRole.DENTIST && (currentUser as any)?.role !== 'DENTIST' && currentUser?.role !== UserRole.SUPPLIER;
  const isTech = isCollaboratorRole && !isAdmin && !isManager;
  const isClient = currentUser?.role === UserRole.CLIENT || currentUser?.role === UserRole.DENTIST || (currentUser as any)?.role === 'DENTIST' || currentOrg?.orgType === 'CLINIC';
  const isLabStaff = !isClient && (isAdmin || isManager || isCollaboratorRole);
  const targetLabOrg = isClient ? activeOrganization : currentOrg;
  const revealJobStatus = !isClient || (targetLabOrg?.revealJobStatusToDentist ?? false);
  const isFinished = job?.status === JobStatus.COMPLETED || job?.status === JobStatus.DELIVERED;

  const hasPerm = (key: PermissionKey) => isAdmin || isManager || Boolean(currentUser?.permissions?.includes(key));

  const canEdit = (isAdmin || isManager || (job?.isBudget ? hasPerm('budgets:edit') : hasPerm('jobs:edit'))) && (!isFinished || Boolean(job?.isBudget));
  const canReopen = isLabStaff && (isAdmin || isManager || hasPerm('jobs:reopen')) && (isFinished || job?.status === JobStatus.RETURNED) && !job?.isBudget;
  const canDelete = isAdmin || isManager || (job?.isBudget ? hasPerm('budgets:delete') : hasPerm('jobs:delete'));
  const canManageCommissions = isAdmin || isManager || hasPerm('commissions:edit');
  const canReturn = isAdmin || isManager || hasPerm('jobs:return');
  const canRegisterReturn = isLabStaff && canReturn && (isFinished || job?.status === JobStatus.RETURNED) && !job?.isBudget;
  const canFinish = isAdmin || isManager || hasPerm('jobs:finish');
  const canAlert = isAdmin || isManager || hasPerm('jobs:alert');
  const canPrint = isAdmin || isManager || hasPerm('jobs:print');
  const canToggleChat = isAdmin || isManager || hasPerm('jobs:chat_toggle');
  const canManageApproval = isAdmin || isManager || hasPerm('jobs:approval');
  const canChangeStatus = isAdmin || isManager || hasPerm('jobs:change_status');
  const canViewProduction = isAdmin || isManager || hasPerm('jobs:production_view');
  const canEditProduction = isAdmin || isManager || hasPerm('jobs:production_edit');
  const canViewServiceDetails = isAdmin || isManager || (isClient ? true : hasPerm('jobs:service_details_view'));
  const canViewJobPrices = isAdmin || isManager || (isClient ? true : hasPerm('jobs:prices_view'));
  const canEditServiceDetails = isLabStaff && (isAdmin || isManager || hasPerm('jobs:service_details_edit')) && (!isFinished || Boolean(job?.isBudget));

  // Buyer / Client Delivery Confirmation & Shopee-style Service Review
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userRating, setUserRating] = useState<LabRating | null>(null);

  const isDelivered = job?.status === JobStatus.DELIVERED || Boolean((job as any)?.deliveryConfirmed) || Boolean((job as any)?.isDelivered);
  const isBuyer = isClient || (currentUser && job && (currentUser.id === job.dentistId || currentOrg?.id === job.dentistOrgId));

  useEffect(() => {
    if (!job?.labId || !job?.id) return;
    const unsub = api.subscribeLabRatings(job.labId, (ratings) => {
      const found = ratings.find(r => r.jobId === job.id || (r.dentistId === currentUser?.id && r.patientName === job.patientName));
      if (found) setUserRating(found);
    });
    return unsub;
  }, [job?.labId, job?.id, currentUser?.id, job?.patientName]);

  const handleConfirmDeliveryByClient = async () => {
    if (!job) return;
    if (!confirm('Deseja confirmar o recebimento deste caso? Isso atualizará o status para Entregue e abrirá a avaliação do serviço.')) return;
    setIsUpdatingStatus(true);
    try {
      await updateJob(job.id, {
        status: JobStatus.DELIVERED,
        deliveryConfirmed: true,
        deliveredAt: new Date()
      });
      setShowReviewModal(true);
    } catch (e: any) {
      console.error(e);
      alert('Erro ao confirmar recebimento: ' + (e?.message || 'Falha de conexão'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const [editPatientName, setEditPatientName] = useState('');
  const [editOsNumber, setEditOsNumber] = useState('');
  const [editBoxNumber, setEditBoxNumber] = useState('');
  const [editBoxColorId, setEditBoxColorId] = useState('');
        
  const activeJobsWithSameBox = useMemo(() => {
    if (!editBoxNumber.trim() || editBoxNumber.trim() === job?.boxNumber) return [];
    return jobs.filter(j => 
        j.id !== job?.id &&
        j.boxNumber === editBoxNumber.trim() && 
        ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
    );
  }, [editBoxNumber, jobs, job]);
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editTotalValue, setEditTotalValue] = useState<number | string>(0);
  const [editUrgency, setEditUrgency] = useState<UrgencyLevel>(UrgencyLevel.NORMAL);
  const [editNotes, setEditNotes] = useState('');
  const [editReceivedMaterials, setEditReceivedMaterials] = useState<string[]>([]);
  const [editReceivedMaterialQuantities, setEditReceivedMaterialQuantities] = useState<Record<string, number>>({});
  const [editItems, setEditItems] = useState<JobItem[]>([]);
  const [editProducts, setEditProducts] = useState<JobProduct[]>([]);
  const [editingModalItemId, setEditingModalItemId] = useState<string | null>(null);
  const [newItemTypeId, setNewItemTypeId] = useState('');
  const [newItemQty, setNewItemQty] = useState<number | string>(1);
  const [newItemNature, setNewItemNature] = useState<JobNature>('NORMAL');
  const [newItemVariationIds, setNewItemVariationIds] = useState<string[]>([]);
  const [newItemTeeth, setNewItemTeeth] = useState<string[]>([]);
  const [newItemTeethInput, setNewItemTeethInput] = useState('');
  const [newItemColor, setNewItemColor] = useState('');
  const [editingModalTeethInput, setEditingModalTeethInput] = useState('');

  useEffect(() => {
    if (editingModalItemId) {
      const item = editItems.find(i => i.id === editingModalItemId);
      if (item && item.selectedTeeth && item.selectedTeeth.length > 0) {
        setEditingModalTeethInput(item.selectedTeeth.join(', '));
      } else {
        setEditingModalTeethInput('');
      }
    } else {
      setEditingModalTeethInput('');
    }
  }, [editingModalItemId]);
  const [newItemAdjustmentMode, setNewItemAdjustmentMode] = useState<'DISCOUNT' | 'SURCHARGE'>('DISCOUNT');
  const [newItemDiscountType, setNewItemDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newItemDiscount, setNewItemDiscount] = useState<number | string>(0);
  const [newItemCustomPrice, setNewItemCustomPrice] = useState<number | string>('');
  const [serviceTypeCatalogFilter, setServiceTypeCatalogFilter] = useState<'DENTIST' | 'LABORATORY' | 'ALL'>('DENTIST');

  const availableJobTypesForEdit = useMemo(() => {
    if (serviceTypeCatalogFilter === 'ALL') return jobTypes;
    if (serviceTypeCatalogFilter === 'LABORATORY') {
      return jobTypes.filter(t => t.isVisibleInternallyLabs === true);
    }
    return jobTypes.filter(t => t.isVisibleInternally !== false);
  }, [jobTypes, serviceTypeCatalogFilter]);

  useEffect(() => {
    if (availableJobTypesForEdit.length > 0) {
      if (!availableJobTypesForEdit.some(t => t.id === newItemTypeId)) {
        setNewItemTypeId(availableJobTypesForEdit[0].id);
      }
    }
  }, [serviceTypeCatalogFilter, availableJobTypesForEdit]);

  const newItemCalculatedBasePrice = useMemo(() => {
    const type = jobTypes.find(t => t.id === newItemTypeId);
    if (!type) return 0;
    const dentistObj = allUsers.find(u => u.id === (editDentistId || job?.dentistId)) || manualDentists.find(d => d.id === (editDentistId || job?.dentistId));
    return calculateItemPriceWithDentist(type, newItemVariationIds, dentistObj, priceTables);
  }, [newItemTypeId, newItemVariationIds, editDentistId, job?.dentistId, allUsers, manualDentists, priceTables, jobTypes]);

  const newItemEffectiveUnitPrice = useMemo(() => {
    const base = newItemCustomPrice !== '' && !isNaN(Number(newItemCustomPrice)) && Number(newItemCustomPrice) >= 0
      ? Number(newItemCustomPrice)
      : ((newItemNature === 'REPETITION' || newItemNature === 'ADJUSTMENT') ? 0 : newItemCalculatedBasePrice);
    const val = Number(newItemDiscount) || 0;
    if (newItemAdjustmentMode === 'SURCHARGE') {
      if (newItemDiscountType === 'FIXED') {
        return base + val;
      }
      return base * (1 + (val / 100));
    }
    if (newItemDiscountType === 'FIXED') {
      return Math.max(0, base - val);
    }
    return Math.max(0, base * (1 - (val / 100)));
  }, [newItemNature, newItemCustomPrice, newItemCalculatedBasePrice, newItemDiscount, newItemDiscountType, newItemAdjustmentMode]);
  
  useEffect(() => {
    const type = jobTypes.find(t => t.id === newItemTypeId);
    let targetAutoQty = 1;
    if (type && type.variationGroups) {
      const defaultIds: string[] = [];
      type.variationGroups.forEach((group: any) => {
        if (group.selectionType === 'SINGLE' && group.options && group.options.length > 0) {
          defaultIds.push(group.options[0].id);
        }
      });
      setNewItemVariationIds(defaultIds);

      for (const group of type.variationGroups) {
        if (!group.options) continue;
        for (const opt of group.options) {
          if (defaultIds.includes(opt.id) && opt.autoQuantity && opt.autoQuantity > 0) {
            if (opt.autoQuantity > targetAutoQty) {
              targetAutoQty = opt.autoQuantity;
            }
          }
        }
      }
    } else {
      setNewItemVariationIds([]);
    }
    setNewItemQty(targetAutoQty);
    setNewItemTeeth([]);
    setNewItemTeethInput('');
    setNewItemColor('');
    setNewItemDiscount(0);
    setNewItemDiscountType('PERCENTAGE');
    setNewItemCustomPrice('');
  }, [newItemTypeId, jobTypes]);
  
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [productManualPrice, setProductManualPrice] = useState<number | null>(null);
  const [productDiscountPercent, setProductDiscountPercent] = useState(0);
  const [stockSourceFilter, setStockSourceFilter] = useState<'ALL' | 'LAB' | 'CLIENT'>('ALL');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Job Type Search in Edit Modal (New Item and Edit Item)
  const [jobTypeSearchQuery, setJobTypeSearchQuery] = useState('');
  const [showJobTypeSuggestions, setShowJobTypeSuggestions] = useState(false);
  const [isSearchingJobType, setIsSearchingJobType] = useState(false);
  const jobTypeDropdownRef = useRef<HTMLDivElement>(null);

  const [editingJobTypeSearchQuery, setEditingJobTypeSearchQuery] = useState('');
  const [showEditingJobTypeSuggestions, setShowEditingJobTypeSuggestions] = useState(false);
  const [isSearchingEditingJobType, setIsSearchingEditingJobType] = useState(false);
  const editingJobTypeDropdownRef = useRef<HTMLDivElement>(null);

  const activeJobTypeForEdit = useMemo(() => {
    return jobTypes.find(t => t.id === newItemTypeId);
  }, [jobTypes, newItemTypeId]);

  const filteredJobTypesForEdit = useMemo(() => {
    if (!jobTypeSearchQuery || !jobTypeSearchQuery.trim()) {
      return availableJobTypesForEdit;
    }
    const query = normalizeText(jobTypeSearchQuery);
    return availableJobTypesForEdit.filter(t => 
      normalizeText(t.name).includes(query) ||
      (t.category && normalizeText(t.category).includes(query)) ||
      (t.description && normalizeText(t.description).includes(query))
    );
  }, [availableJobTypesForEdit, jobTypeSearchQuery]);

  const activeEditingJobType = useMemo(() => {
    const item = editItems.find(i => i.id === editingModalItemId);
    return jobTypes.find(t => t.id === item?.jobTypeId);
  }, [editItems, editingModalItemId, jobTypes]);

  const filteredEditingJobTypes = useMemo(() => {
    const list = jobTypes.filter(t => (serviceTypeCatalogFilter === 'ALL' || (serviceTypeCatalogFilter === 'LABORATORY' ? t.isVisibleInternallyLabs === true : t.isVisibleInternally !== false)) || (editingModalItemId && t.id === editItems.find(i => i.id === editingModalItemId)?.jobTypeId));
    if (!editingJobTypeSearchQuery || !editingJobTypeSearchQuery.trim()) {
      return list;
    }
    const query = normalizeText(editingJobTypeSearchQuery);
    return list.filter(t => 
      normalizeText(t.name).includes(query) ||
      (t.category && normalizeText(t.category).includes(query)) ||
      (t.description && normalizeText(t.description).includes(query))
    );
  }, [jobTypes, serviceTypeCatalogFilter, editingModalItemId, editItems, editingJobTypeSearchQuery]);

  const connectedDentists = useMemo(() => allUsers.filter(u => u.role === UserRole.CLIENT), [allUsers]);

  const suggestions = useMemo(() => {
    if (!dentistSearchQuery || !dentistSearchQuery.trim()) return [];
    const online = connectedDentists.map(d => ({ ...d, type: 'ONLINE' as const }));
    const offline = manualDentists.map(d => ({ ...d, type: 'OFFLINE' as const }));
    const all = [...online, ...offline];
    return filterAndSortClients(all, dentistSearchQuery).slice(0, 10);
  }, [dentistSearchQuery, connectedDentists, manualDentists]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDentistSuggestions(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (jobTypeDropdownRef.current && !jobTypeDropdownRef.current.contains(event.target as Node)) {
        setShowJobTypeSuggestions(false);
        setIsSearchingJobType(false);
      }
      if (editingJobTypeDropdownRef.current && !editingJobTypeDropdownRef.current.contains(event.target as Node)) {
        setShowEditingJobTypeSuggestions(false);
        setIsSearchingEditingJobType(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effectiveDentistId = editDentistId || job?.dentistId || job?.clientId || '';
  const effectiveDentistName = editDentistName || job?.dentistName || 'Cliente';

  const matchedDentist = useMemo(() => {
    const id = editDentistId || job?.dentistId || job?.clientId;
    if (!id) return null;
    return manualDentists.find(d => d.id === id || (d as any).userId === id) || allUsers.find(u => u.id === id);
  }, [editDentistId, job?.dentistId, job?.clientId, manualDentists, allUsers]);

  const isDentistBlocked = useMemo(() => {
    return Boolean(
      matchedDentist?.isBlocked || 
      (matchedDentist as any)?.blocked || 
      (matchedDentist as any)?.status === 'BLOCKED' || 
      (matchedDentist as any)?.financialStatus === 'BLOCKED'
    );
  }, [matchedDentist]);

  const labStockItems = useMemo(() => {
    return inventoryItems.filter(item => !item.dentistOwnerId);
  }, [inventoryItems]);

  const clientStockItems = useMemo(() => {
    const validOwnerIds = new Set<string>();
    if (editDentistId) validOwnerIds.add(editDentistId);
    if (job?.dentistId) validOwnerIds.add(job.dentistId);
    if (job?.clientId) validOwnerIds.add(job.clientId);
    if (matchedDentist?.id) validOwnerIds.add(matchedDentist.id);
    if ((matchedDentist as any)?.userId) validOwnerIds.add((matchedDentist as any).userId);

    if (validOwnerIds.size === 0) return [];
    return inventoryItems.filter(item => item.dentistOwnerId && validOwnerIds.has(item.dentistOwnerId));
  }, [inventoryItems, editDentistId, job?.dentistId, job?.clientId, matchedDentist]);

  const filteredStockItems = useMemo(() => {
    const validOwnerIds = new Set<string>();
    if (editDentistId) validOwnerIds.add(editDentistId);
    if (job?.dentistId) validOwnerIds.add(job.dentistId);
    if (job?.clientId) validOwnerIds.add(job.clientId);
    if (matchedDentist?.id) validOwnerIds.add(matchedDentist.id);
    if ((matchedDentist as any)?.userId) validOwnerIds.add((matchedDentist as any).userId);

    let pool = inventoryItems;
    if (stockSourceFilter === 'LAB') {
      pool = labStockItems;
    } else if (stockSourceFilter === 'CLIENT') {
      pool = clientStockItems;
    } else {
      pool = inventoryItems.filter(item => !item.dentistOwnerId || (validOwnerIds.size > 0 && validOwnerIds.has(item.dentistOwnerId)));
    }

    if (!productSearchQuery || !productSearchQuery.trim()) return pool;
    return filterAndSortProducts(pool, productSearchQuery);
  }, [stockSourceFilter, labStockItems, clientStockItems, inventoryItems, editDentistId, job?.dentistId, job?.clientId, matchedDentist, productSearchQuery]);

  const selectedProductObj = useMemo(() => {
    return inventoryItems.find(i => i.id === selectedProductId);
  }, [inventoryItems, selectedProductId]);

  const selectDentist = (dentist: any) => {
    setEditDentistId(dentist.id);
    setEditDentistName(dentist.name.toUpperCase());
    setDentistSearchQuery(dentist.name.toUpperCase());
    setEditSubDentistName('');
    setSelectedDentistObj(dentist.type === 'ONLINE' ? dentist : null);
    setShowDentistSuggestions(false);
  };

  const handleManualDentistEntry = () => {
    const capsQuery = dentistSearchQuery.toUpperCase();
    setEditDentistId('manual-entry');
    setEditDentistName(capsQuery);
    setSelectedDentistObj(null);
    setShowDentistSuggestions(false);
  };

  useEffect(() => {
    if (job) {
        setEditPatientName(job.patientName || '');
        setEditOsNumber(job.osNumber || '');
        setEditBoxNumber(job.boxNumber || '');
        setEditBoxColorId(job.boxColor?.id || '');
        if (job.dueDate) setEditDueDate(new Date(job.dueDate).toISOString().split("T")[0]);
        setEditDueTime(job.dueTime || '');
        setEditTotalValue(job.totalValue || 0);
        setEditUrgency(job.urgency);
        setEditNotes(job.notes || '');
          setEditReceivedMaterials(job.receivedMaterials || []);
          setEditReceivedMaterialQuantities(job.receivedMaterialQuantities || {});
        setEditItems(job.items);
        setEditProducts(job.products || []);
        setEditDentistId(job.dentistId || '');
        setEditDentistName(job.dentistName || '');
        setEditSubDentistName(job.subDentistName || '');
        setDentistSearchQuery(job.dentistName || '');
        const defaultFilter = job.clientOrigin === 'LABORATORY' ? 'LABORATORY' : 'DENTIST';
        setServiceTypeCatalogFilter(defaultFilter);
        const visibleTypes = jobTypes.filter(t => defaultFilter === 'LABORATORY' ? t.isVisibleInternallyLabs === true : t.isVisibleInternally !== false);
        if (visibleTypes.length > 0) setNewItemTypeId(visibleTypes[0].id);
        else if (jobTypes.length > 0) setNewItemTypeId(jobTypes[0].id);
    }
  }, [job, jobTypes]);

  if (!job) return <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 sm:p-6"><h2 className="text-xl font-bold text-slate-800">Trabalho não encontrado</h2><button onClick={() => navigate('/jobs')} className="mt-4 text-blue-600 font-bold hover:underline">Voltar para lista</button></div>;

  const hasViewPerm = isAdmin || isManager || isBuyer || (job.isBudget 
    ? currentUser?.permissions?.includes('budgets:view') 
    : currentUser?.permissions?.includes('jobs:view'));

  if (!hasViewPerm) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 sm:p-6">
        <h2 className="text-xl font-bold text-slate-800">
          {job.isBudget 
            ? 'Você não tem permissão para visualizar este orçamento.' 
            : 'Você não tem permissão para visualizar este caso.'}
        </h2>
        <button 
          onClick={() => navigate(job.isBudget ? '/budgets' : '/jobs')} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
        >
          Voltar para lista
        </button>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setSelectedFiles(Array.from(e.target.files));
      }
  };

  const handleUploadFiles = async () => {
    if (!job || selectedFiles.length === 0) return;
    setIsUploadingFiles(true);
    setUploadProgressMsg('Processando...');

    const newAttachments: Attachment[] = [];

    try {
        for (const file of selectedFiles) {
            setUploadProgressMsg(`Otimizando: ${file.name}`);
            const processed = await smartCompress(file);
            
            setUploadProgressMsg(`Enviando: ${file.name}`);
            const url = await uploadFile(processed);
            
            newAttachments.push({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                url: url,
                uploadedAt: new Date()
            });
        }

        const updatedAttachments = [...(job.attachments || []).filter(Boolean), ...newAttachments];
        await updateJob(job.id, { 
            attachments: updatedAttachments,
            history: [...(job.history || []).filter(Boolean), {
                id: `hist_files_${Date.now()}`,
                timestamp: new Date(),
                action: `Anexados ${newAttachments.length} novos arquivos ao caso`,
                userId: currentUser?.id || 'sys',
                userName: currentUser?.name || 'Sistema'
            }]
        });

        setSelectedFiles([]);
        setUploadProgressMsg('');
        alert("Arquivos anexados!");
    } catch (err) {
        alert("Erro ao enviar arquivos.");
    } finally {
        setIsUploadingFiles(false);
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!job || !currentUser) return;
    if (!confirm("Tem certeza que deseja excluir este arquivo?")) return;
    
    try {
        const updatedAttachments = job.attachments?.filter((a: any) => a.id !== attId) || [];
        
        const newHistory = [...(job.history || []).filter(Boolean), {
            id: `hist_delatt_${Date.now()}`,
            timestamp: new Date(),
            action: 'Arquivo removido',
            userId: currentUser.id,
            userName: currentUser.name
        }];

        await updateJob(job.id, {
            attachments: updatedAttachments,
            history: newHistory
        });
        
    } catch (error) {
        console.error("Erro ao remover arquivo", error);
        alert("Erro ao remover o arquivo.");
    }
  };

  const handleUpdateAttachmentComment = async (attId: string, newComment: string) => {
    if (!job) return;
    setIsSavingComment(true);
    try {
      const updatedAttachments = (job.attachments || []).map((att: Attachment) => {
        if (att.id === attId) {
          return {
            ...att,
            comment: newComment.trim() || undefined
          };
        }
        return att;
      });
      await updateJob(job.id, { 
        attachments: updatedAttachments,
        history: [...(job.history || []).filter(Boolean), {
          id: `hist_comment_${Date.now()}`,
          timestamp: new Date(),
          action: `Comentário atualizado em anexo do caso`,
          userId: currentUser?.id || 'sys',
          userName: currentUser?.name || 'Sistema'
        }]
      });
      setEditingCommentAttId(null);
      setCommentDraftText('');
    } catch (error) {
      console.error("Erro ao atualizar comentário do anexo", error);
      alert("Erro ao salvar comentário.");
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleAddItemToJob = () => {
      if (!canEditServiceDetails) {
          alert("Você não tem permissão para editar os detalhes do serviço.");
          return;
      }
      const type = jobTypes.find(t => t.id === newItemTypeId);
      if (!type) return;

      const dentistObj = allUsers.find(u => u.id === (editDentistId || job?.dentistId)) || manualDentists.find(d => d.id === (editDentistId || job?.dentistId));
      const calculatedBasePrice = newItemCustomPrice !== '' && !isNaN(Number(newItemCustomPrice)) && Number(newItemCustomPrice) >= 0 
          ? Number(newItemCustomPrice) 
          : calculateItemPriceWithDentist(type, newItemVariationIds, dentistObj, priceTables);
      
      const discVal = Number(newItemDiscount) || 0;
      let finalItemPrice = calculatedBasePrice;
      let appliedPct = 0;
      let appliedFixed = 0;
      let appliedSurPct = 0;
      let appliedSurFixed = 0;

      if ((newItemNature === 'REPETITION' || newItemNature === 'ADJUSTMENT') && (newItemCustomPrice === '' || isNaN(Number(newItemCustomPrice)))) {
          finalItemPrice = 0;
      } else {
          if (newItemAdjustmentMode === 'SURCHARGE') {
              if (newItemDiscountType === 'FIXED') {
                  appliedSurFixed = discVal;
                  finalItemPrice = calculatedBasePrice + discVal;
              } else {
                  appliedSurPct = discVal;
                  finalItemPrice = calculatedBasePrice * (1 + (discVal / 100));
              }
          } else {
              if (newItemDiscountType === 'FIXED') {
                  appliedFixed = discVal;
                  finalItemPrice = Math.max(0, calculatedBasePrice - discVal);
              } else {
                  appliedPct = discVal;
                  finalItemPrice = Math.max(0, calculatedBasePrice * (1 - (discVal / 100)));
              }
          }
      }

      const newItem: JobItem = {
          id: `item_edit_${Date.now()}`,
          jobTypeId: type.id,
          name: type.name,
          quantity: Number(newItemQty) || 1,
          price: finalItemPrice,
          basePriceBeforeDiscount: calculatedBasePrice,
          priceAdjustmentType: newItemAdjustmentMode,
          appliedDiscount: appliedPct,
          appliedDiscountFixed: appliedFixed,
          appliedSurcharge: appliedSurPct,
          appliedSurchargeFixed: appliedSurFixed,
          appliedPriceTable: dentistObj?.priceTableId ? (priceTables.find(t => t.id === dentistObj.priceTableId)?.name || 'Padrão') : 'Padrão',
          selectedVariationIds: newItemVariationIds,
          nature: newItemNature,
          selectedTeeth: newItemTeeth.length > 0 ? newItemTeeth : undefined,
          color: newItemColor || undefined,
          sectorStages: type.sectorStages ? JSON.parse(JSON.stringify(type.sectorStages)) : undefined,
          stageQuantities: (() => {
              if (!type.sectorStages) return undefined;
              const sq: Record<string, Record<string, number>> = {};
              Object.entries(type.sectorStages).forEach(([sec, stgs]) => {
                  if (Array.isArray(stgs)) {
                      sq[sec] = {};
                      stgs.forEach(stg => { sq[sec][stg] = Number(newItemQty) || 1; });
                  }
              });
              return Object.keys(sq).length > 0 ? sq : undefined;
          })()
      };
      const newItems = [...editItems, newItem];
      setEditItems(newItems);
      const productsTotal = (editProducts || []).reduce((acc: number, p: any) => acc + (p.unitPrice * p.quantity), 0);
      setEditTotalValue(newItems.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0) + productsTotal);
      setNewItemNature('NORMAL');
      setNewItemVariationIds([]);
      setNewItemTeeth([]);
      setNewItemTeethInput('');
      setNewItemColor('');
      setNewItemDiscount(0);
      setNewItemDiscountType('PERCENTAGE');
      setNewItemCustomPrice('');
  };

  const handleRemoveItemFromJob = (itemId: string) => {
      if (!canEditServiceDetails) {
          alert("Você não tem permissão para editar os detalhes do serviço.");
          return;
      }
      const newItems = editItems.filter(i => i.id !== itemId);
      setEditItems(newItems);
      const productsTotal = (editProducts || []).reduce((acc: number, p: any) => acc + (p.unitPrice * p.quantity), 0);
      setEditTotalValue(newItems.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0) + productsTotal);
  };

  const handleUpdateEditItem = (itemId: string, updates: Record<string, any>) => {
      if (!canEditServiceDetails) {
          alert("Você não tem permissão para editar os detalhes do serviço.");
          return;
      }
      let itemsTotal = 0;
      const newItems = editItems.map(item => {
          if (item.id === itemId) {
              const updated = { ...item, ...updates };
              
              if ('jobTypeId' in updates) {
                  const type = jobTypes.find(t => t.id === updates.jobTypeId);
                  if (type) {
                      updated.name = type.name;
                      updated.selectedVariationIds = [];
                      updated.sectorStages = type.sectorStages ? JSON.parse(JSON.stringify(type.sectorStages)) : undefined;
                      if (type.sectorStages) {
                          const sq: Record<string, Record<string, number>> = {};
                          Object.entries(type.sectorStages).forEach(([sec, stgs]) => {
                              if (Array.isArray(stgs)) {
                                  sq[sec] = {};
                                  stgs.forEach(stg => { sq[sec][stg] = updated.quantity || 1; });
                              }
                          });
                          updated.stageQuantities = sq;
                      } else {
                          updated.stageQuantities = undefined;
                      }
                  }
              }

              if ('quantity' in updates && updates.quantity > 0) {
                  if (updated.stageQuantities) {
                      const nextSQ: Record<string, Record<string, number>> = {};
                      Object.entries(updated.stageQuantities).forEach(([sec, stgs]) => {
                          nextSQ[sec] = {};
                          Object.entries(stgs as Record<string, number>).forEach(([stg, q]) => {
                              nextSQ[sec][stg] = (q === 1 || q === item.quantity) ? updates.quantity : q;
                          });
                      });
                      updated.stageQuantities = nextSQ;
                  }
              }

              const requiresPriceRecalc = Object.keys(updates).some(k => ['jobTypeId', 'selectedVariationIds', 'nature', 'quantity', 'basePriceBeforeDiscount', 'appliedDiscount', 'appliedDiscountFixed', 'priceAdjustmentType', 'appliedSurcharge', 'appliedSurchargeFixed'].includes(k));

              if (requiresPriceRecalc) {
                  const type = jobTypes.find(t => t.id === updated.jobTypeId);
                  const dentistObj = allUsers.find(u => u.id === (editDentistId || job?.dentistId)) || manualDentists.find(d => d.id === (editDentistId || job?.dentistId));
                  
                  if (type && ('jobTypeId' in updates || 'selectedVariationIds' in updates) && !('basePriceBeforeDiscount' in updates)) {
                      const basePrice = calculateItemPriceWithDentist(type, updated.selectedVariationIds || [], dentistObj, priceTables);
                      updated.basePriceBeforeDiscount = basePrice;
                  }

                   const base = updated.basePriceBeforeDiscount !== undefined ? Number(updated.basePriceBeforeDiscount) : ((updated.nature === 'REPETITION' || updated.nature === 'ADJUSTMENT') ? 0 : (type?.basePrice || 0));
                   const isSur = updated.priceAdjustmentType === 'SURCHARGE' || (Boolean(updated.appliedSurcharge) && Number(updated.appliedSurcharge) > 0) || (Boolean(updated.appliedSurchargeFixed) && Number(updated.appliedSurchargeFixed) > 0);
                   if (isSur) {
                       const pctSur = Number(updated.appliedSurcharge) || 0;
                       const fixSur = Number(updated.appliedSurchargeFixed) || 0;
                       if (fixSur > 0) {
                           updated.price = base + fixSur;
                       } else {
                           updated.price = base * (1 + (pctSur / 100));
                       }
                   } else {
                       const pctDisc = Number(updated.appliedDiscount) || 0;
                       const fixDisc = Number(updated.appliedDiscountFixed) || 0;
                       if (fixDisc > 0) {
                           updated.price = Math.max(0, base - fixDisc);
                       } else {
                           updated.price = Math.max(0, base * (1 - (pctDisc / 100)));
                       }
                   }
              }
              itemsTotal += (updated.price * (updated.quantity || 1));
              return updated;
          }
          itemsTotal += ((item.price || 0) * (item.quantity || 1));
          return item;
      });
      setEditItems(newItems);
      const productsTotal = (editProducts || []).reduce((acc: number, p: any) => acc + (p.unitPrice * p.quantity), 0);
      setEditTotalValue(itemsTotal + productsTotal);
  };

  const handleRemoveProductFromJob = (prodId: string) => {
      const newProds = editProducts.filter(p => p.id !== prodId);
      setEditProducts(newProds);
      const itemsTotal = editItems.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);
      setEditTotalValue(itemsTotal + newProds.reduce((acc: number, p: any) => acc + (p.unitPrice * p.quantity), 0));
  };

  const handleProductChange = (prodId: string, field: 'quantity' | 'basePriceBeforeDiscount' | 'appliedDiscount', value: any) => {
      const newProds = editProducts.map(p => {
          if (p.id === prodId) {
              const basePrice = field === 'basePriceBeforeDiscount' ? (value === '' ? 0 : Number(value)) : (p.basePriceBeforeDiscount ?? p.unitPrice);
              const appliedDiscount = field === 'appliedDiscount' ? (value === '' ? 0 : Number(value)) : (p.appliedDiscount || 0);
              const quantity = field === 'quantity' ? (value === '' ? 1 : Number(value)) : p.quantity;
              
              const finalPrice = basePrice * (1 - (appliedDiscount / 100));
              return {
                  ...p,
                  [field]: value,
                  unitPrice: finalPrice,
                  quantity
              };
          }
          return p;
      });
      setEditProducts(newProds);
      const itemsTotal = editItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      setEditTotalValue(itemsTotal + newProds.reduce((acc, p) => acc + (p.unitPrice * (Number(p.quantity) || 1)), 0));
  };

  const handleAddProductToJob = () => {
      if (!selectedProductId) return;
      const prod = inventoryItems.find(i => i.id === selectedProductId);
      if (!prod) return;

      const finalPrice = productManualPrice !== null ? productManualPrice : prod.sellPrice;
      const discount = productDiscountPercent > 0 ? productDiscountPercent : 0;
      const netPrice = finalPrice * (1 - (discount / 100));

      const newProduct: JobProduct = {
          id: `edit_prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          inventoryItemId: prod.id,
          name: prod.name,
          quantity: productQuantity,
          unitPrice: netPrice,
          basePriceBeforeDiscount: finalPrice,
          appliedDiscount: discount,
          dentistOwnerId: prod.dentistOwnerId || null,
          addedAt: new Date().toISOString()
      };

      const newProds = [...editProducts, newProduct];
      setEditProducts(newProds);
      
      const itemsTotal = editItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      setEditTotalValue(itemsTotal + newProds.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0));

      setSelectedProductId('');
      setProductQuantity(1);
      setProductManualPrice(null);
      setProductDiscountPercent(0);
      setIsAddingProduct(false);
  };

  const handleToggleChat = async () => {
      if (!canToggleChat) return;
      const newState = !job.chatEnabled;
      await updateJob(job.id, { chatEnabled: newState });
  };

  const handleToggleApproval = async () => {
      if (!canManageApproval) return;
      const newState = !job.approvalEnabled;
      await updateJob(job.id, { approvalEnabled: newState });
  };

  const handleSaveChanges = async () => {
    if (isFinished && !job?.isBudget) {
        alert('Não é possível editar um caso concluído. Reabra o caso primeiro para fazer alterações.');
        return;
    }
    if (activeJobsWithSameBox.length > 0) {
        alert('A caixa ' + editBoxNumber + ' já está em uso por outro caso em aberto. Finalize-o antes de usar esta caixa.');
        return;
    }
    if (!currentUser || !job) return;
    setIsUpdatingStatus(true);
    try {
        const dateParts = editDueDate.split('-');
        const adjustedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        
        const changes: string[] = [];
        if (editPatientName !== job.patientName) changes.push(`- Paciente: ${job.patientName} -> ${editPatientName}`);
        if (editOsNumber !== job.osNumber) changes.push(`- OS: ${job.osNumber} -> ${editOsNumber}`);
        if (editBoxNumber !== job.boxNumber) changes.push(`- Caixa: ${job.boxNumber} -> ${editBoxNumber}`);
        
        const selectedBoxColor = boxColors.find(c => c.id === editBoxColorId);
        if (selectedBoxColor?.id !== job.boxColor?.id) {
            changes.push(`- Cor da Caixa: ${job.boxColor?.name || 'Sem cor'} -> ${selectedBoxColor?.name || 'Sem cor'}`);
        }
        
        const oldDate = job.dueDate ? new Date(job.dueDate).toISOString().split("T")[0] : "";
        if (editDueDate !== oldDate) changes.push(`- Vencimento: ${oldDate} -> ${editDueDate}`);
        
        if (editUrgency !== job.urgency) changes.push(`- Urgência: ${job.urgency} -> ${editUrgency}`);
        if (editDentistName !== job.dentistName) changes.push(`- Dentista: ${job.dentistName} -> ${editDentistName}`);

        const actionText = changes.length > 0 
            ? `EDIÇÃO DE FICHA:\n${changes.join('\n')}` 
            : 'Ficha editada manualmente';

        await updateJob(job.id, {
            patientName: editPatientName,
            osNumber: editOsNumber,
            dentistId: editDentistId,
            dentistName: editDentistName,
            subDentistName: editSubDentistName || undefined,
            boxNumber: editBoxNumber,
            boxColor: selectedBoxColor,
            dueDate: adjustedDate,
            dueTime: editDueTime,
            urgency: editUrgency,
            notes: editNotes,
            receivedMaterials: editReceivedMaterials,
            receivedMaterialQuantities: editReceivedMaterialQuantities,
            items: editItems.map(i => {
                const oldItem = job.items.find((orig: any) => orig.id === i.id);
                const oldQty = oldItem ? (Number(oldItem.quantity) || 1) : 1;
                const newQty = Number(i.quantity) || 1;
                let nextSecQuantities: Record<string, number> | undefined = undefined;
                if (i.sectorQuantities) {
                    nextSecQuantities = {};
                    Object.entries(i.sectorQuantities).forEach(([sec, q]) => {
                        nextSecQuantities![sec] = (Number(q) === oldQty || Number(q) === 1) ? newQty : Number(q);
                    });
                }
                let nextStageQuantities = i.stageQuantities;
                if (nextStageQuantities && oldQty !== newQty) {
                    const updatedSQ: Record<string, Record<string, number>> = {};
                    Object.entries(nextStageQuantities).forEach(([sec, stgs]) => {
                        updatedSQ[sec] = {};
                        Object.entries(stgs as Record<string, number>).forEach(([stg, q]) => {
                            updatedSQ[sec][stg] = (Number(q) === 1 || Number(q) === oldQty) ? newQty : q;
                        });
                    });
                    nextStageQuantities = updatedSQ;
                }
                return {
                    ...i, 
                    quantity: newQty,
                    price: Number(i.price) || 0,
                    basePriceBeforeDiscount: i.basePriceBeforeDiscount !== undefined ? (Number(i.basePriceBeforeDiscount) || 0) : (Number(i.price) || 0),
                    appliedDiscount: Number(i.appliedDiscount) || 0,
                    appliedDiscountFixed: Number(i.appliedDiscountFixed) || 0,
                    sectorQuantities: nextSecQuantities,
                    stageQuantities: nextStageQuantities
                };
            }),
            products: editProducts.map(p => ({ ...p, quantity: Number(p.quantity) || 1, basePriceBeforeDiscount: Number(p.basePriceBeforeDiscount) || p.unitPrice, appliedDiscount: Number(p.appliedDiscount) || 0, addedAt: p.addedAt || new Date().toISOString() })),
            totalValue: Number(editTotalValue) || 0,
            history: [...(job.history || []).filter(Boolean), {
                id: `hist_edit_${Date.now()}`,
                timestamp: new Date(),
                action: actionText,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Gestão'
            }]
        });

        // Synchronize inventory stock for added/modified/removed products
        const oldQuantitiesByItem: Record<string, number> = {};
        (job.products || []).forEach((p: any) => {
            if (p.inventoryItemId) {
                oldQuantitiesByItem[p.inventoryItemId] = (oldQuantitiesByItem[p.inventoryItemId] || 0) + (Number(p.quantity) || 1);
            }
        });

        const newQuantitiesByItem: Record<string, number> = {};
        (editProducts || []).forEach((p: any) => {
            if (p.inventoryItemId) {
                newQuantitiesByItem[p.inventoryItemId] = (newQuantitiesByItem[p.inventoryItemId] || 0) + (Number(p.quantity) || 1);
            }
        });

        const allInvItemIds = Array.from(new Set([...Object.keys(oldQuantitiesByItem), ...Object.keys(newQuantitiesByItem)]));
        for (const itemId of allInvItemIds) {
            const oldQty = oldQuantitiesByItem[itemId] || 0;
            const newQty = newQuantitiesByItem[itemId] || 0;
            const diff = newQty - oldQty;

            if (diff !== 0) {
                const invItem = inventoryItems.find(i => i.id === itemId);
                if (invItem) {
                    const currentStockVal = typeof invItem.currentStock === 'number' ? invItem.currentStock : 0;
                    const updatedStock = Math.max(0, currentStockVal - diff);
                    await updateInventoryItem(itemId, { currentStock: updatedStock });
                }
            }
        }

        await recalculateAllCommissions(editItems, job.itemExecutions || []);
        setShowEditModal(false);
    } catch (err) {
        alert("Erro ao salvar.");
    } finally {
        setIsUpdatingStatus(false);
    }
  };

  const handleFinalizeJob = async () => {
    if (!currentUser || isUpdatingStatus) return;

    // New check: Is the dentist blocked?
    const dentist = allUsers.find(u => u.id === job?.dentistId) || manualDentists.find(d => d.id === job?.dentistId);
    if (dentist?.isBlocked) {
        alert("Este cliente está BLOQUEADO por limite de fatura. Não é possível FINALIZAR este trabalho até que a pendência seja resolvida.");
        return;
    }

    if (!window.confirm("Finalizar este caso agora?")) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: JobStatus.COMPLETED,
            completedAt: new Date(),
            history: [...(job.history || []).filter(Boolean), {
                id: `hist_fin_${Date.now()}`,
                timestamp: new Date(),
                action: `Trabalho Finalizado e Conferido`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Expedição'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const handleReopenJob = async () => {
    if (!currentUser || isUpdatingStatus) return;
    if (!window.confirm("Deseja reabrir este caso?")) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: JobStatus.IN_PROGRESS,
            history: [...(job.history || []).filter(Boolean), {
                id: `hist_reopen_${Date.now()}`,
                timestamp: new Date(),
                action: `Trabalho REABERTO`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: currentUser.sector || 'Gestão'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const handleAddToRoute = async () => {
    if (!routeDriver) { alert("Informe o nome do motorista."); return; }
    if (routeDate < todayStr) {
        alert("Não é possível alocar trabalhos em rotas de datas anteriores à atual.");
        return;
    }
    if (routeDate === todayStr && isPast12PM && routeShift === 'MORNING') {
        alert("Após as 12:00, somente rotas do turno da TARDE podem ser selecionadas para a data de hoje.");
        return;
    }
    setIsUpdatingStatus(true);
    try {
        await addJobToRoute(job, routeDriver, routeShift, new Date(routeDate), routeObservations, selectedRouteId || undefined);
        setShowRouteModal(false);
        setRouteObservations('');
        setSelectedRouteId('');
        alert("Trabalho vinculado à rota com sucesso!");
    } catch (err) {
        alert("Erro ao adicionar à rota.");
    } finally { setIsUpdatingStatus(false); }
  };

  const handleConfirmCancelDelivery = async () => {
    if (!job || !currentOrg) return;
    if (!cancelDeliveryReason.trim()) {
        alert("Por favor, informe o motivo do cancelamento da entrega.");
        return;
    }
    setIsCancellingDelivery(true);
    try {
        if (job.routeId) {
            const itemsSnap = await getDocs(collection(db, `organizations/${currentOrg.id}/routes/${job.routeId}/items`));
            itemsSnap.docs.forEach((dDoc: any) => {
                if (dDoc.data()?.jobId === job.id) {
                    api.apiDeleteRouteItem(currentOrg.id, job.routeId!, dDoc.id);
                }
            });
        }

        const lastDeliveryAttempt = {
            driverName: routeInfo?.driverName || 'Motoboy',
            date: routeInfo?.date ? normalizeRouteDate(routeInfo.date) : getTodayDateStr(),
            shift: routeInfo?.shift || 'MORNING',
            status: 'CANCELLED',
            reason: cancelDeliveryReason.trim(),
            timestamp: new Date().toISOString()
        };

        const newHistory = [...(job.history || []).filter(Boolean), {
            id: `hist_cancel_del_${Date.now()}`,
            timestamp: new Date(),
            action: `Entrega Cancelada / Não Entregue`,
            observations: `Motivo: ${cancelDeliveryReason.trim()}`,
            userId: currentUser?.id || '',
            userName: currentUser?.name || 'Usuário',
            sector: 'Logística'
        }];

        await updateJob(job.id, {
            status: JobStatus.COMPLETED,
            routeId: deleteField() as any,
            lastDeliveryAttempt,
            history: newHistory
        });

        setShowCancelDeliveryModal(false);
        setCancelDeliveryReason('');
        setRouteInfo(null);
        alert("Entrega cancelada com sucesso! O status do caso foi mantido como CONCLUÍDO e o motivo foi registrado no histórico de entrega.");
    } catch (err) {
        console.error("Erro ao cancelar entrega:", err);
        alert("Erro ao cancelar entrega. Tente novamente.");
    } finally {
        setIsCancellingDelivery(false);
    }
  };

  const handleQuickStatusUpdate = async (newStatus: JobStatus) => {
    if (!currentUser || isUpdatingStatus) return;

    // New check: Is the dentist blocked?
    const dentist = allUsers.find(u => u.id === job?.dentistId) || manualDentists.find(d => d.id === job?.dentistId);
    if (dentist?.isBlocked && (newStatus === JobStatus.COMPLETED || newStatus === JobStatus.DELIVERED)) {
        alert("Este cliente está BLOQUEADO por limite de fatura. Não é possível CONCLUIR ou ENTREGAR trabalhos até que a pendência seja resolvida.");
        return;
    }

    // If status is REJECTED or CANCELED, prompt for justification
    if (newStatus === JobStatus.REJECTED || newStatus === JobStatus.CANCELED) {
      setRejectionTargetStatus(newStatus);
      setIsRejectionRequisition(false);
      setRejectionReasonText('');
      setShowRejectionModal(true);
      return;
    }

    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: newStatus,
            history: [...(job.history || []).filter(Boolean), {
                id: `hist_stat_${Date.now()}`,
                timestamp: new Date(),
                action: `Status alterado: ${newStatus}`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: currentUser.sector || 'Geral'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const getTranslatedStatus = (status: JobStatus) => {
      switch(status) {
        case JobStatus.WAITING_APPROVAL: return 'Aguardando';
        case JobStatus.PENDING: return 'Pendente';
        case JobStatus.IN_PROGRESS: return 'Produção';
        case JobStatus.COMPLETED: return 'Concluído';
        case JobStatus.DELIVERED: return 'Entregue';
        case JobStatus.REJECTED: return 'Rejeitado';
        case JobStatus.CANCELED: return 'Cancelado';
        case JobStatus.RETURNED: return 'Devolvido';
        case JobStatus.SECTOR_TRANSITION: return 'Em Transição';
        default: return status;
      }
  };

  const getStatusColor = (status: JobStatus) => {
      switch(status) {
          case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200';
          case JobStatus.DELIVERED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200';
          case JobStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 border-purple-200';
          case JobStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
          case JobStatus.CANCELED: return 'bg-gray-200 text-gray-700 border-gray-300';
          case JobStatus.RETURNED: return 'bg-orange-100 text-orange-700 border-orange-200';
          case JobStatus.SECTOR_TRANSITION: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const getFileIcon = (name: string) => {
      const ext = name.split('.').pop()?.toLowerCase();
      if (ext === 'stl') return <Box size={18} className="text-orange-500 shrink-0" />;
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return <ImageIcon className="text-blue-500 shrink-0" size={18} />;
      if (ext === 'pdf') return <FileText className="text-red-500 shrink-0" size={18} />;
      if (['doc', 'docx'].includes(ext || '')) return <FileText className="text-blue-700 shrink-0" size={18} />;
      if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet className="text-green-600 shrink-0" size={18} />;
      if (ext === 'html') return <FileCode className="text-purple-500 shrink-0" size={18} />;
      return <FileIcon className="text-slate-400 shrink-0" size={18} />;
  };

  const sortedHistory = [...(job.history || []).filter(Boolean)].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const getSectorTimeInfo = (job: Job) => {
    if (!job.sectorEntryTime) return { hours: 0, isAttention: false, label: '---' };
    const diff = new Date().getTime() - new Date(job.sectorEntryTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let label = '';
    if (hours > 0) label += `${hours}h `;
    label += `${minutes}m`;
    
    return { hours, isAttention: hours >= 18, label };
  };

  const timeInfo = getSectorTimeInfo(job);
  const canFinalize = canFinish && !isFinished && job.status !== JobStatus.REJECTED && job.status !== JobStatus.CANCELED && job.status !== JobStatus.RETURNED;
  const canShowReturn = canReturn && job.status !== JobStatus.CANCELED && job.status !== JobStatus.RETURNED && job.status !== JobStatus.DELIVERED;
  const canShowCancel = (isAdmin || isManager || canDelete) && job.status !== JobStatus.CANCELED && job.status !== JobStatus.RETURNED && job.status !== JobStatus.DELIVERED;

  const handleCancelJob = async () => {
      if (!window.confirm('Tem certeza que deseja CANCELAR este caso?')) return;
      setIsUpdatingStatus(true);
      try {
          await updateJob(job.id, {
              status: JobStatus.CANCELED,
              history: [...(job.history || []).filter(Boolean), {
                  id: `hist_cancel_${Date.now()}`,
                  timestamp: new Date(),
                  action: 'Trabalho CANCELADO',
                  userId: currentUser?.id || '',
                  userName: currentUser?.name || 'Sistema',
                  sector: currentUser?.sector || 'Gestão'
              }]
          });
      } finally { setIsUpdatingStatus(false); }
  };

  const handleReturnJob = async () => {
      if (!window.confirm('Tem certeza que deseja DEVOLVER este caso ao dentista?')) return;
      setIsUpdatingStatus(true);
      try {
          await updateJob(job.id, {
              status: JobStatus.RETURNED,
              history: [...(job.history || []).filter(Boolean), {
                  id: `hist_return_${Date.now()}`,
                  timestamp: new Date(),
                  action: 'Trabalho DEVOLVIDO',
                  userId: currentUser?.id || '',
                  userName: currentUser?.name || 'Sistema',
                  sector: currentUser?.sector || 'Gestão'
              }]
          });
      } finally { setIsUpdatingStatus(false); }
  };

  const handleOpenEditExecution = (item: JobItem, sector: string, execution?: JobItemExecution | null, latestMov?: SectorMovement | null, stageName?: string) => {
      if (!canEditProduction) return;
      const targetStage = stageName || 'BASE';
      const stageData = execution?.stageTimes?.[targetStage];

      let initialEntryTime = '';
      let initialExitTime = '';
      let initialUserId = '';

      if (stageData) {
          if (stageData.entryTime) {
              const d = parseSafeDate(stageData.entryTime);
              if (d) initialEntryTime = new Date(d.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          }
          if (stageData.exitTime) {
              const d = parseSafeDate(stageData.exitTime);
              if (d) initialExitTime = new Date(d.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          }
          initialUserId = stageData.exitUserId || stageData.entryUserId || execution?.userId || '';
      } else if (targetStage === 'BASE') {
          if (latestMov?.entryTime) {
              initialEntryTime = new Date(latestMov.entryTime.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          } else if (execution?.entryTime) {
              const d = parseSafeDate(execution.entryTime);
              if (d) initialEntryTime = new Date(d.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          }
          if (execution?.timestamp) {
              const d = parseSafeDate(execution.timestamp);
              if (d) initialExitTime = new Date(d.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          }
          initialUserId = execution?.userId || '';
      }

      setEditingExecution({
          item,
          sector,
          stageName: targetStage,
          userId: initialUserId,
          entryTime: initialEntryTime,
          exitTime: initialExitTime,
          originalExecution: execution,
          originalMovement: latestMov
      });
      setShowExecutionModal(true);
  };

  const handleSaveExecutionEdit = async () => {
      if (!canEditProduction) return;
      if (!editingExecution || !job) return;
      if (!editingExecution.userId) return alert('Selecione um funcionário');

      const targetStageKey = editingExecution.stageName || 'BASE';
      const isBaseStage = targetStageKey === 'BASE';

      // Security Rule Enforcement:
      // If this stage/sector already has an entry registered by a collaborator, ONLY that same collaborator can register exit or be assigned to it,
      // UNLESS the stage/sector was cleared ("limpa") first!
      const existingExec = (job.itemExecutions || []).find((e: any) => e.itemId === editingExecution.item.id && e.sector === editingExecution.sector);
      const existingStageData = existingExec?.stageTimes?.[targetStageKey];

      const existingEntryUserId = existingStageData?.entryUserId || (isBaseStage ? (existingExec?.userId || editingExecution.originalMovement?.entryUserId) : undefined);
      const hasExistingEntry = !!(existingStageData?.entryTime || (isBaseStage && (existingExec?.entryTime || editingExecution.originalMovement?.entryTime)));

      if (hasExistingEntry && existingEntryUserId) {
          if (editingExecution.userId !== existingEntryUserId) {
              const entryUserObj = labUsers.find(u => u.id === existingEntryUserId);
              const entryUserName = entryUserObj?.name || existingExec?.userName || 'outro colaborador';
              alert(
                  `Regra de Segurança de Comissão:\n\n` +
                  `Esta etapa/setor possui entrada registrada por "${entryUserName}".\n` +
                  `Apenas este mesmo colaborador pode dar saída e receber a comissão desta etapa.\n\n` +
                  `Caso outro colaborador vá realizar esta etapa, em produção ela deve ser LIMPA primeiro (botão com ícone de desfazer/limpar na tabela de produção).`
              );
              return;
          }
      }

      setIsUpdatingStatus(true);
      try {
          // Prepare new sectorMovements if BASE stage
          let newMovements = [...(job.sectorMovements || [])];
          if (isBaseStage) {
              if (editingExecution.originalMovement) {
                  const idx = newMovements.findIndex(m => m.id === editingExecution.originalMovement!.id);
                  if (idx !== -1) {
                      newMovements[idx] = {
                          ...newMovements[idx],
                          entryTime: new Date(editingExecution.entryTime),
                          exitTime: editingExecution.exitTime ? new Date(editingExecution.exitTime) : undefined,
                          exitUserId: editingExecution.exitTime ? editingExecution.userId : undefined,
                          exitUserName: editingExecution.exitTime ? (labUsers.find(u => u.id === editingExecution.userId)?.name || '') : undefined
                      };
                  }
              } else if (editingExecution.entryTime) {
                  newMovements.push({
                      id: Math.random().toString(),
                      sector: editingExecution.sector,
                      entryTime: new Date(editingExecution.entryTime),
                      entryUserId: editingExecution.userId,
                      entryUserName: labUsers.find(u => u.id === editingExecution.userId)?.name || '',
                      exitTime: editingExecution.exitTime ? new Date(editingExecution.exitTime) : undefined,
                      exitUserId: editingExecution.exitTime ? editingExecution.userId : undefined,
                      exitUserName: editingExecution.exitTime ? (labUsers.find(u => u.id === editingExecution.userId)?.name || '') : undefined
                  });
              }
          }

          // Prepare new itemExecutions
          let newExecutions = [...(job.itemExecutions || [])];
          const idx = newExecutions.findIndex(e => e.itemId === editingExecution.item.id && e.sector === editingExecution.sector);

          const entryDate = editingExecution.entryTime ? new Date(editingExecution.entryTime) : undefined;
          const exitDate = editingExecution.exitTime ? new Date(editingExecution.exitTime) : undefined;

          if (entryDate || exitDate) {
              const existingExec = idx !== -1 ? newExecutions[idx] : null;
              const stageTimes = existingExec?.stageTimes ? { ...existingExec.stageTimes } : {};
              const curStage = stageTimes[targetStageKey] || {};
              stageTimes[targetStageKey] = {
                  ...curStage,
                  entryTime: entryDate || curStage.entryTime,
                  entryUserId: entryDate ? editingExecution.userId : curStage.entryUserId,
                  exitTime: exitDate || curStage.exitTime,
                  exitUserId: exitDate ? editingExecution.userId : curStage.exitUserId
              };

              let executedStages = [...(existingExec?.executedStages || [])];
              if (!isBaseStage) {
                  if (exitDate && !executedStages.includes(targetStageKey)) {
                      executedStages.push(targetStageKey);
                  } else if (!exitDate && executedStages.includes(targetStageKey)) {
                      executedStages = executedStages.filter(s => s !== targetStageKey);
                  }
              }

              const updatedExec: any = {
                  itemId: editingExecution.item.id,
                  jobTypeId: editingExecution.item.jobTypeId,
                  jobTypeName: jobTypes.find(t => t.id === editingExecution.item.jobTypeId)?.name || '',
                  sector: editingExecution.sector,
                  userId: isBaseStage ? editingExecution.userId : (existingExec?.userId || editingExecution.userId),
                  userName: isBaseStage ? (labUsers.find(u => u.id === editingExecution.userId)?.name || '') : (existingExec?.userName || labUsers.find(u => u.id === editingExecution.userId)?.name || ''),
                  entryTime: isBaseStage ? (entryDate || existingExec?.entryTime) : existingExec?.entryTime,
                  timestamp: isBaseStage ? (exitDate || existingExec?.timestamp || entryDate) : (existingExec?.timestamp || exitDate || entryDate),
                  stageTimes: stageTimes,
                  isBaseChecked: isBaseStage ? (!!exitDate || existingExec?.isBaseChecked) : existingExec?.isBaseChecked,
                  executedStages: executedStages
              };

              if (idx !== -1) {
                  newExecutions[idx] = updatedExec;
              } else {
                  newExecutions.push(updatedExec);
              }
          } else if (idx !== -1) {
              const existingExec = newExecutions[idx];
              if (existingExec?.stageTimes && existingExec.stageTimes[targetStageKey]) {
                  const stageTimes = { ...existingExec.stageTimes };
                  delete stageTimes[targetStageKey];
                  const remainingKeys = Object.keys(stageTimes);
                  if (remainingKeys.length === 0 && !existingExec.entryTime && !existingExec.timestamp) {
                      newExecutions.splice(idx, 1);
                  } else {
                      newExecutions[idx] = {
                          ...existingExec,
                          stageTimes,
                          executedStages: (existingExec.executedStages || []).filter((s: string) => s !== targetStageKey)
                      };
                  }
              }
          }

          const selectedUser = labUsers.find(u => u.id === editingExecution.userId);
          const userName = selectedUser?.name || '-';
          const entryTimeStr = editingExecution.entryTime ? new Date(editingExecution.entryTime).toLocaleString() : '-';
          const exitTimeStr = editingExecution.exitTime ? new Date(editingExecution.exitTime).toLocaleString() : '-';
          
          const oldUserName = editingExecution.originalExecution?.userName || 'N/A';
          const oldEntry = editingExecution.originalMovement?.entryTime ? new Date(editingExecution.originalMovement.entryTime).toLocaleString() : 'N/A';
          const oldExit = editingExecution.originalExecution?.timestamp ? new Date(editingExecution.originalExecution.timestamp).toLocaleString() : 'N/A';

          const historyAction = `ALTERAÇÃO DE PRODUÇÃO: Item "${editingExecution.item.name}" (${editingExecution.sector})\n` +
                                `- DE: ${oldUserName} | Ent: ${oldEntry} | Sai: ${oldExit}\n` +
                                `- PARA: ${userName} | Ent: ${entryTimeStr} | Sai: ${exitTimeStr}`;

          const newJobStatus = (entryDate && (job.status === JobStatus.PENDING || job.status === JobStatus.WAITING_APPROVAL)) 
              ? JobStatus.IN_PROGRESS 
              : job.status;

          await updateJob(job.id, {
              status: newJobStatus,
              currentSector: editingExecution.sector,
              sectorMovements: newMovements,
              itemExecutions: newExecutions,
              history: [...(job.history || []).filter(Boolean), {
                  id: `hist_exec_edit_${Date.now()}`,
                  timestamp: new Date(),
                  action: historyAction,
                  userId: currentUser?.id || '',
                  userName: currentUser?.name || 'Sistema',
                  sector: currentUser?.sector || 'Gestão'
              }]
          });

          // Handle commission: recalculate total commission for this user in this sector
          const userItemsInSector = newExecutions.filter(e => e.userId === editingExecution.userId && e.sector === editingExecution.sector).map(e => e.itemId);
          let totalUserComm = 0;
          
          job.items.forEach((item: any) => {
              if (userItemsInSector.includes(item.id) && !item.commissionDisabled) {
                  const secQty = (item.sectorQuantities && item.sectorQuantities[editingExecution.sector]) ? item.sectorQuantities[editingExecution.sector] : item.quantity;
                  const jt = jobTypes.find(t => t.id === item.jobTypeId);
                  const exec = newExecutions.find((e: any) => e.itemId === item.id && e.sector === editingExecution.sector && e.userId === editingExecution.userId);
                  totalUserComm += calculateItemCommission(item, jt, selectedUser, secQty, editingExecution.sector, exec?.executedStages, exec?.isBaseChecked !== false, commissionGroups);
              }
          });

          const matchingComms = commissions.filter(c => c.jobId === job.id && c.sector === editingExecution.sector && c.userId === editingExecution.userId && c.status === CommissionStatus.PENDING);
          const existingComm = matchingComms[0];
          const hasExecutionsInSector = userItemsInSector.length > 0;
          if (hasExecutionsInSector) {
              if (existingComm) {
                  await updateCommissionRecord(existingComm.id, {
                      amount: totalUserComm,
                      createdAt: editingExecution.exitTime ? new Date(editingExecution.exitTime) : existingComm.createdAt
                  });
                  for (let i = 1; i < matchingComms.length; i++) {
                      await deleteCommissionRecord(matchingComms[i].id);
                  }
              } else {
                  await addCommissionRecord({
                      jobId: job.id,
                      osNumber: job.osNumber || 'N/A',
                      patientName: job.patientName,
                      sector: editingExecution.sector,
                      userId: editingExecution.userId,
                      userName: selectedUser?.name || '',
                      amount: totalUserComm,
                      status: CommissionStatus.PENDING,
                      createdAt: editingExecution.exitTime ? new Date(editingExecution.exitTime) : new Date()
                  });
              }
          } else if (matchingComms.length > 0) {
              for (const comm of matchingComms) {
                  await deleteCommissionRecord(comm.id);
              }
          }

          setShowExecutionModal(false);
      } catch (err) {
          console.error(err);
      } finally {
          setIsUpdatingStatus(false);
      }
  };

  const handleDeleteExecution = async (item: JobItem, sector: string) => {
      if (!job || !window.confirm("Deseja realmente excluir esta execução? Os registros de ponto, funcionários e comissão serão limpos para este tipo de trabalho.")) return;
      setIsUpdatingStatus(true);
      try {
          const executionToDelete = (job.itemExecutions || []).find((e: any) => e.itemId === item.id && e.sector === sector);
          const newExecutions = (job.itemExecutions || []).filter((e: any) => !(e.itemId === item.id && e.sector === sector));
          const newMovements = (job.sectorMovements || []).filter((m: any) => m.sector !== sector);
          const deletedUserName = executionToDelete ? executionToDelete.userName : '-';
          
          const exitTime = executionToDelete?.timestamp ? new Date(executionToDelete.timestamp).toLocaleString() : 'N/A';
          const historyAction = `EXCLUSÃO DE PRODUÇÃO: Item "${item.name}" no setor "${sector}".\n` +
                                `- Registro de: ${deletedUserName} finalizado em ${exitTime}`;

          await updateJob(job.id, {
              itemExecutions: newExecutions,
              sectorMovements: newMovements,
              history: [...(job.history || []).filter(Boolean), {
                  id: `hist_exec_del_${Date.now()}`,
                  timestamp: new Date(),
                  action: historyAction,
                  userId: currentUser?.id || '',
                  userName: currentUser?.name || 'Sistema',
                  sector: currentUser?.sector || 'Gestão'
              }]
          });

          if (executionToDelete) {
              const userItemsInSector = newExecutions.filter((e: any) => e.userId === executionToDelete.userId && e.sector === sector).map((e: any) => e.itemId);
              let totalUserComm = 0;
              const selectedUser = labUsers.find(u => u.id === executionToDelete.userId);
              
              job.items.forEach((i: any) => {
                  if (userItemsInSector.includes(i.id) && !i.commissionDisabled) {
                      const secQty = (i.sectorQuantities && i.sectorQuantities[sector]) ? i.sectorQuantities[sector] : i.quantity;
                      const jt = jobTypes.find(t => t.id === i.jobTypeId);
                      const exec = newExecutions.find((e: any) => e.itemId === i.id && e.sector === sector && e.userId === executionToDelete.userId);
                      totalUserComm += calculateItemCommission(i, jt, selectedUser, secQty, sector, exec?.executedStages, exec?.isBaseChecked !== false, commissionGroups);
                  }
              });

              const existingComm = commissions.find(c => c.jobId === job.id && c.sector === sector && c.userId === executionToDelete.userId);
              if (existingComm) {
                  if (totalUserComm > 0) {
                      await updateCommissionRecord(existingComm.id, { amount: totalUserComm });
                  } else {
                      await deleteCommissionRecord(existingComm.id);
                  }
              }
          }
      } catch (err) {
          console.error(err);
      } finally {
          setIsUpdatingStatus(false);
      }
  };

  const recalculateAllCommissions = async (itemsToUse: any[], executionsToUse: any[], extraUserId?: string, extraSector?: string) => {
      if (!job) return;
      const sectorUserPairs = new Map<string, { sector: string; userId: string }>();
      (executionsToUse || []).forEach((e: any) => {
          if (e.sector && e.userId) {
              sectorUserPairs.set(`${e.sector}_${e.userId}`, { sector: e.sector, userId: e.userId });
          }
          if (e.stageTimes && e.sector) {
              Object.values(e.stageTimes).forEach((st: any) => {
                  const uid = st?.exitUserId || st?.entryUserId;
                  if (uid) {
                      sectorUserPairs.set(`${e.sector}_${uid}`, { sector: e.sector, userId: uid });
                  }
              });
          }
      });

      // Gather from existing commissions on this job so any user whose stages were cleared gets checked & disregarded!
      (commissions || []).filter(c => c.jobId === job.id).forEach(c => {
          if (c.sector && c.userId) {
              sectorUserPairs.set(`${c.sector}_${c.userId}`, { sector: c.sector, userId: c.userId });
          }
      });

      if (extraUserId && extraSector) {
          sectorUserPairs.set(`${extraSector}_${extraUserId}`, { sector: extraSector, userId: extraUserId });
      }

      for (const { sector, userId } of sectorUserPairs.values()) {
          const selectedUser = labUsers.find(u => u.id === userId);
          const userItemsInSector = (executionsToUse || [])
              .filter((e: any) => e.sector === sector && (e.userId === userId || (e.stageTimes && Object.values(e.stageTimes).some((st: any) => st?.exitUserId === userId || st?.entryUserId === userId))))
              .map((e: any) => e.itemId);
          
          let totalUserComm = 0;
          itemsToUse.forEach((item: any) => {
              if (userItemsInSector.includes(item.id) && !item.commissionDisabled) {
                  const sectorDisabled = item.sectorCommissionDisabled?.[sector];
                  if (!sectorDisabled) {
                      const secQty = (item.sectorQuantities && item.sectorQuantities[sector] !== undefined) 
                          ? item.sectorQuantities[sector] 
                          : item.quantity;
                      const jt = jobTypes.find(t => t.id === item.jobTypeId);
                      const exec = (executionsToUse || []).find((e: any) => e.itemId === item.id && e.sector === sector);
                      if (exec) {
                          // Filter stages executed specifically by this user
                          let stagesForThisUser = exec.executedStages || [];
                          if (exec.stageTimes) {
                              stagesForThisUser = (exec.executedStages || []).filter((stg: string) => {
                                  const stData = exec.stageTimes?.[stg];
                                  if (stData?.exitUserId) return stData.exitUserId === userId;
                                  return exec.userId === userId;
                              });
                          }
                          const isBaseForThisUser = (exec.isBaseChecked !== false) && 
                              (!exec.stageTimes?.['BASE']?.exitUserId || exec.stageTimes?.['BASE']?.exitUserId === userId || exec.userId === userId);

                          totalUserComm += calculateItemCommission(
                              item, 
                              jt, 
                              selectedUser, 
                              Number(secQty) || 1, 
                              sector, 
                              stagesForThisUser, 
                              isBaseForThisUser, 
                              commissionGroups
                          );
                      }
                  }
              }
          });

          // Determinar a data de saída exata do colaborador neste setor, se disponível
          let userExitTime: Date | undefined = undefined;
          const userExecs = (executionsToUse || []).filter((e: any) => e.sector === sector && (e.userId === userId || (e.stageTimes && Object.values(e.stageTimes).some((st: any) => st?.exitUserId === userId))));
          for (const ue of userExecs) {
              if (ue.stageTimes) {
                  for (const st of Object.values(ue.stageTimes) as any[]) {
                      if (st?.exitTime && (st.exitUserId === userId || !st.exitUserId)) {
                          userExitTime = st.exitTime instanceof Date ? st.exitTime : new Date((st.exitTime as any).seconds ? (st.exitTime as any).seconds * 1000 : st.exitTime);
                          break;
                      }
                  }
              }
              if (!userExitTime && ue.exitTime) {
                  userExitTime = ue.exitTime instanceof Date ? ue.exitTime : new Date((ue.exitTime as any).seconds ? (ue.exitTime as any).seconds * 1000 : ue.exitTime);
              }
              if (userExitTime) break;
          }

          const matchingComms = commissions.filter(c => c.jobId === job.id && c.sector === sector && c.userId === userId && c.status === CommissionStatus.PENDING);
          const existingComm = matchingComms[0];
          const hasExecutionsInSector = userItemsInSector.length > 0;
          if (hasExecutionsInSector) {
              if (existingComm) {
                  await updateCommissionRecord(existingComm.id, { 
                      amount: totalUserComm,
                      createdAt: userExitTime || existingComm.createdAt || new Date()
                  });
                  for (let i = 1; i < matchingComms.length; i++) {
                      await deleteCommissionRecord(matchingComms[i].id);
                  }
              } else {
                  await addCommissionRecord({
                      jobId: job.id,
                      osNumber: job.osNumber || 'N/A',
                      patientName: job.patientName,
                      sector: sector,
                      userId: userId,
                      userName: selectedUser?.name || '',
                      amount: totalUserComm,
                      status: CommissionStatus.PENDING,
                      createdAt: userExitTime || new Date()
                  });
              }
          } else if (matchingComms.length > 0) {
              for (const comm of matchingComms) {
                  await deleteCommissionRecord(comm.id);
              }
          }
      }
  };

  const handleClearStageExecution = async (item: JobItem, sector: string, stageName: string) => {
      if (!job) return;
      if (!canEditProduction && !canManageCommissions) {
          alert("Você não possui permissão para gerenciar a produção ou comissões.");
          return;
      }

      const displayName = stageName === 'BASE' ? sector : `${sector} - ${stageName}`;
      const confirmed = window.confirm(
          `Deseja realmente limpar a etapa "${displayName}" no item "${item.name}"?\n\n` +
          `• Os horários de entrada e saída serão removidos desta etapa.\n` +
          `• Caso um colaborador tenha dado saída e tido a comissão contabilizada, ela será AUTOMATICAMENTE DESCONSIDERADA.`
      );
      if (!confirmed) return;

      setIsUpdatingStatus(true);
      try {
          const execution = (job.itemExecutions || []).find((e: any) => e.itemId === item.id && e.sector === sector);
          if (!execution) return;

          const stageData = execution.stageTimes?.[stageName];
          const affectedUserId = stageData?.exitUserId || stageData?.entryUserId || execution.userId;
          const affectedUser = labUsers.find(u => u.id === affectedUserId);
          const affectedUserName = affectedUser?.name || execution.userName || 'Colaborador';

          let newExecutions: any[] = [];
          (job.itemExecutions || []).forEach((e: any) => {
              if (e.itemId === item.id && e.sector === sector) {
                  const newStageTimes = { ...(e.stageTimes || {}) };
                  delete newStageTimes[stageName];

                  const newExecutedStages = (e.executedStages || []).filter((s: string) => s !== stageName);
                  let isBaseChecked = e.isBaseChecked;
                  let entryTime = e.entryTime;
                  let timestamp = e.timestamp;
                  let userId = e.userId;
                  let userName = e.userName;

                  if (stageName === 'BASE') {
                      isBaseChecked = false;
                      entryTime = undefined;
                      timestamp = undefined;
                  }

                  const remainingStageEntries = Object.entries(newStageTimes);
                  if (remainingStageEntries.length > 0) {
                      const [lastStgName, lastStgData]: [string, any] = remainingStageEntries[remainingStageEntries.length - 1];
                      if (lastStgData?.exitUserId || lastStgData?.entryUserId) {
                          const fallbackUid = lastStgData.exitUserId || lastStgData.entryUserId;
                          userId = fallbackUid;
                          userName = labUsers.find(u => u.id === fallbackUid)?.name || userName;
                      }
                      if (lastStgData?.exitTime || lastStgData?.entryTime) {
                          timestamp = lastStgData.exitTime || lastStgData.entryTime;
                      }
                  } else if (!isBaseChecked && !entryTime && !timestamp) {
                      userId = '';
                      userName = '';
                  }

                  const hasStagesLeft = remainingStageEntries.length > 0;
                  const hasExecutedStagesLeft = newExecutedStages.length > 0;
                  const hasBaseLeft = isBaseChecked || !!entryTime || !!timestamp;

                  if (hasStagesLeft || hasExecutedStagesLeft || hasBaseLeft) {
                      newExecutions.push({
                          ...e,
                          stageTimes: newStageTimes,
                          executedStages: newExecutedStages,
                          isBaseChecked,
                          entryTime,
                          timestamp,
                          userId,
                          userName
                      });
                  }
              } else {
                  newExecutions.push(e);
              }
          });

          // Ajustar movimentações de setor caso não sobre nada ativo neste setor
          let newMovements = [...(job.sectorMovements || [])];
          const anyActiveInSector = newExecutions.some((e: any) => e.sector === sector);
          if (!anyActiveInSector) {
              newMovements = newMovements.filter(m => m.sector !== sector || (m.entryTime && !m.exitTime));
          }

          const historyAction = `LIMPEZA DE ETAPA: Etapa "${displayName}" no item "${item.name}" foi limpa pelo gestor.\n` +
                                `- Entrada e saída resetadas.\n` +
                                `- Comissão desconsiderada para ${affectedUserName}.`;

          const newHistory = [...(job.history || []).filter(Boolean), {
              id: `hist_exec_clear_${Date.now()}`,
              timestamp: new Date(),
              action: historyAction,
              userId: currentUser?.id || '',
              userName: currentUser?.name || 'Sistema',
              sector: currentUser?.sector || 'Gestão'
          }];

          await updateJob(job.id, {
              itemExecutions: newExecutions,
              sectorMovements: newMovements,
              history: newHistory
          });

          // Desconsidera automaticamente a comissão do colaborador nesta etapa
          await recalculateAllCommissions(job.items, newExecutions, affectedUserId, sector);

      } catch (err) {
          console.error("Erro ao limpar etapa:", err);
          alert("Erro ao limpar a etapa.");
      } finally {
          setIsUpdatingStatus(false);
      }
  };

  const handleSectorQuantityChange = async (itemId: string, sectorName: string, newQty: number | string) => {
      if (!canManageCommissions && !canEditProduction) return;
      const updatedItems = job.items.map((item: any) => {
          if (item.id === itemId) {
              const currentQuantities = item.sectorQuantities || {};
              const currentStageQuantities = item.stageQuantities || {};
              const updatedStageQuantitiesForSec = { ...(currentStageQuantities[sectorName] || {}) };
              Object.keys(updatedStageQuantitiesForSec).forEach(stg => {
                  updatedStageQuantitiesForSec[stg] = typeof newQty === 'number' ? newQty : Number(newQty) || 1;
              });
              return {
                  ...item,
                  sectorQuantities: {
                      ...currentQuantities,
                      [sectorName]: newQty
                  },
                  stageQuantities: Object.keys(updatedStageQuantitiesForSec).length > 0 ? {
                      ...currentStageQuantities,
                      [sectorName]: updatedStageQuantitiesForSec
                  } : currentStageQuantities
              };
          }
          return item;
      });

      await updateJob(job.id, { items: updatedItems });
      if (newQty !== '' && !isNaN(Number(newQty))) {
          await recalculateAllCommissions(updatedItems, job.itemExecutions || []);
      }
  };

  const handleSectorCommissionToggle = async (itemId: string, sectorName: string, disabled: boolean) => {
      if (!canManageCommissions) return;
      const updatedItems = job.items.map((item: any) => {
          if (item.id === itemId) {
              const currentDisabled = item.sectorCommissionDisabled || {};
              return {
                  ...item,
                  sectorCommissionDisabled: {
                      ...currentDisabled,
                      [sectorName]: disabled
                  }
              };
          }
          return item;
      });

      await updateJob(job.id, { items: updatedItems });
      await recalculateAllCommissions(updatedItems, job.itemExecutions || []);
  };

  const startEditingItem = (item: JobItem) => {
      if (isFinished && !job?.isBudget) {
          alert("Não é possível editar itens de um caso concluído. Reabra o caso primeiro.");
          return;
      }
      if (!canEditServiceDetails) {
          alert("Você não tem permissão para editar os detalhes do serviço.");
          return;
      }
      setEditingItemId(item.id);
      const teeth = item.selectedTeeth || [];
      setItemEditTeethInput(teeth.join(', '));
      const isSur = item.priceAdjustmentType === 'SURCHARGE' || (Boolean(item.appliedSurcharge) && Number(item.appliedSurcharge) > 0) || (Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0);
      const isFixed = isSur ? (Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0) : (Boolean(item.appliedDiscountFixed) && Number(item.appliedDiscountFixed) > 0);
      setItemEditForm({
          quantity: item.quantity || 1,
          nature: item.nature || 'NORMAL',
          price: item.basePriceBeforeDiscount ?? item.price,
          priceAdjustmentType: isSur ? 'SURCHARGE' : 'DISCOUNT',
          appliedDiscount: item.appliedDiscount || 0,
          appliedDiscountFixed: item.appliedDiscountFixed || 0,
          appliedSurcharge: item.appliedSurcharge || 0,
          appliedSurchargeFixed: item.appliedSurchargeFixed || 0,
          discountType: isFixed ? 'FIXED' : 'PERCENTAGE',
          appliedPriceTable: item.appliedPriceTable || 'Padrão',
          commissionDisabled: item.commissionDisabled || false,
          isInternalStep: item.isInternalStep || false,
          selectedVariationIds: item.selectedVariationIds || [],
          variationValues: item.variationValues || {},
          sectorCommissionDisabled: item.sectorCommissionDisabled || {},
          selectedTeeth: teeth,
          color: item.color || ''
      });
  };

  const cancelEditingItem = () => {
      setEditingItemId(null);
  };

  const handleSaveItemEdit = async (item: JobItem) => {
      if (isFinished && !job?.isBudget) {
          alert("Não é possível editar itens de um caso concluído. Reabra o caso primeiro.");
          return;
      }
      if (!canEditServiceDetails) {
          alert("Você não tem permissão para editar os detalhes do serviço.");
          return;
      }
      const parsedQty = Math.max(1, parseInt(String(itemEditForm.quantity)) || (itemEditForm.selectedTeeth.length > 0 ? itemEditForm.selectedTeeth.length : 1));
      const newBasePrice = Math.max(0, parseFloat(String(itemEditForm.price)) || 0);
      const isSur = itemEditForm.priceAdjustmentType === 'SURCHARGE';
      const appliedDiscount = !isSur ? Math.max(0, parseFloat(String(itemEditForm.appliedDiscount)) || 0) : 0;
      const appliedDiscountFixed = !isSur ? Math.max(0, parseFloat(String(itemEditForm.appliedDiscountFixed)) || 0) : 0;
      const appliedSurcharge = isSur ? Math.max(0, parseFloat(String(itemEditForm.appliedSurcharge)) || 0) : 0;
      const appliedSurchargeFixed = isSur ? Math.max(0, parseFloat(String(itemEditForm.appliedSurchargeFixed)) || 0) : 0;

      let finalPrice = newBasePrice;
      if (isSur) {
          if (appliedSurchargeFixed > 0) finalPrice += appliedSurchargeFixed;
          else finalPrice = finalPrice * (1 + appliedSurcharge / 100);
      } else {
          finalPrice = finalPrice * (1 - (appliedDiscount / 100));
          if (appliedDiscountFixed > 0) finalPrice -= appliedDiscountFixed;
          finalPrice = Math.max(0, finalPrice);
      }
      
      const updatedItems = job.items.map((i: any) => {
          if (i.id === item.id) {
              const oldQty = i.quantity || 1;
              const nextSectorQuantities: Record<string, number> = {};
              if (i.sectorQuantities) {
                  Object.entries(i.sectorQuantities).forEach(([sec, q]: [string, any]) => {
                      nextSectorQuantities[sec] = (Number(q) === oldQty || Number(q) === 1) ? parsedQty : Number(q);
                  });
              }
              return {
                  ...i,
                  quantity: parsedQty,
                  nature: itemEditForm.nature || 'NORMAL',
                  price: finalPrice,
                  basePriceBeforeDiscount: newBasePrice,
                  priceAdjustmentType: itemEditForm.priceAdjustmentType || 'DISCOUNT',
                  appliedDiscount: appliedDiscount,
                  appliedDiscountFixed: appliedDiscountFixed,
                  appliedSurcharge: appliedSurcharge,
                  appliedSurchargeFixed: appliedSurchargeFixed,
                  appliedPriceTable: itemEditForm.appliedPriceTable,
                  commissionDisabled: itemEditForm.commissionDisabled,
                  isInternalStep: itemEditForm.isInternalStep,
                  selectedVariationIds: itemEditForm.selectedVariationIds,
                  variationValues: itemEditForm.variationValues,
                  sectorCommissionDisabled: itemEditForm.sectorCommissionDisabled,
                  selectedTeeth: itemEditForm.selectedTeeth.length > 0 ? itemEditForm.selectedTeeth : undefined,
                  color: itemEditForm.color || undefined,
                  sectorQuantities: Object.keys(nextSectorQuantities).length > 0 ? nextSectorQuantities : undefined,
                  stageQuantities: i.stageQuantities ? (() => {
                      const nextSQ: Record<string, Record<string, number>> = {};
                      Object.entries(i.stageQuantities).forEach(([sec, stgs]) => {
                          nextSQ[sec] = {};
                          Object.entries(stgs as Record<string, number>).forEach(([stg, q]) => {
                              nextSQ[sec][stg] = (Number(q) === 1 || Number(q) === oldQty) ? parsedQty : q;
                          });
                      });
                      return nextSQ;
                  })() : undefined
              };
          }
          return i;
      });

      const productsTotal = (job.products || []).reduce((acc: number, p: any) => acc + (p.unitPrice * p.quantity), 0);
      const newTotalValue = updatedItems.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0) + productsTotal;

      await updateJob(job.id, { 
          items: updatedItems,
          totalValue: newTotalValue,
          history: [...(job.history || []).filter(Boolean), {
              id: `hist_item_edit_${Date.now()}`,
              timestamp: new Date(),
              action: `Item "${item.name}" editado (Qtd: ${parsedQty}, Total: R$ ${(finalPrice * parsedQty).toFixed(2)})`,
              userId: currentUser?.id || '',
              userName: currentUser?.name || 'Sistema',
              sector: currentUser?.sector || 'Gestão'
          }]
      });

      await recalculateAllCommissions(updatedItems, job.itemExecutions || []);
      setEditingItemId(null);
  };

  const handlePriceTableSelect = (itemTypeId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = e.target.value;
      if (selectedValue === 'padrão') {
          const jType = jobTypes.find(jt => jt.id === itemTypeId);
          if (jType) {
              setItemEditForm(prev => ({ ...prev, price: jType.basePrice, appliedPriceTable: 'Padrão' }));
          }
      } else if (selectedValue === 'custom') {
           setItemEditForm(prev => ({ ...prev, appliedPriceTable: 'Personalizado' }));
      } else {
          const table = priceTables.find(t => t.id === selectedValue);
          if (table) {
              const priceObj = table.prices[itemTypeId];
              if (priceObj && priceObj.basePrice !== undefined) {
                  setItemEditForm(prev => ({ ...prev, price: priceObj.basePrice, appliedPriceTable: table.name }));
              } else {
                  // Fallback to jobType basePrice
                  const jType = jobTypes.find(jt => jt.id === itemTypeId);
                  if (jType) {
                      setItemEditForm(prev => ({ ...prev, price: jType.basePrice, appliedPriceTable: table.name }));
                  }
              }
          }
      }
  };

  const showChatTab = true;

  if (isFreeLab) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/jobs')} 
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors animate-in cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('jobDetails.caseSummary', 'Resumo do Caso')}</h1>
            <p className="text-xs text-slate-500 font-bold">{t('jobDetails.simplifiedOs', 'Ordem de Serviço Simplificada')}</p>
          </div>
        </div>

        {/* OS Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-4 sm:p-6 md:p-4 sm:p-8 space-y-6">
          
          {/* Header OS details */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t('jobDetails.osCode', 'Código OS')}</span>
              <h2 className="font-mono text-xl font-black text-blue-600">#{job.osNumber || job.id.substring(0, 6)}</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t('jobDetails.currentStatus', 'Status Atual')}</span>
              <div>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(job.status)}`}>
                  {getTranslatedStatus(job.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Core Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:p-6">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">{t('jobDetails.requestingDentist', 'Dentista Solicitante')}</span>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <User size={16} className="text-blue-500 font-bold" />
                <span>Dr(a). {job.dentistName}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">{t('jobDetails.patientName', 'Nome do Paciente')}</span>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <User size={16} className="text-slate-400 font-bold" />
                <span>{job.patientName}</span>
              </div>
              {clientAddressFormatted && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600 font-medium">
                  <MapPin size={13} className="text-blue-500 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Endereço:</span>
                  <span className="truncate" title={clientAddressFormatted}>{clientAddressFormatted}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">{t('jobDetails.completionDate', 'Data de Finalização')}</span>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Calendar size={16} className="text-green-500 font-bold" />
                <span>{(job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-")}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">{t('jobDetails.serviceType', 'Tipo de Serviço')}</span>
              <div className="text-slate-700 font-bold bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-xs">
                {job.items?.map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ') || 
                 job.products?.map((p: any) => `${p.name} (x${p.quantity || 1})`).join(', ') || 'Sem serviços informados'}
              </div>
            </div>
          </div>

          {/* Observations and Editing */}
          <div className="border-t border-slate-100 pt-6 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t('jobDetails.orderObservations', 'Observações do Pedido')}</span>
              {!freeLabEditingNotes && (
                <button 
                  onClick={() => {
                    setFreeLabEditingNotes(true);
                    setFreeLabNotesText(job.notes || '');
                  }}
                  className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 size={14} /> Editar Obs.
                </button>
              )}
            </div>

            {freeLabEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={freeLabNotesText}
                  onChange={(e) => setFreeLabNotesText(e.target.value)}
                  placeholder="Acrescente observações ou notas adicionais aqui..."
                  rows={4}
                  className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setFreeLabEditingNotes(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setIsUpdatingStatus(true);
                      try {
                        await updateJob(job.id, { 
                          notes: freeLabNotesText,
                          history: [...(job.history || []).filter(Boolean), {
                            id: `hist_freelab_notes_${Date.now()}`,
                            timestamp: new Date(),
                            action: `Observação do caso editada`,
                            userId: currentUser?.id || 'sys',
                            userName: currentUser?.name || 'Sistema'
                          }]
                        });
                        setFreeLabEditingNotes(false);
                      } catch (err) {
                        alert("Erro ao salvar observações.");
                      } finally {
                        setIsUpdatingStatus(false);
                      }
                    }}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    {isUpdatingStatus && <Loader2 size={12} className="animate-spin" />}
                    Salvar Observação
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[80px]">
                {job.notes ? (
                  <p className="text-slate-700 text-xs font-semibold whitespace-pre-wrap">{job.notes}</p>
                ) : (
                  <p className="text-slate-400 text-xs italic">{t("job.noAdditionalNotes", "Nenhuma observação ou instrução adicional informada.")}</p>
                )}

                {/* Notas Externas Fixas do Cliente */}
                {matchedDentist?.externalNotes && (
                  <div className="mt-3 bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs shadow-2xs">
                    <Pin size={14} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-blue-900 uppercase tracking-wider flex items-center justify-between">
                        <span>Notas Externas Fixas do Cliente ({matchedDentist.name})</span>
                        <span className="bg-blue-200/70 text-blue-900 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">Fixa nos Trabalhos</span>
                      </div>
                      <p className="text-blue-950 font-bold mt-1 whitespace-pre-wrap leading-relaxed">{matchedDentist.externalNotes}</p>
                    </div>
                  </div>
                )}

                {/* Observações Internas sobre o Dentista (Laboratório) */}
                {matchedDentist?.internalNotes && (
                  <div className="mt-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs shadow-2xs">
                    <Lock size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center justify-between">
                        <span>Observações Internas sobre o Cliente ({matchedDentist.name})</span>
                        <span className="bg-amber-200/70 text-amber-900 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">Apenas Laboratório</span>
                      </div>
                      <p className="text-amber-950 font-medium mt-1 whitespace-pre-wrap leading-relaxed">{matchedDentist.internalNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notas Exclusivas do Caso */}
          <div className="border-t border-slate-100 pt-6 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <StickyNote size={15} className="text-amber-600" />
                <span className="text-[11px] font-black uppercase text-amber-900 tracking-wider">Notas do Caso</span>
                <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-amber-200">Exclusivo deste Caso</span>
              </div>
              {!editingCaseNotes && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingCaseNotes(true);
                    setCaseNotesText(job.caseNotes || '');
                  }}
                  className="text-amber-700 hover:text-amber-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200/80"
                >
                  <Edit3 size={13} /> {job.caseNotes ? 'Editar Notas do Caso' : '+ Adicionar Nota'}
                </button>
              )}
            </div>

            {editingCaseNotes ? (
              <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200">
                <div className="text-[11px] font-bold text-amber-900">
                  Insira anotações ou comentários específicos para este caso. Podem ser inseridos ou modificados a qualquer momento (mesmo após o caso ser finalizado).
                </div>
                <textarea
                  value={caseNotesText}
                  onChange={(e) => setCaseNotesText(e.target.value)}
                  placeholder="Digite comentários ou anotações referentes exclusivamente a este caso..."
                  rows={4}
                  className="w-full p-3 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-xs font-semibold text-slate-800 shadow-2xs"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCaseNotes(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsUpdatingStatus(true);
                      try {
                        await updateJob(job.id, { 
                          caseNotes: caseNotesText,
                          history: [...(job.history || []).filter(Boolean), {
                            id: `hist_case_notes_${Date.now()}`,
                            timestamp: new Date(),
                            action: `Nota do caso atualizada`,
                            userId: currentUser?.id || 'sys',
                            userName: currentUser?.name || 'Sistema'
                          }]
                        });
                        setEditingCaseNotes(false);
                      } catch (err) {
                        alert("Erro ao salvar notas do caso.");
                      } finally {
                        setIsUpdatingStatus(false);
                      }
                    }}
                    disabled={isUpdatingStatus}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    {isUpdatingStatus && <Loader2 size={12} className="animate-spin" />}
                    Salvar Notas do Caso
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60 min-h-[70px]">
                {job.caseNotes ? (
                  <p className="text-amber-950 text-xs font-semibold whitespace-pre-wrap leading-relaxed">{job.caseNotes}</p>
                ) : (
                  <div className="flex items-center justify-between text-amber-800/80 text-xs italic">
                    <span>Nenhuma nota específica foi registrada sobre este caso.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCaseNotes(true);
                        setCaseNotesText('');
                      }}
                      className="not-italic font-bold text-amber-900 hover:underline text-[11px] cursor-pointer"
                    >
                      + Criar Nota do Caso
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action / Status Buttons Section */}
          <div className="border-t border-slate-100 pt-6">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-4">{t("job.statusControlActions", "Ações de Controle de Status")}</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Botão de Status */}
              {canChangeStatus && (
              <div 
                className="relative"
                onMouseEnter={() => canChangeStatus && setIsActionStatusMenuOpen(true)}
                onMouseLeave={() => setIsActionStatusMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => canChangeStatus && setIsActionStatusMenuOpen(prev => !prev)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all border border-slate-200 cursor-pointer shadow-xs"
                >
                  <RefreshCw size={14} className="text-slate-500" />
                  Mudar Status
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${isActionStatusMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown item options */}
                {isActionStatusMenuOpen && (
                  <div className="absolute left-0 right-0 top-full pt-0.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                      {[JobStatus.PENDING, JobStatus.IN_PROGRESS, JobStatus.WAITING_APPROVAL].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setIsActionStatusMenuOpen(false);
                            handleQuickStatusUpdate(st);
                          }}
                          className="w-full px-4 py-3 hover:bg-slate-50 text-left text-xs font-extrabold text-slate-700 uppercase tracking-tight flex items-center justify-between transition-colors border-b last:border-0 border-slate-100 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${st === JobStatus.PENDING ? 'bg-amber-400' : st === JobStatus.IN_PROGRESS ? 'bg-blue-400' : 'bg-purple-400'}`} />
                            <span>{getTranslatedStatus(st)}</span>
                          </div>
                          {job.status === st && <Check size={14} className="text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Botão Finalizar */}
              {canFinish && (
              <button
                type="button"
                onClick={() => handleQuickStatusUpdate(JobStatus.COMPLETED)}
                disabled={job.status === JobStatus.COMPLETED}
                className={`w-full py-3 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  job.status === JobStatus.COMPLETED 
                    ? 'bg-green-100 text-green-700 border border-green-200 cursor-default' 
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg active:scale-95'
                }`}
              >
                <CheckCircle2 size={16} />
                {job.status === JobStatus.COMPLETED ? 'Finalizado' : 'Finalizar Caso'}
              </button>
              )}

              {/* Botão Logística */}
              {canChangeStatus && (
              <button
                type="button"
                onClick={() => handleQuickStatusUpdate(JobStatus.DELIVERED)}
                disabled={job.status === JobStatus.DELIVERED}
                className={`w-full py-3 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  job.status === JobStatus.DELIVERED 
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-default' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95'
                }`}
              >
                <Truck size={16} />
                {job.status === JobStatus.DELIVERED ? 'Na Logística' : 'Enviar p/ Logística'}
              </button>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 md:space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      
      {job.isPseudo && job.status === 'REJECTED_REQUISITION' && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-3xl p-4 md:p-4 sm:p-6 mb-4 flex flex-col md:flex-row md:items-center p-5 justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex gap-3">
            <XCircle className="text-red-500 shrink-0 mt-0.5 md:mt-0 animate-bounce" size={24} />
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-tight text-red-900">{t("job.reqRejected", "Requisição Recusada")}</h4>
              {job.rejectionReason ? (
                <div className="mt-2 text-xs font-semibold text-red-700 bg-red-100/50 p-3 rounded-2xl border border-red-200">
                  <span className="font-bold block uppercase text-[10px] tracking-wide mb-1 text-red-800">Motivo fornecido pelo laboratório:</span>
                  {job.rejectionReason}
                </div>
              ) : (
                <p className="text-xs font-semibold text-red-700 mt-1 max-w-2xl">
                  O laboratório {job.labName} optou por não dar andamento nesta requisição. Entre em contato diretamente com o laboratório para obter esclarecimentos.
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0">
            <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Recusada pelo Lab
            </span>
          </div>
        </div>
      )}

      {!job.isPseudo && job.status === JobStatus.REJECTED && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-3xl p-4 md:p-4 sm:p-6 mb-4 flex flex-col md:flex-row md:items-center p-5 justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex gap-3">
            <XCircle className="text-red-500 shrink-0 mt-0.5 md:mt-0 animate-bounce" size={24} />
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-tight text-red-900">Trabalho Rejeitado / Cancelado</h4>
              {job.rejectionReason ? (
                <div className="mt-2 text-xs font-semibold text-red-700 bg-red-100/50 p-3 rounded-2xl border border-red-200">
                  <span className="font-bold block uppercase text-[10px] tracking-wide mb-1 text-red-800">Motivo da recusa / cancelamento:</span>
                  {job.rejectionReason}
                </div>
              ) : (
                <p className="text-xs font-semibold text-red-700 mt-1 max-w-2xl">
                  Este trabalho foi recusado/cancelado. Entre em contato diretamente com o laboratório para obter mais esclarecimentos.
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0">
            <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Rejeitado / Estornado
            </span>
          </div>
        </div>
      )}

      {job.isPseudo && job.status === 'PENDING_REQUISITION' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-3xl p-4 md:p-4 sm:p-6 mb-4 flex flex-col md:flex-row md:items-center p-5 justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex gap-3">
            <Clock className="text-amber-500 shrink-0 mt-0.5 md:mt-0" size={24} />
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-tight text-amber-900">{t("job.reqPending", "Requisição Online Pendente")}</h4>
              <p className="text-xs font-semibold text-amber-700 mt-1 max-w-2xl">
                {isLabStaff 
                  ? "Esta é uma nova requisição enviada por um dentista parceiro. Você pode aceitá-la para iniciar a produção ou recusá-la informando o motivo."
                  : `Esta é uma requisição enviada ao laboratório ${job.labName}. O status do trabalho e o chat de acompanhamento estarão disponíveis e ativos assim que o laboratório aceitar este envio e criar a Ordem de Serviço em produção.`
                }
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {isLabStaff ? (
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptRequisitionFromDetails}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-2xl text-xs uppercase flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Check size={14} /> Aceitar
                </button>
                <button
                  onClick={handleRejectRequisitionFromDetails}
                  className="bg-red-100 hover:bg-red-200 text-red-700 font-black px-4 py-2 rounded-2xl text-xs uppercase flex items-center gap-1.5 transition-all active:scale-95 border border-red-200 cursor-pointer"
                >
                  <X size={14} /> Recusar
                </button>
              </div>
            ) : (
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                Aguardando Laboratório
              </span>
            )}
          </div>
        </div>
      )}
      
      {show3DViewer && job.attachments && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Carregando 3D...</div>}>
              <STLViewer files={job.attachments} onClose={() => setShow3DViewer(false)} />
          </Suspense>
      )}

      {showAlertModal && <CreateAlertModal job={job} onClose={() => setShowAlertModal(false)} />}
      
      {/* MODAL RETORNO */}
      {showReturnModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-4 sm:p-8 max-w-lg w-full text-center animate-in zoom-in duration-300 shadow-2xl">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RefreshCw size={32} className="text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">{t("job.registerReturn", "Cadastrar Retorno")}</h3>
                  <p className="text-sm text-slate-500 font-bold mb-8">O que deseja fazer com esta Ordem de Serviço?</p>
                  
                  <div className="grid grid-cols-1 gap-3">
                      <button onClick={() => { setShowReturnModal(false); handleReturnAction('PROSSEGUIMENTO'); }} className="w-full p-4 border-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-2xl font-black uppercase flex items-center justify-between group transition-all">
                          <div className="flex items-center gap-3">
                              <ArrowRightCircle size={20} className="text-indigo-500" />
                              <div className="text-left">
                                  <div className="text-sm">{t("job.continuation", "Prosseguimento")}</div>
                                  <div className="text-[10px] text-indigo-400 font-bold tracking-widest mt-0.5">{t("job.createCleanOS", "Criar OS limpa para a próxima fase")}</div>
                              </div>
                          </div>
                      </button>

                      <button onClick={() => { setShowReturnModal(false); handleReturnAction('REPETICAO'); }} className="w-full p-4 border-2 border-red-100 bg-red-50/50 hover:bg-red-50 text-red-700 rounded-2xl font-black uppercase flex items-center justify-between group transition-all">
                          <div className="flex items-center gap-3">
                              <RotateCcw size={20} className="text-red-500" />
                              <div className="text-left">
                                  <div className="text-sm">{t("job.repetition", "Repetição")}</div>
                                  <div className="text-[10px] text-red-400 font-bold tracking-widest mt-0.5">{t("job.copyOSRepetition", "Copiar OS com itens de repetição")}</div>
                              </div>
                          </div>
                      </button>

                      <button onClick={() => { setShowReturnModal(false); handleReturnAction('AJUSTE'); }} className="w-full p-4 border-2 border-orange-100 bg-orange-50/50 hover:bg-orange-50 text-orange-700 rounded-2xl font-black uppercase flex items-center justify-between group transition-all">
                          <div className="flex items-center gap-3">
                              <Edit3 size={20} className="text-orange-500" />
                              <div className="text-left">
                                  <div className="text-sm">{t("job.adjustment", "Ajuste")}</div>
                                  <div className="text-[10px] text-orange-400 font-bold tracking-widest mt-0.5">{t("job.copyOSAdjustment", "Copiar OS com itens para ajuste")}</div>
                              </div>
                          </div>
                      </button>
                  </div>
                  
                  <button onClick={() => setShowReturnModal(false)} className="mt-6 w-full py-3 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest">
                      Cancelar
                  </button>
              </div>
          </div>
      )}

      
      {/* MODAL STAGE CONFIG */}
      {stageConfigItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl shrink-0">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                              <Settings className="text-slate-400" />
                              Etapas do Serviço
                          </h3>
                          <p className="text-xs text-slate-500 font-bold uppercase mt-1 tracking-widest">{stageConfigItem.name}</p>
                      </div>
                      <button onClick={() => setStageConfigItem(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 overflow-y-auto flex-1 space-y-4">
                      {sectors.map(sector => (
                          <div key={sector.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                              <button
                                  className="w-full bg-slate-50 hover:bg-slate-100 p-4 flex justify-between items-center transition-colors"
                                  onClick={() => setExpandedStageSectors(prev => ({ ...prev, [sector.name]: !prev[sector.name] }))}
                              >
                                  <span className="font-black text-slate-700 text-sm">{sector.name}</span>
                                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${expandedStageSectors[sector.name] ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {expandedStageSectors[sector.name] && (
                                  <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                                      {(() => {
                                          const combinedStages = Array.from(new Set([
                                              ...(sector.stages || []),
                                              ...(tempItemStages[sector.name] || [])
                                          ])).filter(stg => typeof stg === 'string' && stg.trim() !== '');

                                          return (
                                              <>
                                                  {combinedStages.length === 0 ? (
                                                      <p className="text-xs text-slate-400 font-bold text-center py-1">{t("job.noStepsInSector", "Nenhuma etapa cadastrada neste setor.")}</p>
                                                  ) : (
                                                      combinedStages.map((stage, idx) => {
                                                          const isChecked = tempItemStages[sector.name]?.includes(stage) || false;
                                                          return (
                                                              <div key={idx} className="flex items-center justify-between gap-3 p-2 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-colors">
                                                                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                                      <input
                                                                          type="checkbox"
                                                                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                                                          checked={isChecked}
                                                                          onChange={(e) => {
                                                                              const current = tempItemStages[sector.name] || [];
                                                                              let next;
                                                                              if (e.target.checked) {
                                                                                  next = [...current, stage];
                                                                                  const secQty = (stageConfigItem?.sectorQuantities && stageConfigItem.sectorQuantities[sector.name] !== undefined)
                                                                                      ? stageConfigItem.sectorQuantities[sector.name]
                                                                                      : (stageConfigItem?.quantity || 1);
                                                                                  setTempStageQuantities(prev => ({
                                                                                      ...prev,
                                                                                      [sector.name]: {
                                                                                          ...(prev[sector.name] || {}),
                                                                                          [stage]: secQty
                                                                                      }
                                                                                  }));
                                                                              } else {
                                                                                  next = current.filter(s => s !== stage);
                                                                                  if (tempStageQuantities[sector.name] && tempStageQuantities[sector.name][stage]) {
                                                                                      setTempStageQuantities(prev => {
                                                                                          const newQts = {...prev};
                                                                                          if (newQts[sector.name]) {
                                                                                              delete newQts[sector.name][stage];
                                                                                          }
                                                                                          return newQts;
                                                                                      });
                                                                                  }
                                                                              }
                                                                              setTempItemStages(prev => ({ ...prev, [sector.name]: next }));
                                                                          }}
                                                                      />
                                                                      <span className="text-sm font-bold text-slate-600">{stage}</span>
                                                                  </label>
                                                                  
                                                                  {isChecked && (
                                                                      <div className="flex items-center gap-2">
                                                                          <span className="text-xs text-slate-400 font-bold">Qtd:</span>
                                                                          <input 
                                                                              type="number"
                                                                              min="1"
                                                                              className="w-16 h-8 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent px-2"
                                                                              value={(() => {
                                                                                  const v = tempStageQuantities[sector.name]?.[stage];
                                                                                  if (v !== undefined && v > 0) return v;
                                                                                  const secQty = (stageConfigItem?.sectorQuantities && stageConfigItem.sectorQuantities[sector.name] !== undefined)
                                                                                      ? stageConfigItem.sectorQuantities[sector.name]
                                                                                      : (stageConfigItem?.quantity || 1);
                                                                                  return secQty;
                                                                              })()}
                                                                              onChange={(e) => {
                                                                                  const val = e.target.value === '' ? '' : (parseInt(e.target.value) || '');
                                                                                  setTempStageQuantities(prev => ({
                                                                                      ...prev,
                                                                                      [sector.name]: {
                                                                                          ...(prev[sector.name] || {}),
                                                                                          [stage]: val as any
                                                                                      }
                                                                                  }));
                                                                              }}
                                                                          />
                                                                      </div>
                                                                  )}
                                                              </div>
                                                          );
                                                      })
                                                  )}

                                                  {/* Campo para Adicionar Nova Etapa Personalizada */}
                                                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                                      <input
                                                          type="text"
                                                          placeholder="Digitar nome de nova etapa..."
                                                          value={newStageInputs[sector.name] || ''}
                                                          onChange={(e) => setNewStageInputs(prev => ({ ...prev, [sector.name]: e.target.value }))}
                                                          onKeyDown={(e) => {
                                                              if (e.key === 'Enter') {
                                                                  e.preventDefault();
                                                                  handleAddCustomStage(sector.name);
                                                              }
                                                          }}
                                                          className="flex-1 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                      />
                                                      <button
                                                          type="button"
                                                          onClick={() => handleAddCustomStage(sector.name)}
                                                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                                                      >
                                                          <Plus size={14} /> Add Etapa
                                                      </button>
                                                  </div>
                                              </>
                                          );
                                      })()}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>

                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3 shrink-0">
                      <button onClick={() => setStageConfigItem(null)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                      <button 
                          onClick={handleSaveStageConfig}
                          disabled={isUpdatingStatus}
                          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
                      >
                          {isUpdatingStatus ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                          SALVAR ETAPAS
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL EXECUTION EDIT */}
      {showExecutionModal && editingExecution && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-6 w-full max-w-md animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                              <Settings className="text-slate-400" />
                              {editingExecution.stageName && editingExecution.stageName !== 'BASE' 
                                  ? `Etapa: ${editingExecution.stageName}` 
                                  : t("job.editSectorRecords", "Registro de Produção")}
                          </h3>
                          <p className="text-xs font-bold text-slate-400 mt-0.5">{editingExecution.item.name}</p>
                      </div>
                      <button onClick={() => setShowExecutionModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      {(() => {
                          const targetStageKey = editingExecution.stageName || 'BASE';
                          const existingExec = (job.itemExecutions || []).find((e: any) => e.itemId === editingExecution.item.id && e.sector === editingExecution.sector);
                          const existingStageData = existingExec?.stageTimes?.[targetStageKey];
                          const entryUid = existingStageData?.entryUserId || (targetStageKey === 'BASE' ? (existingExec?.userId || editingExecution.originalMovement?.entryUserId) : undefined);
                          const entryUserObj = entryUid ? labUsers.find(u => u.id === entryUid) : null;
                          const entryName = entryUserObj?.name || existingExec?.userName;
                          
                          if (entryName && (existingStageData?.entryTime || (targetStageKey === 'BASE' && (existingExec?.entryTime || editingExecution.originalMovement?.entryTime)))) {
                              return (
                                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-2xl font-medium space-y-1">
                                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                                          <AlertTriangle size={14} className="text-amber-600" /> Regra de Segurança de Comissão
                                      </div>
                                      <p className="text-[11px] leading-snug">Entrada iniciada por <strong>{entryName}</strong>. Apenas este colaborador pode registrar a saída (ou limpe a etapa primeiro na produção para atribuir a outro).</p>
                                  </div>
                              );
                          }
                          return null;
                      })()}

                      <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest pl-2">{t("job.sector", "Setor")}</label>
                          <div className="w-full bg-slate-50 text-slate-600 p-3 rounded-xl border border-slate-200 font-bold">{editingExecution.sector}</div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black uppercase text-blue-500 mb-1 tracking-widest pl-2">{t("job.employee", "Funcionário")}</label>
                          <select
                              value={editingExecution.userId}
                              onChange={e => setEditingExecution({ ...editingExecution, userId: e.target.value })}
                              className="w-full bg-white border-2 border-blue-100 text-blue-900 rounded-xl p-3 font-bold focus:ring-0 focus:border-blue-400"
                          >
                              <option value="">{t("common.select", "Selecione...")}</option>
                              {labUsers.filter(u => u.sector === editingExecution.sector || u.sectors?.includes(editingExecution.sector) || u.id === editingExecution.userId).map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest pl-2">Início (Entrada)</label>
                          <input
                              type="datetime-local"
                              value={editingExecution.entryTime}
                              onChange={e => setEditingExecution({ ...editingExecution, entryTime: e.target.value })}
                              className="w-full bg-slate-50 text-slate-700 p-3 rounded-xl border-2 border-slate-200 focus:border-slate-400 font-bold"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-[10px] font-black uppercase text-orange-500 mb-1 tracking-widest pl-2">Término (Saída)</label>
                          <input
                              type="datetime-local"
                              value={editingExecution.exitTime}
                              onChange={e => setEditingExecution({ ...editingExecution, exitTime: e.target.value })}
                              className="w-full bg-white text-slate-700 p-3 rounded-xl border-2 border-orange-200 focus:border-orange-400 font-bold"
                          />
                      </div>
                  </div>

                  <div className="mt-8 flex gap-2">
                      <button 
                          type="button" 
                          onClick={() => {
                              const targetItem = editingExecution.item;
                              const targetSec = editingExecution.sector;
                              const targetStg = editingExecution.stageName || 'BASE';
                              setShowExecutionModal(false);
                              handleClearStageExecution(targetItem, targetSec, targetStg);
                          }} 
                          className="py-3 px-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shrink-0"
                          title="Limpar etapa (resetar ponto e desconsiderar comissão)"
                      >
                          <RotateCcw size={14} /> Limpar
                      </button>
                      <button onClick={() => setShowExecutionModal(false)} className="flex-1 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-colors">
                          Cancelar
                      </button>
                      <button onClick={handleSaveExecutionEdit} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2">
                          {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL EDITAR - Mobile Responsive & Wide on Tablet/PC */}
      {showEditModal && (!isFinished || job?.isBudget) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 md:p-6">
              <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-2xl w-full max-w-full md:max-w-[94vw] lg:max-w-[92vw] xl:max-w-[1360px] max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-4 md:p-5 sm:p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2"><Edit className="text-blue-600" /> {t("job.editOrder", "Editar Ordem")}</h3>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-5 sm:p-6 space-y-6 no-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="md:col-span-2 lg:col-span-4 relative" ref={dropdownRef}>
                              <div className="flex items-center justify-between mb-1.5 ml-1">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Dentista / Clínica</label>
                                  {isDentistBlocked && (
                                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded-md border border-red-200 animate-pulse">
                                          <Lock size={12} /> Cliente Bloqueado
                                      </span>
                                  )}
                              </div>
                              <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                          {isDentistBlocked ? <Lock size={18} className="text-red-600 animate-pulse" /> : <Search size={18} />}
                                      </div>
                                      <input 
                                          type="text" 
                                          value={dentistSearchQuery} 
                                          onChange={e => { setDentistSearchQuery(e.target.value.toUpperCase()); setShowDentistSuggestions(true); }}
                                          onFocus={() => setShowDentistSuggestions(true)}
                                          placeholder="Buscar cliente ou clínica..."
                                          className={`w-full pl-12 pr-4 py-3 ${isDentistBlocked ? 'border-2 border-red-500 bg-red-50/50 text-red-900 focus:ring-red-400' : 'bg-slate-50 border border-slate-200 focus:ring-blue-500'} rounded-xl outline-none focus:ring-2 font-bold text-sm transition-all uppercase`}
                                      />
                                  </div>
                                  {isDentistBlocked && (
                                      <div 
                                          className="shrink-0 flex items-center gap-1.5 px-3 py-3 bg-red-600 text-white rounded-xl shadow-md border border-red-700 animate-pulse transition-all cursor-help select-none"
                                          title="Cliente Bloqueado: Este cliente possui restrições financeiras ou administrativas."
                                      >
                                          <Lock size={18} className="shrink-0 stroke-[2.5]" />
                                          <span className="text-[11px] font-black uppercase tracking-wider hidden sm:inline">Bloqueado</span>
                                      </div>
                                  )}
                              </div>

                              {showDentistSuggestions && (
                                  <div className="absolute z-[110] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                      <div className="p-2 bg-slate-50 border-b flex justify-between items-center">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{t("job.suggestions", "Sugestões")}</span>
                                          <button onClick={() => setShowDentistSuggestions(false)} className="text-slate-400 p-1 hover:bg-slate-200 rounded-lg"><X size={14}/></button>
                                      </div>
                                      <div className="max-h-[240px] overflow-y-auto">
                                          {suggestions.length > 0 ? (
                                              suggestions.map(d => (
                                                  <button key={d.id} onClick={() => selectDentist(d)} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between group transition-colors">
                                                      <div className="flex items-center gap-3">
                                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${d.type === 'ONLINE' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                              <User size={16} />
                                                          </div>
                                                          <div>
                                                              <div className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{d.name}</div>
                                                              {d.clinicName && <div className="text-[9px] font-bold text-slate-400 uppercase">{d.clinicName}</div>}
                                                          </div>
                                                      </div>
                                                      {d.type === 'ONLINE' && <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">{t("job.online", "Online")}</span>}
                                                  </button>
                                              ))
                                          ) : dentistSearchQuery.length > 2 && (
                                              <button onClick={handleManualDentistEntry} className="w-full text-left px-4 py-4 hover:bg-amber-50 flex items-center gap-3 group transition-colors">
                                                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                      <Plus size={16} />
                                                  </div>
                                                  <div>
                                                      <div className="text-xs font-bold text-slate-700 group-hover:text-amber-700">Cadastrar "{dentistSearchQuery}"</div>
                                                      <div className="text-[9px] font-bold text-slate-400 uppercase">Entrada manual (sem vínculo)</div>
                                                  </div>
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              )}
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t("job.patient", "Paciente")}</label>
                              <input type="text" value={editPatientName} onChange={e => setEditPatientName(e.target.value.toUpperCase())} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nº OS</label>
                              <input type="text" value={editOsNumber} onChange={e => setEditOsNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          {!job.isBudget && (
                          <>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t("job.box", "Caixa")}</label>
                              <input type="text" value={editBoxNumber} onChange={e => setEditBoxNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                              {activeJobsWithSameBox.length > 0 && (
                                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl relative z-10">
                                      <div className="flex items-center gap-2 text-amber-700 font-bold mb-2 text-[10px] uppercase">
                                          <AlertTriangle size={14} />
                                          <span>{t("job.boxInUse", "Caixa em uso!")}</span>
                                      </div>
                                      <ul className="space-y-2">
                                          {activeJobsWithSameBox.map(conflictingJob => (
                                              <li key={conflictingJob.id}>
                                                  <Link to={`/jobs/${conflictingJob.id}`} target="_blank" rel="noopener noreferrer" className="block p-2 bg-white rounded-lg border border-amber-100 hover:border-amber-300 transition-colors shadow-sm">
                                                      <div className="text-xs font-bold text-slate-800">OS {conflictingJob.osNumber}</div>
                                                      <div className="text-[10px] text-slate-500 truncate">{conflictingJob.dentistName} - {conflictingJob.patientName}</div>
                                                  </Link>
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              )}
                          </div>
                          {boxColors.length > 0 && (
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t("job.boxColor", "Cor da Caixa")}</label>
                                  <div className="flex flex-wrap gap-1.5">
                                      {boxColors.map(color => (
                                          <button 
                                            key={color.id} 
                                            type="button" 
                                            onClick={() => setEditBoxColorId(color.id)} 
                                            className={`w-7 h-7 rounded-full border-2 transition-all ${editBoxColorId === color.id ? 'border-slate-900 scale-125 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`} 
                                            style={{ backgroundColor: color.hex }}
                                            title={color.name}
                                          />
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => setEditBoxColorId('')}
                                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center bg-slate-100 ${!editBoxColorId ? 'border-slate-900 scale-125 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        title="Sem cor"
                                      >
                                        <span className="text-[10px] font-bold text-slate-400">X</span>
                                      </button>
                                  </div>
                              </div>
                          )}
                          </>
                          )}
                          {canViewJobPrices && (
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor Total (R$)</label>
                              <input type="number" step="0.01" value={editTotalValue} onChange={e => setEditTotalValue(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          )}
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t("job.newDelivery", "Nova Entrega")}</label>
                              <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t("job.deliveryTime", "Hora da Entrega")}</label>
                              <input type="time" value={editDueTime} onChange={e => setEditDueTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div className="md:col-span-2 lg:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t("job.priority", "Prioridade")}</label>
                              <select value={editUrgency} onChange={e => setEditUrgency(e.target.value as UrgencyLevel)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                                  <option value={UrgencyLevel.LOW}>{t("job.low", "Baixa")}</option>
                                  <option value={UrgencyLevel.NORMAL}>{t("job.normal", "Normal")}</option>
                                  <option value={UrgencyLevel.HIGH}>{t("job.high", "Alta")}</option>
                                  <option value={UrgencyLevel.VIP}>VIP / Urgente</option>
                              </select>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens da OS</h4>
                              <span className="text-[10px] font-bold text-slate-400">{editItems.length} {editItems.length === 1 ? 'serviço' : 'serviços'}</span>
                          </div>
                          <div className="space-y-2">
                              {editItems.map(item => {
                                  if (editingModalItemId === item.id) {
                                       const basePriceVal = item.basePriceBeforeDiscount !== undefined ? item.basePriceBeforeDiscount : (item.price || 0);
                                       const isItemSurcharge = item.priceAdjustmentType === 'SURCHARGE' || (Boolean(item.appliedSurcharge) && Number(item.appliedSurcharge) > 0) || (Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0);
                                       const isFixedDisc = isItemSurcharge
                                           ? (Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0)
                                           : (Boolean(item.appliedDiscountFixed) && Number(item.appliedDiscountFixed) > 0);
                                       const currentDiscVal = isItemSurcharge
                                           ? (isFixedDisc ? item.appliedSurchargeFixed : (item.appliedSurcharge || ''))
                                           : (isFixedDisc ? item.appliedDiscountFixed : (item.appliedDiscount || ''));

                                       return (
                                           <div key={item.id} className="p-3.5 bg-blue-50/80 border-2 border-blue-300 rounded-2xl space-y-3.5 shadow-sm">
                                               <div className="flex justify-between items-center">
                                                   <div className="flex items-center gap-1.5">
                                                       <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                                       <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-wider">Editando Serviço</h4>
                                                   </div>
                                                   <button 
                                                       type="button" 
                                                       onClick={() => setEditingModalItemId(null)} 
                                                       className="text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                                   >
                                                       <Check size={14} /> Concluir
                                                   </button>
                                               </div>

                                               {/* GRID PRINCIPAL: Coluna Esquerda (Campos, Preço e Variações) e Coluna Direita (Odontograma) */}
                                               <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                                   {/* COLUNA ESQUERDA: Campos compactos + Resumo de Preço + Natureza e Variações abaixo do preço */}
                                                   <div className="md:col-span-7 lg:col-span-7 flex flex-col gap-3">

                                                       {/* Tipo de Serviço */}
                                                       <div>
                                                           <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                                                               <label className="text-[9px] font-black text-slate-500 uppercase">Tipo de Serviço</label>
                                                               <div className="flex items-center gap-1 bg-white border border-blue-200 p-0.5 rounded-lg shadow-xs">
                                                                   <button
                                                                       type="button"
                                                                       onClick={() => setServiceTypeCatalogFilter('DENTIST')}
                                                                       className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase transition-all ${
                                                                           serviceTypeCatalogFilter === 'DENTIST'
                                                                               ? 'bg-blue-600 text-white shadow-xs'
                                                                               : 'text-slate-500 hover:text-slate-800'
                                                                       }`}
                                                                   >
                                                                       Dentista
                                                                   </button>
                                                                   <button
                                                                       type="button"
                                                                       onClick={() => setServiceTypeCatalogFilter('LABORATORY')}
                                                                       className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase transition-all ${
                                                                           serviceTypeCatalogFilter === 'LABORATORY'
                                                                               ? 'bg-blue-600 text-white shadow-xs'
                                                                               : 'text-slate-500 hover:text-slate-800'
                                                                       }`}
                                                                   >
                                                                       Laboratório
                                                                   </button>
                                                                   <button
                                                                       type="button"
                                                                       onClick={() => setServiceTypeCatalogFilter('ALL')}
                                                                       className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase transition-all ${
                                                                           serviceTypeCatalogFilter === 'ALL'
                                                                               ? 'bg-blue-600 text-white shadow-xs'
                                                                               : 'text-slate-500 hover:text-slate-800'
                                                                       }`}
                                                                   >
                                                                       Todos
                                                                   </button>
                                                               </div>
                                                           </div>
                                                           <div className="relative" ref={editingJobTypeDropdownRef}>
                                                               <div className="relative">
                                                                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                                       <Search size={14} />
                                                                   </div>
                                                                   <input 
                                                                       type="text" 
                                                                       value={isSearchingEditingJobType ? editingJobTypeSearchQuery : (activeEditingJobType?.name || '')} 
                                                                       onChange={e => {
                                                                           setEditingJobTypeSearchQuery(e.target.value);
                                                                           setShowEditingJobTypeSuggestions(true);
                                                                       }}
                                                                       onFocus={() => {
                                                                           setEditingJobTypeSearchQuery(activeEditingJobType?.name || '');
                                                                           setShowEditingJobTypeSuggestions(true);
                                                                           setIsSearchingEditingJobType(true);
                                                                       }}
                                                                       placeholder="Digite para buscar tipo de serviço..."
                                                                       className="w-full pl-8 pr-9 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-slate-800"
                                                                   />
                                                                   {(item.jobTypeId || editingJobTypeSearchQuery || isSearchingEditingJobType) && (
                                                                       <button 
                                                                           type="button"
                                                                           onClick={(e) => {
                                                                               e.stopPropagation();
                                                                               setEditingJobTypeSearchQuery('');
                                                                               setIsSearchingEditingJobType(false);
                                                                               setShowEditingJobTypeSuggestions(false);
                                                                           }}
                                                                           className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-0.5 rounded"
                                                                           title="Limpar campo"
                                                                       >
                                                                           <X size={13} />
                                                                       </button>
                                                                   )}
                                                               </div>

                                                               {showEditingJobTypeSuggestions && (
                                                                   <div className="absolute z-[120] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                                                                       <div className="max-h-48 overflow-y-auto">
                                                                           {filteredEditingJobTypes.length > 0 ? (
                                                                               filteredEditingJobTypes.map(type => (
                                                                                   <button 
                                                                                       key={type.id} 
                                                                                       type="button"
                                                                                       onClick={() => {
                                                                                           handleUpdateEditItem(item.id, { jobTypeId: type.id });
                                                                                           setEditingJobTypeSearchQuery(type.name);
                                                                                           setShowEditingJobTypeSuggestions(false);
                                                                                           setIsSearchingEditingJobType(false);
                                                                                       }} 
                                                                                       className={`w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0 ${item.jobTypeId === type.id ? 'bg-blue-50' : ''}`}
                                                                                   >
                                                                                       <div className="flex items-center gap-2">
                                                                                           <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${item.jobTypeId === type.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                                                               <Layers size={13} />
                                                                                           </div>
                                                                                           <div>
                                                                                               <div className={`text-xs font-bold ${item.jobTypeId === type.id ? 'text-blue-700' : 'text-slate-700'}`}>{type.name}</div>
                                                                                               <div className="text-[9px] font-bold text-slate-400 uppercase">R$ {type.basePrice.toFixed(2)}</div>
                                                                                           </div>
                                                                                       </div>
                                                                                       {item.jobTypeId === type.id && <Check size={13} className="text-blue-600" />}
                                                                                   </button>
                                                                               ))
                                                                           ) : (
                                                                               <div className="p-3 text-center text-slate-400 text-xs font-bold">Nenhum serviço encontrado</div>
                                                                           )}
                                                                       </div>
                                                                   </div>
                                                               )}
                                                           </div>
                                                       </div>

                                                       {/* Qtd, Dentes e Cor */}
                                                       <div className="flex gap-2 items-end">
                                                           <div className="w-16 sm:w-20 shrink-0">
                                                               <label className="block text-[9px] font-black text-slate-500 uppercase mb-1 flex items-center justify-between">
                                                                   <span>Qtd</span>
                                                                   {item.selectedTeeth && item.selectedTeeth.length > 0 && item.quantity !== item.selectedTeeth.length && (
                                                                       <span className="text-[8px] text-amber-600 font-bold" title="Quantidade definida manualmente">Man.</span>
                                                                   )}
                                                               </label>
                                                               <input 
                                                                   type="number" 
                                                                   min="1" 
                                                                   value={(item.quantity as any) === '' ? '' : (item.quantity ?? 1)} 
                                                                   onChange={e => {
                                                                       const val = e.target.value;
                                                                       if (val === '') {
                                                                           handleUpdateEditItem(item.id, { quantity: '' as any });
                                                                       } else {
                                                                           const parsed = parseInt(val, 10);
                                                                           handleUpdateEditItem(item.id, { quantity: isNaN(parsed) ? 1 : Math.max(1, parsed) });
                                                                       }
                                                                   }} 
                                                                   onBlur={() => {
                                                                       if ((item.quantity as any) === '' || isNaN(Number(item.quantity)) || Number(item.quantity) < 1) {
                                                                           handleUpdateEditItem(item.id, { quantity: item.selectedTeeth?.length || 1 });
                                                                       }
                                                                   }}
                                                                   className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-800 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs" 
                                                                   title="Quantidade manual do serviço"
                                                               />
                                                           </div>
                                                           <div className="flex-1 min-w-0">
                                                               <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Dentes</label>
                                                               <input 
                                                                   type="text" 
                                                                   value={editingModalTeethInput} 
                                                                   onChange={e => {
                                                                       const raw = e.target.value;
                                                                       setEditingModalTeethInput(raw);
                                                                       const parsed = raw.split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                                                                       handleUpdateEditItem(item.id, {
                                                                           selectedTeeth: parsed.length > 0 ? parsed : undefined,
                                                                           quantity: parsed.length > 0 ? parsed.length : (item.quantity || 1)
                                                                       });
                                                                   }} 
                                                                   placeholder="Ex: 11, 21, 16" 
                                                                   className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-blue-500 outline-none" 
                                                               />
                                                           </div>
                                                           <div className="w-20 sm:w-24 shrink-0">
                                                               <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Cor</label>
                                                               <input type="text" value={item.color || ''} onChange={e => handleUpdateEditItem(item.id, { color: e.target.value })} placeholder="Ex: A3" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                                                           </div>
                                                       </div>

                                                       {/* Valores e Desconto */}
                                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-blue-200/60">
                                                           <div>
                                                               <label className="block text-[9px] font-black text-slate-600 uppercase mb-1">Valor Unitário Base (R$)</label>
                                                               <input 
                                                                   type="number" 
                                                                   min="0" 
                                                                   step="0.01" 
                                                                   value={basePriceVal} 
                                                                   onChange={e => handleUpdateEditItem(item.id, { basePriceBeforeDiscount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} 
                                                                   className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:border-blue-500 outline-none" 
                                                               />
                                                           </div>
                                                           <div>
                                                               <div className="flex items-center justify-between mb-1">
                                                                   <label className="block text-[9px] font-black text-slate-600 uppercase">
                                                                       {isItemSurcharge ? "Acréscimo no Serviço" : "Desconto no Serviço"}
                                                                   </label>
                                                                   {/* Chave Seletora: Desconto vs Acréscimo */}
                                                                   <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black">
                                                                       <button
                                                                           type="button"
                                                                           onClick={() => {
                                                                               const currentVal = isFixedDisc ? (Number(item.appliedSurchargeFixed) || 0) : (Number(item.appliedSurcharge) || 0);
                                                                               handleUpdateEditItem(item.id, {
                                                                                   priceAdjustmentType: 'DISCOUNT',
                                                                                   appliedDiscount: isFixedDisc ? 0 : currentVal,
                                                                                   appliedDiscountFixed: isFixedDisc ? currentVal : 0,
                                                                                   appliedSurcharge: 0,
                                                                                   appliedSurchargeFixed: 0,
                                                                               });
                                                                           }}
                                                                           className={`px-1.5 py-0.5 rounded transition-all ${
                                                                               !isItemSurcharge
                                                                                   ? 'bg-emerald-600 text-white shadow-xs'
                                                                                   : 'text-slate-600 hover:text-slate-900'
                                                                           }`}
                                                                       >
                                                                           Desconto
                                                                       </button>
                                                                       <button
                                                                           type="button"
                                                                           onClick={() => {
                                                                               const currentVal = isFixedDisc ? (Number(item.appliedDiscountFixed) || 0) : (Number(item.appliedDiscount) || 0);
                                                                               handleUpdateEditItem(item.id, {
                                                                                   priceAdjustmentType: 'SURCHARGE',
                                                                                   appliedSurcharge: isFixedDisc ? 0 : currentVal,
                                                                                   appliedSurchargeFixed: isFixedDisc ? currentVal : 0,
                                                                                   appliedDiscount: 0,
                                                                                   appliedDiscountFixed: 0,
                                                                               });
                                                                           }}
                                                                           className={`px-1.5 py-0.5 rounded transition-all ${
                                                                               isItemSurcharge
                                                                                   ? 'bg-amber-500 text-white shadow-xs'
                                                                                   : 'text-slate-600 hover:text-slate-900'
                                                                           }`}
                                                                       >
                                                                           Acréscimo
                                                                       </button>
                                                                   </div>
                                                               </div>
                                                               <div className="flex gap-1.5">
                                                                   <select 
                                                                       value={isFixedDisc ? 'FIXED' : 'PERCENTAGE'}
                                                                       onChange={e => {
                                                                           const mode = e.target.value;
                                                                           if (isItemSurcharge) {
                                                                               if (mode === 'FIXED') {
                                                                                   handleUpdateEditItem(item.id, { appliedSurchargeFixed: Number(item.appliedSurcharge) || 0, appliedSurcharge: 0 });
                                                                               } else {
                                                                                   handleUpdateEditItem(item.id, { appliedSurcharge: Number(item.appliedSurchargeFixed) || 0, appliedSurchargeFixed: 0 });
                                                                               }
                                                                           } else {
                                                                               if (mode === 'FIXED') {
                                                                                   handleUpdateEditItem(item.id, { appliedDiscountFixed: Number(item.appliedDiscount) || 0, appliedDiscount: 0 });
                                                                               } else {
                                                                                   handleUpdateEditItem(item.id, { appliedDiscount: Number(item.appliedDiscountFixed) || 0, appliedDiscountFixed: 0 });
                                                                               }
                                                                           }
                                                                       }}
                                                                       className="w-18 sm:w-20 px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                                                                   >
                                                                       <option value="PERCENTAGE">%</option>
                                                                       <option value="FIXED">R$</option>
                                                                   </select>
                                                                   <input 
                                                                       type="number" 
                                                                       min="0" 
                                                                       step="0.1" 
                                                                       max={isFixedDisc || isItemSurcharge ? undefined : 100}
                                                                       value={currentDiscVal} 
                                                                       placeholder="0"
                                                                       onChange={e => {
                                                                           const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                                                                           if (isItemSurcharge) {
                                                                               if (isFixedDisc) {
                                                                                   handleUpdateEditItem(item.id, { appliedSurchargeFixed: val, appliedSurcharge: 0 });
                                                                               } else {
                                                                                   handleUpdateEditItem(item.id, { appliedSurcharge: val, appliedSurchargeFixed: 0 });
                                                                               }
                                                                           } else {
                                                                               if (isFixedDisc) {
                                                                                   handleUpdateEditItem(item.id, { appliedDiscountFixed: val, appliedDiscount: 0 });
                                                                               } else {
                                                                                   handleUpdateEditItem(item.id, { appliedDiscount: val, appliedDiscountFixed: 0 });
                                                                               }
                                                                           }
                                                                       }} 
                                                                       className={`flex-1 min-w-0 px-3 py-2 bg-white border rounded-xl text-xs font-bold focus:border-blue-500 outline-none ${
                                                                           isItemSurcharge ? 'border-amber-300 text-amber-900' : 'border-slate-300 text-slate-800'
                                                                       }`} 
                                                                   />
                                                               </div>
                                                           </div>
                                                       </div>

                                                       {/* Resumo com Preço Final */}
                                                       <div className="flex items-center justify-between bg-blue-100/70 p-2.5 rounded-xl text-xs font-bold text-blue-900 shadow-2xs">
                                                           <span>
                                                               {item.nature === 'REPETITION' ? `(Repetição: R$ ${(item.price || 0).toFixed(2)})` : item.nature === 'ADJUSTMENT' ? `(Ajuste: R$ ${(item.price || 0).toFixed(2)})` : isItemSurcharge ? `Preço com Acrésc.: R$ ${(item.price || 0).toFixed(2)}/un.` : `Preço com Desc: R$ ${(item.price || 0).toFixed(2)}/un.`}
                                                           </span>
                                                           <span className="font-black text-sm">
                                                               Total: R$ ${((item.price || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                                                           </span>
                                                       </div>

                                                       {/* CONTAINER DA NATUREZA E VARIAÇÕES: abaixo do valor total, ao lado esquerdo do odontograma */}
{/* CONTAINER INFERIOR: Natureza do Caso e Variações do Serviço (abaixo do preço final, sem barra de rolagem interna) */}
                                               <div className="flex flex-col gap-3.5 bg-white/95 border border-blue-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                                                   {/* Natureza do Serviço */}
                                                   <div>
                                                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                                           Natureza do Serviço
                                                       </label>
                                                       <div className="grid grid-cols-3 gap-2">
                                                           <button 
                                                               type="button" 
                                                               onClick={() => handleUpdateEditItem(item.id, { nature: 'NORMAL' })} 
                                                               className={`py-2 px-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${item.nature === 'NORMAL' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                                           >
                                                               {t("job.normal", "Normal")}
                                                           </button>
                                                           <button 
                                                               type="button" 
                                                               onClick={() => handleUpdateEditItem(item.id, { nature: 'REPETITION' })} 
                                                               className={`py-2 px-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${item.nature === 'REPETITION' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                                           >
                                                               {t("job.repetition", "(R) Repetição")}
                                                           </button>
                                                           <button 
                                                               type="button" 
                                                               onClick={() => handleUpdateEditItem(item.id, { nature: 'ADJUSTMENT' })} 
                                                               className={`py-2 px-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${item.nature === 'ADJUSTMENT' ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                                           >
                                                               {t("job.adjustment", "(A) Ajuste")}
                                                           </button>
                                                       </div>
                                                   </div>

                                                   {/* Variações do Serviço (todas as opções sem scroll) */}
                                                   {(() => {
                                                       const type = jobTypes.find(t => t.id === item.jobTypeId);
                                                       if (!type || ((!type.variationGroups || type.variationGroups.length === 0) && (!type.variations || type.variations.length === 0))) {
                                                           return (
                                                               <div className="pt-2 border-t border-slate-200/80">
                                                                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                       Variações do Serviço
                                                                   </label>
                                                                   <p className="text-xs text-slate-400 italic">Este serviço não possui variações adicionais.</p>
                                                               </div>
                                                           );
                                                       }
                                                       const groups = (type.variationGroups && type.variationGroups.length > 0) ? type.variationGroups : [{ id: 'default', name: 'Opções', options: type.variations || [] }];
                                                       return (
                                                           <div className="space-y-3 pt-2 border-t border-slate-200/80">
                                                               <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                   Variações / Opções do Serviço
                                                               </label>
                                                               <div className="space-y-2.5">
                                                                   {groups.map((group: any) => (
                                                                       <div key={group.id} className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                                                                           <div className="flex items-center justify-between">
                                                                               <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{group.name}</h4>
                                                                               <span className="text-[9px] font-semibold text-slate-400">
                                                                                   {group.selectionType === 'SINGLE' ? 'Escolha 1' : 'Múltipla'}
                                                                               </span>
                                                                           </div>
                                                                           <div className="flex flex-wrap gap-1.5">
                                                                               {group.options.map((option: any) => {
                                                                                   const isSelected = (item.selectedVariationIds || []).includes(option.id);
                                                                                   return (
                                                                                       <button
                                                                                           key={option.id}
                                                                                           type="button"
                                                                                           onClick={() => {
                                                                                               let newSelected = [...(item.selectedVariationIds || [])];
                                                                                               if (group.selectionType === 'SINGLE') {
                                                                                                   newSelected = newSelected.filter(id => !group.options.find((o: any) => o.id === id));
                                                                                                   if (!isSelected) newSelected.push(option.id);
                                                                                               } else {
                                                                                                   if (isSelected) newSelected = newSelected.filter(id => id !== option.id);
                                                                                                   else newSelected.push(option.id);
                                                                                               }
                                                                                               const updates: any = { selectedVariationIds: newSelected };
                                                                                               if (group.selectionType === 'SINGLE') {
                                                                                                   if (!isSelected && option.autoQuantity && option.autoQuantity > 0) {
                                                                                                       updates.quantity = option.autoQuantity;
                                                                                                   } else {
                                                                                                       updates.quantity = 1;
                                                                                                   }
                                                                                               } else {
                                                                                                   const selectedOptsInGroup = group.options.filter((o: any) => newSelected.includes(o.id));
                                                                                                   const autoOpt = selectedOptsInGroup.find((o: any) => o.autoQuantity && o.autoQuantity > 0);
                                                                                                   updates.quantity = autoOpt?.autoQuantity || 1;
                                                                                               }
                                                                                               handleUpdateEditItem(item.id, updates);
                                                                                           }}
                                                                                           className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
                                                                                       >
                                                                                           {option.name}
                                                                                       </button>
                                                                                   );
                                                                               })}
                                                                           </div>
                                                                       </div>
                                                                   ))}
                                                               </div>
                                                           </div>
                                                       );
                                                   })()}
                                               </div>
                                                   </div>

                                                   {/* COLUNA DIREITA: Odontograma ao lado de tudo */}
                                                   <div className="md:col-span-5 lg:col-span-5 flex flex-col items-center bg-white border border-blue-200/80 rounded-2xl p-3 sm:p-4 shadow-xs md:sticky md:top-2">
<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 self-start">
                                                           Odontograma (Seleção de Elementos)
                                                       </span>
                                                       <div className="w-full flex justify-center py-1">
                                                           <Odontogram 
                                                               selectedTeeth={item.selectedTeeth || []}
                                                               onChange={(teeth) => {
                                                                   setEditingModalTeethInput(teeth.sort().join(', '));
                                                                   handleUpdateEditItem(item.id, {
                                                                       selectedTeeth: teeth.length > 0 ? teeth : undefined,
                                                                       quantity: teeth.length > 0 ? teeth.length : 1
                                                                   });
                                                               }}
                                                               className="w-full max-w-[260px] sm:max-w-[290px] md:max-w-[330px] lg:max-w-[360px] h-auto"
                                                           />
                                                       </div>
                                                       {(item.selectedTeeth && item.selectedTeeth.length > 0) ? (
                                                           <p className="text-[11px] text-indigo-700 font-bold mt-2 text-center bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl w-full">
                                                               Dentes selecionados ({item.selectedTeeth.length}): {item.selectedTeeth.sort().join(', ')}
                                                           </p>
                                                       ) : (
                                                           <p className="text-[10px] text-slate-400 font-medium mt-1 text-center">
                                                               Clique nos dentes para selecionar ou desmarcar
                                                        </p>
                                                       )}
                                                   </div>
                                               </div>
                                           </div>
                                       );
                                   }
                                   return (
                                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors gap-2">
                                          <div className="flex items-center gap-1.5 shrink-0">
                                              <button 
                                                  type="button" 
                                                  onClick={() => handleUpdateEditItem(item.id, { quantity: Math.max(1, (Number(item.quantity) || 1) - 1) })}
                                                  className="w-7 h-7 flex items-center justify-center text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-black text-xs transition-colors shadow-xs active:scale-95"
                                                  title="Diminuir quantidade"
                                              >
                                                  -
                                              </button>
                                              <input 
                                                  type="number" 
                                                  min="1" 
                                                  value={(item.quantity as any) === '' ? '' : (item.quantity ?? 1)}
                                                  onChange={(e) => {
                                                      const val = e.target.value;
                                                      if (val === '') {
                                                          handleUpdateEditItem(item.id, { quantity: '' as any });
                                                      } else {
                                                          const parsed = parseInt(val, 10);
                                                          handleUpdateEditItem(item.id, { quantity: isNaN(parsed) ? 1 : Math.max(1, parsed) });
                                                      }
                                                  }}
                                                  onBlur={() => {
                                                      if ((item.quantity as any) === '' || isNaN(Number(item.quantity)) || Number(item.quantity) < 1) {
                                                          handleUpdateEditItem(item.id, { quantity: 1 });
                                                      }
                                                  }}
                                                  className="w-11 h-7 text-center font-black text-xs text-slate-800 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500 shadow-xs"
                                                  title="Alterar quantidade manualmente"
                                              />
                                              <button 
                                                  type="button" 
                                                  onClick={() => handleUpdateEditItem(item.id, { quantity: (Number(item.quantity) || 1) + 1 })}
                                                  className="w-7 h-7 flex items-center justify-center text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-black text-xs transition-colors shadow-xs active:scale-95"
                                                  title="Aumentar quantidade"
                                              >
                                                  +
                                              </button>
                                          </div>
                                          <div className="flex flex-col min-w-0 flex-1">
                                              <div className="text-xs font-bold text-slate-700 truncate">{getNaturePrefix(item.nature)}{formatItemNameWithVariations(item, jobTypes)}</div>
                                              <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                                                  <span className="font-black text-slate-500 uppercase tracking-wider">
                                                      {item.nature === 'REPETITION' ? `REPETIÇÃO (R$ ${(item.price || 0).toFixed(2)})` : item.nature === 'ADJUSTMENT' ? `AJUSTE (R$ ${(item.price || 0).toFixed(2)})` : `R$ ${(item.basePriceBeforeDiscount !== undefined ? item.basePriceBeforeDiscount : item.price).toFixed(2)}/un.`}
                                                  </span>
                                                   {item.nature === 'NORMAL' && (
                                                       (item.priceAdjustmentType === 'SURCHARGE' || (Boolean(item.appliedSurcharge) && Number(item.appliedSurcharge) > 0) || (Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0)) ? (
                                                           <span className="bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded text-[9px] border border-amber-200">
                                                               {item.appliedSurchargeFixed && Number(item.appliedSurchargeFixed) > 0 ? `+R$ ${Number(item.appliedSurchargeFixed).toFixed(2)} acrésc.` : `+${item.appliedSurcharge}% acrésc.`}
                                                           </span>
                                                       ) : ((item.appliedDiscount && Number(item.appliedDiscount) > 0) || (item.appliedDiscountFixed && Number(item.appliedDiscountFixed) > 0)) ? (
                                                           <span className="bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded text-[9px]">
                                                               {item.appliedDiscountFixed && Number(item.appliedDiscountFixed) > 0 ? `-R$ ${Number(item.appliedDiscountFixed).toFixed(2)} desc` : `-${item.appliedDiscount}% desc`}
                                                           </span>
                                                       ) : null
                                                   )}
                                                  <span className="font-black text-slate-800">
                                                      Total: R$ {((item.price || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                                                  </span>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                              <button type="button" onClick={() => setEditingModalItemId(item.id)} className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Editar serviço e desconto"><Edit3 size={14}/></button>
                                              <button type="button" onClick={() => handleRemoveItemFromJob(item.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Remover serviço"><Trash2 size={14}/></button>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                          
                          {editProducts.length > 0 && (
                          <div className="space-y-3 mt-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Produtos Adicionais</h4>
                              <div className="space-y-2">
                                  {editProducts.map(prod => (
                                      <div key={prod.id} className="flex flex-col gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                          <div className="flex items-center justify-between">
                                              <div className="text-xs font-bold text-slate-700 truncate"><Package size={12} className="inline mr-1 text-amber-500"/> {prod.name}</div>
                                              <button type="button" onClick={() => handleRemoveProductFromJob(prod.id)} className="p-1.5 text-slate-400 hover:bg-white hover:text-red-500 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                          </div>
                                          <div className="flex gap-2 items-center">
                                              <div className="flex-1">
                                                  <label className="text-[9px] font-black text-slate-500 uppercase">Qtd</label>
                                                  <input type="number" min="1" value={prod.quantity} onChange={(e) => handleProductChange(prod.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-xs font-bold p-1.5 bg-white border border-amber-200 rounded outline-none" />
                                              </div>
                                              <div className="flex-[1.5]">
                                                  <label className="text-[9px] font-black text-slate-500 uppercase">Val. Unit</label>
                                                  <input type="number" step="0.01" value={prod.basePriceBeforeDiscount ?? prod.unitPrice} onChange={(e) => handleProductChange(prod.id, 'basePriceBeforeDiscount', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full text-xs font-bold p-1.5 bg-white border border-amber-200 rounded outline-none" />
                                              </div>
                                              <div className="flex-[1.5]">
                                                  <label className="text-[9px] font-black text-slate-500 uppercase">Desc (%)</label>
                                                  <input type="number" step="0.01" max="100" min="0" value={prod.appliedDiscount === undefined ? '' : prod.appliedDiscount} onChange={(e) => handleProductChange(prod.id, 'appliedDiscount', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full text-xs font-bold p-1.5 bg-white border border-amber-200 rounded outline-none" />
                                              </div>
                                          </div>
                                          <div className="text-right mt-1 font-black text-slate-700 text-xs">
                                              Total: R$ {(prod.unitPrice * prod.quantity).toFixed(2)}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          )}

                           <div className="flex flex-col gap-3.5 pt-2 border-b border-slate-100 pb-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                                    Novo Serviço
                                </h5>

                                {/* GRID PRINCIPAL: Coluna Esquerda (Campos, Preço e Variações) e Coluna Direita (Odontograma) */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                    {/* COLUNA ESQUERDA: Campos compactos + Resumo de Preço + Natureza e Variações abaixo do preço */}
                                    <div className="md:col-span-7 lg:col-span-7 flex flex-col gap-3">

                                        {/* Tipo de Serviço */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase">Tipo de Serviço</label>
                                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shadow-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => setServiceTypeCatalogFilter('DENTIST')}
                                                        className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase transition-all ${
                                                            serviceTypeCatalogFilter === 'DENTIST'
                                                                ? 'bg-white text-blue-700 shadow-xs'
                                                                : 'text-slate-500 hover:text-slate-800'
                                                        }`}
                                                    >
                                                        Dentista
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setServiceTypeCatalogFilter('LABORATORY')}
                                                        className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase transition-all ${
                                                            serviceTypeCatalogFilter === 'LABORATORY'
                                                                ? 'bg-white text-blue-700 shadow-xs'
                                                                : 'text-slate-500 hover:text-slate-800'
                                                        }`}
                                                    >
                                                        Laboratório
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setServiceTypeCatalogFilter('ALL')}
                                                        className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase transition-all ${
                                                            serviceTypeCatalogFilter === 'ALL'
                                                                ? 'bg-white text-blue-700 shadow-xs'
                                                                : 'text-slate-500 hover:text-slate-800'
                                                        }`}
                                                    >
                                                        Todos
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative" ref={jobTypeDropdownRef}>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <Search size={14} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={isSearchingJobType ? jobTypeSearchQuery : (activeJobTypeForEdit?.name || '')} 
                                                        onChange={e => {
                                                            setJobTypeSearchQuery(e.target.value);
                                                            setShowJobTypeSuggestions(true);
                                                            if (!e.target.value) setNewItemTypeId('');
                                                        }}
                                                        onFocus={() => {
                                                            setJobTypeSearchQuery(activeJobTypeForEdit?.name || '');
                                                            setShowJobTypeSuggestions(true);
                                                            setIsSearchingJobType(true);
                                                        }}
                                                        placeholder="Digite para buscar tipo de serviço..."
                                                        className="w-full pl-8 pr-9 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-slate-800"
                                                    />
                                                    {(newItemTypeId || jobTypeSearchQuery || isSearchingJobType) && (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNewItemTypeId('');
                                                                setJobTypeSearchQuery('');
                                                                setIsSearchingJobType(false);
                                                                setShowJobTypeSuggestions(false);
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-0.5 rounded"
                                                            title="Limpar campo"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    )}
                                                </div>

                                                {showJobTypeSuggestions && (
                                                    <div className="absolute z-[120] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {filteredJobTypesForEdit.length > 0 ? (
                                                                filteredJobTypesForEdit.map(type => (
                                                                    <button 
                                                                        key={type.id} 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setNewItemTypeId(type.id);
                                                                            setJobTypeSearchQuery(type.name);
                                                                            setShowJobTypeSuggestions(false);
                                                                            setIsSearchingJobType(false);
                                                                        }} 
                                                                        className={`w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0 ${newItemTypeId === type.id ? 'bg-blue-50' : ''}`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${newItemTypeId === type.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                                                <Layers size={13} />
                                                                            </div>
                                                                            <div>
                                                                                <div className={`text-xs font-bold ${newItemTypeId === type.id ? 'text-blue-700' : 'text-slate-700'}`}>{type.name}</div>
                                                                                <div className="text-[9px] font-bold text-slate-400 uppercase">R$ {type.basePrice.toFixed(2)}</div>
                                                                            </div>
                                                                        </div>
                                                                        {newItemTypeId === type.id && <Check size={13} className="text-blue-600" />}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="p-3 text-center text-slate-400 text-xs font-bold">Nenhum serviço encontrado</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Qtd, Dentes e Cor */}
                                        <div className="flex gap-2 items-end">
                                            <div className="w-16 sm:w-20 shrink-0">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Qtd</label>
                                                <input type="number" min="1" value={newItemQty} onChange={e => setNewItemQty(e.target.value === '' ? '' : parseInt(e.target.value) || 1)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Dentes</label>
                                                <input 
                                                    type="text" 
                                                    value={newItemTeethInput} 
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        setNewItemTeethInput(raw);
                                                        const parsed = raw.split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                                                        setNewItemTeeth(parsed);
                                                        if (parsed.length > 0) {
                                                            setNewItemQty(parsed.length);
                                                        }
                                                    }} 
                                                    placeholder="Ex: 11, 21, 16" 
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-blue-500 outline-none" 
                                                />
                                            </div>
                                            <div className="w-20 sm:w-24 shrink-0">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cor</label>
                                                <input type="text" value={newItemColor} onChange={e => setNewItemColor(e.target.value)} placeholder="Ex: A3" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                                            </div>
                                        </div>

                                        {/* Valores e Desconto para Novo Serviço */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-600 uppercase mb-1">Valor Unitário Base (R$)</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.01" 
                                                    value={newItemCustomPrice !== '' ? newItemCustomPrice : (newItemCalculatedBasePrice || '')} 
                                                    placeholder={newItemCalculatedBasePrice.toFixed(2)}
                                                    onChange={e => setNewItemCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} 
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:border-blue-500 outline-none" 
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-[9px] font-black text-slate-600 uppercase">
                                                        {newItemAdjustmentMode === 'SURCHARGE' ? 'Acréscimo no Serviço' : 'Desconto no Serviço'}
                                                    </label>
                                                    {/* Chave Seletora: Desconto vs Acréscimo */}
                                                    <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewItemAdjustmentMode('DISCOUNT')}
                                                            className={`px-1.5 py-0.5 rounded transition-all ${
                                                                newItemAdjustmentMode === 'DISCOUNT'
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'text-slate-600 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            Desconto
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewItemAdjustmentMode('SURCHARGE')}
                                                            className={`px-1.5 py-0.5 rounded transition-all ${
                                                                newItemAdjustmentMode === 'SURCHARGE'
                                                                    ? 'bg-amber-500 text-white shadow-xs'
                                                                    : 'text-slate-600 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            Acréscimo
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <select 
                                                        value={newItemDiscountType}
                                                        onChange={e => setNewItemDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                                                        className="w-18 sm:w-20 px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                                                    >
                                                        <option value="PERCENTAGE">%</option>
                                                        <option value="FIXED">R$</option>
                                                    </select>
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        step={newItemDiscountType === 'PERCENTAGE' ? "0.1" : "0.01"} 
                                                        max={newItemDiscountType === 'PERCENTAGE' && newItemAdjustmentMode === 'DISCOUNT' ? 100 : undefined}
                                                        value={newItemDiscount === 0 ? '' : newItemDiscount} 
                                                        placeholder="0"
                                                        onChange={e => setNewItemDiscount(e.target.value === '' ? '' : (newItemDiscountType === 'PERCENTAGE' && newItemAdjustmentMode === 'DISCOUNT' ? Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) : Math.max(0, parseFloat(e.target.value) || 0)))} 
                                                        className={`flex-1 min-w-0 px-3 py-2 bg-white border rounded-xl text-xs font-bold focus:border-blue-500 outline-none ${
                                                            newItemAdjustmentMode === 'SURCHARGE' ? 'border-amber-300 text-amber-900' : 'border-slate-300 text-slate-800'
                                                        }`} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Resumo do Preço com Desconto */}
                                        <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl text-xs font-bold text-emerald-900 shadow-2xs">
                                            <span>
                                                {newItemNature === 'REPETITION' ? `(Repetição: R$ ${newItemEffectiveUnitPrice.toFixed(2)})` : newItemNature === 'ADJUSTMENT' ? `(Ajuste: R$ ${newItemEffectiveUnitPrice.toFixed(2)})` : newItemAdjustmentMode === 'SURCHARGE' ? `Preço com Acrésc.: R$ ${newItemEffectiveUnitPrice.toFixed(2)}/un.` : `Preço com Desc: R$ ${newItemEffectiveUnitPrice.toFixed(2)}/un.`}
                                            </span>
                                            <span className="font-black text-sm text-emerald-950">
                                                Total: R$ ${(newItemEffectiveUnitPrice * (Number(newItemQty) || 1)).toFixed(2)}
                                            </span>
                                        </div>

                                        {/* CONTAINER DA NATUREZA E VARIAÇÕES: abaixo do valor total, ao lado esquerdo do odontograma */}
{/* CONTAINER INFERIOR: Natureza do Caso e Variações do Serviço (abaixo do preço final, sem barra de rolagem interna) */}
                                <div className="flex flex-col gap-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                                    {/* Natureza do Serviço */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                            Natureza do Serviço
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setNewItemNature('NORMAL')} 
                                                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${newItemNature === 'NORMAL' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {t("job.normal", "Normal")}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setNewItemNature('REPETITION')} 
                                                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${newItemNature === 'REPETITION' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {t("job.repetition", "(R) Repetição")}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setNewItemNature('ADJUSTMENT')} 
                                                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${newItemNature === 'ADJUSTMENT' ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {t("job.adjustment", "(A) Ajuste")}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Variações do Serviço */}
                                    {(() => {
                                        const type = jobTypes.find(t => t.id === newItemTypeId);
                                        if (!type || ((!type.variationGroups || type.variationGroups.length === 0) && (!type.variations || type.variations.length === 0))) {
                                            return (
                                                <div className="pt-2 border-t border-slate-200/80">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Variações do Serviço
                                                    </label>
                                                    <p className="text-xs text-slate-400 italic">Este serviço não possui variações adicionais.</p>
                                                </div>
                                            );
                                        }
                                        const groups = (type.variationGroups && type.variationGroups.length > 0) ? type.variationGroups : [{ id: 'default', name: 'Opções', options: type.variations || [] }];
                                        return (
                                            <div className="space-y-3 pt-2 border-t border-slate-200/80">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    Variações / Opções do Serviço
                                                </label>
                                                {/* Todas as opções sem barra de rolagem */}
                                                <div className="space-y-2.5">
                                                    {groups.map((group: any) => (
                                                        <div key={group.id} className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{group.name}</h4>
                                                                <span className="text-[9px] font-semibold text-slate-400">
                                                                    {group.selectionType === 'SINGLE' ? 'Escolha 1' : 'Múltipla'}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {group.options.map((option: any) => {
                                                                    const isSelected = newItemVariationIds.includes(option.id);
                                                                    return (
                                                                        <button 
                                                                            key={option.id} 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                                let newSelected = [...newItemVariationIds];
                                                                                if (group.selectionType === 'SINGLE') {
                                                                                    newSelected = newSelected.filter(id => !group.options.find((o: any) => o.id === id));
                                                                                    if (!isSelected) newSelected.push(option.id);
                                                                                } else {
                                                                                    if (isSelected) newSelected = newSelected.filter(id => id !== option.id);
                                                                                    else newSelected.push(option.id);
                                                                                }
                                                                                setNewItemVariationIds(newSelected);
                                                                                const type = jobTypes.find((t: any) => t.id === newItemTypeId);
                                                                                let targetAutoQty = 1;
                                                                                if (type && type.variationGroups) {
                                                                                    for (const g of type.variationGroups) {
                                                                                        if (!g.options) continue;
                                                                                        for (const opt of g.options) {
                                                                                            if (newSelected.includes(opt.id) && opt.autoQuantity && opt.autoQuantity > 0) {
                                                                                                if (opt.autoQuantity > targetAutoQty) {
                                                                                                    targetAutoQty = opt.autoQuantity;
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                                setNewItemQty(targetAutoQty);
                                                                            }} 
                                                                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400'}`}
                                                                        >
                                                                            {option.name}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                    </div>

                                    {/* COLUNA DIREITA: Odontograma ao lado de tudo */}
                                    <div className="md:col-span-5 lg:col-span-5 flex flex-col items-center bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs md:sticky md:top-2">
<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 self-start">
                                            Odontograma (Seleção de Elementos)
                                        </span>
                                        <div className="w-full flex justify-center py-1">
                                            <Odontogram 
                                                selectedTeeth={newItemTeeth}
                                                onChange={(teeth) => {
                                                    setNewItemTeeth(teeth);
                                                    setNewItemTeethInput(teeth.sort().join(', '));
                                                    if (teeth.length > 0) setNewItemQty(teeth.length);
                                                    else setNewItemQty(1);
                                                }}
                                                className="w-full max-w-[260px] sm:max-w-[290px] md:max-w-[330px] lg:max-w-[360px] h-auto"
                                            />
                                        </div>
                                        {newItemTeeth.length > 0 ? (
                                            <p className="text-[11px] text-indigo-700 font-bold mt-2 text-center bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl w-full">
                                                Dentes selecionados ({newItemTeeth.length}): {newItemTeeth.sort().join(', ')}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 font-medium mt-1 text-center">
                                                Clique nos dentes para selecionar ou desmarcar
                                        </p>
                                        )}
                                    </div>
                                </div>

                                {/* Botão Adicionar ocupando linha completa */}
                                <div className="pt-1">
                                    <button 
                                        type="button" 
                                        onClick={handleAddItemToJob} 
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Plus size={16}/> Adicionar Serviço ao Caso
                                    </button>
                                </div>
                            </div>
                          <div className="pt-2">
                              <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto / Implante</h4>
                                  <button type="button" onClick={() => setIsAddingProduct(!isAddingProduct)} className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${isAddingProduct ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                                      {isAddingProduct ? 'Cancelar' : '+ Add Produto'}
                                  </button>
                              </div>

                              {isAddingProduct && (
                                  <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 space-y-3 mb-3 shadow-xs animate-in fade-in slide-in-from-top-2">
                                      {/* Stock Source Filter Tabs */}
                                      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-amber-200/60">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Estoque:</span>
                                          <button
                                              type="button"
                                              onClick={() => setStockSourceFilter('ALL')}
                                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                                                  stockSourceFilter === 'ALL'
                                                      ? 'bg-blue-600 text-white shadow-xs'
                                                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                              }`}
                                          >
                                              Todos ({inventoryItems.filter(i => !i.dentistOwnerId || i.dentistOwnerId === effectiveDentistId).length})
                                          </button>
                                          <button
                                              type="button"
                                              onClick={() => setStockSourceFilter('LAB')}
                                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 ${
                                                  stockSourceFilter === 'LAB'
                                                      ? 'bg-blue-600 text-white shadow-xs'
                                                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                              }`}
                                          >
                                              <Box size={11} />
                                              Laboratório ({labStockItems.length})
                                          </button>
                                          <button
                                              type="button"
                                              onClick={() => setStockSourceFilter('CLIENT')}
                                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 ${
                                                  stockSourceFilter === 'CLIENT'
                                                      ? 'bg-amber-500 text-white shadow-xs'
                                                      : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                                              }`}
                                          >
                                              <Stethoscope size={11} />
                                              Cliente: {effectiveDentistName} ({clientStockItems.length})
                                          </button>
                                      </div>

                                      {/* Product Search & Dropdown */}
                                      <div className="space-y-1 relative" ref={productDropdownRef}>
                                          <div className="flex items-center justify-between">
                                              <label className="text-[9px] font-black text-slate-500 uppercase">Produto / Implante</label>
                                              {selectedProductObj && (
                                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                      selectedProductObj.dentistOwnerId 
                                                          ? 'bg-amber-100 text-amber-800' 
                                                          : 'bg-blue-100 text-blue-800'
                                                  }`}>
                                                      {selectedProductObj.dentistOwnerId ? `Estoque de ${effectiveDentistName}` : 'Estoque do Laboratório'}
                                                  </span>
                                              )}
                                          </div>
                                          <div className="relative">
                                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                  <Search size={14} />
                                              </div>
                                              <input
                                                  type="text"
                                                  value={productSearchQuery}
                                                  onChange={e => {
                                                      setProductSearchQuery(e.target.value);
                                                      setShowProductDropdown(true);
                                                  }}
                                                  onFocus={() => setShowProductDropdown(true)}
                                                  placeholder="Buscar por nome ou código SKU..."
                                                  className="w-full pl-8 pr-7 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                                              />
                                              {(productSearchQuery || selectedProductId) && (
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          setProductSearchQuery('');
                                                          setSelectedProductId('');
                                                          setProductManualPrice(null);
                                                          setShowProductDropdown(false);
                                                      }}
                                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-0.5 rounded"
                                                  >
                                                      <X size={13} />
                                                  </button>
                                              )}
                                          </div>

                                          {/* Dropdown list of filtered products */}
                                          {showProductDropdown && (
                                              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                                                  {filteredStockItems.length > 0 ? (
                                                      filteredStockItems.map(item => {
                                                          const isSelected = selectedProductId === item.id;
                                                          const isOutOfStock = item.currentStock <= 0;
                                                          return (
                                                              <button
                                                                  key={item.id}
                                                                  type="button"
                                                                  onClick={() => {
                                                                      setSelectedProductId(item.id);
                                                                      setProductManualPrice(item.sellPrice);
                                                                      setProductSearchQuery(item.name);
                                                                      setShowProductDropdown(false);
                                                                  }}
                                                                  className={`w-full text-left px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-blue-50 transition-colors flex items-center justify-between group ${
                                                                      isSelected ? 'bg-blue-50' : ''
                                                                  }`}
                                                              >
                                                                  <div className="min-w-0 pr-2">
                                                                      <div className="flex items-center gap-1.5 flex-wrap">
                                                                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                                                                          {item.dentistOwnerId ? (
                                                                              <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                                                                                  Cliente
                                                                              </span>
                                                                          ) : (
                                                                              <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded">
                                                                                  Laboratório
                                                                              </span>
                                                                          )}
                                                                      </div>
                                                                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                                                          <span className={isOutOfStock ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
                                                                              {item.currentStock > 0 ? `${item.currentStock} un.` : 'Sem estoque'}
                                                                          </span>
                                                                          {item.code && <span>Cód: {item.code}</span>}
                                                                      </div>
                                                                  </div>
                                                                  <div className="text-right shrink-0">
                                                                      <span className="text-xs font-black text-slate-700">R$ {Number(item.sellPrice || 0).toFixed(2)}</span>
                                                                      {isSelected && <Check size={13} className="text-blue-600 ml-auto mt-0.5" />}
                                                                  </div>
                                                              </button>
                                                          );
                                                      })
                                                  ) : (
                                                      <div className="p-3.5 text-center text-slate-400 text-xs font-bold">
                                                          Nenhum produto encontrado neste estoque
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>

                                      {/* Quantity, Price, Discount inputs */}
                                      <div className="flex gap-2 items-end">
                                          <div className="flex-1">
                                              <label className="text-[9px] font-black text-slate-500 uppercase">Qtd</label>
                                              <input 
                                                  type="number" 
                                                  min="1" 
                                                  value={productQuantity} 
                                                  onChange={e => setProductQuantity(Math.max(1, Number(e.target.value) || 1))} 
                                                  className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                                              />
                                          </div>
                                          <div className="flex-[1.5]">
                                              <label className="text-[9px] font-black text-slate-500 uppercase">Val. Unit (R$)</label>
                                              <input 
                                                  type="number" 
                                                  step="0.01" 
                                                  value={productManualPrice !== null ? productManualPrice : ''} 
                                                  onChange={e => setProductManualPrice(e.target.value === '' ? null : Number(e.target.value))} 
                                                  className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                                              />
                                          </div>
                                          <div className="flex-[1.5]">
                                              <label className="text-[9px] font-black text-slate-500 uppercase">Desc (%)</label>
                                              <input 
                                                  type="number" 
                                                  step="0.01" 
                                                  min="0" 
                                                  max="100" 
                                                  value={productDiscountPercent} 
                                                  onChange={e => setProductDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} 
                                                  className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                                              />
                                          </div>
                                          <div className="shrink-0">
                                            <button 
                                                type="button" 
                                                onClick={handleAddProductToJob} 
                                                disabled={!selectedProductId} 
                                                className="h-[36px] px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-all font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                                                title="Adicionar Produto ao Caso"
                                            >
                                                <Plus size={15}/> Add
                                            </button>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="pt-6">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações Técnicas</label>
                          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" placeholder="Novas instruções..."></textarea>
                      </div>

                  {/* Materiais Recebidos */}
                  {(currentOrg?.receivedMaterialOptions && currentOrg.receivedMaterialOptions.length > 0) && (
                      <div className="pt-6 mt-6 border-t border-slate-100">
                          <label className="block text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                              <Box size={14} className="text-slate-400" /> Materiais Enviados pelo Dentista
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Array.isArray(currentOrg.receivedMaterialOptions) && currentOrg.receivedMaterialOptions.map(mat => {
                                  const isChecked = Array.isArray(editReceivedMaterials) && editReceivedMaterials.includes(mat);
                                  return (
                                      <div key={mat} className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${isChecked ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-slate-50'}`}>
                                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                                              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                                  {isChecked && <Check size={14} className="text-white" />}
                                              </div>
                                              <span className={`text-xs font-bold ${isChecked ? 'text-indigo-700' : 'text-slate-600'}`}>{mat}</span>
                                              <input 
                                                  type="checkbox"
                                                  className="hidden"
                                                  checked={isChecked}
                                                  onChange={(e) => {
                                                      if (e.target.checked) {
                                                          setEditReceivedMaterials(prev => [...prev, mat]);
                                                          setEditReceivedMaterialQuantities(prev => ({...prev, [mat]: prev[mat] || 1}));
                                                      } else {
                                                          setEditReceivedMaterials(prev => prev.filter(m => m !== mat));
                                                          setEditReceivedMaterialQuantities(prev => {
                                                              const newQ = {...prev};
                                                              delete newQ[mat];
                                                              return newQ;
                                                          });
                                                      }
                                                  }}
                                              />
                                          </label>
                                          {isChecked && (
                                              <div className="flex items-center gap-2 pl-8">
                                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Qtd:</span>
                                                  <input 
                                                      type="number"
                                                      min="1"
                                                      value={editReceivedMaterialQuantities[mat] || 1}
                                                      onChange={(e) => setEditReceivedMaterialQuantities(prev => ({...prev, [mat]: parseInt(e.target.value) || 1}))}
                                                      className="w-16 p-1 text-xs border border-slate-200 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                  />
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  )}

                  </div>
                  <div className="p-4 md:p-4 sm:p-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowEditModal(false)} className="px-5 py-2 font-black text-xs text-slate-400 uppercase tracking-widest">Cancelar</button>
                      <button onClick={handleSaveChanges} disabled={isUpdatingStatus} className="px-6 py-3 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xl shadow-blue-100 hover:bg-blue-700 flex items-center gap-2 uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50">
                          {isUpdatingStatus ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 shrink-0">
          <button onClick={() => navigate(job.isBudget ? '/budgets' : '/jobs')} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest transition-colors"><ArrowLeft size={16} /> {t('common.back', 'Voltar')}</button>
          <div className="flex flex-wrap gap-2 w-full xs:w-auto">
              {job.isBudget && job.status === 'PENDING' && (isAdmin || isManager || currentUser?.permissions?.includes('jobs:create') || currentUser?.permissions?.includes('budgets:edit')) && (
                  <button onClick={() => handleReturnAction('PROSSEGUIMENTO')} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-green-50 border border-green-100 text-green-600 rounded-lg hover:bg-green-100 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest transition-all">
                      <CheckCircle2 size={12} /> {t('jobDetails.approveAndGenerateOs', 'Aprovar e Gerar OS')}
                  </button>
              )}
              {canRegisterReturn && (
                  <button onClick={() => setShowReturnModal(true)} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-100 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest transition-all">
                      <Plus size={12} /> {t('jobDetails.registerReturn', 'Cadastrar Retorno')}
                  </button>
              )}
              {canReopen && !job.isBudget && (
                  <button onClick={handleReopenJob} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg hover:bg-amber-100 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest transition-all">
                    {isUpdatingStatus ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} {t('jobDetails.reopen', 'Reabrir')}
                  </button>
              )}
              {canPrint && job.status !== JobStatus.REJECTED && (
                  <>
                      {!job.isBudget && (
                        <>
                          <button onClick={() => triggerPrint(job, 'SHEET')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> Ficha Interna</button>
                          {isFinished && (
                            <button onClick={() => triggerPrint(job, 'INVOICE_SHEET')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> Ficha de Entrega</button>
                          )}
                        </>
                      )}
                      {job.isBudget && (
                          <button onClick={() => triggerPrint(job, 'BUDGET_SHEET')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> Imprimir Orçamento</button>
                      )}
                      {!job.isBudget && (
                      <>
                        <button onClick={() => triggerPrint(job, 'LABEL')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> Etiquetas</button>
                        {isFinished && (
                          <button onClick={() => triggerPrint(job, 'ADDRESS_LABEL')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><MapPin size={12} /> Endereço</button>
                        )}
                      </>
                      )}
                  </>
              )}
          </div>
      </div>

      {/* CARD PRINCIPAL INFO - Mobile Resilient */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-4 sm:p-8 relative overflow-visible shrink-0">
         <div className={`absolute top-0 left-0 w-1.5 md:w-2 h-full rounded-l-[32px] ${job.urgency === UrgencyLevel.VIP ? 'bg-orange-500' : 'bg-blue-600'}`} />
         <div className="flex flex-col lg:flex-row justify-between items-start gap-4 sm:p-6">
            <div className="w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div className="flex items-center gap-3 shrink-0 relative overflow-visible">
                        <span className="font-mono font-black text-2xl md:text-3xl text-slate-900 tracking-tight shrink-0">OS #{job.osNumber || '---'}</span>
                        {jobs.filter(j => j.patientName === job.patientName).length > 1 && (
                            <div className="relative shrink-0">
                                <button onClick={() => setIsCasesDropdownOpen(!isCasesDropdownOpen)} className="text-[9px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-black uppercase tracking-widest hover:bg-slate-300 transition-colors shadow-sm cursor-pointer border border-slate-300">{t('jobDetails.allCases', 'Todos os Casos')}</button>
                                {isCasesDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[9998]" onClick={() => setIsCasesDropdownOpen(false)}></div>
                                        <div className="absolute left-0 top-full mt-2 bg-white shadow-2xl border border-slate-200 rounded-xl py-2 w-48 z-[9999]">
                                            <div className="px-3 pb-2 mb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {t('jobDetails.patientHistory', 'Histórico do Paciente')}
                                            </div>
                                            {jobs.filter(j => j.patientName === job.patientName)
                                                 .sort((a,b) => {
                                                    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(((a.createdAt as any)?.seconds || 0) * 1000 || a.createdAt);
                                                    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(((b.createdAt as any)?.seconds || 0) * 1000 || b.createdAt);
                                                    return dateA.getTime() - dateB.getTime();
                                                 })
                                                 .map(j => (
                                                <button 
                                                    key={j.id} 
                                                    onClick={() => { setIsCasesDropdownOpen(false); navigate(`/jobs/${j.id}`); }} 
                                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm font-mono font-bold text-slate-700 flex items-center justify-between"
                                                >
                                                    <span>OS {j.osNumber || 'N/A'}</span>
                                                    {j.id === job.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {!job.isBudget && (
                    <div 
                        className="relative shrink-0"
                        onMouseEnter={() => canChangeStatus && setIsHeaderStatusMenuOpen(true)}
                        onMouseLeave={() => setIsHeaderStatusMenuOpen(false)}
                    >
                        {revealJobStatus ? (
                            <button 
                                type="button"
                                onClick={() => canChangeStatus && setIsHeaderStatusMenuOpen(prev => !prev)}
                                className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 ${getStatusColor(job.status)} shadow-sm ${canChangeStatus ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                            >
                                {getTranslatedStatus(job.status)} {canChangeStatus && <ChevronDown size={10}/>}
                            </button>
                        ) : (
                            <button type="button" className="px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 bg-slate-100 text-slate-400 border-slate-200 shadow-sm cursor-not-allowed" title="Andamento ocultado pelo laboratório">
                                <Lock size={10} /> Indisponível
                            </button>
                        )}
                        {canChangeStatus && isHeaderStatusMenuOpen && (
                            <div className="absolute top-full left-0 pt-0.5 w-48 z-[60]">
                                <div className="bg-white border border-slate-200 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 overflow-hidden">
                                    <div className="p-1.5 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b flex justify-between items-center">
                                        <span>Alterar Status</span>
                                        <button onClick={() => setIsHeaderStatusMenuOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={10}/></button>
                                    </div>
                                    <div className="p-1 space-y-0.5 max-h-60 overflow-y-auto">
                                        {Object.values(JobStatus).map(s => (
                                            <button 
                                                key={s} 
                                                type="button"
                                                onClick={() => {
                                                    setIsHeaderStatusMenuOpen(false);
                                                    handleQuickStatusUpdate(s);
                                                }} 
                                                className={`w-full text-left px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between ${
                                                    job.status === s ? 'bg-blue-50 text-blue-700 font-black' : 'text-slate-600 hover:bg-blue-600 hover:text-white'
                                                }`}
                                            >
                                                <span>{getTranslatedStatus(s)}</span>
                                                {job.status === s && <Check size={12} className="text-blue-600 shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                    <div className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 shadow-sm ${
                        job.urgency === UrgencyLevel.VIP ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        job.urgency === UrgencyLevel.HIGH ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                        {job.urgency === UrgencyLevel.VIP ? <Crown size={10}/> : <AlertTriangle size={10}/>}
                        {job.urgency}
                    </div>
                    
                    {!job.isBudget && canToggleChat && (
                         <button 
                            onClick={handleToggleChat}
                            className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 transition-all shadow-sm ${job.chatEnabled ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                        >
                            <MessageSquare size={10}/> {job.chatEnabled ? t('jobDetails.chatActive', 'Chat Ativo') : t('jobDetails.chatOff', 'Chat Desativado')}
                        </button>
                    )}
                    {!job.isBudget && canManageApproval && (
                         <button 
                            onClick={handleToggleApproval}
                            className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 transition-all shadow-sm ${job.approvalEnabled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                        >
                            <CheckSquare size={10}/> {job.approvalEnabled ? t('jobDetails.approvalActive', 'Aprovação Ativa') : t('jobDetails.approvalOff', 'Aprovação Desativada')}
                        </button>
                    )}
                    {job.caseNotes && (
                        <div className="px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 bg-amber-100 text-amber-900 border-amber-300 shadow-2xs" title={job.caseNotes}>
                            <StickyNote size={11} className="text-amber-700 shrink-0" />
                            <span className="truncate max-w-[180px]">Nota: {job.caseNotes}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-slate-900 leading-tight">
                    <h1 className="text-xl md:text-2xl font-black uppercase truncate flex items-center gap-2 text-slate-800">
                        <User size={20} className="text-blue-600 shrink-0" />
                        {job.dentistName}
                    </h1>
                    {job.subDentistName && (
                        <span className="flex items-center gap-1 text-xs md:text-sm font-bold text-slate-500 border-l border-slate-300 pl-2 truncate">
                            <Stethoscope size={14} className="text-indigo-500 shrink-0" /> Dr(a). {job.subDentistName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-base md:text-lg uppercase text-slate-600 truncate">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Paciente:</span>
                    <span className="text-slate-700 font-extrabold truncate">{job.patientName}</span>
                </div>
                {clientAddressFormatted && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                        <MapPin size={13} className="text-blue-500 shrink-0" />
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0">Endereço do Cliente:</span>
                        <span className="text-slate-600 font-semibold truncate" title={clientAddressFormatted}>{clientAddressFormatted}</span>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col xs:flex-row lg:flex-col lg:items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                <div className="flex flex-wrap xs:flex-nowrap gap-4 lg:flex-col lg:items-end shrink-0">
                    <div className="lg:text-right shrink-0">
                        <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Data / Hora de Cadastro</p>
                        <div className="flex items-center lg:justify-end gap-1.5 text-xs md:text-sm font-extrabold text-slate-700">
                            <Clock size={16} className="text-indigo-600 shrink-0" />
                            {parseDateSafely(job.createdAt)?.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || '-'}
                        </div>
                    </div>
                    <div className="lg:text-right shrink-0">
                        <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">{t('jobDetails.estimatedDelivery', 'Previsão de Saída')}</p>
                        <div className="flex items-center lg:justify-end gap-1.5 text-sm md:text-lg font-black text-slate-800"><Calendar size={18} className="text-blue-600 shrink-0" /> {(job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-")}</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-1 lg:justify-end w-full">
                    {/* Buyer: Delivery confirmation and Shopee-style review */}
                    {isBuyer && !job.isBudget && (
                        <>
                            {!isDelivered ? (
                                <button
                                    onClick={handleConfirmDeliveryByClient}
                                    disabled={isUpdatingStatus}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 uppercase tracking-widest transition-all transform active:scale-95 cursor-pointer"
                                    title="Confirmar que o trabalho foi entregue e recebido no consultório"
                                >
                                    {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Confirmar Entrega
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowReviewModal(true)}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] rounded-xl shadow-xl shadow-amber-100 flex items-center justify-center gap-2 uppercase tracking-widest transition-all transform active:scale-95 cursor-pointer"
                                >
                                    <Star size={16} className="fill-white" />
                                    {userRating ? 'Ver Minha Avaliação' : 'Avaliar Serviço'}
                                </button>
                            )}
                        </>
                    )}

                    {isLabStaff && !isFinished && !job.isBudget && (
                        <button 
                            onClick={() => { 
    console.log('Dispatching open-job-scanner-popup for job', job.id); 
    window.dispatchEvent(new CustomEvent('open-job-scanner-popup', { detail: { jobId: job.id } })); 
  }} 
                            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 text-white font-black text-[10px] rounded-xl hover:bg-slate-900 shadow-xl shadow-slate-200 flex items-center justify-center gap-2 uppercase tracking-widest transition-all transform active:scale-95"
                        >
                            <ScanBarcode size={16} /> {t('jobDetails.readBarcode', 'Ler Código')}
                        </button>
                    )}
                    {canFinalize && !job.isBudget && (
                         <button onClick={handleFinalizeJob} disabled={isUpdatingStatus} className="w-full sm:w-auto px-4 py-2.5 bg-green-600 text-white font-black text-[10px] rounded-xl hover:bg-green-700 shadow-xl shadow-green-100 flex items-center justify-center gap-2 uppercase tracking-widest transition-all transform active:scale-95">
                            {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {t('jobDetails.finishCase', 'Finalizar')}
                        </button>
                    )}
                    {isFinished && isLabStaff && !job.routeId && (
                        <button onClick={() => setShowRouteModal(true)} className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white font-black text-[10px] rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 uppercase tracking-widest transition-all">
                            <Truck size={16} /> {t('jobDetails.sendToLogistics', 'Logística')}
                        </button>
                    )}
                    {canAlert && !job.isBudget && (
                         <button onClick={() => setShowAlertModal(true)} className="w-full sm:w-auto px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-red-100">
                            <Bell size={16} /> {t('jobDetails.alert', 'Alerta')}
                        </button>
                    )}
                    {canEdit && (
                        <button onClick={() => setShowEditModal(true)} className="w-full sm:w-auto px-4 py-2.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-blue-100">
                            <Edit size={16} /> {t('common.edit', 'Editar')}
                        </button>
                    )}
                    {canShowReturn && !job.isBudget && (
                        <button onClick={handleReturnJob} disabled={isUpdatingStatus} className="w-full sm:w-auto px-4 py-2.5 bg-orange-50 border border-orange-100 text-orange-600 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-orange-100">
                            {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftCircle size={16} />} {t('jobDetails.returnJob', 'Devolver')}
                        </button>
                    )}
                    {canShowCancel && (
                        <button onClick={handleCancelJob} disabled={isUpdatingStatus} className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-gray-100">
                            {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} {t('jobDetails.cancelJob', 'Cancelar')}
                        </button>
                    )}
                </div>
            </div>
         </div>
      </div>

      {/* ABAS COM OVERFLOW AUTO */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 sticky top-0 md:top-16 bg-slate-50 z-20 w-full">
         <button onClick={() => setActiveTab('SUMMARY')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'SUMMARY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={16} /> {t('jobDetails.basicData', 'Dados Básicos')}</button>
         
         {!isClient && (
           <>
             {!job.isBudget && (!job.isPseudo && (isLabStaff ? canViewProduction : revealJobStatus)) ? (
                <button onClick={() => setActiveTab('PRODUCTION')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'PRODUCTION' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Layers size={16} /> {t('jobDetails.production', 'Produção')}</button>
             ) : !job.isBudget ? (
                <button type="button" className="px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 text-slate-300 cursor-not-allowed" title="Controle de produção indisponível para este trabalho">
                  <Lock size={14} className="text-slate-300" /> {t('jobDetails.production', 'Produção')} <span className="text-[8px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase">Indisponível</span>
                </button>
             ) : null}

             {(!job.isPseudo && (isLabStaff || revealJobStatus)) ? (
                <button onClick={() => setActiveTab('HISTORY')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'HISTORY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Clock size={16} /> {t('jobDetails.history', 'Histórico')}</button>
             ) : (
                <button type="button" className="px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 text-slate-300 cursor-not-allowed" title="Histórico indisponível para este trabalho">
                  <Lock size={14} className="text-slate-300" /> {t('jobDetails.history', 'Histórico')} <span className="text-[8px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase">Indisponível</span>
                </button>
             )}
           </>
         )}

         {!job.isBudget && (!job.isPseudo && (isLabStaff || job.chatEnabled)) ? (
            <button onClick={() => setActiveTab('CHAT')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'CHAT' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <MessageCircle size={16} /> {t('jobDetails.chat', 'Chat')}
                {job.chatEnabled && isLabStaff && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></div>}
            </button>
         ) : !job.isBudget ? (
            <button type="button" className="px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 text-slate-300 cursor-not-allowed" title="Chat desativado pelo laboratório">
              <Lock size={14} className="text-slate-300" /> {t('jobDetails.chat', 'Chat')} <span className="text-[8px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase">Indisponível</span>
            </button>
         ) : null}
      </div>

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {activeTab === 'SUMMARY' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-4 sm:p-8 animate-in fade-in duration-300 w-full pb-8">
                {/* KPI BOXES - Responsive Layout */}
                <div className={`lg:col-span-3 grid grid-cols-1 ${isClient ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-3 md:gap-4`}>
                    <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0"><Clock size={24} /></div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Data de Cadastro</p>
                            <p className="font-black text-xs sm:text-sm text-slate-800 truncate">
                                {parseDateSafely(job.createdAt)?.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || '-'}
                            </p>
                        </div>
                    </div>
                    {!job.isBudget && !isClient && (
                        <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0"><Box size={24} /></div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Caixa Física</p>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-xl text-slate-800">{job.boxNumber || '--'}</span>
                                    {job.boxColor && <div className="w-3.5 h-3.5 rounded-full shadow-sm border border-black/10 shrink-0" style={{ backgroundColor: job.boxColor.hex }} />}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0"><MapPin size={24} /></div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Localização Atual</p>
                            <p className="font-black text-lg text-slate-800 uppercase truncate">
                                {revealJobStatus ? (job.currentSector || 'Triagem') : 'Indisponível'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl shrink-0"><DollarSign size={24} /></div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Orçamento</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                {canViewJobPrices ? (
                                    <span className="font-black text-lg text-slate-800">R$ {job.totalValue.toFixed(2)}</span>
                                ) : (
                                    <span className="font-black text-lg text-slate-400 tracking-widest">••••••</span>
                                )}
                                {job.paymentStatus && (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                        job.paymentStatus === 'VOUCHER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        job.paymentStatus === 'AUTHORIZED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        job.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    }`}>
                                        {
                                            job.paymentStatus === 'VOUCHER' ? 'Voucher' :
                                            job.paymentStatus === 'AUTHORIZED' ? 'Pré-Autorizado' :
                                            job.paymentStatus === 'PAID' ? 'Pago' :
                                            'Aguardando Pagamento'
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4 md:space-y-6 min-w-0">
                    {(routeInfo || job?.lastDeliveryAttempt) && revealJobStatus && (
                        <div id="delivery-record-wrapper" className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-top-4">
                            <div className={`px-6 py-4 flex justify-between items-center border-b ${
                                routeInfo ? (
                                    routeInfo.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                                    routeInfo.status === 'IN_TRANSIT' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-700'
                                ) : 'bg-rose-50 border-rose-100 text-rose-900'
                            }`}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <Truck size={20} className={routeInfo?.status === 'IN_TRANSIT' ? 'animate-bounce' : ''} />
                                    <h3 className="font-black text-xs uppercase tracking-widest truncate">Registro de Entrega (Motoboy)</h3>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm ${
                                        routeInfo ? (
                                            routeInfo.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : 
                                            routeInfo.status === 'IN_TRANSIT' ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-500 text-white'
                                        ) : 'bg-rose-600 text-white'
                                    }`}>
                                        {routeInfo ? (
                                            routeInfo.status === 'COMPLETED' ? '✓ Entregue' : 
                                            routeInfo.status === 'IN_TRANSIT' ? '🛵 Em Trânsito' : '📦 Agendado'
                                        ) : '⚠️ Entrega Cancelada / Não Entregue'}
                                    </span>

                                    {(canManageCommissions || canEditProduction || isLabStaff) && (
                                        <div className="flex items-center gap-1.5 ml-2">
                                            <button 
                                                type="button"
                                                onClick={() => setShowRouteModal(true)}
                                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-extrabold text-[10px] transition-all border border-slate-200 shadow-sm flex items-center gap-1 uppercase tracking-tight"
                                                title={routeInfo ? "Trocar de rota de entrega" : "Vincular a uma nova rota"}
                                            >
                                                <RefreshCw size={12} className="text-indigo-600" />
                                                <span>{routeInfo ? "Trocar Rota" : "Vincular a Nova Rota"}</span>
                                            </button>
                                            {routeInfo && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowCancelDeliveryModal(true)}
                                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-extrabold text-[10px] transition-all border border-rose-200 shadow-sm flex items-center gap-1 uppercase tracking-tight"
                                                    title="Cancelar entrega deste caso"
                                                >
                                                    <XCircle size={12} className="text-rose-600" />
                                                    <span>Cancelar Entrega</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {routeInfo ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`p-3 rounded-xl shadow-sm border shrink-0 ${
                                                routeInfo.status === 'COMPLETED' ? 'bg-emerald-100/40 text-emerald-600 border-emerald-100' : 'bg-slate-100/50 text-slate-500 border-slate-100'
                                            }`}><User size={20}/></div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quem Entregou / Motoboy</p>
                                                <p className="font-extrabold text-slate-800 text-sm md:text-base uppercase truncate mt-0.5">{routeInfo.driverName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="p-3 bg-slate-100/50 text-slate-500 border border-slate-100 rounded-xl shadow-sm shrink-0"><Calendar size={20}/></div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Entrega / Rota</p>
                                                <p className="font-extrabold text-slate-800 text-sm md:text-base truncate mt-0.5">
                                                    {(() => {
                                                        try {
                                                            const d = routeInfo.date instanceof Date ? routeInfo.date : new Date(routeInfo.date);
                                                            return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                                                        } catch(e) {
                                                            try {
                                                                return new Date(routeInfo.date).toLocaleDateString('pt-BR');
                                                            } catch(err) {
                                                                return String(routeInfo.date);
                                                            }
                                                        }
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="p-3 bg-slate-100/50 text-slate-500 border border-slate-100 rounded-xl shadow-sm shrink-0"><Clock size={20}/></div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno do Roteiro</p>
                                                <p className="font-extrabold text-slate-800 text-sm md:text-base truncate mt-0.5">
                                                    {routeInfo.shift === 'MORNING' ? (
                                                        <span className="inline-flex items-center gap-1 text-amber-600">
                                                            ☀️ Rota da Manhã
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-indigo-600">
                                                            🌙 Rota da Tarde
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Histórico de Tentativa Cancelada */}
                                {job?.lastDeliveryAttempt && (
                                    <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2">
                                        <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                                                <AlertCircle size={14} className="text-rose-600" /> Histórico da Última Tentativa de Entrega
                                            </span>
                                            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-rose-200/60 text-rose-900 rounded-md uppercase">
                                                {job.lastDeliveryAttempt.status === 'CANCELLED' ? 'Entrega Não Realizada' : job.lastDeliveryAttempt.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-rose-400 tracking-wider">Motoboy</p>
                                                <p className="font-bold text-slate-800 uppercase">{job.lastDeliveryAttempt.driverName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-rose-400 tracking-wider">Data / Turno</p>
                                                <p className="font-bold text-slate-800">
                                                    {job.lastDeliveryAttempt.date.split('-').reverse().join('/')} ({job.lastDeliveryAttempt.shift === 'MORNING' ? 'Manhã' : 'Tarde'})
                                                </p>
                                            </div>
                                            <div className="sm:col-span-3 pt-1 border-t border-rose-200/50">
                                                <p className="text-[9px] font-black uppercase text-rose-500 tracking-wider mb-0.5">Motivo do Cancelamento:</p>
                                                <p className="font-black text-rose-900 bg-white p-2.5 rounded-xl border border-rose-200 shadow-2xs leading-relaxed text-xs">
                                                    "{job.lastDeliveryAttempt.reason || 'Motivo não informado'}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Card de Entrega e Avaliação do Serviço (Exclusivo para o Cliente/Comprador da Loja Online / Dentista) */}
                    {isBuyer && !job.isBudget && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent rounded-[32px] border border-amber-200/80 p-5 md:p-6 shadow-sm overflow-hidden animate-in slide-in-from-top-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                        <Star size={24} className="fill-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full">
                                                {isDelivered ? 'Trabalho Entregue' : 'Aguardando Entrega'}
                                            </span>
                                            {userRating && (
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                                    ✓ Avaliado ({userRating.score} ★)
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-black text-slate-800 text-base md:text-lg mt-0.5">
                                            {userRating ? 'Sua Avaliação do Laboratório' : isDelivered ? 'Avalie a qualidade deste serviço!' : 'Confirme a entrega do caso'}
                                        </h4>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {userRating
                                                ? `"${userRating.comment}"`
                                                : isDelivered
                                                ? 'Deixe suas estrelas, fotos, vídeos e comentários sobre a prótese recebida.'
                                                : 'Quando o motoboy ou transportadora entregar o caso no consultório, confirme o recebimento para avaliar.'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {!isDelivered && (
                                        <button
                                            onClick={handleConfirmDeliveryByClient}
                                            disabled={isUpdatingStatus}
                                            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                            Confirmar Entrega
                                        </button>
                                    )}
                                    {isDelivered && (
                                        <button
                                            onClick={() => setShowReviewModal(true)}
                                            className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Star size={14} className="fill-white" />
                                            {userRating ? 'Editar / Ver Avaliação' : 'Avaliar Serviço'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {userRating && (Boolean(userRating.imageUrls?.length) || Boolean(userRating.videoUrls?.length)) && (
                                <div className="mt-4 pt-3 border-t border-amber-200/50 flex items-center gap-2 overflow-x-auto">
                                    <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Mídias enviadas:</span>
                                    {userRating.imageUrls?.map((url, i) => (
                                        <img key={i} src={url} className="w-10 h-10 rounded-lg object-cover border border-amber-200" />
                                    ))}
                                    {userRating.videoUrls?.map((_, i) => (
                                        <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-lg font-bold">🎬 Vídeo {i+1}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Exibição Read-Only da Avaliação do Cliente para o Laboratório (caso exista) */}
                    {!isBuyer && userRating && !job.isBudget && (
                        <div className="bg-slate-50 rounded-[32px] border border-slate-200/80 p-5 md:p-6 shadow-sm overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                        <Star size={20} className="fill-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                                Avaliação Recebida do Cliente ({userRating.score} ★)
                                            </span>
                                        </div>
                                        <h4 className="font-extrabold text-slate-800 text-sm mt-1">
                                            "{userRating.comment || 'Sem comentário por escrito.'}"
                                        </h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-4 sm:p-8">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tighter shrink-0"><FileText size={20} className="text-blue-500 shrink-0" /> Serviços do Pedido</h3>
                        <div className="divide-y divide-slate-100">
                            {job.items.map((item: any, idx: number) => {
                                const jType = jobTypes.find(jt => jt.id === item.jobTypeId);
                                const allowedSecs = (jType?.allowedSectors && jType.allowedSectors.length > 0) ? jType.allowedSectors.filter(sec => sectors.some(s => s.name === sec)) : sectors.map(s => s.name);
                                const isExpanded = expandedItemIdx === idx;
                                
                                return (
                                <div key={idx} className="py-4 flex flex-col min-w-0">
                                    <div 
                                      className={`flex justify-between items-center gap-4 ${canViewServiceDetails ? 'cursor-pointer hover:bg-slate-50' : ''} p-2 -mx-2 rounded-xl transition-colors`}
                                      onClick={() => {
                                        if (canViewServiceDetails) {
                                          setExpandedItemIdx(isExpanded ? null : idx);
                                        }
                                      }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-slate-800 text-sm md:text-base leading-tight">
                                                {getNaturePrefix(item.nature)}{formatItemNameWithVariations(item, jobTypes)}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                                                {/* Quantidade */}
                                                <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-blue-50 text-blue-700 border border-blue-100/80 flex items-center gap-1 shrink-0">
                                                    <span className="text-[9px] uppercase tracking-wider text-blue-400 font-black">Qtd:</span> {item.quantity || 1}
                                                </span>

                                                {/* Natureza */}
                                                <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] border flex items-center gap-1 shrink-0 ${
                                                    item.nature === 'REPETITION' ? 'bg-amber-50 text-amber-800 border-amber-200' : 
                                                    item.nature === 'ADJUSTMENT' ? 'bg-purple-50 text-purple-800 border-purple-200' : 
                                                    'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                    <span className="text-[9px] uppercase tracking-wider opacity-60 font-black">Natureza:</span> {
                                                        item.nature === 'REPETITION' ? '(R) Repetição' : 
                                                        item.nature === 'ADJUSTMENT' ? '(A) Ajuste' : 
                                                        'Normal'
                                                    }
                                                </span>

                                                {/* Cor */}
                                                <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1 shrink-0">
                                                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black">Cor:</span> {item.color || 'Não informada'}
                                                </span>

                                                {/* Dentes */}
                                                <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 shrink-0">
                                                    <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-black">Dentes:</span> {formatTeethRange(item.selectedTeeth) || 'Sem elemento'}
                                                </span>

                                                {(item.nature === 'REPETITION' || item.nature === 'ADJUSTMENT') && canManageCommissions && (
                                                    <button 
                                                        type="button" 
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const updatedItems = job.items.map((i: any) => i.id === item.id ? { ...i, commissionDisabled: !i.commissionDisabled } : i);
                                                            await updateJob(job.id, { items: updatedItems });
                                                        }}
                                                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md transition-all flex items-center gap-1 hover:scale-105 active:scale-95 shadow-sm ${!item.commissionDisabled ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-100'}`}
                                                    >
                                                        {!item.commissionDisabled ? '✅ COMISSÃO ATIVA' : '🚫 COMISSÃO INATIVA'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {(canManageCommissions || canEditProduction) && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenStageConfig(item);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Configurar Etapas do Serviço"
                                                >
                                                    <Settings size={18} />
                                                </button>
                                            )}
                                            {item.isInternalStep ? (
                                                <p className="font-black text-indigo-500 text-[10px] uppercase">NÃO FATURADO</p>
                                            ) : canViewJobPrices ? (
                                                <p className="font-black text-slate-600 text-sm md:text-base">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                            ) : (
                                                <p className="font-black text-slate-400 text-sm md:text-base tracking-widest">••••••</p>
                                            )}
                                            {canViewServiceDetails && (
                                                <ChevronDown size={18} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            )}
                                        </div>
                                    </div>
                                    
                                    {canViewServiceDetails && isExpanded && (
                                        <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                            {editingItemId === item.id ? (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center bg-blue-50 -my-4 -mx-4 p-4 rounded-t-2xl border-b border-blue-100 mb-4">
                                                        <span className="font-bold text-blue-800 text-sm flex items-center gap-2"><Edit size={16} /> Editar Detalhes do Serviço</span>
                                                        <div className="flex gap-2">
                                                            <button onClick={cancelEditingItem} className="text-slate-500 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"><X size={16}/></button>
                                                            <button onClick={() => handleSaveItemEdit(item)} className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shadow-sm shadow-blue-500/20"><Save size={14}/> Salvar</button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                                                            <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Natureza do Serviço</label>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setItemEditForm({...itemEditForm, nature: 'NORMAL'})} 
                                                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all border ${itemEditForm.nature === 'NORMAL' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                                                >
                                                                    Normal
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setItemEditForm({...itemEditForm, nature: 'REPETITION', commissionDisabled: true})} 
                                                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all border ${itemEditForm.nature === 'REPETITION' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                                                >
                                                                    (R) Repetição
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setItemEditForm({...itemEditForm, nature: 'ADJUSTMENT', commissionDisabled: true})} 
                                                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all border ${itemEditForm.nature === 'ADJUSTMENT' ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                                                >
                                                                    (A) Ajuste
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="col-span-1 sm:col-span-2">
                                                            <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Tabela de Preço</label>
                                                            <select 
                                                                className="w-full text-sm font-bold border border-slate-300 p-2.5 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                value={priceTables.find(t => t.name === itemEditForm.appliedPriceTable)?.id || (itemEditForm.appliedPriceTable === 'Padrão' ? 'padrão' : 'custom')}
                                                                onChange={(e) => handlePriceTableSelect(item.jobTypeId, e)}
                                                            >
                                                                <option value="padrão">Padrão</option>
                                                                {itemEditForm.appliedPriceTable === 'Personalizado' && <option value="custom" disabled hidden>Personalizado</option>}
                                                                {priceTables.map(t => (
                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="col-span-1 sm:col-span-2 flex gap-2 items-end">
                                                            <div className="w-20 sm:w-24 shrink-0">
                                                                <label className="block text-[10px] uppercase font-black text-slate-500 mb-1 flex items-center justify-between">
                                                                    <span>Qtd</span>
                                                                    {itemEditForm.selectedTeeth && itemEditForm.selectedTeeth.length > 0 && itemEditForm.quantity !== itemEditForm.selectedTeeth.length && (
                                                                        <span className="text-[8px] text-amber-600 font-bold" title="Quantidade definida manualmente">Manual</span>
                                                                    )}
                                                                </label>
                                                                <input 
                                                                    type="number" 
                                                                    min={1}
                                                                    className="w-full text-sm font-bold border border-slate-300 p-2.5 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center shadow-xs"
                                                                    value={itemEditForm.quantity}
                                                                    onChange={(e) => setItemEditForm(prev => ({...prev, quantity: e.target.value === '' ? '' : (parseInt(e.target.value) || 1)}))}
                                                                    onBlur={() => {
                                                                        if ((itemEditForm.quantity as any) === '' || isNaN(Number(itemEditForm.quantity)) || Number(itemEditForm.quantity) < 1) {
                                                                            setItemEditForm(prev => ({...prev, quantity: prev.selectedTeeth && prev.selectedTeeth.length > 0 ? prev.selectedTeeth.length : 1}));
                                                                        }
                                                                    }}
                                                                    title="Quantidade manual do serviço"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Dentes</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={itemEditTeethInput}
                                                                    onChange={(e) => {
                                                                        const raw = e.target.value;
                                                                        setItemEditTeethInput(raw);
                                                                        const parsed = raw.split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                                                                        setItemEditForm(prev => {
                                                                            const oldTeethCount = prev.selectedTeeth ? prev.selectedTeeth.length : 0;
                                                                            const wasDefaultQty = Number(prev.quantity) === oldTeethCount || Number(prev.quantity) === 1 || !prev.quantity;
                                                                            return {
                                                                                ...prev,
                                                                                selectedTeeth: parsed,
                                                                                quantity: wasDefaultQty ? (parsed.length > 0 ? parsed.length : 1) : prev.quantity
                                                                            };
                                                                        });
                                                                    }}
                                                                    placeholder="Ex: 11, 21, 16" 
                                                                    className="w-full text-sm font-bold border border-slate-300 p-2.5 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                                                />
                                                            </div>
                                                            <div className="w-24 sm:w-28 shrink-0">
                                                                <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Cor</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={itemEditForm.color || ''} 
                                                                    onChange={(e) => setItemEditForm({...itemEditForm, color: e.target.value})} 
                                                                    placeholder="Ex: A3" 
                                                                    className="w-full text-sm font-bold border border-slate-300 p-2.5 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Odontograma interativo */}
                                                        <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Odontograma (Seleção de Elementos)</span>
                                                            <Odontogram 
                                                                selectedTeeth={itemEditForm.selectedTeeth || []}
                                                                onChange={(teeth) => {
                                                                    const sorted = [...teeth].sort();
                                                                    setItemEditTeethInput(sorted.join(', '));
                                                                    setItemEditForm(prev => {
                                                                        const oldTeethCount = prev.selectedTeeth ? prev.selectedTeeth.length : 0;
                                                                        const wasDefaultQty = Number(prev.quantity) === oldTeethCount || Number(prev.quantity) === 1 || !prev.quantity;
                                                                        return {
                                                                            ...prev,
                                                                            selectedTeeth: sorted,
                                                                            quantity: wasDefaultQty ? (sorted.length > 0 ? sorted.length : 1) : prev.quantity
                                                                        };
                                                                    });
                                                                }}
                                                                className="w-full max-w-[280px] h-auto"
                                                            />
                                                            {itemEditForm.selectedTeeth && itemEditForm.selectedTeeth.length > 0 && (
                                                                <p className="text-[10px] text-indigo-600 font-bold">Dentes selecionados ({itemEditForm.selectedTeeth.length}): {itemEditForm.selectedTeeth.join(', ')}</p>
                                                            )}
                                                        </div>

                                                        {canViewJobPrices && (
                                                        <>
                                                        <div className="col-span-1 sm:col-span-2">
                                                            <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Valor Unitário (Base)</label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                                                <input 
                                                                    type="number" min={0} step={0.01}
                                                                    className="w-full text-sm font-bold border border-slate-300 p-2.5 pl-8 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    value={itemEditForm.price}
                                                                    onChange={(e) => setItemEditForm({...itemEditForm, price: e.target.value === '' ? '' : e.target.value, appliedPriceTable: 'Personalizado'})}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="col-span-1 sm:col-span-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <label className="block text-[10px] uppercase font-black text-slate-500">
                                                                    {itemEditForm.priceAdjustmentType === 'SURCHARGE' ? 'Acréscimo no Serviço' : 'Desconto Extra'}
                                                                </label>
                                                                {/* Chave Seletora: Desconto vs Acréscimo */}
                                                                <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const curVal = itemEditForm.discountType === 'PERCENTAGE' 
                                                                                ? (itemEditForm.appliedSurcharge || itemEditForm.appliedDiscount || 0)
                                                                                : (itemEditForm.appliedSurchargeFixed || itemEditForm.appliedDiscountFixed || 0);
                                                                            setItemEditForm({
                                                                                ...itemEditForm,
                                                                                priceAdjustmentType: 'DISCOUNT',
                                                                                appliedDiscount: itemEditForm.discountType === 'PERCENTAGE' ? curVal : 0,
                                                                                appliedDiscountFixed: itemEditForm.discountType === 'FIXED' ? curVal : 0,
                                                                                appliedSurcharge: 0,
                                                                                appliedSurchargeFixed: 0,
                                                                            });
                                                                        }}
                                                                        className={`px-1.5 py-0.5 rounded transition-all ${
                                                                            itemEditForm.priceAdjustmentType !== 'SURCHARGE'
                                                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                                                : 'text-slate-600 hover:text-slate-900'
                                                                        }`}
                                                                    >
                                                                        Desconto
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const curVal = itemEditForm.discountType === 'PERCENTAGE' 
                                                                                ? (itemEditForm.appliedDiscount || itemEditForm.appliedSurcharge || 0)
                                                                                : (itemEditForm.appliedDiscountFixed || itemEditForm.appliedSurchargeFixed || 0);
                                                                            setItemEditForm({
                                                                                ...itemEditForm,
                                                                                priceAdjustmentType: 'SURCHARGE',
                                                                                appliedSurcharge: itemEditForm.discountType === 'PERCENTAGE' ? curVal : 0,
                                                                                appliedSurchargeFixed: itemEditForm.discountType === 'FIXED' ? curVal : 0,
                                                                                appliedDiscount: 0,
                                                                                appliedDiscountFixed: 0,
                                                                            });
                                                                        }}
                                                                        className={`px-1.5 py-0.5 rounded transition-all ${
                                                                            itemEditForm.priceAdjustmentType === 'SURCHARGE'
                                                                                ? 'bg-amber-500 text-white shadow-xs'
                                                                                : 'text-slate-600 hover:text-slate-900'
                                                                        }`}
                                                                    >
                                                                        Acréscimo
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <select 
                                                                    value={itemEditForm.discountType} 
                                                                    onChange={(e) => setItemEditForm({...itemEditForm, discountType: e.target.value as 'PERCENTAGE' | 'FIXED'})}
                                                                    className="w-1/3 px-2 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 outline-none text-xs"
                                                                >
                                                                    <option value="PERCENTAGE">% (Porcentagem)</option>
                                                                    <option value="FIXED">R$ (Valor Fixo)</option>
                                                                </select>
                                                                <input 
                                                                    type="number" 
                                                                    min={0} 
                                                                    step={itemEditForm.discountType === 'PERCENTAGE' ? "0.1" : "0.01"}
                                                                    max={itemEditForm.discountType === 'PERCENTAGE' && itemEditForm.priceAdjustmentType !== 'SURCHARGE' ? 100 : undefined}
                                                                    className={`flex-1 w-full text-sm font-bold border p-2.5 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                                        itemEditForm.priceAdjustmentType === 'SURCHARGE' ? 'border-amber-300 text-amber-900' : 'border-slate-300 text-slate-800'
                                                                    }`}
                                                                    value={itemEditForm.priceAdjustmentType === 'SURCHARGE'
                                                                        ? (itemEditForm.discountType === 'PERCENTAGE' ? itemEditForm.appliedSurcharge : itemEditForm.appliedSurchargeFixed)
                                                                        : (itemEditForm.discountType === 'PERCENTAGE' ? itemEditForm.appliedDiscount : itemEditForm.appliedDiscountFixed)
                                                                    }
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === '' ? '' : e.target.value;
                                                                        if (itemEditForm.priceAdjustmentType === 'SURCHARGE') {
                                                                            if (itemEditForm.discountType === 'PERCENTAGE') {
                                                                                setItemEditForm({...itemEditForm, appliedSurcharge: val, appliedSurchargeFixed: 0});
                                                                            } else {
                                                                                setItemEditForm({...itemEditForm, appliedSurchargeFixed: val, appliedSurcharge: 0});
                                                                            }
                                                                        } else {
                                                                            if (itemEditForm.discountType === 'PERCENTAGE') {
                                                                                setItemEditForm({...itemEditForm, appliedDiscount: val, appliedDiscountFixed: 0});
                                                                            } else {
                                                                                setItemEditForm({...itemEditForm, appliedDiscountFixed: val, appliedDiscount: 0});
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Resumo do Valor Total do Item */}
                                                        <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex items-center justify-between bg-blue-100/70 p-3 rounded-xl text-xs font-bold text-blue-900">
                                                            <span>
                                                                {(() => { const naturePrefix = itemEditForm.nature === 'REPETITION' ? '(Repetição) ' : itemEditForm.nature === 'ADJUSTMENT' ? '(Ajuste) ' : '';
                                                                    const base = parseFloat(String(itemEditForm.price)) || 0;
                                                                    const isSur = itemEditForm.priceAdjustmentType === 'SURCHARGE';
                                                                    if (isSur) {
                                                                        const sPerc = itemEditForm.discountType === 'PERCENTAGE' ? (parseFloat(String(itemEditForm.appliedSurcharge)) || 0) : 0;
                                                                        const sFix = itemEditForm.discountType === 'FIXED' ? (parseFloat(String(itemEditForm.appliedSurchargeFixed)) || 0) : 0;
                                                                        const unitFinal = sFix > 0 ? (base + sFix) : (base * (1 + sPerc / 100));
                                                                        return `${naturePrefix}Preço com Acrésc.: R$ ${unitFinal.toFixed(2)}`;
                                                                    } else {
                                                                        const dPerc = itemEditForm.discountType === 'PERCENTAGE' ? (parseFloat(String(itemEditForm.appliedDiscount)) || 0) : 0;
                                                                        const dFix = itemEditForm.discountType === 'FIXED' ? (parseFloat(String(itemEditForm.appliedDiscountFixed)) || 0) : 0;
                                                                        const unitFinal = Math.max(0, (base * (1 - dPerc / 100)) - dFix);
                                                                        return `${naturePrefix}Preço Final Unit.: R$ ${unitFinal.toFixed(2)}`;
                                                                    }
                                                                })()}
                                                            </span>
                                                            <span className="font-black text-sm">
                                                                Total: R$ {(() => {
                                                                    // Allow total calculation for repetition or adjustment if non-zero price is set
                                                                    const base = parseFloat(String(itemEditForm.price)) || 0;
                                                                    const isSur = itemEditForm.priceAdjustmentType === 'SURCHARGE';
                                                                    let unitFinal = base;
                                                                    if (isSur) {
                                                                        const sPerc = itemEditForm.discountType === 'PERCENTAGE' ? (parseFloat(String(itemEditForm.appliedSurcharge)) || 0) : 0;
                                                                        const sFix = itemEditForm.discountType === 'FIXED' ? (parseFloat(String(itemEditForm.appliedSurchargeFixed)) || 0) : 0;
                                                                        unitFinal = sFix > 0 ? (base + sFix) : (base * (1 + sPerc / 100));
                                                                    } else {
                                                                        const dPerc = itemEditForm.discountType === 'PERCENTAGE' ? (parseFloat(String(itemEditForm.appliedDiscount)) || 0) : 0;
                                                                        const dFix = itemEditForm.discountType === 'FIXED' ? (parseFloat(String(itemEditForm.appliedDiscountFixed)) || 0) : 0;
                                                                        unitFinal = Math.max(0, (base * (1 - dPerc / 100)) - dFix);
                                                                    }
                                                                    const q = Number(itemEditForm.quantity) || (itemEditForm.selectedTeeth.length > 0 ? itemEditForm.selectedTeeth.length : 1);
                                                                    return (unitFinal * q).toFixed(2);
                                                                })()}
                                                            </span>
                                                        </div>
                                                        </>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Variations Editing */}
                                                    {(() => {
                                                        const itemJobType = jobTypes.find(jt => jt.id === item.jobTypeId);
                                                        if (!itemJobType || ((!itemJobType.variationGroups || itemJobType.variationGroups.length === 0) && (!itemJobType.variations || itemJobType.variations.length === 0))) return null;
                                                        const groups = (itemJobType.variationGroups && itemJobType.variationGroups.length > 0) ? itemJobType.variationGroups : [{ id: 'default', name: 'Opções', options: itemJobType.variations || [] }];
                                                        
                                                        return (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
                                                                {groups.map((group: any) => (
                                                                    <div key={group.id} className="space-y-2">
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.name}</h4>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {group.options.map((option: any) => {
                                                                                const isSelected = itemEditForm.selectedVariationIds.includes(option.id);
                                                                                return (
                                                                                    <button 
                                                                                        key={option.id} 
                                                                                        type="button" 
                                                                                        onClick={() => {
                                                                                            let newSelected = [...itemEditForm.selectedVariationIds];
                                                                                            if (group.selectionType === 'SINGLE') {
                                                                                                newSelected = newSelected.filter(id => !group.options.find((o: any) => o.id === id));
                                                                                                if (!isSelected) newSelected.push(option.id);
                                                                                            } else {
                                                                                                if (isSelected) newSelected = newSelected.filter(id => id !== option.id);
                                                                                                else newSelected.push(option.id);
                                                                                            }
                                                                                            const editingItem = job?.items?.find((i: any) => i.id === editingItemId);
                                                                                            const type = jobTypes.find((t: any) => t.id === editingItem?.jobTypeId);
                                                                                            let targetAutoQty = 1;
                                                                                            if (type && type.variationGroups) {
                                                                                                for (const g of type.variationGroups) {
                                                                                                    if (!g.options) continue;
                                                                                                    for (const opt of g.options) {
                                                                                                        if (newSelected.includes(opt.id) && opt.autoQuantity && opt.autoQuantity > 0) {
                                                                                                            if (opt.autoQuantity > targetAutoQty) {
                                                                                                                targetAutoQty = opt.autoQuantity;
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            }

                                                                                            const updatedForm: any = { 
                                                                                                ...itemEditForm, 
                                                                                                selectedVariationIds: newSelected,
                                                                                                quantity: targetAutoQty
                                                                                            };
                                                                                            setItemEditForm(updatedForm);
                                                                                        }} 
                                                                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
                                                                                    >
                                                                                        {option.name}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}

                                                    {(item.nature === 'REPETITION' || item.nature === 'ADJUSTMENT') && canManageCommissions && (
                                                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 mt-2">
                                                            <div className="relative flex items-start">
                                                                <div className="flex h-6 items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!itemEditForm.commissionDisabled}
                                                                        onChange={(e) => setItemEditForm({...itemEditForm, commissionDisabled: !e.target.checked})}
                                                                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                                                                    />
                                                                </div>
                                                                <div className="ml-3 text-sm leading-6">
                                                                    <label className="font-black text-slate-800 uppercase tracking-tight text-[11px]">
                                                                        Ativar Comissão para este item
                                                                    </label>
                                                                    <p className="text-[10px] text-slate-500 font-bold">Por padrão, ajustes e repetições não geram comissão.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 flex-1">
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Natureza</p>
                                                                <p className="text-sm font-bold text-slate-700">
                                                                    {item.nature === 'REPETITION' ? '(R) Repetição' : item.nature === 'ADJUSTMENT' ? '(A) Ajuste' : 'Normal'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Dentes</p>
                                                                <p className="text-sm font-bold text-indigo-600">{formatTeethRange(item.selectedTeeth) || 'Sem elemento'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Cor</p>
                                                                <p className="text-sm font-bold text-slate-700">{item.color || 'Não informada'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Quantidade</p>
                                                                <p className="text-sm font-bold text-slate-700">{item.quantity || 1}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Valor Unitário</p>
                                                                <p className="text-sm font-bold text-slate-700">
                                                                    {canViewJobPrices ? `R$ ${(item.basePriceBeforeDiscount ?? item.price).toFixed(2)}` : '••••••'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">
                                                                    {item.priceAdjustmentType === 'SURCHARGE' || (Boolean(item.appliedSurcharge) && Number(item.appliedSurcharge) > 0) || (Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0) ? 'Acréscimo' : 'Desconto'}
                                                                </p>
                                                                <p className="text-sm font-bold text-slate-700">
                                                                    {!canViewJobPrices ? (
                                                                        '••••••'
                                                                    ) : (item.priceAdjustmentType === 'SURCHARGE' || (Boolean(item.appliedSurcharge) && Number(item.appliedSurcharge) > 0) || (Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0)) ? (
                                                                        <span className="text-amber-700 font-bold">
                                                                            {item.appliedSurcharge ? `+${Number(item.appliedSurcharge).toFixed(1)}% ` : ''}
                                                                            {item.appliedSurchargeFixed ? `(+R$ ${Number(item.appliedSurchargeFixed).toFixed(2)})` : ''}
                                                                        </span>
                                                                    ) : item.appliedDiscount || item.appliedDiscountFixed ? (
                                                                        <span className="text-emerald-700 font-bold">
                                                                            {item.appliedDiscount ? `-${Number(item.appliedDiscount).toFixed(1)}% ` : ''}
                                                                            {item.appliedDiscountFixed ? `(-R$ ${Number(item.appliedDiscountFixed).toFixed(2)})` : ''}
                                                                        </span>
                                                                    ) : 'Nenhum'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Tabela Usada</p>
                                                                <p className="text-sm font-bold text-slate-700 truncate" title={item.appliedPriceTable || 'Padrão'}>{item.appliedPriceTable || 'Padrão'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Preço Total</p>
                                                                {item.isInternalStep ? (
                                                                    <p className="text-[10px] font-black text-indigo-500 mt-1 uppercase">Não Faturado</p>
                                                                ) : canViewJobPrices ? (
                                                                    <p className="text-sm font-bold text-slate-700">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                                                ) : (
                                                                    <p className="text-sm font-bold text-slate-400">••••••</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isLabStaff && canEditServiceDetails && (
                                                            <div className="flex flex-col gap-2 shrink-0 ml-4 items-end">
                                                                <button 
                                                                    onClick={() => startEditingItem(item)}
                                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0"
                                                                    title="Editar este item"
                                                                >
                                                                    <Edit size={18} />
                                                                </button>
                                                                {(item.nature === 'REPETITION' || item.nature === 'ADJUSTMENT') && canManageCommissions && (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={async () => {
                                                                            const updatedItems = job.items.map((i: any) => i.id === item.id ? { ...i, commissionDisabled: !i.commissionDisabled } : i);
                                                                            await updateJob(job.id, { items: updatedItems });
                                                                        }}
                                                                        className={`text-[9px] font-black uppercase px-2 py-1 rounded-md transition-all flex items-center gap-1 hover:scale-105 active:scale-95 shadow-sm ${!item.commissionDisabled ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-100'}`}
                                                                    >
                                                                        {!item.commissionDisabled ? '✅ COMISSÃO ATIVA' : '🚫 COMISSÃO INATIVA'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                            
                                            {canManageCommissions && editingItemId !== item.id && (
                                                <div className="border-t border-slate-200 pt-4">
                                                    {!job.isBudget && <h4 className="text-[10px] font-black text-slate-600 uppercase mb-3 flex items-center gap-1"><Briefcase size={12} /> Setores Permitidos e Comissão</h4>}
                                                    <div className="space-y-3">
                                                            {jType?.allowedSectors?.length === 0 && (
                                                                <p className="text-xs text-slate-500 italic mb-2">Este serviço é permitido em todos os setores. Abaixo você pode configurar a comissão individualmente para cada um deles.</p>
                                                            )}
                                                            <p className="text-[10px] text-slate-500 leading-tight">Defina a quantidade de unidades para fins de comissão em cada setor (padrão é igual à quantidade original da OS).</p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {allowedSecs.map(secName => {
                                                                    const rawVal = item.sectorQuantities?.[secName];
                                                                    const secQty = rawVal !== undefined ? rawVal : (item.quantity || 1);
                                                                    const isSectorCommissionDisabled = item.sectorCommissionDisabled?.[secName] ?? (item.nature === 'REPETITION' || item.nature === 'ADJUSTMENT');
                                                                    return (
                                                                        <div key={secName} className="flex flex-col gap-2 bg-white p-2 md:p-3 rounded-xl border border-slate-200">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-xs font-bold text-slate-700 truncate mr-2">{secName}</span>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Qtd:</span>
                                                                                    <input 
                                                                                        type="number" 
                                                                                        min={1} 
                                                                                        step={1}
                                                                                        value={secQty}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            if (val === '') {
                                                                                                handleSectorQuantityChange(item.id, secName, '');
                                                                                            } else {
                                                                                                const parsed = parseInt(val, 10);
                                                                                                if (!isNaN(parsed)) {
                                                                                                    handleSectorQuantityChange(item.id, secName, Math.max(1, parsed));
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        onBlur={() => {
                                                                                            if (secQty === '' || isNaN(Number(secQty)) || Number(secQty) < 1) {
                                                                                                handleSectorQuantityChange(item.id, secName, item.quantity || 1);
                                                                                            }
                                                                                        }}
                                                                                        className="w-16 p-1 text-center text-xs font-bold border border-slate-300 bg-slate-50 focus:bg-white rounded outline-none focus:border-blue-500"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <button 
                                                                                type="button" 
                                                                                onClick={() => handleSectorCommissionToggle(item.id, secName, !isSectorCommissionDisabled)}
                                                                                className={`text-[8px] font-black uppercase px-2 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-95 shadow-sm ${!isSectorCommissionDisabled ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-100'}`}
                                                                            >
                                                                                {!isSectorCommissionDisabled ? '✅ COMISSÃO ATIVA' : '🚫 COMISSÃO INATIVA'}
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>

                        {job.products && job.products.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-widest"><Package size={14} className="text-amber-500" /> Produtos & Componentes Adicionais</h4>
                                <div className="space-y-2">
                                    {job.products.map((prod: any) => (
                                        <div key={prod.id} className="flex justify-between items-center p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center font-black text-xs">{prod.quantity}</div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-800 text-sm uppercase truncate max-w-[200px] leading-tight">{prod.name}</p>
                                                    {prod.dentistOwnerId && (
                                                        <p className="text-[9px] text-amber-700 font-bold uppercase overflow-hidden whitespace-nowrap text-ellipsis mt-1">Estoque do Próprio Dentista</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {canViewJobPrices ? (
                                                    <span className="font-black text-slate-700 text-sm">R$ {(prod.unitPrice * prod.quantity).toFixed(2)}</span>
                                                ) : (
                                                    <span className="font-bold text-slate-400 text-sm tracking-wider">••••••</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-slate-200 text-right shrink-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Valor Total da OS</span>
                            {canViewJobPrices ? (
                                <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none mt-1">R$ {job.totalValue.toFixed(2)}</div>
                            ) : (
                                <div className="text-2xl md:text-3xl font-black text-slate-400 leading-none mt-1 tracking-widest">••••••</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-6 sm:p-8 space-y-6">
                        <div>
                            <h3 className="text-base md:text-lg font-black text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-tighter shrink-0"><FileIcon size={20} className="text-blue-500 shrink-0" /> Observações do Pedido</h3>
                            <div className="bg-slate-50 p-4 rounded-2xl text-slate-600 text-xs md:text-sm font-medium leading-relaxed whitespace-pre-wrap min-h-[80px] border border-slate-100">
                                {job.notes || "Sem instruções adicionais registradas no pedido."}
                            </div>
                        </div>

                        {/* Notas Exclusivas do Caso */}
                        <div className="pt-5 border-t border-slate-100 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <StickyNote size={20} className="text-amber-600 shrink-0" />
                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter">Notas do Caso</h3>
                                    <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-200">
                                        Exclusivas do Caso
                                    </span>
                                </div>
                                {!editingCaseNotes && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setEditingCaseNotes(true);
                                            setCaseNotesText(job.caseNotes || '');
                                        }}
                                        className="self-start sm:self-auto text-amber-800 hover:text-amber-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer bg-amber-50 hover:bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-200/80 shadow-2xs"
                                    >
                                        <Edit3 size={14} /> {job.caseNotes ? 'Editar Notas do Caso' : '+ Adicionar Nota ao Caso'}
                                    </button>
                                )}
                            </div>

                            {editingCaseNotes ? (
                                <div className="space-y-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                                    <div className="text-xs font-bold text-amber-950">
                                        Insira comentários ou anotações referentes exclusivamente a este caso (editáveis a qualquer momento, mesmo após o caso ser finalizado).
                                    </div>
                                    <textarea
                                        value={caseNotesText}
                                        onChange={(e) => setCaseNotesText(e.target.value)}
                                        placeholder="Digite observações ou anotações sobre este caso específico..."
                                        rows={4}
                                        className="w-full p-3.5 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-xs md:text-sm font-semibold text-slate-800 shadow-2xs"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditingCaseNotes(false)}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setIsUpdatingStatus(true);
                                                try {
                                                    await updateJob(job.id, { 
                                                        caseNotes: caseNotesText,
                                                        history: [...(job.history || []).filter(Boolean), {
                                                            id: `hist_case_notes_${Date.now()}`,
                                                            timestamp: new Date(),
                                                            action: `Notas do caso atualizadas`,
                                                            userId: currentUser?.id || 'sys',
                                                            userName: currentUser?.name || 'Sistema'
                                                        }]
                                                    });
                                                    setEditingCaseNotes(false);
                                                } catch (err) {
                                                    alert("Erro ao salvar notas do caso.");
                                                } finally {
                                                    setIsUpdatingStatus(false);
                                                }
                                            }}
                                            disabled={isUpdatingStatus}
                                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                                        >
                                            {isUpdatingStatus && <Loader2 size={13} className="animate-spin" />}
                                            Salvar Notas do Caso
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60 min-h-[75px]">
                                    {job.caseNotes ? (
                                        <p className="text-amber-950 text-xs md:text-sm font-semibold whitespace-pre-wrap leading-relaxed">{job.caseNotes}</p>
                                    ) : (
                                        <div className="flex items-center justify-between text-amber-800/80 text-xs italic">
                                            <span>Nenhuma nota específica registrada para este caso.</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingCaseNotes(true);
                                                    setCaseNotesText('');
                                                }}
                                                className="not-italic font-black text-amber-900 hover:underline text-xs cursor-pointer ml-2 shrink-0"
                                            >
                                                + Criar Nota do Caso
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Materiais Enviados View */}
                    {(Array.isArray(job.receivedMaterials) && job.receivedMaterials.length > 0) && (
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 md:p-8 mt-4 md:mt-6 overflow-hidden relative">
                            <h3 className="text-base md:text-lg font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-tighter shrink-0">
                                <Box size={20} className="text-indigo-500 shrink-0" /> Materiais Recebidos
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {job.receivedMaterials.map((mat: string) => {
                                    const qty = job.receivedMaterialQuantities?.[mat];
                                    const displayName = qty ? `${qty}x ${mat}` : mat;
                                    return (
                                        <div key={mat} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl">
                                            <CheckCircle size={16} className="text-indigo-500 shrink-0" />
                                            <span className="text-[11px] font-bold leading-tight">{displayName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Case Approval System Section */}
                    {(!job.isBudget && !job.isPseudo && (job.origin === 'ONLINE_ORDER' || job.origin === 'ONLINE_REQUISITION' || job.approvalEnabled || isLabStaff)) && (
                        <div className="mt-4 md:mt-6">
                            {isClient && !job.approvalEnabled ? (
                                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-4 sm:p-6 text-center text-slate-500">
                                    <Lock size={32} className="text-slate-300 mx-auto mb-2" />
                                    <p className="font-extrabold text-xs uppercase text-slate-700">Área de Aprovação de Caso</p>
                                    <p className="text-[10px] mt-1 text-slate-400 font-bold">Aguardando ativação do laboratório para este caso.</p>
                                </div>
                            ) : (
                                <CaseApprovalSystem job={job} orgId={job.organizationId} />
                            )}
                        </div>
                    )}
                </div>

                {!job.isBudget && (
                <div className="lg:col-span-1 space-y-4 md:space-y-6 min-w-0 pb-8">
                    {/* Linha do Tempo de Prazos */}
                    <div id="lifecycle-timeline-card" className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-4 sm:p-6">
                        <h3 className="text-sm md:text-base font-black text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-tighter truncate">
                            <Clock size={20} className="text-blue-600 shrink-0" />
                            Prazos do Caso
                        </h3>
                        <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                            {/* Passo 1: Envio */}
                            <div className="flex gap-4 relative">
                                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm font-black text-[10px]">
                                    1
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Envio / Solicitação</p>
                                    <p className="font-extrabold text-slate-800 text-xs mt-1">
                                        {parseDateSafely(job.sentAt || job.createdAt)?.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Não informado'}
                                    </p>
                                </div>
                            </div>

                            {/* Passo 2: Aceite */}
                            <div className="flex gap-4 relative">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm font-black text-[10px] ${parseDateSafely(job.acceptedAt) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                    2
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Aceite pelo Laboratório</p>
                                    {parseDateSafely(job.acceptedAt) ? (
                                        <p className="font-extrabold text-emerald-600 text-xs mt-1">
                                            {parseDateSafely(job.acceptedAt)?.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic mt-1 font-semibold">
                                            {parseDateSafely(job.rejectedAt) ? 'Caso recusado' : 'Aguardando aceite...'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Passo 3: Recusa (opcional, só mostra se houver recusa) */}
                            {parseDateSafely(job.rejectedAt) && (
                                <div className="flex gap-4 relative animate-in slide-in-from-top-2">
                                    <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm font-black text-[10px]">
                                        ✕
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Recusa / Cancelamento</p>
                                        <p className="font-extrabold text-red-600 text-xs mt-1">
                                            {parseDateSafely(job.rejectedAt)?.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {job.rejectionReason && (
                                            <div className="mt-2 bg-red-50/50 border border-red-100 p-2.5 rounded-xl text-[11px] text-red-700 leading-relaxed font-semibold">
                                                <span className="font-bold text-red-800">Justificativa:</span> {job.rejectionReason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CARD LOGÍSTICA & RASTREAMENTO FRENET */}
                    <div id="job-logistics-card" className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-4 sm:p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter truncate">
                                <Truck size={20} className="text-indigo-600 shrink-0" />
                                Envio & Rastreamento
                            </h3>
                            {canManageCommissions && !isEditingShipping && (
                                <button
                                    onClick={() => {
                                        setNewTrackingCode(job.trackingCode || '');
                                        setNewShippingCarrier(job.shippingCarrier || '');
                                        setIsEditingShipping(true);
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase"
                                >
                                    <Edit3 size={12} />
                                    {job.trackingCode ? 'Alterar' : 'Adicionar'}
                                </button>
                            )}
                        </div>

                        {isEditingShipping ? (
                            <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Código de Rastreamento (Frenet / Transportadora)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: QB123456789BR ou 12345678"
                                        value={newTrackingCode}
                                        onChange={e => setNewTrackingCode(e.target.value.toUpperCase())}
                                        className="w-full text-xs font-mono font-bold p-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Transportadora / Serviço</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: SEDEX, PAC, Correios, Jadlog, Loggi..."
                                        value={newShippingCarrier}
                                        onChange={e => setNewShippingCarrier(e.target.value)}
                                        className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingShipping(false)}
                                        className="px-3 py-1.5 text-xs text-slate-500 font-bold rounded-lg hover:bg-slate-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveJobShipping}
                                        disabled={isUpdatingStatus}
                                        className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700"
                                    >
                                        {isUpdatingStatus ? 'Salvando...' : 'Salvar Envio'}
                                    </button>
                                </div>
                            </div>
                        ) : job.trackingCode ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Código:</span>
                                            <span className="font-mono font-black text-xs text-indigo-950">{job.trackingCode}</span>
                                        </div>
                                        {job.shippingCarrier && (
                                            <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                                                {job.shippingCarrier}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSyncJobFrenetTracking}
                                        disabled={isSyncingTracking}
                                        className="px-3 py-2 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 font-bold rounded-xl text-[10px] flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                                    >
                                        <RefreshCw size={12} className={isSyncingTracking ? 'animate-spin' : ''} />
                                        <span>{isSyncingTracking ? 'Sincronizando...' : 'Rastrear Frenet'}</span>
                                    </button>
                                </div>

                                {trackingSyncMsg && (
                                    <p className="text-[11px] font-bold text-indigo-600 bg-indigo-50 p-2 rounded-xl text-center animate-in fade-in">
                                        {trackingSyncMsg}
                                    </p>
                                )}

                                {/* Linha do Tempo das Movimentações */}
                                {job.trackingEvents && job.trackingEvents.length > 0 ? (
                                    <div className="space-y-2 pt-1 border-t border-slate-100 max-h-48 overflow-y-auto pr-1">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Movimentações do Pacote
                                        </div>
                                        <div className="space-y-2">
                                            {job.trackingEvents.map((ev: any, idx: number) => (
                                                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-0.5">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-slate-800">{ev.description}</span>
                                                        <span className="text-[9px] font-mono text-slate-400">
                                                            {new Date(ev.date).toLocaleDateString('pt-BR')} {new Date(ev.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    {ev.location && (
                                                        <p className="text-[10px] text-slate-500 font-medium">Local: {ev.location}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-slate-400 italic text-center py-1">
                                        Clique em "Rastrear Frenet" para sincronizar o status em tempo real da transportadora.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
                                <p className="text-xs font-bold text-slate-600">Nenhum código de rastreamento vinculado</p>
                                <p className="text-[10px] text-slate-400">Adicione o código de envio Frenet/Correios para rastrear a entrega das próteses.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-6 overflow-hidden">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-6 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <FileIcon size={20} className="shrink-0" />
                                </div>
                                <div>
                                    <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tighter">
                                        Documentos e Arquivos do Caso
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Fotos, Escaneamentos STL e Anexos
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {job.attachments?.some((a: any) => a.name.toLowerCase().endsWith('.stl') || a.name.toLowerCase().endsWith('.ply') || a.name.toLowerCase().endsWith('.obj')) && (
                                    <button
                                        type="button"
                                        onClick={() => setShow3DViewer(true)}
                                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                                        title="Abrir Visualizador 3D interativo para todos os modelos STL"
                                    >
                                        <Box size={14} className="text-indigo-600" />
                                        <span>Visualizador 3D Geral</span>
                                    </button>
                                )}
                                <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                                    {job.attachments?.length || 0} {job.attachments?.length === 1 ? 'arquivo' : 'arquivos'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Hidden native camera capture input */}
                            <input 
                                ref={nativeCameraInputRef}
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setSelectedFiles(prev => [...prev, e.target.files![0]]);
                                        e.target.value = '';
                                    }
                                }}
                            />

                            {/* Upload and Camera Buttons Adaptados para o Dispositivo */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {!isMobileDevice() ? (
                                    <>
                                        {/* PC / Desktop Option 1: Anexar Arquivos, Imagens e Vídeos */}
                                        <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/80 group hover:border-blue-400 hover:bg-blue-50/40 transition-all text-center relative shrink-0">
                                            <input 
                                                type="file" 
                                                multiple 
                                                onChange={handleFileSelect} 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                accept="image/*,video/*,.stl,.ply,.obj,.pdf,.doc,.docx,.xls,.xlsx,application/*" 
                                            />
                                            <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                                                <UploadCloud size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                                                    Anexar Arquivos, Imagens e Vídeos
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium">
                                                    Imagens, Vídeos, STL, Documentos
                                                </span>
                                            </div>
                                        </div>

                                        {/* PC / Desktop Option 2: Câmera Web */}
                                        <button 
                                            type="button"
                                            onClick={() => setIsWebcamOpen(true)}
                                            disabled={isUploadingFiles}
                                            className="p-4 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/50 group hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                                            title="Abrir Câmera Web para Fotos e Vídeos"
                                        >
                                            <CameraIcon size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
                                            <span className="text-[11px] font-black text-blue-900 uppercase tracking-wider text-center leading-tight">
                                                Câmera Web
                                            </span>
                                            <span className="text-[9px] text-blue-600/80 font-bold">
                                                Foto e Gravação de Vídeo
                                            </span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Dispositivo Móvel Option 1: Câmera */}
                                        <button 
                                            type="button"
                                            onClick={() => setIsWebcamOpen(true)}
                                            disabled={isUploadingFiles}
                                            className="p-4 border-2 border-dashed border-emerald-300/80 rounded-2xl bg-emerald-50/50 group hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                                            title="Abrir Câmera para Foto e Gravação de Vídeo"
                                        >
                                            <Smartphone size={24} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                                            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider text-center leading-tight">
                                                Câmera
                                            </span>
                                            <span className="text-[9px] text-emerald-600/80 font-bold">
                                                Foto e Gravação de Vídeo
                                            </span>
                                        </button>

                                        {/* Dispositivo Móvel Option 2: Anexar Arquivos, Imagens e Vídeos */}
                                        <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/80 group hover:border-blue-400 hover:bg-blue-50/40 transition-all text-center relative shrink-0">
                                            <input 
                                                type="file" 
                                                multiple 
                                                onChange={handleFileSelect} 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                accept="image/*,video/*,.stl,.ply,.obj,.pdf,.doc,.docx,.xls,.xlsx,application/*" 
                                            />
                                            <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                                                <UploadCloud size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                                                    Anexar Arquivos, Imagens e Vídeos
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium">
                                                    Galeria, Arquivos e Mídias
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Queue of files to upload */}
                            {selectedFiles.length > 0 && (
                                <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-100 space-y-3 animate-in zoom-in shrink-0">
                                    <div className="flex justify-between items-center text-white pb-1 border-b border-blue-500/50">
                                        <span className="text-[11px] font-black uppercase tracking-wider">
                                            {selectedFiles.length} {selectedFiles.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedFiles([])}
                                            className="text-[10px] font-bold text-blue-200 hover:text-white uppercase"
                                        >
                                            Limpar fila
                                        </button>
                                    </div>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                                        {selectedFiles.map((f, i) => (
                                            <div key={i} className="flex justify-between items-center text-[10px] font-bold text-white/90 bg-blue-700/40 px-3 py-1.5 rounded-lg">
                                                <span className="truncate flex-1 pr-2">{f.name}</span>
                                                <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-0.5 hover:text-white shrink-0"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleUploadFiles} disabled={isUploadingFiles} className="w-full py-2.5 bg-white text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
                                        {isUploadingFiles ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        {isUploadingFiles ? 'Enviando Arquivos...' : 'Confirmar Envio'}
                                    </button>
                                    {uploadProgressMsg && <p className="text-[9px] text-white/70 text-center font-bold animate-pulse truncate">{uploadProgressMsg}</p>}
                                </div>
                            )}

                            {/* Filter Pills if there are attachments */}
                            {job.attachments && job.attachments.length > 0 && (
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setAttachmentViewFilter('ALL')}
                                        className={`px-3 py-1.5 rounded-xl transition uppercase tracking-wider text-[10px] shrink-0 ${
                                            attachmentViewFilter === 'ALL'
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Todos ({job.attachments.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAttachmentViewFilter('IMAGE')}
                                        className={`px-3 py-1.5 rounded-xl transition uppercase tracking-wider text-[10px] shrink-0 flex items-center gap-1 ${
                                            attachmentViewFilter === 'IMAGE'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <ImageLucide size={12} />
                                        Imagens ({job.attachments.filter((a: any) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(a.name.split('.').pop()?.toLowerCase() || '')).length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAttachmentViewFilter('STL')}
                                        className={`px-3 py-1.5 rounded-xl transition uppercase tracking-wider text-[10px] shrink-0 flex items-center gap-1 ${
                                            attachmentViewFilter === 'STL'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <Box size={12} />
                                        Modelos 3D ({job.attachments.filter((a: any) => ['stl', 'ply', 'obj'].includes(a.name.split('.').pop()?.toLowerCase() || '')).length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAttachmentViewFilter('DOC')}
                                        className={`px-3 py-1.5 rounded-xl transition uppercase tracking-wider text-[10px] shrink-0 flex items-center gap-1 ${
                                            attachmentViewFilter === 'DOC'
                                                ? 'bg-slate-800 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <FileText size={12} />
                                        Documentos ({job.attachments.filter((a: any) => !['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'stl', 'ply', 'obj'].includes(a.name.split('.').pop()?.toLowerCase() || '')).length})
                                    </button>
                                </div>
                            )}

                            {/* Attachments Cards Grid */}
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
                                {(() => {
                                    const allAtts = job.attachments || [];
                                    const filtered = allAtts.filter((att: any) => {
                                        const ext = att.name.split('.').pop()?.toLowerCase() || '';
                                        const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
                                        const isStl = ['stl', 'ply', 'obj'].includes(ext);
                                        if (attachmentViewFilter === 'IMAGE') return isImg;
                                        if (attachmentViewFilter === 'STL') return isStl;
                                        if (attachmentViewFilter === 'DOC') return !isImg && !isStl;
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="text-center py-10 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-6">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                    Nenhum arquivo encontrado nesta categoria.
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 gap-4">
                                            {filtered.map((att: any) => {
                                                const ext = att.name.split('.').pop()?.toLowerCase() || '';
                                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
                                                const isStl = ['stl', 'ply', 'obj'].includes(ext);

                                                return (
                                                    <div 
                                                        key={att.id} 
                                                        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-blue-300 transition-all overflow-hidden p-4 space-y-3"
                                                    >
                                                        {/* Preview Header Area */}
                                                        {isImage && (
                                                            <div 
                                                                onClick={() => {
                                                                    setSelectedAttachment(att);
                                                                    setAllAttachmentsForPreview(job.attachments || []);
                                                                }}
                                                                className="relative h-48 w-full bg-slate-900 rounded-xl overflow-hidden cursor-pointer group/img flex items-center justify-center"
                                                            >
                                                                <img 
                                                                    src={att.url} 
                                                                    alt={att.name}
                                                                    className="w-full h-full object-contain group-hover/img:scale-105 transition-transform duration-300"
                                                                    referrerPolicy="no-referrer"
                                                                />
                                                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    <ImageLucide size={10} className="text-violet-400" />
                                                                    {ext.toUpperCase()}
                                                                </div>
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-black text-xs uppercase tracking-wider">
                                                                    <Eye size={18} /> Clique para ampliar
                                                                </div>
                                                            </div>
                                                        )}

                                                        {isStl && (
                                                            <div className="h-36 w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden border border-slate-750 text-white shadow-inner">
                                                                <span className="absolute top-2 left-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                    <Box size={10} /> 3D STL
                                                                </span>
                                                                <Box size={32} className="text-blue-400 animate-pulse mb-1.5" />
                                                                <span className="text-xs font-black text-slate-100 uppercase truncate max-w-[90%] text-center px-2">
                                                                    {att.name}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedAttachment(att);
                                                                        setAllAttachmentsForPreview(job.attachments || []);
                                                                    }}
                                                                    className="mt-2.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                                                                >
                                                                    <Box size={13} /> Visualizar em 3D
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* File Info Bar */}
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                                {!isImage && !isStl && (
                                                                    <div className="p-2 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                                                                        {getFileIcon(att.name)}
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <h4 className="text-xs font-black text-slate-800 truncate uppercase tracking-tight" title={att.name}>
                                                                        {att.name}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold">
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock size={11} className="text-slate-400 shrink-0" />
                                                                            Importado em {formatAttachmentDateTime(att.uploadedAt)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Action buttons */}
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedAttachment(att);
                                                                        setAllAttachmentsForPreview(job.attachments || []);
                                                                    }}
                                                                    className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition border border-slate-100"
                                                                    title="Visualizar anexo"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownloadFile(att.url, att.name)}
                                                                    className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition border border-slate-100"
                                                                    title="Baixar arquivo original"
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteAttachment(att.id)}
                                                                    className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition border border-slate-100"
                                                                    title="Excluir anexo"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Comment Section per file */}
                                                        <div className="pt-2 border-t border-slate-100">
                                                            {editingCommentAttId === att.id ? (
                                                                <div className="space-y-2">
                                                                    <input
                                                                        type="text"
                                                                        value={commentDraftText}
                                                                        onChange={e => setCommentDraftText(e.target.value)}
                                                                        placeholder="Escreva um comentário ou instrução para este arquivo..."
                                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                                        autoFocus
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') handleUpdateAttachmentComment(att.id, commentDraftText);
                                                                            if (e.key === 'Escape') setEditingCommentAttId(null);
                                                                        }}
                                                                    />
                                                                    <div className="flex justify-end gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingCommentAttId(null)}
                                                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleUpdateAttachmentComment(att.id, commentDraftText)}
                                                                            disabled={isSavingComment}
                                                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-sm transition disabled:opacity-50"
                                                                        >
                                                                            {isSavingComment ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                                                            Salvar Comentário
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : att.comment ? (
                                                                <div className="bg-blue-50/70 border border-blue-100/80 rounded-xl p-2.5 flex items-start justify-between gap-2">
                                                                    <div className="flex items-start gap-2 min-w-0">
                                                                        <MessageSquare size={13} className="text-blue-500 shrink-0 mt-0.5" />
                                                                        <p className="text-xs text-slate-700 italic leading-snug break-words">
                                                                            "{att.comment}"
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingCommentAttId(att.id);
                                                                            setCommentDraftText(att.comment || '');
                                                                        }}
                                                                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition shrink-0"
                                                                        title="Editar comentário"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingCommentAttId(att.id);
                                                                        setCommentDraftText('');
                                                                    }}
                                                                    className="text-[11px] font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                                                >
                                                                    <MessageSquare size={12} />
                                                                    <span>+ Adicionar comentário</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        )}

        {activeTab === 'HISTORY' && (
            revealJobStatus ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-4 sm:p-8 animate-in fade-in duration-300 w-full overflow-hidden pb-8">
                    <div className="lg:col-span-2 min-w-0">
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-4 sm:p-8">
                            <h3 className="text-base md:text-lg font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-tighter"><ListChecks size={20} className="text-blue-500 shrink-0" /> Linha do Tempo</h3>
                            <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-50">
                                {sortedHistory.map((h, idx) => (
                                    <div key={idx} className="flex gap-4 md:gap-4 sm:p-6 relative min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm ${idx === 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-100 text-slate-300'}`}>
                                            {h.action.toLowerCase().includes('concluído') ? <Check size={16} className="shrink-0" /> : idx === 0 ? <Clock size={16} className="shrink-0" /> : <div className="w-2 h-2 bg-slate-300 rounded-full shrink-0" />}
                                        </div>
                                        <div className="flex-1 pb-8 border-b border-slate-50 last:border-0 last:pb-0 min-w-0">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-1.5 md:gap-4 mb-2">
                                                <p className={`font-black text-xs md:text-sm uppercase tracking-tight leading-tight ${idx === 0 ? 'text-blue-600' : 'text-slate-700'}`}>{h.action}</p>
                                                <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded shrink-0 whitespace-nowrap">{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 font-bold uppercase truncate"><User size={12} className="shrink-0" /> {h.userName}</div>
                                                {h.sector && <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded shrink-0">{h.sector}</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1 space-y-4 md:space-y-6 min-w-0">
                         <div className={`rounded-[32px] shadow-xl p-6 md:p-8 text-white overflow-hidden relative min-h-[160px] flex flex-col justify-center shrink-0 transition-colors duration-500 ${timeInfo.isAttention ? 'bg-amber-600' : 'bg-indigo-900'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Flag size={100} /></div>
                            <h4 className={`font-black text-[10px] md:text-xs mb-2 flex items-center gap-2 uppercase tracking-widest ${timeInfo.isAttention ? 'text-amber-200' : 'text-indigo-300'}`}><MapPin size={16} className="shrink-0" /> Estágio Atual</h4>
                            <p className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight break-words">{job.currentSector || 'Triagem'}</p>
                            <div className="mt-4 flex flex-col gap-1">
                                <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] ${timeInfo.isAttention ? 'text-amber-100' : 'text-indigo-400'} shrink-0`}>
                                    <Clock size={14} /> Permanência: {timeInfo.label}
                                </div>
                                {timeInfo.isAttention && (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-white/20 px-3 py-1 rounded-lg w-fit mt-2 animate-pulse">
                                        <FileWarning size={14} /> Status de Atenção (+18h)
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 shrink-0">
                                <div className={`w-1.5 h-1.5 rounded-full animate-ping shrink-0 ${timeInfo.isAttention ? 'bg-white' : 'bg-indigo-400'}`}></div> PRODUÇÃO EM CURSO
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-12 md:p-20 rounded-[32px] border border-slate-100 shadow-sm text-center max-w-4xl mx-auto my-6">
                    <Lock size={48} className="mx-auto text-slate-200 mb-4 shrink-0" />
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Histórico Indisponível</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mt-2 text-sm font-medium">Este laboratório desabilitou o acompanhamento de histórico para os dentistas.</p>
                </div>
            )
        )}

        {activeTab === 'PRODUCTION' && (
            (isLabStaff ? canViewProduction : revealJobStatus) ? (
                <div className="w-full animate-in fade-in duration-300 pb-8 overflow-x-auto">
                <div className="min-w-[800px] max-w-6xl mx-auto space-y-6">
                    {job.items.map((item: any) => {
                        const jt = jobTypes.find(t => t.id === item.jobTypeId);
                        const activeLabSectorNames = new Set(sectors.map(s => s.name));

                        const itemConfiguredSectors = Object.keys(item.sectorStages || {}).filter(sec => Array.isArray(item.sectorStages[sec]) && item.sectorStages[sec].length > 0);
                        const jtSectorStages = jt?.sectorStages;
                        const jtConfiguredSectors = Object.keys(jtSectorStages || {}).filter(sec => Array.isArray(jtSectorStages?.[sec]) && (jtSectorStages?.[sec]?.length || 0) > 0);
                        const allConfiguredSectors = Array.from(new Set([...itemConfiguredSectors, ...jtConfiguredSectors]));

                        let candidateSectors: string[] = [];
                        if (jt?.allowedSectors && jt.allowedSectors.length > 0) {
                            candidateSectors = Array.from(new Set([
                                ...jt.allowedSectors.filter(sec => activeLabSectorNames.has(sec)),
                                ...allConfiguredSectors.filter(sec => activeLabSectorNames.has(sec))
                            ]));
                        } else {
                            candidateSectors = sectors.map(s => s.name);
                        }

                        const itemExecutions = (job.itemExecutions || []).filter((e: any) => e.itemId === item.id);
                        const executedSectors = new Set<string>();
                        itemExecutions.forEach((e: any) => {
                            if (e.sector && activeLabSectorNames.has(e.sector)) {
                                const hasTimes = e.stageTimes && Object.keys(e.stageTimes).length > 0;
                                const hasExecutedList = e.executedStages && e.executedStages.length > 0;
                                if (hasTimes || hasExecutedList || e.entryTime || e.userId) {
                                    executedSectors.add(e.sector);
                                }
                            }
                        });

                        const sectorsToRender = Array.from(new Set([...candidateSectors, ...Array.from(executedSectors)]))
                            .filter(sec => activeLabSectorNames.has(sec));

                        return (
                            <div key={item.id} className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
                                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                    <h4 className="font-black text-slate-700 text-xs uppercase tracking-widest">{getNaturePrefix(item.nature)}{formatItemNameWithVariations(item, jobTypes)}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">{jt?.category || 'Geral'}</span>
                                </div>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white border-b border-slate-50">
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionários</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Previsão</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Início</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Término</th>
                                            {(isLabStaff && canEditProduction) && <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
    {sectorsToRender.flatMap(sector => {
        const activeSector = sectors.find(s => s.name === sector);
        if (!activeSector) return [];

        const activeSectorStages = activeSector?.stages || [];
        const execution = (job.itemExecutions || []).find((e: any) => e.itemId === item.id && e.sector === sector);
        const executedStageNames = new Set<string>();
        if (execution?.stageTimes) {
          Object.keys(execution.stageTimes).forEach(k => executedStageNames.add(k));
        }
        if (execution?.executedStages) {
          execution.executedStages.forEach((s: string) => executedStageNames.add(s));
        }

        const itemSectorStages = item.sectorStages?.[sector];
        const jtSectorStages = jt?.sectorStages?.[sector];

        let candidateStages: string[] = [];
        if (itemSectorStages !== undefined) {
            candidateStages = itemSectorStages;
        } else if (jtSectorStages !== undefined) {
            candidateStages = jtSectorStages;
        } else {
            candidateStages = activeSectorStages;
        }

        const combinedStagesSet = new Set<string>();
        candidateStages.forEach((s: string) => {
            if (s && typeof s === 'string' && s.trim() !== '') {
                combinedStagesSet.add(s);
            }
        });
        executedStageNames.forEach((s: string) => combinedStagesSet.add(s));

        const itemSectorStagesList = Array.from(combinedStagesSet);
        const stagesToRender = itemSectorStagesList.length > 0 ? itemSectorStagesList : ['BASE'];
        
        return stagesToRender.map((stageName: string, stageIdx: number) => {
            const execution = (job.itemExecutions || []).find((e: any) => e.itemId === item.id && e.sector === sector);
            const stageData = execution?.stageTimes?.[stageName] || null;
            
            const isStarted = !!stageData?.entryTime;
            const isFinished = !!stageData?.exitTime;
            
            const entryTime = parseSafeDate(stageData?.entryTime);
            const exitTime = parseSafeDate(stageData?.exitTime);
            
            const isLegacyExecution = execution && (!execution.stageTimes || Object.keys(execution.stageTimes).length === 0);

            // If it's BASE and no stageData, we can fallback to checking execution
            let finalStarted = isStarted;
            let finalFinished = isFinished;
            if (stageName === 'BASE' && isLegacyExecution) {
                // For legacy data, if execution exists, maybe it was finished
                if (execution.timestamp) finalFinished = true;
                finalStarted = true; // execution means it was at least started
            }

            // Find users from stageData
            const exitUserObj = stageData?.exitUserId ? labUsers.find(u => u.id === stageData.exitUserId) : null;
            const entryUserObj = stageData?.entryUserId ? labUsers.find(u => u.id === stageData.entryUserId) : null;
            
            let entryUserName = entryUserObj?.name || (stageData?.entryUserId ? stageData.entryUserId : null);
            let exitUserName = exitUserObj?.name || (stageData?.exitUserId ? stageData.exitUserId : null);
            
            if (stageName === 'BASE' && isLegacyExecution && !entryUserName && !exitUserName) {
                entryUserName = execution.userName;
                exitUserName = execution.userName;
            }

            const activeUser = exitUserName || entryUserName;
            const activeUserObj = exitUserObj || entryUserObj || (execution?.userId ? labUsers.find(u => u.id === execution.userId) : null) || (activeUser ? labUsers.find(u => u.name === activeUser) : null);
            const activeUserAvatar = activeUserObj?.avatarUrl || activeUserObj?.photoUrl;

            const displayName = stageName === 'BASE' ? sector : `${sector} - ${stageName}`;
            
            const secQty = (item.sectorQuantities && item.sectorQuantities[sector] !== undefined)
                ? item.sectorQuantities[sector]
                : (item.quantity || 1);
            const stageCustomQty = item.stageQuantities?.[sector]?.[stageName];
            const effectiveQty = (stageCustomQty !== undefined && stageCustomQty !== '')
                ? Number(stageCustomQty)
                : Number(secQty);

            return (
                <tr key={`${sector}-${stageName}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-6 rounded-full ${finalFinished ? 'bg-green-500' : finalStarted ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{displayName}</span>
                        </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                        {(canManageCommissions || canEditProduction) ? (
                            <div className="flex items-center justify-center">
                                <input 
                                    type="number" 
                                    min={1} 
                                    step={1}
                                    value={effectiveQty}
                                    title="Quantidade de elementos para este setor (sincronizada com Setores Permitidos e Comissão)"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            handleSectorQuantityChange(item.id, sector, '');
                                        } else {
                                            const parsed = parseInt(val, 10);
                                            if (!isNaN(parsed)) {
                                                handleSectorQuantityChange(item.id, sector, Math.max(1, parsed));
                                            }
                                        }
                                    }}
                                    onBlur={() => {
                                        if (isNaN(Number(effectiveQty)) || Number(effectiveQty) < 1) {
                                            handleSectorQuantityChange(item.id, sector, item.quantity || 1);
                                        }
                                    }}
                                    className="w-14 h-7 text-center text-xs font-black text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg shadow-sm outline-none transition-all"
                                />
                            </div>
                        ) : (
                            <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{effectiveQty}</span>
                        )}
                    </td>
                    <td className="px-5 py-3">
                        {activeUser ? (
                            <div className="flex items-center gap-2">
                                {activeUserAvatar ? (
                                    <img 
                                        src={activeUserAvatar} 
                                        alt={activeUser} 
                                        className="w-6 h-6 rounded-lg object-cover border border-blue-200 shadow-sm shrink-0" 
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black text-[9px] uppercase shadow-sm shrink-0">
                                        {activeUser.charAt(0)}
                                    </div>
                                )}
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{activeUser}</span>
                            </div>
                        ) : (
                            <span className="text-[10px] font-bold text-slate-300 italic group-hover:text-blue-400 transition-colors">Aguardando</span>
                        )}
                    </td>
                    <td className="px-5 py-3 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{(job.dueDate ? new Date(job.dueDate).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) : "-")}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                        {entryTime ? (
                            <div className="flex items-center justify-center gap-1.5 text-blue-600">
                                <Calendar size={12} className="opacity-50" />
                                <span className="text-[10px] font-black">{entryTime.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ) : (stageName === 'BASE' && isLegacyExecution && parseSafeDate(execution?.entryTime)) ? (
                            <div className="flex items-center justify-center gap-1.5 text-blue-600">
                                <Calendar size={12} className="opacity-50" />
                                <span className="text-[10px] font-black">{(parseSafeDate(execution.entryTime) as Date).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {(parseSafeDate(execution.entryTime) as Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ) : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                        {exitTime ? (
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                                <Calendar size={12} className="opacity-50" />
                                <span className="text-[10px] font-black">{exitTime.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {exitTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ) : (stageName === 'BASE' && isLegacyExecution && parseSafeDate(execution?.timestamp)) ? (
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                                <Calendar size={12} className="opacity-50" />
                                <span className="text-[10px] font-black">{(parseSafeDate(execution.timestamp) as Date).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {(parseSafeDate(execution.timestamp) as Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ) : <span className="text-slate-200">—</span>}
                    </td>
                    {isLabStaff && canEditProduction && (
                        <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                <button
                                    onClick={() => handleOpenEditExecution(item, sector, execution, null, stageName)}
                                    title="Editar ou registrar manualmente no setor"
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleClearStageExecution(item, sector, stageName)}
                                    disabled={isUpdatingStatus || (!finalStarted && !finalFinished && !execution?.stageTimes?.[stageName] && !execution)}
                                    title="Limpar etapa (remover entrada/saída e desconsiderar comissão)"
                                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                                        (finalStarted || finalFinished || execution?.stageTimes?.[stageName] || execution)
                                            ? 'text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer active:scale-95'
                                            : 'text-slate-200 cursor-not-allowed opacity-30'
                                    }`}
                                >
                                    <RotateCcw size={14} />
                                </button>
                            </div>
                        </td>
                    )}
                </tr>
            );
        });
    })}
</tbody>
                                </table>
                            </div>
                        );
                    })}

                    <div className="bg-white rounded-[24px] p-4 sm:p-6 shadow-sm border border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Clock size={16} /> Fluxo de Logística do Caso
                        </h3>
                        {(!job.sectorMovements || job.sectorMovements.length === 0) ? (
                            <div className="text-center py-6 text-slate-300 text-xs italic">Nenhuma movimentação para exibir.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...(job.sectorMovements || [])].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()).map((movement, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-700 text-xs uppercase tracking-tight truncate">{movement.sector}</p>
                                            <div className="mt-1 flex flex-col gap-0.5">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase"><span className="text-blue-500">E:</span> {new Date(movement.entryTime).toLocaleString()} ({movement.entryUserName})</p>
                                                {movement.exitTime && (
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase"><span className="text-orange-500">S:</span> {new Date(movement.exitTime).toLocaleString()} ({movement.exitUserName || '?'})</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`w-2 h-10 rounded-full shrink-0 ${movement.exitTime ? 'bg-slate-200' : 'bg-blue-500 animate-pulse'}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            ) : (
                <div className="bg-white p-12 md:p-20 rounded-[32px] border border-slate-100 shadow-sm text-center max-w-4xl mx-auto my-6 animate-in fade-in duration-300">
                    <Lock size={48} className="mx-auto text-slate-200 mb-4 shrink-0" />
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Produção Indisponível</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mt-2 text-sm font-medium">Este laboratório desabilitou o acompanhamento de etapas de produção para os dentistas.</p>
                </div>
            )
        )}

        {activeTab === 'CHAT' && showChatTab && (
            <div className="w-full animate-in fade-in zoom-in duration-300 pb-8">
                {job.chatEnabled || isLabStaff ? (
                    <div className="max-w-4xl mx-auto"><ChatSystem job={job} orgId={job.organizationId} /></div>
                ) : (
                    <div className="bg-white p-12 md:p-20 rounded-[32px] border border-slate-100 shadow-sm text-center">
                        <Lock size={48} className="mx-auto text-slate-200 mb-4 shrink-0" />
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Chat Indisponível</h3>
                        <p className="text-slate-400 max-w-sm mx-auto mt-2 text-sm font-medium">Este laboratório ainda não liberou o canal de chat para este trabalho.</p>
                    </div>
                )}
            </div>
        )}

      {showRouteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-4 sm:p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter"><Truck className="text-indigo-600" /> Confirmar Logística</h3>
                      <button onClick={() => setShowRouteModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data da Rota</label>
                          <input 
                              type="date" 
                              min={todayStr} 
                              value={routeDate} 
                              onChange={e => setRouteDate(e.target.value)} 
                              className="w-full px-4 py-2 border rounded-xl font-bold bg-slate-50 text-slate-800 text-xs" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Turno da Rota</label>
                          <select value={routeShift} onChange={e => setRouteShift(e.target.value as any)} className="w-full px-4 py-2 border rounded-xl bg-slate-50 font-black text-xs text-slate-800">
                              <option value="MORNING" disabled={routeDate === todayStr && isPast12PM}>
                                  Manhã {routeDate === todayStr && isPast12PM ? '(Indisponível após 12h)' : ''}
                              </option>
                              <option value="AFTERNOON">Tarde</option>
                          </select>
                          {routeDate === todayStr && isPast12PM && (
                              <p className="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                                  <Clock size={12} /> Após as 12:00, somente rotas do turno da TARDE podem ser selecionadas para hoje.
                              </p>
                          )}
                      </div>
                      {/* OPEN ROUTES FOR THIS DATE */}
                      {openRoutesForShift.length > 0 && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                              <p className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Truck size={14} className="text-blue-600" /> Rotas Abertas nesta Data:
                              </p>
                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                  {openRoutesForShift.map(r => (
                                      <button
                                          key={r.id}
                                          type="button"
                                          onClick={() => {
                                              setSelectedRouteId(r.id);
                                              setRouteDriver(r.driverName);
                                              setRouteShift(r.shift);
                                          }}
                                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                              selectedRouteId === r.id
                                                  ? 'bg-blue-600 text-white shadow-sm'
                                                  : 'bg-white text-slate-800 hover:bg-blue-100/50 border border-blue-100'
                                          }`}
                                      >
                                          <div className="flex items-center gap-2">
                                              <User size={14} />
                                              <span>{r.driverName} ({r.shift === 'MORNING' ? 'Manhã' : 'Tarde'})</span>
                                          </div>
                                          <span className="text-[10px] font-black uppercase opacity-90">
                                              {selectedRouteId === r.id ? 'Selecionada' : 'Usar esta rota'}
                                          </span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Motorista / Motoboy</label>
                          {couriers && couriers.filter(c => c.active).length > 0 ? (
                              <div className="space-y-2">
                                  <select 
                                      value={couriers.filter(c => c.active).map(c => c.name).includes(routeDriver) ? routeDriver : (routeDriver ? 'MANUAL' : '')} 
                                      onChange={e => {
                                          if (e.target.value === 'MANUAL') {
                                              setRouteDriver('');
                                              setSelectedRouteId('');
                                          } else {
                                              setRouteDriver(e.target.value);
                                              const matched = openRoutesForShift.find(r => r.driverName.trim().toLowerCase() === e.target.value.trim().toLowerCase() && r.shift === routeShift);
                                              if (matched) setSelectedRouteId(matched.id);
                                              else setSelectedRouteId('');
                                          }
                                      }} 
                                      className="w-full px-4 py-2 border rounded-xl bg-white font-bold text-slate-800 text-xs"
                                  >
                                      <option value="">-- Selecione o Motoboy --</option>
                                      {couriers.filter(c => c.active).map(c => (
                                          <option key={c.id} value={c.name}>{c.name} {c.vehicle ? `(${c.vehicle})` : ''}</option>
                                      ))}
                                      <option value="MANUAL">Outro (Digitar nome)</option>
                                  </select>
                                  {(!couriers.filter(c => c.active).map(c => c.name).includes(routeDriver) || routeDriver === '') && (
                                      <input 
                                          placeholder="Digite o nome do Motoboy" 
                                          value={routeDriver} 
                                          onChange={e => setRouteDriver(e.target.value)} 
                                          className="w-full px-4 py-2 border rounded-xl font-bold text-slate-800 text-xs" 
                                      />
                                  )}
                              </div>
                          ) : (
                              <input placeholder="Nome do Motoboy" value={routeDriver} onChange={e => setRouteDriver(e.target.value)} className="w-full px-4 py-2 border rounded-xl font-bold text-slate-800 text-xs bg-slate-50" />
                          )}
                      </div>
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observações de Entrega (Opcional)</label>
                          <textarea 
                              placeholder="Instruções adicionais para a entrega..."
                              value={routeObservations}
                              onChange={e => setRouteObservations(e.target.value)}
                              className="w-full px-4 py-2 border rounded-xl bg-white font-bold text-slate-800 text-xs resize-none h-20"
                          />
                      </div>
                      <button onClick={handleAddToRoute} disabled={isUpdatingStatus} className="w-full py-4 bg-indigo-600 text-white font-black text-xs rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 active:scale-95 transition-transform uppercase tracking-widest mt-2">
                          {isUpdatingStatus ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> ADICIONAR AO ROTEIRO</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: CANCELAR ENTREGA DO CASO */}
      {showCancelDeliveryModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="cancelDeliveryModal">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                          <XCircle className="text-rose-600" size={20} /> Cancelar Entrega do Caso
                      </h3>
                      <button onClick={() => setShowCancelDeliveryModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Descreva abaixo o motivo do cancelamento da entrega (ex: cliente ausente, endereço incorreto, chuva/atraso, remarcação). Este caso será removido da rota atual para poder ser alocado em uma outra rota.
                  </p>

                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motivo do Cancelamento *</label>
                      <textarea 
                          rows={3}
                          placeholder="Digite o motivo em detalhes..."
                          value={cancelDeliveryReason}
                          onChange={e => setCancelDeliveryReason(e.target.value)}
                          className="w-full px-3.5 py-2.5 border rounded-2xl bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                      />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                      <button 
                          type="button" 
                          onClick={() => setShowCancelDeliveryModal(false)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                      >
                          Voltar
                      </button>
                      <button 
                          type="button" 
                          onClick={handleConfirmCancelDelivery}
                          disabled={isCancellingDelivery || !cancelDeliveryReason.trim()}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                          {isCancellingDelivery ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                          <span>Confirmar Cancelamento</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
      {showRejectionModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="jobRejectionModal">
          <div className="bg-white rounded-[32px] p-4 sm:p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Justificativa da Recusa
              </h3>
              <button
                type="button"
                onClick={() => setShowRejectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-500 mb-4 leading-relaxed">
              {isRejectionRequisition
                ? "Por favor, preencha o motivo de recusar esta requisição online para que o dentista saiba o porquê e como corrigir."
                : "Informe o motivo para recusar ou cancelar esta Ordem de Serviço."
              }
            </p>

            <textarea
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              placeholder="Ex: Falta de modelo de gesso, moldagem com distorção no dente 14, arquivo STL corrompido, etc..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none mb-4"
              id="rejectionReasonInput"
            />

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRejectionModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-tight transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectionStatus}
                disabled={isUpdatingStatus}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-tight transition active:scale-95 shadow-md shadow-red-500/10 flex items-center gap-1.5 cursor-pointer"
                id="btnConfirmRejection"
              >
                {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

       {showReviewModal && job && (
         <LabServiceReviewModal 
           job={job}
           onClose={() => setShowReviewModal(false)}
           onSuccess={() => {
             setShowReviewModal(false);
           }}
         />
       )}

       {selectedAttachment && (
           <AttachmentPreviewModal 
               file={selectedAttachment}
               allAttachments={allAttachmentsForPreview}
               onClose={() => {
                   setSelectedAttachment(null);
                   setAllAttachmentsForPreview([]);
               }}
               onUpdateComment={handleUpdateAttachmentComment}
           />
       )}

       {isWebcamOpen && (
         <WebcamModal 
           title={`Foto do Caso #${job?.jobOrder || job?.id || ''}`}
           onClose={() => setIsWebcamOpen(false)}
           onCapture={(file) => {
             setSelectedFiles(prev => [...prev, file]);
             setIsWebcamOpen(false);
           }}
         />
        )}
      </div>
    </div>
  );
};

const ImageIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
