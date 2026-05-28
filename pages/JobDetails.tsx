
import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole, JobItem, LabRating, Job, DeliveryRoute, Attachment, JobNature, JobItemExecution, SectorMovement, CommissionStatus, JobProduct } from '../types';
import { 
  ArrowLeft, Calendar, User, Clock, MapPin, Camera as CameraIcon,
  FileText, DollarSign, CheckCircle, AlertTriangle, 
  Printer, Box, Layers, ListChecks, Bell, Edit, Save, X, Plus, Trash2, Settings,
  LogIn, LogOut, Flag, CheckSquare, File as FileIcon, Download, Loader2, CreditCard, ExternalLink, Copy, Check, Star, UploadCloud, ChevronDown, CheckCircle2, Truck, Navigation, RotateCcw, MessageCircle, MessageSquare, Lock, Crown, FileCode, FileSpreadsheet, FileWarning, XCircle, ArrowLeftCircle, ScanBarcode, Briefcase, Search, ArrowRightCircle, RefreshCw, Edit3, Package
} from 'lucide-react';
import { CreateAlertModal } from '../components/AlertSystem';
import { ChatSystem } from '../components/ChatSystem';
import { smartCompress } from '../services/compressionService';
import * as api from '../services/firebaseService';
import * as firestorePkg from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const { doc, onSnapshot } = firestorePkg as any;

const STLViewer = React.lazy(() => import('../components/STLViewer').then(module => ({ default: module.STLViewer })));

export const JobDetails = () => {
  const { id } = useParams();
  const { jobs, updateJob, triggerPrint, currentUser, jobTypes, sectors, uploadFile, addJobToRoute, currentOrg, allUsers, manualDentists, priceTables, inventoryItems } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'HISTORY' | 'CHAT' | 'PRODUCTION'>('SUMMARY');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDentistId, setEditDentistId] = useState('');
  const [editDentistName, setEditDentistName] = useState('');
  const [dentistSearchQuery, setDentistSearchQuery] = useState('');
  const [showDentistSuggestions, setShowDentistSuggestions] = useState(false);
  const [selectedDentistObj, setSelectedDentistObj] = useState<any>(null);
  
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [editingExecution, setEditingExecution] = useState<{
      item: JobItem,
      sector: string,
      userId: string,
      entryTime: string,
      exitTime: string,
      originalExecution?: JobItemExecution | null,
      originalMovement?: SectorMovement | null
  } | null>(null);

  const { commissions, addCommissionRecord, deleteCommissionRecord, updateCommissionRecord, updateJobType } = useApp(); // Wait, let's just get what's missing if not already destructured
  const labUsers = useMemo(() => allUsers.filter(u => u.role !== UserRole.CLIENT), [allUsers]);

  const [showRouteModal, setShowRouteModal] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [expandedItemIdx, setExpandedItemIdx] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemEditForm, setItemEditForm] = useState<{
    quantity: number;
    price: number;
    appliedDiscount: number;
    appliedPriceTable: string;
    commissionDisabled: boolean;
    selectedVariationIds: string[];
    variationValues: Record<string, string>;
    sectorCommissionDisabled: Record<string, boolean>;
  }>({ quantity: 1, price: 0, appliedDiscount: 0, appliedPriceTable: 'Padrão', commissionDisabled: false, selectedVariationIds: [], variationValues: {}, sectorCommissionDisabled: {} });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  const [routeInfo, setRouteInfo] = useState<DeliveryRoute | null>(null);
  const [routeDriver, setRouteDriver] = useState('');
  const [routeShift, setRouteShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);

  const [showReturnModal, setShowReturnModal] = useState(false);

  const job = jobs.find(j => j.id === id);

  const handleReturnAction = (action: 'PROSSEGUIMENTO' | 'AJUSTE' | 'REPETICAO') => {
    if (!job) return;
    
    // Auto-generate next sequence for OS
    const baseOs = (job.osNumber || 'RET').split('-')[0];
    const baseJobs = jobs.filter(j => (j.osNumber || '').startsWith(baseOs));
    let nextSeq = 1;
    baseJobs.forEach(j => {
        const jOs = j.osNumber || '';
        if (jOs.includes('-')) {
            const seq = parseInt(jOs.split('-')[1]);
            if (!isNaN(seq) && seq >= nextSeq) {
                nextSeq = seq + 1;
            }
        }
    });
    const nextOsNumber = `${baseOs}-${nextSeq}`;

    if (action === 'PROSSEGUIMENTO') {
        navigate('/new-job', {
            state: {
                entryType: 'CONTINUATION',
                patientName: job.patientName,
                dentistId: job.dentistId,
                dentistName: job.dentistName,
                osNumber: nextOsNumber
            }
        });
    } else {
        const newItems = job.items.map(item => ({
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
                osNumber: nextOsNumber,
                items: newItems
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

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isManager = currentUser?.role === UserRole.MANAGER;
  const isTech = currentUser?.role === UserRole.COLLABORATOR;
  const isClient = currentUser?.role === UserRole.CLIENT;
  const isLabStaff = isAdmin || isManager || isTech;
  const canEdit = isAdmin || isManager || (isTech && currentUser?.permissions?.includes('jobs:edit'));
  const canManageCommissions = isAdmin || isManager || (isTech && currentUser?.permissions?.includes('commissions:edit'));

  const [editPatientName, setEditPatientName] = useState('');
  const [editOsNumber, setEditOsNumber] = useState('');
  const [editBoxNumber, setEditBoxNumber] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editTotalValue, setEditTotalValue] = useState<number>(0);
  const [editUrgency, setEditUrgency] = useState<UrgencyLevel>(UrgencyLevel.NORMAL);
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<JobItem[]>([]);
  const [editProducts, setEditProducts] = useState<JobProduct[]>([]);
  const [newItemTypeId, setNewItemTypeId] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemNature, setNewItemNature] = useState<JobNature>('NORMAL');
  const [newItemVariationIds, setNewItemVariationIds] = useState<string[]>([]);
  
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [productManualPrice, setProductManualPrice] = useState<number | null>(null);
  const [productDiscountPercent, setProductDiscountPercent] = useState(0);

  const connectedDentists = useMemo(() => allUsers.filter(u => u.role === UserRole.CLIENT), [allUsers]);

  const suggestions = useMemo(() => {
    if (!dentistSearchQuery) return [];
    const query = dentistSearchQuery.toLowerCase();
    const online = connectedDentists.map(d => ({ ...d, type: 'ONLINE' }));
    const offline = manualDentists.map(d => ({ ...d, type: 'OFFLINE' }));
    return [...online, ...offline].filter(d => 
        d.name.toLowerCase().includes(query) || (d.clinicName && d.clinicName.toLowerCase().includes(query))
    ).slice(0, 8); 
  }, [dentistSearchQuery, connectedDentists, manualDentists]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDentistSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectDentist = (dentist: any) => {
    setEditDentistId(dentist.id);
    setEditDentistName(dentist.name);
    setDentistSearchQuery(dentist.name);
    setSelectedDentistObj(dentist.type === 'ONLINE' ? dentist : null);
    setShowDentistSuggestions(false);
  };

  const handleManualDentistEntry = () => {
    setEditDentistId('manual-entry');
    setEditDentistName(dentistSearchQuery);
    setSelectedDentistObj(null);
    setShowDentistSuggestions(false);
  };

  useEffect(() => {
    if (job) {
        setEditPatientName(job.patientName || '');
        setEditOsNumber(job.osNumber || '');
        setEditBoxNumber(job.boxNumber || '');
        setEditDueDate(new Date(job.dueDate).toISOString().split('T')[0]);
        setEditDueTime(job.dueTime || '');
        setEditTotalValue(job.totalValue || 0);
        setEditUrgency(job.urgency);
        setEditNotes(job.notes || '');
        setEditItems(job.items);
        setEditProducts(job.products || []);
        setEditDentistId(job.dentistId || '');
        setEditDentistName(job.dentistName || '');
        setDentistSearchQuery(job.dentistName || '');
        if (jobTypes.length > 0) setNewItemTypeId(jobTypes[0].id);
    }
  }, [job, jobTypes]);

  if (!job) return <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6"><h2 className="text-xl font-bold text-slate-800">Trabalho não encontrado</h2><button onClick={() => navigate('/jobs')} className="mt-4 text-blue-600 font-bold hover:underline">Voltar para lista</button></div>;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setSelectedFiles(Array.from(e.target.files));
      }
  };

  const handleTakePhoto = async () => {
    if (!job || !currentUser) return;
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Anexar Foto',
        promptLabelPhoto: 'Escolher da Galeria',
        promptLabelPicture: 'Tirar Foto'
      });

      if (image.base64String) {
        setIsUploadingFiles(true);
        setUploadProgressMsg('Enviando foto...');
        
        const byteCharacters = atob(image.base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: `image/${image.format}` });
        const file = new File([blob], `photo_${Date.now()}.${image.format}`, { type: `image/${image.format}` });
        
        const url = await uploadFile(file);
        
        const newAttachment: Attachment = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: url,
            uploadedAt: new Date()
        };

        const updatedAttachments = [...(job.attachments || []).filter(Boolean), newAttachment];
        await updateJob(job.id, { 
            attachments: updatedAttachments,
            history: [...(job.history || []).filter(Boolean), {
                id: `hist_photo_${Date.now()}`,
                timestamp: new Date(),
                action: `Foto anexada ao caso via câmera`,
                userId: currentUser.id,
                userName: currentUser.name
            }]
        });

        setUploadProgressMsg('');
        alert("Foto anexada!");
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      if (error instanceof Error && error.message !== 'User cancelled photos app') {
        alert('Erro ao acessar a câmera.');
      }
    } finally {
      setIsUploadingFiles(false);
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

  const handleAddItemToJob = () => {
      const type = jobTypes.find(t => t.id === newItemTypeId);
      if (!type) return;
      const newItem: JobItem = {
          id: `item_edit_${Date.now()}`,
          jobTypeId: type.id,
          name: type.name,
          quantity: newItemQty,
          price: type.basePrice,
          selectedVariationIds: newItemVariationIds,
          nature: newItemNature
      };
      const newItems = [...editItems, newItem];
      setEditItems(newItems);
      const productsTotal = (job.products || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0);
      setEditTotalValue(newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + productsTotal);
      setNewItemNature('NORMAL');
      setNewItemVariationIds([]);
  };

  const handleRemoveItemFromJob = (itemId: string) => {
      const newItems = editItems.filter(i => i.id !== itemId);
      setEditItems(newItems);
      const productsTotal = (job.products || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0);
      setEditTotalValue(newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + productsTotal);
  };

  const handleRemoveProductFromJob = (prodId: string) => {
      const newProds = editProducts.filter(p => p.id !== prodId);
      setEditProducts(newProds);
      const itemsTotal = editItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      setEditTotalValue(itemsTotal + newProds.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0));
  };

  const handleProductChange = (prodId: string, field: 'quantity' | 'basePriceBeforeDiscount' | 'appliedDiscount', value: number) => {
      const newProds = editProducts.map(p => {
          if (p.id === prodId) {
              const basePrice = field === 'basePriceBeforeDiscount' ? value : (p.basePriceBeforeDiscount ?? p.unitPrice);
              const appliedDiscount = field === 'appliedDiscount' ? value : (p.appliedDiscount || 0);
              const quantity = field === 'quantity' ? value : p.quantity;
              
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
      setEditTotalValue(itemsTotal + newProds.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0));
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
      if (!isLabStaff) return;
      const newState = !job.chatEnabled;
      await updateJob(job.id, { chatEnabled: newState });
  };

  const handleSaveChanges = async () => {
    if (!currentUser || !job) return;
    setIsUpdatingStatus(true);
    try {
        const dateParts = editDueDate.split('-');
        const adjustedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        
        const changes: string[] = [];
        if (editPatientName !== job.patientName) changes.push(`- Paciente: ${job.patientName} -> ${editPatientName}`);
        if (editOsNumber !== job.osNumber) changes.push(`- OS: ${job.osNumber} -> ${editOsNumber}`);
        if (editBoxNumber !== job.boxNumber) changes.push(`- Caixa: ${job.boxNumber} -> ${editBoxNumber}`);
        
        const oldDate = new Date(job.dueDate).toISOString().split('T')[0];
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
            boxNumber: editBoxNumber,
            dueDate: adjustedDate,
            dueTime: editDueTime,
            urgency: editUrgency,
            notes: editNotes,
            items: editItems,
            products: editProducts,
            totalValue: editTotalValue,
            history: [...(job.history || []).filter(Boolean), {
                id: `hist_edit_${Date.now()}`,
                timestamp: new Date(),
                action: actionText,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Gestão'
            }]
        });
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
    setIsUpdatingStatus(true);
    try {
        await addJobToRoute(job, routeDriver, routeShift, new Date(routeDate));
        setShowRouteModal(false);
    } catch (err) {
        alert("Erro ao adicionar à rota.");
    } finally { setIsUpdatingStatus(false); }
  };

  const handleQuickStatusUpdate = async (newStatus: JobStatus) => {
    if (!currentUser || isUpdatingStatus) return;

    // New check: Is the dentist blocked?
    const dentist = allUsers.find(u => u.id === job?.dentistId) || manualDentists.find(d => d.id === job?.dentistId);
    if (dentist?.isBlocked && (newStatus === JobStatus.COMPLETED || newStatus === JobStatus.DELIVERED)) {
        alert("Este cliente está BLOQUEADO por limite de fatura. Não é possível CONCLUIR ou ENTREGAR trabalhos até que a pendência seja resolvida.");
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
  const isFinished = job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED;
  const canFinalize = isLabStaff && !isFinished && job.status !== JobStatus.REJECTED && job.status !== JobStatus.CANCELED && job.status !== JobStatus.RETURNED;
  const canCancelOrReturn = (isAdmin || isManager) && job.status !== JobStatus.CANCELED && job.status !== JobStatus.RETURNED && job.status !== JobStatus.DELIVERED;
  const canReopen = isLabStaff && (job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED || job.status === JobStatus.RETURNED);

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

  const handleOpenEditExecution = (item: JobItem, sector: string, execution?: JobItemExecution | null, latestMov?: SectorMovement | null) => {
      setEditingExecution({
          item,
          sector,
          userId: execution ? execution.userId : '',
          entryTime: latestMov ? new Date(latestMov.entryTime.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
          exitTime: execution ? new Date(execution.timestamp.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
          originalExecution: execution,
          originalMovement: latestMov
      });
      setShowExecutionModal(true);
  };

  const handleSaveExecutionEdit = async () => {
      if (!editingExecution || !job) return;
      if (!editingExecution.userId) return alert('Selecione um funcionário');

      setIsUpdatingStatus(true);
      try {
          // Prepare new sectorMovements
          let newMovements = [...(job.sectorMovements || [])];
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

          // Prepare new itemExecutions
          let newExecutions = [...(job.itemExecutions || [])];
          if (editingExecution.originalExecution) {
              const idx = newExecutions.findIndex(e => e.itemId === editingExecution.item.id && e.sector === editingExecution.sector);
              if (idx !== -1 && editingExecution.exitTime) {
                  newExecutions[idx] = {
                      ...newExecutions[idx],
                      userId: editingExecution.userId,
                      userName: labUsers.find(u => u.id === editingExecution.userId)?.name || '',
                      timestamp: new Date(editingExecution.exitTime)
                  };
              } else if (idx !== -1 && !editingExecution.exitTime) {
                  newExecutions.splice(idx, 1);
              }
          } else if (editingExecution.exitTime) {
              const jt = jobTypes.find(t => t.id === editingExecution.item.jobTypeId);
              newExecutions.push({
                  itemId: editingExecution.item.id,
                  jobTypeId: editingExecution.item.jobTypeId,
                  jobTypeName: jt?.name || '',
                  sector: editingExecution.sector,
                  userId: editingExecution.userId,
                  userName: labUsers.find(u => u.id === editingExecution.userId)?.name || '',
                  timestamp: new Date(editingExecution.exitTime)
              });
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

          await updateJob(job.id, {
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
          
          job.items.forEach(item => {
              if (userItemsInSector.includes(item.id) && !item.commissionDisabled) {
                  const secQty = (item.sectorQuantities && item.sectorQuantities[editingExecution.sector]) ? item.sectorQuantities[editingExecution.sector] : item.quantity;
                  const setting = selectedUser?.commissionSettings?.find((s: any) => s.jobTypeId === item.jobTypeId);
                  if (setting) {
                      if (setting.type === 'FIXED') totalUserComm += setting.value * secQty;
                      else totalUserComm += (item.price * secQty * (setting.value / 100));
                  } else {
                      const jt = jobTypes.find(t => t.id === item.jobTypeId);
                      if (jt?.baseCommission) totalUserComm += jt.baseCommission * secQty;
                  }
              }
          });

          const existingComm = commissions.find(c => c.jobId === job.id && c.sector === editingExecution.sector && c.userId === editingExecution.userId);
          if (totalUserComm > 0) {
              if (existingComm) {
                  await updateCommissionRecord(existingComm.id, {
                      amount: totalUserComm,
                      createdAt: editingExecution.exitTime ? new Date(editingExecution.exitTime) : existingComm.createdAt
                  });
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
          } else if (existingComm) {
              await deleteCommissionRecord(existingComm.id);
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
          const executionToDelete = (job.itemExecutions || []).find(e => e.itemId === item.id && e.sector === sector);
          const newExecutions = (job.itemExecutions || []).filter(e => !(e.itemId === item.id && e.sector === sector));
          const newMovements = (job.sectorMovements || []).filter(m => m.sector !== sector);
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
              const userItemsInSector = newExecutions.filter(e => e.userId === executionToDelete.userId && e.sector === sector).map(e => e.itemId);
              let totalUserComm = 0;
              const selectedUser = labUsers.find(u => u.id === executionToDelete.userId);
              
              job.items.forEach(i => {
                  if (userItemsInSector.includes(i.id) && !i.commissionDisabled) {
                      const secQty = (i.sectorQuantities && i.sectorQuantities[sector]) ? i.sectorQuantities[sector] : i.quantity;
                      const setting = selectedUser?.commissionSettings?.find((s: any) => s.jobTypeId === i.jobTypeId);
                      if (setting) {
                          if (setting.type === 'FIXED') totalUserComm += setting.value * secQty;
                          else totalUserComm += (i.price * secQty * (setting.value / 100));
                      } else {
                          const jt = jobTypes.find(t => t.id === i.jobTypeId);
                          if (jt?.baseCommission) totalUserComm += jt.baseCommission * secQty;
                      }
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

  const handleSectorQuantityChange = async (itemId: string, sectorName: string, newQty: number) => {
      if (!canManageCommissions) return;
      const updatedItems = job.items.map(item => {
          if (item.id === itemId) {
              const currentQuantities = item.sectorQuantities || {};
              return {
                  ...item,
                  sectorQuantities: {
                      ...currentQuantities,
                      [sectorName]: newQty
                  }
              };
          }
          return item;
      });

      await updateJob(job.id, { items: updatedItems });
  };

  const handleSectorCommissionToggle = async (itemId: string, sectorName: string, disabled: boolean) => {
      if (!canManageCommissions) return;
      const updatedItems = job.items.map(item => {
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
  };

  const startEditingItem = (item: JobItem) => {
      setEditingItemId(item.id);
      setItemEditForm({
          quantity: item.quantity,
          price: item.basePriceBeforeDiscount ?? item.price,
          appliedDiscount: item.appliedDiscount || 0,
          appliedPriceTable: item.appliedPriceTable || 'Padrão',
          commissionDisabled: item.commissionDisabled || false,
          selectedVariationIds: item.selectedVariationIds || [],
          variationValues: item.variationValues || {},
          sectorCommissionDisabled: item.sectorCommissionDisabled || {}
      });
  };

  const cancelEditingItem = () => {
      setEditingItemId(null);
  };

  const handleSaveItemEdit = async (item: JobItem) => {
      const newBasePrice = itemEditForm.price;
      const finalPrice = newBasePrice * (1 - (itemEditForm.appliedDiscount / 100));
      
      const updatedItems = job.items.map(i => {
          if (i.id === item.id) {
              return {
                  ...i,
                  quantity: itemEditForm.quantity,
                  price: finalPrice,
                  basePriceBeforeDiscount: newBasePrice,
                  appliedDiscount: itemEditForm.appliedDiscount,
                  appliedPriceTable: itemEditForm.appliedPriceTable,
                  commissionDisabled: itemEditForm.commissionDisabled,
                  selectedVariationIds: itemEditForm.selectedVariationIds,
                  variationValues: itemEditForm.variationValues,
                  sectorCommissionDisabled: itemEditForm.sectorCommissionDisabled
              };
          }
          return i;
      });

      const productsTotal = (job.products || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0);
      const newTotalValue = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + productsTotal;

      await updateJob(job.id, { 
          items: updatedItems,
          totalValue: newTotalValue,
          history: [...(job.history || []).filter(Boolean), {
              id: `hist_item_edit_${Date.now()}`,
              timestamp: new Date(),
              action: `Item "${item.name}" editado (Qtd: ${itemEditForm.quantity}, Total: R$ ${(finalPrice * itemEditForm.quantity).toFixed(2)})`,
              userId: currentUser?.id || '',
              userName: currentUser?.name || 'Sistema',
              sector: currentUser?.sector || 'Gestão'
          }]
      });

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

  const showChatTab = isLabStaff || (isClient && job.chatEnabled);

  return (
    <div className="w-full space-y-4 md:space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      
      {show3DViewer && job.attachments && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Carregando 3D...</div>}>
              <STLViewer files={job.attachments} onClose={() => setShow3DViewer(false)} />
          </Suspense>
      )}

      {showAlertModal && <CreateAlertModal job={job} onClose={() => setShowAlertModal(false)} />}
      
      {/* MODAL RETORNO */}
      {showReturnModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full text-center animate-in zoom-in duration-300 shadow-2xl">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RefreshCw size={32} className="text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Cadastrar Retorno</h3>
                  <p className="text-sm text-slate-500 font-bold mb-8">O que deseja fazer com esta Ordem de Serviço?</p>
                  
                  <div className="grid grid-cols-1 gap-3">
                      <button onClick={() => { setShowReturnModal(false); handleReturnAction('PROSSEGUIMENTO'); }} className="w-full p-4 border-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-2xl font-black uppercase flex items-center justify-between group transition-all">
                          <div className="flex items-center gap-3">
                              <ArrowRightCircle size={20} className="text-indigo-500" />
                              <div className="text-left">
                                  <div className="text-sm">Prosseguimento</div>
                                  <div className="text-[10px] text-indigo-400 font-bold tracking-widest mt-0.5">Criar OS limpa para a próxima fase</div>
                              </div>
                          </div>
                      </button>

                      <button onClick={() => { setShowReturnModal(false); handleReturnAction('REPETICAO'); }} className="w-full p-4 border-2 border-red-100 bg-red-50/50 hover:bg-red-50 text-red-700 rounded-2xl font-black uppercase flex items-center justify-between group transition-all">
                          <div className="flex items-center gap-3">
                              <RotateCcw size={20} className="text-red-500" />
                              <div className="text-left">
                                  <div className="text-sm">Repetição</div>
                                  <div className="text-[10px] text-red-400 font-bold tracking-widest mt-0.5">Copiar OS com itens de repetição</div>
                              </div>
                          </div>
                      </button>

                      <button onClick={() => { setShowReturnModal(false); handleReturnAction('AJUSTE'); }} className="w-full p-4 border-2 border-orange-100 bg-orange-50/50 hover:bg-orange-50 text-orange-700 rounded-2xl font-black uppercase flex items-center justify-between group transition-all">
                          <div className="flex items-center gap-3">
                              <Edit3 size={20} className="text-orange-500" />
                              <div className="text-left">
                                  <div className="text-sm">Ajuste</div>
                                  <div className="text-[10px] text-orange-400 font-bold tracking-widest mt-0.5">Copiar OS com itens para ajuste</div>
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

      {/* MODAL EXECUTION EDIT */}
      {showExecutionModal && editingExecution && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                          <Settings className="text-slate-400" />
                          Registro
                      </h3>
                      <button onClick={() => setShowExecutionModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest pl-2">Setor</label>
                          <div className="w-full bg-slate-50 text-slate-600 p-3 rounded-xl border border-slate-200 font-bold">{editingExecution.sector}</div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black uppercase text-blue-500 mb-1 tracking-widest pl-2">Funcionário</label>
                          <select
                              value={editingExecution.userId}
                              onChange={e => setEditingExecution({ ...editingExecution, userId: e.target.value })}
                              className="w-full bg-white border-2 border-blue-100 text-blue-900 rounded-xl p-3 font-bold focus:ring-0 focus:border-blue-400"
                          >
                              <option value="">Selecione...</option>
                              {labUsers.filter(u => u.sector === editingExecution.sector || u.id === editingExecution.userId).map(u => (
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

                  <div className="mt-8 flex gap-3">
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

      {/* MODAL EDITAR - Mobile Responsive */}
      {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
              <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2"><Edit className="text-blue-600" /> Editar Ordem</h3>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2 relative" ref={dropdownRef}>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dentista / Clínica</label>
                              <div className="relative">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                      <Search size={18} />
                                  </div>
                                  <input 
                                      type="text" 
                                      value={dentistSearchQuery} 
                                      onChange={e => { setDentistSearchQuery(e.target.value); setShowDentistSuggestions(true); }}
                                      onFocus={() => setShowDentistSuggestions(true)}
                                      placeholder="Buscar dentista ou clínica..."
                                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-all"
                                  />
                              </div>

                              {showDentistSuggestions && (
                                  <div className="absolute z-[110] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                      <div className="p-2 bg-slate-50 border-b flex justify-between items-center">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Sugestões</span>
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
                                                      {d.type === 'ONLINE' && <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">Online</span>}
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
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Paciente</label>
                              <input type="text" value={editPatientName} onChange={e => setEditPatientName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nº OS</label>
                              <input type="text" value={editOsNumber} onChange={e => setEditOsNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Caixa</label>
                              <input type="text" value={editBoxNumber} onChange={e => setEditBoxNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor Total (R$)</label>
                              <input type="number" step="0.01" value={editTotalValue} onChange={e => setEditTotalValue(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nova Entrega</label>
                              <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hora da Entrega</label>
                              <input type="time" value={editDueTime} onChange={e => setEditDueTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prioridade</label>
                              <select value={editUrgency} onChange={e => setEditUrgency(e.target.value as UrgencyLevel)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                                  <option value={UrgencyLevel.LOW}>Baixa</option>
                                  <option value={UrgencyLevel.NORMAL}>Normal</option>
                                  <option value={UrgencyLevel.HIGH}>Alta</option>
                                  <option value={UrgencyLevel.VIP}>VIP / Urgente</option>
                              </select>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Itens da OS</h4>
                          <div className="space-y-2">
                              {editItems.map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex flex-col min-w-0 mr-2">
                                          <div className="text-xs font-bold text-slate-700 truncate">{item.quantity}x {item.name}</div>
                                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{item.nature === 'REPETITION' ? 'REPETIÇÃO' : item.nature === 'ADJUSTMENT' ? 'AJUSTE' : 'NORMAL'}</div>
                                      </div>
                                      <button onClick={() => handleRemoveItemFromJob(item.id)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={16}/></button>
                                  </div>
                              ))}
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
                                                  <input type="number" min="1" value={prod.quantity} onChange={(e) => handleProductChange(prod.id, 'quantity', Number(e.target.value))} className="w-full text-xs font-bold p-1.5 bg-white border border-amber-200 rounded outline-none" />
                                              </div>
                                              <div className="flex-[1.5]">
                                                  <label className="text-[9px] font-black text-slate-500 uppercase">Val. Unit</label>
                                                  <input type="number" step="0.01" value={prod.basePriceBeforeDiscount ?? prod.unitPrice} onChange={(e) => handleProductChange(prod.id, 'basePriceBeforeDiscount', parseFloat(e.target.value) || 0)} className="w-full text-xs font-bold p-1.5 bg-white border border-amber-200 rounded outline-none" />
                                              </div>
                                              <div className="flex-[1.5]">
                                                  <label className="text-[9px] font-black text-slate-500 uppercase">Desc (%)</label>
                                                  <input type="number" step="0.01" max="100" min="0" value={prod.appliedDiscount || 0} onChange={(e) => handleProductChange(prod.id, 'appliedDiscount', parseFloat(e.target.value) || 0)} className="w-full text-xs font-bold p-1.5 bg-white border border-amber-200 rounded outline-none" />
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

                          <div className="flex flex-col gap-2 pt-2 border-b border-slate-100 pb-4">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                                  Novo Serviço
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                  <div className="flex-1 min-w-[150px]">
                                      <select value={newItemTypeId} onChange={e => setNewItemTypeId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                                          {jobTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                      </select>
                                  </div>
                                  <div className="w-16">
                                      <input type="number" value={newItemQty} onChange={e => setNewItemQty(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center" />
                                  </div>
                                  <button onClick={handleAddItemToJob} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shrink-0 shadow-md"><Plus size={18}/></button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  <button onClick={() => setNewItemNature('NORMAL')} className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${newItemNature === 'NORMAL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>Normal</button>
                                  <button onClick={() => setNewItemNature('REPETITION')} className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${newItemNature === 'REPETITION' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>Repetição</button>
                                  <button onClick={() => setNewItemNature('ADJUSTMENT')} className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${newItemNature === 'ADJUSTMENT' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>Ajuste</button>
                              </div>
                              {(() => {
                                  const type = jobTypes.find(t => t.id === newItemTypeId);
                                  if (!type || !type.variationGroups || type.variationGroups.length === 0) return null;
                                  return (
                                      <div className="grid grid-cols-1 gap-3 mt-2">
                                          {type.variationGroups.map(group => (
                                              <div key={group.id} className="space-y-1">
                                                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{group.name}</h4>
                                                  <div className="flex flex-wrap gap-1.5">
                                                      {group.options.map(option => {
                                                          const isSelected = newItemVariationIds.includes(option.id);
                                                          return (
                                                              <button 
                                                                  key={option.id} 
                                                                  type="button" 
                                                                  onClick={() => {
                                                                      let newSelected = [...newItemVariationIds];
                                                                      if (group.selectionType === 'SINGLE') {
                                                                          newSelected = newSelected.filter(id => !group.options.find(o => o.id === id));
                                                                          if (!isSelected) newSelected.push(option.id);
                                                                      } else {
                                                                          if (isSelected) newSelected = newSelected.filter(id => id !== option.id);
                                                                          else newSelected.push(option.id);
                                                                      }
                                                                      setNewItemVariationIds(newSelected);
                                                                  }} 
                                                                  className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-400'}`}
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
                          </div>
                      
                          <div className="pt-2">
                              <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto / Implante</h4>
                                  <button type="button" onClick={() => setIsAddingProduct(!isAddingProduct)} className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${isAddingProduct ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                                      {isAddingProduct ? 'Cancelar' : '+ Add Produto'}
                                  </button>
                              </div>

                              {isAddingProduct && (
                                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-3 mb-3">
                                      <div className="space-y-1">
                                          <select value={selectedProductId} onChange={e => {
                                              setSelectedProductId(e.target.value);
                                              const prod = inventoryItems.find(i => i.id === e.target.value);
                                              if (prod) setProductManualPrice(prod.sellPrice);
                                          }} className="w-full p-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                              <option value="">Selecione um item no estoque...</option>
                                              {inventoryItems.map(item => (
                                                  <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                                                      {item.name} ({item.currentStock > 0 ? `${item.currentStock} un.` : 'Sem Estoque'})
                                                  </option>
                                              ))}
                                          </select>
                                      </div>
                                      <div className="flex gap-2">
                                          <div className="flex-1">
                                              <label className="text-[9px] font-black text-slate-500 uppercase">Qtd</label>
                                              <input type="number" min="1" value={productQuantity} onChange={e => setProductQuantity(Number(e.target.value))} className="w-full text-xs font-bold p-1.5 bg-white border border-slate-200 rounded outline-none" />
                                          </div>
                                          <div className="flex-[1.5]">
                                              <label className="text-[9px] font-black text-slate-500 uppercase">Val. Unit</label>
                                              <input type="number" step="0.01" value={productManualPrice !== null ? productManualPrice : ''} onChange={e => setProductManualPrice(Number(e.target.value))} className="w-full text-xs font-bold p-1.5 bg-white border border-slate-200 rounded outline-none" />
                                          </div>
                                          <div className="flex-[1.5]">
                                              <label className="text-[9px] font-black text-slate-500 uppercase">Desc (%)</label>
                                              <input type="number" step="0.01" min="0" max="100" value={productDiscountPercent} onChange={e => setProductDiscountPercent(Number(e.target.value))} className="w-full text-xs font-bold p-1.5 bg-white border border-slate-200 rounded outline-none" />
                                          </div>
                                          <div className="pt-4 shrink-0">
                                            <button type="button" onClick={handleAddProductToJob} disabled={!selectedProductId} className="h-[28px] px-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"><Check size={14}/></button>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações Técnicas</label>
                          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" placeholder="Novas instruções..."></textarea>
                      </div>
                  </div>
                  <div className="p-4 md:p-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
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
          <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest transition-colors"><ArrowLeft size={16} /> Lista</button>
          <div className="flex flex-wrap gap-2 w-full xs:w-auto">
              {canReopen && (
                  <>
                    <button onClick={() => setShowReturnModal(true)} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-100 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest transition-all">
                        <Plus size={12} /> CADASTRAR RETORNO
                    </button>
                    <button onClick={handleReopenJob} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg hover:bg-amber-100 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest transition-all">
                      {isUpdatingStatus ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} REABRIR
                    </button>
                  </>
              )}
              {!isClient && job.status !== JobStatus.REJECTED && (
                  <>
                      <button onClick={() => triggerPrint(job, 'SHEET')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> A4</button>
                      <button onClick={() => triggerPrint(job, 'LABEL')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> Etiquetas</button>
                      <button onClick={() => triggerPrint(job, 'ADDRESS_LABEL')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><MapPin size={12} /> Endereço</button>
                  </>
              )}
          </div>
      </div>

      {/* CARD PRINCIPAL INFO - Mobile Resilient */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8 relative overflow-hidden shrink-0">
         <div className={`absolute top-0 left-0 w-1.5 md:w-2 h-full ${job.urgency === UrgencyLevel.VIP ? 'bg-orange-500' : 'bg-blue-600'}`} />
         <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="font-mono font-black text-2xl md:text-3xl text-slate-900 tracking-tight shrink-0">OS #{job.osNumber || '---'}</span>
                    <div className="relative group shrink-0">
                        <button className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 ${getStatusColor(job.status)} shadow-sm`}>
                            {getTranslatedStatus(job.status)} <ChevronDown size={10}/>
                        </button>
                        {!isClient && (
                            <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] hidden group-hover:block animate-in fade-in slide-in-from-top-2 overflow-hidden">
                                <div className="p-1.5 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b">Alterar Status</div>
                                <div className="p-1 space-y-0.5">
                                    {Object.values(JobStatus).map(s => (
                                        <button key={s} onClick={() => handleQuickStatusUpdate(s)} className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors">{getTranslatedStatus(s)}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 shadow-sm ${
                        job.urgency === UrgencyLevel.VIP ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        job.urgency === UrgencyLevel.HIGH ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                        {job.urgency === UrgencyLevel.VIP ? <Crown size={10}/> : <AlertTriangle size={10}/>}
                        {job.urgency}
                    </div>
                    
                    {isLabStaff && (
                         <button 
                            onClick={handleToggleChat}
                            className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 transition-all shadow-sm ${job.chatEnabled ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                        >
                            <MessageSquare size={10}/> {job.chatEnabled ? 'CHAT ATIVO' : 'CHAT OFF'}
                        </button>
                    )}
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight uppercase truncate">{job.patientName}</h1>
                <div className="flex items-center gap-2 text-slate-500 mt-1 font-bold text-xs uppercase truncate"><User size={14} className="text-blue-500 shrink-0" /> Dr(a). {job.dentistName}</div>
            </div>
            
            <div className="flex flex-col xs:flex-row lg:flex-col lg:items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                <div className="lg:text-right shrink-0">
                    <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Previsão de Saída</p>
                    <div className="flex items-center lg:justify-end gap-1.5 text-sm md:text-lg font-black text-slate-800"><Calendar size={18} className="text-blue-600 shrink-0" /> {new Date(job.dueDate).toLocaleDateString()}</div>
                </div>
                
                <div className="flex flex-wrap gap-2 flex-1 lg:justify-end">
                    {isLabStaff && !isFinished && (
                        <button 
                            onClick={() => window.dispatchEvent(new CustomEvent('open-job-scanner-popup', { detail: { jobId: job.id } }))} 
                            className="flex-1 xs:flex-none px-4 py-2.5 bg-slate-800 text-white font-black text-[10px] rounded-xl hover:bg-slate-900 shadow-xl shadow-slate-200 flex items-center justify-center gap-2 uppercase tracking-widest transition-all transform active:scale-95"
                        >
                            <ScanBarcode size={16} /> LER CÓDIGO
                        </button>
                    )}
                    {canFinalize && (
                         <button onClick={handleFinalizeJob} disabled={isUpdatingStatus} className="flex-1 xs:flex-none px-4 py-2.5 bg-green-600 text-white font-black text-[10px] rounded-xl hover:bg-green-700 shadow-xl shadow-green-100 flex items-center justify-center gap-2 uppercase tracking-widest transition-all transform active:scale-95">
                            {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} FINALIZAR
                        </button>
                    )}
                    {isFinished && isLabStaff && !job.routeId && (
                        <button onClick={() => setShowRouteModal(true)} className="flex-1 xs:flex-none px-4 py-2.5 bg-indigo-600 text-white font-black text-[10px] rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 uppercase tracking-widest transition-all">
                            <Truck size={16} /> LOGÍSTICA
                        </button>
                    )}
                    {isLabStaff && (
                         <button onClick={() => setShowAlertModal(true)} className="flex-1 xs:flex-none px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-red-100">
                            <Bell size={16} /> Alerta
                        </button>
                    )}
                    {canEdit && (
                        <button onClick={() => setShowEditModal(true)} className="flex-1 xs:flex-none px-4 py-2.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-blue-100">
                            <Edit size={16} /> Editar
                        </button>
                    )}
                    {canCancelOrReturn && (
                        <>
                            <button onClick={handleReturnJob} disabled={isUpdatingStatus} className="flex-1 xs:flex-none px-4 py-2.5 bg-orange-50 border border-orange-100 text-orange-600 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-orange-100">
                                {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftCircle size={16} />} Devolver
                            </button>
                            <button onClick={handleCancelJob} disabled={isUpdatingStatus} className="flex-1 xs:flex-none px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-gray-100">
                                {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Cancelar
                            </button>
                        </>
                    )}
                </div>
            </div>
         </div>
      </div>

      {/* ABAS COM OVERFLOW AUTO */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 sticky top-0 md:top-16 bg-slate-50 z-20 w-full">
         <button onClick={() => setActiveTab('SUMMARY')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'SUMMARY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={16} /> Dados Básicos</button>
         <button onClick={() => setActiveTab('PRODUCTION')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'PRODUCTION' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Layers size={16} /> Produção</button>
         <button onClick={() => setActiveTab('HISTORY')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'HISTORY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Clock size={16} /> Histórico</button>
         {showChatTab && (
            <button onClick={() => setActiveTab('CHAT')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'CHAT' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <MessageCircle size={16} /> Chat
                {job.chatEnabled && isLabStaff && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></div>}
            </button>
         )}
      </div>

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {activeTab === 'SUMMARY' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 animate-in fade-in duration-300 w-full pb-8">
                {/* KPI BOXES - Responsive Layout */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
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
                    <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0"><MapPin size={24} /></div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Localização Atual</p>
                            <p className="font-black text-lg text-slate-800 uppercase truncate">{job.currentSector || 'Triagem'}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl shrink-0"><DollarSign size={24} /></div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Orçamento</p>
                            <p className="font-black text-lg text-slate-800">R$ {job.totalValue.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4 md:space-y-6 min-w-0">
                    {routeInfo && (
                        <div className="bg-indigo-50 rounded-[32px] shadow-sm border border-indigo-200 overflow-hidden animate-in slide-in-from-top-4">
                            <div className="bg-indigo-600 px-6 py-3 text-white flex justify-between items-center">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Truck size={18} className="shrink-0" />
                                    <h3 className="font-black text-[10px] uppercase tracking-widest truncate">Logística de Entrega</h3>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                                    routeInfo.status === 'COMPLETED' ? 'bg-green-500' : 
                                    routeInfo.status === 'IN_TRANSIT' ? 'bg-orange-500 animate-pulse' : 'bg-indigo-400'
                                }`}>
                                    {routeInfo.status}
                                </span>
                            </div>
                            <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 border border-indigo-100 shrink-0"><User size={24}/></div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Motorista</p>
                                        <p className="font-black text-indigo-900 text-base md:text-lg uppercase truncate">{routeInfo.driverName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 border border-indigo-100 shrink-0"><Navigation size={24}/></div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Agendamento</p>
                                        <p className="font-black text-indigo-900 text-sm md:text-base truncate">
                                            {new Date(routeInfo.date).toLocaleDateString()} • {routeInfo.shift}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tighter shrink-0"><FileText size={20} className="text-blue-500 shrink-0" /> Itens do Pedido</h3>
                        <div className="divide-y divide-slate-100">
                            {job.items.map((item, idx) => {
                                const jType = jobTypes.find(jt => jt.id === item.jobTypeId);
                                const allowedSecs = jType?.allowedSectors || [];
                                const isExpanded = expandedItemIdx === idx;
                                
                                return (
                                <div key={idx} className="py-4 flex flex-col min-w-0">
                                    <div 
                                      className="flex justify-between items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors"
                                      onClick={() => setExpandedItemIdx(isExpanded ? null : idx)}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-slate-800 text-sm md:text-base leading-tight truncate"><span className="text-blue-600 mr-1">{item.quantity}x</span> {item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest truncate">{item.nature === 'REPETITION' ? 'REPETIÇÃO' : item.nature === 'ADJUSTMENT' ? 'AJUSTE' : 'NORMAL'}</p>
                                                {(item.nature === 'REPETITION' || item.nature === 'ADJUSTMENT') && canManageCommissions && (
                                                    <button 
                                                        type="button" 
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const updatedItems = job.items.map(i => i.id === item.id ? { ...i, commissionDisabled: !i.commissionDisabled } : i);
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
                                            <p className="font-black text-slate-600 text-sm md:text-base">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                            <ChevronDown size={18} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
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
                                                        <div>
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
                                                        <div>
                                                            <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Quantidade</label>
                                                            <input 
                                                                type="number" min={1}
                                                                className="w-full text-sm font-bold border border-slate-300 p-2.5 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                value={itemEditForm.quantity}
                                                                onChange={(e) => setItemEditForm({...itemEditForm, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Valor Unitário (Base)</label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                                                <input 
                                                                    type="number" min={0} step={0.01}
                                                                    className="w-full text-sm font-bold border border-slate-300 p-2.5 pl-8 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    value={itemEditForm.price}
                                                                    onChange={(e) => setItemEditForm({...itemEditForm, price: parseFloat(e.target.value) || 0, appliedPriceTable: 'Personalizado'})}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Desconto (%)</label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="number" min={0} max={100} step={0.1}
                                                                    className="w-full text-sm font-bold border border-slate-300 p-2.5 pr-8 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    value={itemEditForm.appliedDiscount}
                                                                    onChange={(e) => setItemEditForm({...itemEditForm, appliedDiscount: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))})}
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Variations Editing */}
                                                    {(() => {
                                                        const itemJobType = jobTypes.find(jt => jt.id === item.jobTypeId);
                                                        if (!itemJobType || !itemJobType.variationGroups || itemJobType.variationGroups.length === 0) return null;
                                                        
                                                        return (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
                                                                {itemJobType.variationGroups.map(group => (
                                                                    <div key={group.id} className="space-y-2">
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.name}</h4>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {group.options.map(option => {
                                                                                const isSelected = itemEditForm.selectedVariationIds.includes(option.id);
                                                                                return (
                                                                                    <button 
                                                                                        key={option.id} 
                                                                                        type="button" 
                                                                                        onClick={() => {
                                                                                            let newSelected = [...itemEditForm.selectedVariationIds];
                                                                                            if (group.selectionType === 'SINGLE') {
                                                                                                newSelected = newSelected.filter(id => !group.options.find(o => o.id === id));
                                                                                                if (!isSelected) newSelected.push(option.id);
                                                                                            } else {
                                                                                                if (isSelected) newSelected = newSelected.filter(id => id !== option.id);
                                                                                                else newSelected.push(option.id);
                                                                                            }
                                                                                            setItemEditForm({...itemEditForm, selectedVariationIds: newSelected});
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
                                                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 flex-1">
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Quant. Original</p>
                                                                <p className="text-sm font-bold text-slate-700">{item.quantity}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Valor Unitário</p>
                                                                <p className="text-sm font-bold text-slate-700">R$ {(item.basePriceBeforeDiscount ?? item.price).toFixed(2)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Desconto</p>
                                                                <p className="text-sm font-bold text-slate-700">{item.appliedDiscount ? `${item.appliedDiscount.toFixed(1)}%` : 'Nenhum'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Tabela Usada</p>
                                                                <p className="text-sm font-bold text-slate-700 truncate" title={item.appliedPriceTable || 'Padrão'}>{item.appliedPriceTable || 'Padrão'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Preço Total</p>
                                                                <p className="text-sm font-bold text-slate-700">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                        {isLabStaff && (
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
                                                                            const updatedItems = job.items.map(i => i.id === item.id ? { ...i, commissionDisabled: !i.commissionDisabled } : i);
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
                                                    <h4 className="text-[10px] font-black text-slate-600 uppercase mb-3 flex items-center gap-1"><Briefcase size={12} /> Setores Permitidos e Comissão</h4>
                                                    {allowedSecs.length === 0 ? (
                                                        <p className="text-xs text-slate-500 italic">Este serviço não tem setores específicos definidos. Permitido em todos.</p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <p className="text-[10px] text-slate-500 leading-tight">Defina a quantidade de unidades para fins de comissão em cada setor (padrão é igual à quantidade original da OS).</p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {allowedSecs.map(secName => {
                                                                    const secQty = item.sectorQuantities?.[secName] ?? item.quantity;
                                                                    const isSectorCommissionDisabled = item.sectorCommissionDisabled?.[secName] ?? (item.nature === 'REPETITION' || item.nature === 'ADJUSTMENT');
                                                                    return (
                                                                        <div key={secName} className="flex flex-col gap-2 bg-white p-2 md:p-3 rounded-xl border border-slate-200">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-xs font-bold text-slate-700 truncate mr-2">{secName}</span>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Qtd:</span>
                                                                                    <input 
                                                                                        type="number" 
                                                                                        min={0.1} 
                                                                                        step={0.1}
                                                                                        value={secQty}
                                                                                        onChange={(e) => handleSectorQuantityChange(item.id, secName, parseFloat(e.target.value) || item.quantity)}
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
                                                    )}
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
                                    {job.products.map(prod => (
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
                                                <span className="font-black text-slate-700 text-sm">R$ {(prod.unitPrice * prod.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-slate-200 text-right shrink-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Valor Total da OS</span>
                            <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none mt-1">R$ {job.totalValue.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-tighter shrink-0"><FileIcon size={20} className="text-blue-500 shrink-0" /> Observações</h3>
                        <div className="bg-slate-50 p-4 rounded-2xl text-slate-600 text-xs md:text-sm font-medium leading-relaxed whitespace-pre-wrap min-h-[100px] border border-slate-100">
                            {job.notes || "Sem instruções adicionais registradas."}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-4 md:space-y-6 min-w-0 pb-8">
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-6 overflow-hidden">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter truncate"><FileIcon size={20} className="text-blue-600 shrink-0" /> Documentos</h3>
                            <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded shrink-0">{job.attachments?.length || 0}</span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="flex-1 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 group hover:border-blue-400 hover:bg-blue-50/50 transition-all text-center relative shrink-0">
                                    <input type="file" multiple onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".stl,.pdf,.doc,.docx,.xls,.xlsx,.html,.png,.jpg,.jpeg" />
                                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                                        <UploadCloud size={28} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anexar Arquivos</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleTakePhoto}
                                    disabled={isUploadingFiles}
                                    className="w-20 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 group hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex flex-col items-center justify-center gap-2 shrink-0"
                                >
                                    <CameraIcon size={28} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Foto</span>
                                </button>
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-100 space-y-3 animate-in zoom-in shrink-0">
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                                        {selectedFiles.map((f, i) => (
                                            <div key={i} className="flex justify-between items-center text-[10px] font-black text-white/80 uppercase tracking-tighter">
                                                <span className="truncate flex-1 pr-2">{f.name}</span>
                                                <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-1 hover:text-white shrink-0"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleUploadFiles} disabled={isUploadingFiles} className="w-full py-2.5 bg-white text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
                                        {isUploadingFiles ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        {isUploadingFiles ? 'Enviando...' : 'Confirmar Envio'}
                                    </button>
                                    {uploadProgressMsg && <p className="text-[9px] text-white/60 text-center font-bold animate-pulse truncate">{uploadProgressMsg}</p>}
                                </div>
                            )}

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar shrink-0">
                                {job.attachments?.map(att => (
                                    <div key={att.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 transition-all group overflow-hidden">
                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 overflow-hidden flex-1">
                                            {getFileIcon(att.name)}
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-700 truncate uppercase tracking-tighter">{att.name}</p>
                                                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{new Date(att.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                        </a>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={att.url} download={att.name} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download size={14} /></a>
                                        </div>
                                    </div>
                                ))}
                                {(!job.attachments || job.attachments.length === 0) && <p className="text-xs text-slate-300 text-center py-12 italic border border-dashed rounded-[24px]">Sem mídias associadas.</p>}
                            </div>
                            
                            {job.attachments && job.attachments.some(a => a.name.toLowerCase().endsWith('.stl')) && (
                                <button onClick={() => setShow3DViewer(true)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all mt-2 text-[10px] uppercase tracking-widest shadow-xl shrink-0 active:scale-95">
                                    <Box size={20} className="shrink-0" /> Abrir Visualizador 3D
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'HISTORY' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 animate-in fade-in duration-300 w-full overflow-hidden pb-8">
                <div className="lg:col-span-2 min-w-0">
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-tighter"><ListChecks size={20} className="text-blue-500 shrink-0" /> Linha do Tempo</h3>
                        <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-50">
                            {sortedHistory.map((h, idx) => (
                                <div key={idx} className="flex gap-4 md:gap-6 relative min-w-0">
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
        )}

        {activeTab === 'PRODUCTION' && (
            <div className="w-full animate-in fade-in duration-300 pb-8 overflow-x-auto">
                <div className="min-w-[800px] max-w-6xl mx-auto space-y-6">
                    {job.items.map(item => {
                        const jt = jobTypes.find(t => t.id === item.jobTypeId);
                        const sectorsToRender = jt?.allowedSectors && jt.allowedSectors.length > 0 
                            ? jt.allowedSectors 
                            : sectors.map(s => s.name);

                        return (
                            <div key={item.id} className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
                                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                    <h4 className="font-black text-slate-700 text-xs uppercase tracking-widest">{item.name}</h4>
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
                                            {isLabStaff && <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sectorsToRender.map(sector => {
                                            const execution = (job.itemExecutions || []).find(e => e.itemId === item.id && e.sector === sector);
                                            const movements = (job.sectorMovements || []).filter(m => m.sector === sector);
                                            const latestMov = movements.length > 0 
                                                ? movements.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())[0]
                                                : null;

                                            return (
                                                <tr key={sector} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-1.5 h-6 rounded-full ${execution ? 'bg-green-500' : latestMov && !latestMov.exitTime ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} />
                                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{sector}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className="text-xs font-black text-slate-800">{item.quantity}</span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        {execution ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black text-[9px] uppercase shadow-sm">
                                                                    {execution.userName.charAt(0)}
                                                                </div>
                                                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{execution.userName}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-slate-300 italic group-hover:text-blue-400 transition-colors">Definir funcionário</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(job.dueDate).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        {latestMov ? (
                                                            <div className="flex items-center justify-center gap-1.5 text-blue-600">
                                                                <Calendar size={12} className="opacity-50" />
                                                                <span className="text-[10px] font-black">{new Date(latestMov.entryTime).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(latestMov.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        ) : <span className="text-slate-200">—</span>}
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        {execution ? (
                                                            <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                                                                <Calendar size={12} className="opacity-50" />
                                                                <span className="text-[10px] font-black">{new Date(execution.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(execution.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        ) : <span className="text-slate-200">—</span>}
                                                    </td>
                                                    {isLabStaff && (
                                                        <td className="px-5 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleOpenEditExecution(item, sector, execution, latestMov)}
                                                                    title="Editar ou registrar manualmente no setor"
                                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </button>
                                                                {execution && (
                                                                    <button
                                                                        onClick={() => handleDeleteExecution(item, sector)}
                                                                        title="Excluir execução deste funcionário"
                                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}

                    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
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
      </div>
    </div>
  );
};

const ImageIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
