import logger from "../utils/logger";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { 
  User, Job, JobType, CartItem, UserRole, Sector, JobAlert, Attachment,
  ClinicPatient, Appointment, Organization, SubscriptionPlan, OrganizationConnection, Coupon, LabCoupon, CommissionRecord, CommissionStatus, ManualDentist, GlobalSettings, DeliveryRoute, RouteItem, BoxColor, ClinicService, ClinicRoom, ClinicDentist, PermissionKey, PaymentRecord, PriceTable, BillingBatch, DentistPayment, Courier,
  CardMachine, BankAccount,
  JobStatus, UrgencyLevel, OnlineRequisition
} from '../types';
import { db, auth } from '../services/firebaseConfig';
import * as api from '../services/firebaseService';
import { notifyAppointmentCreated, notifyJobLogistics, notifySupplierOrder } from '../services/ycloudService';

import * as authPkg from 'firebase/auth';
import * as firestorePkg from 'firebase/firestore';

const { onAuthStateChanged } = authPkg as any;
const { doc, getDoc, onSnapshot, getDocFromServer } = firestorePkg as any;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  logger.error({ context: errInfo }, 'Firestore Error');
  throw new Error(JSON.stringify(errInfo));
}

const ALL_PERMISSIONS: PermissionKey[] = [
  'jobs:view', 'jobs:create', 'jobs:edit', 'jobs:delete',
  'finance:view', 'finance:create', 'finance:edit', 'finance:delete',
  'catalog:view', 'catalog:create', 'catalog:edit', 'catalog:delete', 'catalog:prices_view',
  'clients:view', 'clients:create', 'clients:edit', 'clients:delete', 'clients:block_manage', 'clients:statement_view',
  'sectors:view', 'sectors:create', 'sectors:edit', 'sectors:delete',
  'users:view', 'users:create', 'users:edit', 'users:delete',
  'commissions:view', 'commissions:create', 'commissions:edit', 'commissions:delete',
  'receipts:view', 'receipts:create', 'receipts:edit', 'receipts:delete',
  'logistics:view', 'logistics:create', 'logistics:edit', 'logistics:delete',
  'boxes:view', 'boxes:create', 'boxes:edit', 'boxes:delete',
  'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
  'vip:view', 'calendar:view'
];

interface AppContextType {
  currentUser: User | null;
  currentOrg: Organization | null;
  currentPlan: SubscriptionPlan | null;
  isLoadingAuth: boolean;
  globalSettings: GlobalSettings | null;
  
  allUsers: User[]; 
  jobs: Job[];
  jobTypes: JobType[];
  clinicServices: ClinicService[];
  clinicRooms: ClinicRoom[];
  clinicDentists: ClinicDentist[];
  sectors: Sector[];
  boxColors: BoxColor[];
  alerts: JobAlert[];
  commissions: CommissionRecord[];
  allOrganizations: Organization[];
  allLaboratories: Organization[]; 
  allPlans: SubscriptionPlan[];
  coupons: Coupon[];
  allPayments: PaymentRecord[];
  patients: ClinicPatient[];
  appointments: Appointment[];
  manualDentists: ManualDentist[];
  priceTables: PriceTable[];
  billingBatches: BillingBatch[];
  dentistPayments: DentistPayment[];
  cardMachines: CardMachine[];
  bankAccounts: BankAccount[];
  inventoryCategories: import('../types').InventoryCategory[];
  inventoryItems: import('../types').InventoryItem[];
  productCatalogItems: import('../types').ProductCatalogItem[];
  activeAlert: JobAlert | null;
  onlineRequisitions: OnlineRequisition[];
  activeManualDentistId: string | null;
  nfcBoxes: any[];

  addOnlineRequisition: (labId: string, req: Omit<OnlineRequisition, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateOnlineRequisition: (labId: string, id: string, updates: Partial<OnlineRequisition>) => Promise<void>;

  addInventoryCategory: (category: any) => Promise<string>;
  updateInventoryCategory: (id: string, updates: Partial<import('../types').InventoryCategory>) => Promise<void>;
  deleteInventoryCategory: (id: string) => Promise<void>;

  addProductCatalogItem: (item: Omit<import('../types').ProductCatalogItem, 'id' | 'organizationId'>) => Promise<void>;
  updateProductCatalogItem: (id: string, updates: Partial<import('../types').ProductCatalogItem>) => Promise<void>;
  deleteProductCatalogItem: (id: string) => Promise<void>;

  addInventoryItem: (item: Omit<import('../types').InventoryItem, 'id' | 'organizationId'>) => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<import('../types').InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;

  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  addJob: (job: Omit<Job, 'id' | 'organizationId'>) => Promise<string>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  
  addCommissionRecord: (rec: Omit<CommissionRecord, 'id' | 'organizationId'>) => Promise<void>;
  updateCommissionStatus: (id: string, status: CommissionStatus) => Promise<void>;
  updateCommissionRecord: (id: string, updates: Partial<CommissionRecord>) => Promise<void>;
  deleteCommissionRecord: (id: string) => Promise<void>;

  addJobType: (type: Omit<JobType, 'id'>) => Promise<void>;
  updateJobType: (id: string, updates: Partial<JobType>) => Promise<void>;
  deleteJobType: (id: string) => Promise<void>;

  addClinicService: (service: Omit<ClinicService, 'id'>) => Promise<void>;
  updateClinicService: (id: string, updates: Partial<ClinicService>) => Promise<void>;
  deleteClinicService: (id: string) => Promise<void>;

  addClinicRoom: (room: Omit<ClinicRoom, 'id'>) => Promise<void>;
  updateClinicRoom: (id: string, updates: Partial<ClinicRoom>) => Promise<void>;
  deleteClinicRoom: (id: string) => Promise<void>;

  addClinicDentist: (dentist: Omit<ClinicDentist, 'id'>) => Promise<void>;
  updateClinicDentist: (id: string, updates: Partial<ClinicDentist>) => Promise<void>;
  deleteClinicDentist: (id: string) => Promise<void>;

  addSector: (name: string) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  
  addBoxColor: (color: Omit<BoxColor, 'id'>) => Promise<void>;
  deleteBoxColor: (id: string) => Promise<void>;

  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemQty: (cartItemId: string, qty: number) => void;
  clearCart: () => void;
  uploadFile: (file: File) => Promise<string>;
  getOriginalUrl: (url: string) => Promise<string>;

  printData: { job?: Job, mode: 'SHEET' | 'LABEL' | 'ROUTE' | 'ADDRESS_LABEL' | 'INVOICE_SHEET', routeItems?: RouteItem[], driver?: string, shift?: string, date?: string } | null;
  triggerPrint: (job: Job, mode: 'SHEET' | 'LABEL' | 'ADDRESS_LABEL' | 'INVOICE_SHEET') => void;
  triggerRoutePrint: (items: RouteItem[], driver: string, shift: string, date: string) => void;
  clearPrint: () => void;
  
  activeOrganization: Organization | null;
  switchActiveOrganization: (id: string | null) => void;
  userConnections: OrganizationConnection[];

  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  checkSlugAvailability: (slug: string, currentOrgId: string) => Promise<boolean>;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => Promise<void>;
  validateCoupon: (code: string, planId: string) => Promise<Coupon | null>;
  createSubscription: (orgId: string, planId: string, email: string, name: string, cpfCnpj: string, couponCode?: string) => Promise<any>;
  createLabWallet: (payload: any) => Promise<any>;
  getSaaSInvoices: (orgId: string) => Promise<any>;
  checkSubscriptionStatus: (orgId: string) => Promise<any>;
  setSubscriptionStatus: (orgId: string, status: string) => Promise<any>;
  addAlert: (alert: JobAlert) => Promise<void>;
  dismissAlert: (id: string) => Promise<void>;
  addPatient: (p: Omit<ClinicPatient, 'id' | 'organizationId'>) => Promise<void>;
  updatePatient: (id: string, updates: Partial<ClinicPatient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addAppointment: (a: Omit<Appointment, 'id' | 'organizationId'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  registerOrganization: (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string, address?: Partial<User>) => Promise<User>;
  registerOutsourcedLab: (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string, address?: Partial<User>) => Promise<User>;
  registerDentist: (email: string, pass: string, name: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string, address?: Partial<User>) => Promise<User>;
  registerSupplier: (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string, address?: Partial<User>) => Promise<User>;
  allSuppliers: Organization[];
  allSupplierProducts: import('../types').InventoryItem[];
  supplierOrders: import('../types').SupplierOrder[];
  addSupplierOrder: (order: import('../types').SupplierOrder) => Promise<void>;
  updateSupplierOrder: (id: string, updates: Partial<import('../types').SupplierOrder>) => Promise<void>;
  validateCro: (uf: string, numero: string, categoria: string) => Promise<any>;
  addSubscriptionPlan: (plan: SubscriptionPlan) => Promise<void>;
  updateSubscriptionPlan: (id: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  deleteSubscriptionPlan: (id: string) => Promise<void>;
  addConnectionByCode: (code: string) => Promise<void>;
  addCoupon: (c: Coupon) => Promise<void>;
  updateCoupon: (code: string, updates: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  addPayment: (p: PaymentRecord) => Promise<void>;
  addManualDentist: (d: Omit<ManualDentist, 'id' | 'organizationId'>) => Promise<void>;
  updateManualDentist: (id: string, updates: Partial<ManualDentist>) => Promise<void>;
  deleteManualDentist: (id: string) => Promise<void>;
  
  addCardMachine: (machine: Omit<CardMachine, 'id' | 'organizationId' | 'createdAt'>) => Promise<void>;
  updateCardMachine: (id: string, updates: Partial<CardMachine>) => Promise<void>;
  deleteCardMachine: (id: string) => Promise<void>;

  addBankAccount: (account: Omit<BankAccount, 'id' | 'organizationId' | 'createdAt'>) => Promise<void>;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;

  addPriceTable: (table: Omit<PriceTable, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePriceTable: (id: string, updates: Partial<PriceTable>) => Promise<void>;
  deletePriceTable: (id: string) => Promise<void>;

  addJobToRoute: (job: Job, driver: string, shift: 'MORNING' | 'AFTERNOON', date: Date) => Promise<void>;
  generateBatchBoleto: (dentistId: string, jobIds: string[], dueDate: Date, customAmount?: number) => Promise<any>;
  addDentistPayment: (p: Omit<DentistPayment, 'id' | 'organizationId' | 'createdAt'>) => Promise<void>;
  updateDentistPayment: (id: string, updates: Partial<DentistPayment>) => Promise<void>;
  updateBillingBatchStatus: (id: string, status: BillingBatch['status']) => Promise<void>;

  labCoupons: LabCoupon[];
  addLabCoupon: (coupon: Omit<LabCoupon, 'id' | 'organizationId' | 'usedCount'>) => Promise<void>;
  updateLabCoupon: (id: string, updates: Partial<LabCoupon>) => Promise<void>;
  deleteLabCoupon: (id: string) => Promise<void>;
  validateLabCoupon: (orgId: string, code: string) => Promise<LabCoupon | null>;

  couriers: Courier[];
  addCourier: (c: Omit<Courier, 'id' | 'organizationId' | 'createdAt'>) => Promise<void>;
  updateCourier: (id: string, updates: Partial<Courier>) => Promise<void>;
  deleteCourier: (id: string) => Promise<void>;

  patientPayments: import('../types').PatientPayment[];
  patientBillingBatches: import('../types').PatientBillingBatch[];
  addPatientPayment: (p: Omit<import('../types').PatientPayment, 'id' | 'organizationId' | 'createdAt'>) => Promise<void>;
  updatePatientPayment: (id: string, updates: Partial<import('../types').PatientPayment>) => Promise<void>;
  deletePatientPayment: (id: string) => Promise<void>;
  addPatientBillingBatch: (b: Omit<import('../types').PatientBillingBatch, 'id' | 'organizationId' | 'createdAt'>) => Promise<void>;
  updatePatientBillingBatchStatus: (id: string, status: import('../types').PatientBillingBatch['status']) => Promise<void>;
  deletePatientBillingBatch: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [clinicServices, setClinicServices] = useState<ClinicService[]>([]);
  const [clinicRooms, setClinicRooms] = useState<ClinicRoom[]>([]);
  const [clinicDentists, setClinicDentists] = useState<ClinicDentist[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [boxColors, setBoxColors] = useState<BoxColor[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allLaboratories, setAllLaboratories] = useState<Organization[]>([]);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [labCoupons, setLabCoupons] = useState<LabCoupon[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [manualDentists, setManualDentists] = useState<ManualDentist[]>([]);
  const [priceTables, setPriceTables] = useState<PriceTable[]>([]);
  const [cardMachines, setCardMachines] = useState<CardMachine[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<import('../types').InventoryCategory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<import('../types').InventoryItem[]>([]);
  const [productCatalogItems, setProductCatalogItems] = useState<import('../types').ProductCatalogItem[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Organization[]>([]);
  const [allSupplierProducts, setAllSupplierProducts] = useState<import('../types').InventoryItem[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<import('../types').SupplierOrder[]>([]);
  const [billingBatches, setBillingBatches] = useState<BillingBatch[]>([]);
  const [dentistPayments, setDentistPayments] = useState<DentistPayment[]>([]);
  const [patientPayments, setPatientPayments] = useState<import('../types').PatientPayment[]>([]);
  const [patientBillingBatches, setPatientBillingBatches] = useState<import('../types').PatientBillingBatch[]>([]);
  const [activeAlert, setActiveAlert] = useState<JobAlert | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [onlineRequisitions, setOnlineRequisitions] = useState<OnlineRequisition[]>([]);
  const [activeManualDentistId, setActiveManualDentistId] = useState<string | null>(null);
  const [nfcBoxes, setNfcBoxes] = useState<any[]>([]);

  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [userConnections, setUserConnections] = useState<OrganizationConnection[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<AppContextType['printData']>(null);

  // Subscrições Públicas: Planos, Laboratórios e Fornecedores são públicos
  useEffect(() => {
    if (!db) return;
    const unsubPlans = api.subscribeSubscriptionPlans(setAllPlans);
    const unsubLabs = api.subscribeAllLaboratories(setAllLaboratories);
    const unsubSuppliers = api.subscribeAllSuppliers(setAllSuppliers);
    return () => { 
      unsubPlans(); 
      unsubLabs(); 
      unsubSuppliers(); 
    };
  }, []);

  // Subscrição de Produtos de Fornecedores (depende dos fornecedores carregados)
  useEffect(() => {
    if (!db || allSuppliers.length === 0) {
      setAllSupplierProducts([]);
      return;
    }
    const supplierIds = allSuppliers.map(s => s.id);
    const unsubSupplierProducts = api.subscribeAllSupplierProducts(supplierIds, setAllSupplierProducts);
    return () => {
      unsubSupplierProducts();
    };
  }, [allSuppliers]);

  // Monitoramento de Auth e Perfil
  useEffect(() => {
    if (!auth) { setIsLoadingAuth(false); return; }
    const unsub = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        const profile = await api.getUserProfile(user.uid);
        if (profile) {
            if (profile.role === UserRole.SUPER_ADMIN) {
                profile.permissions = ALL_PERMISSIONS;
            }
            
            setCurrentUser(profile);
            const profileOrgId = profile.organizationId;
            if (profileOrgId) {
                const orgRef = doc(db, 'organizations', profileOrgId);
                onSnapshot(orgRef, (snap: any) => {
                    if (snap.exists()) {
                        const oData = { id: snap.id, ...snap.data() as any } as Organization;
                        setCurrentOrg(oData);
                        
                        if (oData.planId) {
                            const planRef = doc(db, 'subscriptionPlans', oData.planId);
                            getDoc(planRef).then((pSnap: any) => {
                                if (pSnap.exists()) {
                                    setCurrentPlan({ id: pSnap.id, ...pSnap.data() as any } as SubscriptionPlan);
                                } else if (oData.planId === 'free_lab') {
                                    setCurrentPlan({
                                        id: 'free_lab',
                                        name: 'Plano Grátis - Loja Online',
                                        price: 0,
                                        active: true,
                                        isPublic: true,
                                        features: {
                                            maxUsers: 1,
                                            maxStorageGB: 5,
                                            maxDentists: -1,
                                            maxJobsPerMonth: -1,
                                            hasStoreModule: true,
                                            hasClinicModule: false,
                                            isLabFreeStoreOnly: true
                                        }
                                    });
                                } else if (oData.planId === 'basic') {
                                    setCurrentPlan({
                                        id: 'basic',
                                        name: 'Plano Básico Conectado',
                                        price: 0,
                                        active: true,
                                        isPublic: false,
                                        features: {
                                            maxUsers: 1,
                                            maxStorageGB: 1,
                                            maxDentists: 1,
                                            maxJobsPerMonth: -1,
                                            hasStoreModule: true,
                                            hasClinicModule: false
                                        }
                                    });
                                } else if (profile.role === UserRole.SUPER_ADMIN) {
                                    setCurrentPlan({
                                        id: 'super_plan', name: 'Plano Administrativo', price: 0, active: true, isPublic: false,
                                        features: { maxUsers: -1, maxStorageGB: 100, maxDentists: -1, maxJobsPerMonth: -1, hasStoreModule: true, hasClinicModule: true }
                                    });
                                }
                            });
                        }
                    }
                });

                if (profile.role === UserRole.CLIENT || profileOrgId) {
                    api.subscribeUserConnections(profileOrgId, (conns) => {
                        setUserConnections(conns);
                        
                        // Ensure all connected laboratories are loaded and synced with activeOrganization / allLaboratories
                        if (conns.length > 0) {
                            if (!activeOrganization) {
                                const firstOrgId = conns[0].organizationId;
                                getDoc(doc(db, 'organizations', firstOrgId)).then((snap: any) => {
                                    if (snap.exists()) {
                                        const data = snap.data();
                                        const createdAtVal = data.createdAt;
                                        const createdAtDate = createdAtVal?.toDate ? createdAtVal.toDate() : (createdAtVal ? new Date(createdAtVal) : new Date());
                                        const labObj = { id: snap.id, ...data, createdAt: createdAtDate } as Organization;
                                        setActiveOrganization(labObj);
                                    }
                                });
                            }

                            // Fetch and insert/update details for each connection in the allLaboratories list
                            conns.forEach(conn => {
                                getDoc(doc(db, 'organizations', conn.organizationId)).then((snap: any) => {
                                    if (snap.exists()) {
                                        const data = snap.data();
                                        const createdAtVal = data.createdAt;
                                        const createdAtDate = createdAtVal?.toDate ? createdAtVal.toDate() : (createdAtVal ? new Date(createdAtVal) : new Date());
                                        const labObj = { id: snap.id, ...data, createdAt: createdAtDate } as Organization;
                                        setAllLaboratories(prev => {
                                            if (prev.some(l => l.id === labObj.id)) {
                                                return prev.map(l => l.id === labObj.id ? labObj : l);
                                            }
                                            return [...prev, labObj];
                                        });
                                    }
                                });
                            });
                        }
                    });
                }
            }
        }
      } else {
        setCurrentUser(null); setCurrentOrg(null); setCurrentPlan(null); setActiveOrganization(null);
        setUserConnections([]); setClinicServices([]); setClinicRooms([]); setClinicDentists([]);
        setAllUsers([]); setJobs([]); setJobTypes([]); setCoupons([]); setLabCoupons([]); setGlobalSettings(null);
      }
      setIsLoadingAuth(false);
    });
    return unsub;
  }, []);

  const activeDataId = useMemo(() => {
      if (currentUser?.role === UserRole.CLIENT || currentUser?.role === UserRole.SUPER_ADMIN) {
          return activeOrganization?.id || currentUser?.organizationId || null;
      }
      return currentUser?.organizationId || null;
  }, [currentUser, activeOrganization]);

  // Sincroniza o manualDentistId do dentista dinamicamente com base no laboratório selecionado
  useEffect(() => {
    setActiveManualDentistId(null);
    if (!currentUser || !activeDataId || currentUser.role !== UserRole.CLIENT) return;

    // Busca um dentista manual no lab ativo que tenha o mesmo e-mail do dentista logado
    const unsub = api.subscribeManualDentists(activeDataId, (manuals) => {
      const match = manuals.find(m => m.email?.toLowerCase() === currentUser.email?.toLowerCase());
      if (match) {
        setActiveManualDentistId(match.id);
        if (!match.userId || match.userId !== currentUser.id) {
          api.apiUpdateManualDentist(activeDataId, match.id, { userId: currentUser.id }).catch((err: any) => {
            logger.error({ err: err }, "Erro ao atualizar userId do dentista manual:");
          });
        }
      }
    });
    return () => unsub();
  }, [currentUser, activeDataId]);

  // Subscrições de Dados Protegidos (Só rodam se houver usuário e permissão)
  useEffect(() => {
    if (!db || !currentUser) return;

    const unsubs: (() => void)[] = [];
    const isSuper = currentUser.role === UserRole.SUPER_ADMIN;

    // Apenas Super Admin ouve cupons e outras coisas
    if (isSuper) {
        unsubs.push(api.subscribeCoupons(setCoupons));
        unsubs.push(api.subscribeAllOrganizations(setAllOrganizations));
        unsubs.push(api.subscribeAllUsers(setAllUsers));
        unsubs.push(api.subscribeAllPayments(setAllPayments));
    }
    
    // Todos os usuários ouvem as configurações globais (banners, etc)
    unsubs.push(api.subscribeGlobalSettings(setGlobalSettings));

    if (activeDataId) {
        const isClient = currentUser.role === UserRole.CLIENT || activeDataId !== currentUser.organizationId;
        unsubs.push(api.subscribeJobs(activeDataId, currentUser.id, isClient, setJobs, activeManualDentistId || (currentUser as any).manualDentistId));
        unsubs.push(api.subscribeJobTypes(activeDataId, setJobTypes));
        
        // Colaboradores: Super Admin ou qualquer membro da própria organização
        const canSeeUsers = isSuper || currentUser.organizationId === activeDataId;
        
        if (canSeeUsers) {
            unsubs.push(api.subscribeOrgUsers(activeDataId, setAllUsers));
        }
    }

    const myOrgId = currentUser.organizationId;
    if (myOrgId) {
        unsubs.push(api.subscribePatients(myOrgId, setPatients));
        unsubs.push(api.subscribeAppointments(myOrgId, setAppointments));
        unsubs.push(api.subscribeCouriers(myOrgId, setCouriers));
        
        if (currentUser.role !== UserRole.CLIENT || currentOrg?.orgType === 'CLINIC') {
            unsubs.push(api.subscribeSectors(myOrgId, setSectors));
            unsubs.push(api.subscribeBoxColors(myOrgId, setBoxColors));
            unsubs.push(api.subscribeCommissions(myOrgId, setCommissions));
            unsubs.push(api.subscribeAlerts(myOrgId, setAlerts));
            unsubs.push(api.subscribeBillingBatches(myOrgId, setBillingBatches));
            unsubs.push(api.subscribeDentistPayments(myOrgId, setDentistPayments));
            unsubs.push(api.subscribeManualDentists(myOrgId, setManualDentists));
            unsubs.push(api.subscribeLabCoupons(myOrgId, setLabCoupons));
            unsubs.push(api.subscribePriceTables(myOrgId, setPriceTables));
            unsubs.push(api.subscribeCardMachines(myOrgId, setCardMachines));
            unsubs.push(api.subscribeBankAccounts(myOrgId, setBankAccounts));
            unsubs.push(api.subscribeInventoryCategories(myOrgId, setInventoryCategories));
            unsubs.push(api.subscribeInventoryItems(myOrgId, setInventoryItems));
            unsubs.push(api.subscribeProductCatalogItems(myOrgId, setProductCatalogItems));
            unsubs.push(api.subscribeNfcBoxes(myOrgId, setNfcBoxes));
            if (currentOrg?.orgType !== 'CLINIC') {
                unsubs.push(api.subscribeLabOnlineRequisitions(myOrgId, setOnlineRequisitions));
            } else {
                unsubs.push(api.subscribeClinicServices(myOrgId, setClinicServices));
                unsubs.push(api.subscribeClinicRooms(myOrgId, setClinicRooms));
                unsubs.push(api.subscribeClinicDentists(myOrgId, setClinicDentists));
            }
        } else if (activeDataId) {
            unsubs.push(api.subscribeDentistOnlineRequisitions([activeDataId], currentUser.id, setOnlineRequisitions));
        }

        if (currentOrg?.orgType === 'SUPPLIER') {
            unsubs.push(api.subscribeSupplierOrders(myOrgId, setSupplierOrders));
        } else {
            unsubs.push(api.subscribeBuyerSupplierOrders(myOrgId, setSupplierOrders));
        }

        unsubs.push(api.subscribePatientPayments(myOrgId, setPatientPayments));
        unsubs.push(api.subscribePatientBillingBatches(myOrgId, setPatientBillingBatches));
    }
    
    return () => unsubs.forEach(u => u());
  }, [currentUser, activeDataId, activeManualDentistId]);

  // Special subscriptions for Dentists (CLINIC users) to track jobs and requisitions from all their connected labs
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'CLIENT') return;
    if (currentOrg?.orgType !== 'CLINIC') return;

    const unsubs: any[] = [];
    
    // Extract lab IDs from userConnections
    const connectedLabIds = userConnections
        .filter(c => c.status === 'ACTIVE')
        .map(c => c.organizationId);

    // Also include connectedLabId if present directly on user
    if ((currentUser as any).connectedLabId && !connectedLabIds.includes((currentUser as any).connectedLabId)) {
        connectedLabIds.push((currentUser as any).connectedLabId);
    }

    if (connectedLabIds.length === 0) {
        setJobs([]);
        setOnlineRequisitions([]);
        return;
    }
    
    const manualDentistId = activeManualDentistId || (currentUser as any).manualDentistId;

    unsubs.push(api.subscribeDentistConnectedJobs(
        connectedLabIds, 
        currentUser.id, 
        manualDentistId, 
        (labJobs) => {
            setJobs(prev => {
                const myOrgId = currentUser.organizationId;
                const localJobs = prev.filter(j => j.organizationId === myOrgId);
                const merged = [...localJobs, ...labJobs];
                return Array.from(new Map(merged.map(j => [j.id, j])).values());
            });
        }
    ));

    unsubs.push(api.subscribeDentistOnlineRequisitions(
        connectedLabIds,
        currentUser.id,
        (reqs) => {
            setOnlineRequisitions(reqs);
        }
    ));

    return () => unsubs.forEach(u => u());
  }, [currentUser, currentOrg, userConnections, activeManualDentistId]);


  
  // Monitoramento de Alertas Agendados
  useEffect(() => {
    if (!currentUser || alerts.length === 0) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      
      const alert = alerts.find(a => {
        // Ignorar se já foi lido por este usuário
        if (a.readBy && a.readBy.includes(currentUser.id)) return false;
        
        // Ignorar se a data agendada for no futuro
        if (!a.scheduledFor) return false;
        const scheduledTime = a.scheduledFor instanceof Date ? a.scheduledFor.getTime() : new Date(a.scheduledFor).getTime();
        if (scheduledTime > now.getTime()) return false;
        
        // Regras de direcionamento (target)
        // 1. Se tem targetUserId, só exibe se o targetUserId == currentUser.id
        if (a.targetUserId && a.targetUserId !== currentUser.id) return false;
        
        // 2. Se tem targetSector, só exibe se o targetSector == currentUser.sector
        if (a.targetSector && a.targetSector !== currentUser.sector) return false;
        
        // Se não tem targetUserId nem targetSector, então é geral para toda a org, pode exibir.
        // Ou se tiver targetUserId e for do currentUser
        // Ou se tiver targetSector e for do setor do currentUser
        return true;
      });

      if (alert && (!activeAlert || activeAlert.id !== alert.id)) {
        setActiveAlert(alert);
      }
    }, 5000); // Verifica a cada 5 segundos
    
    return () => clearInterval(interval);
  }, [alerts, currentUser, activeAlert]);

  // Optimized Automatic Blocking Logic

  useEffect(() => {
    if (!activeDataId || jobs.length === 0 || (currentUser?.role === UserRole.CLIENT)) return;

    const checkBlocking = async () => {
      const now = new Date();
      const dentists = [...allUsers.filter(u => u.role === UserRole.CLIENT), ...manualDentists];
      
      // Performance: Pre-calculate all balances in a single pass
      const balanceMap = new Map<string, number>();
      jobs.forEach(j => {
        if (j.dentistId && (j.paymentStatus === 'PENDING' || !j.paymentStatus) && 
            (j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED) &&
            !j.batchId && !j.asaasPaymentId) {
          balanceMap.set(j.dentistId, (balanceMap.get(j.dentistId) || 0) + (j.totalValue || 0));
        }
      });

      // Deduct manual/received payments from the balance map
      dentistPayments.forEach(p => {
        if (p.dentistId) {
          const payAmount = p.type === 'DISCOUNT' ? Number(p.amount || 0) : (Number(p.amount || 0) + Number(p.discount || 0));
          balanceMap.set(p.dentistId, (balanceMap.get(p.dentistId) || 0) - payAmount);
        }
      });
      
      for (const d of dentists) {
        // Se estiver temporariamente desbloqueado e o prazo não expirou, pula
        if (d.temporaryUnblockUntil && new Date(d.temporaryUnblockUntil) > now) {
          continue;
        }

        // Bloqueio por Aprovação Financeira
        if (d.blockReason === 'FINANCIAL_APPROVAL' && !d.isBlocked) {
           const updates = { isBlocked: true, blockReason: 'FINANCIAL_APPROVAL' } as any;
           if (allUsers.find(u => u.id === d.id)) await api.apiUpdateUser(d.id, updates);
           else await api.apiUpdateManualDentist(activeDataId, d.id, updates);
           continue;
        }

        // Bloqueio por Inadimplência
        if (d.billingLimit && d.billingLimit > 0) {
          const pendingBalance = balanceMap.get(d.id) || 0;
          const shouldBeBlocked = pendingBalance >= d.billingLimit;

          if (shouldBeBlocked && !d.isBlocked) {
             const updates = { isBlocked: true, blockReason: 'DEBT' } as any;
             if (allUsers.find(u => u.id === d.id)) await api.apiUpdateUser(d.id, updates);
             else await api.apiUpdateManualDentist(activeDataId, d.id, updates);
          } 
          else if (!shouldBeBlocked && d.isBlocked && d.blockReason === 'DEBT') {
             const updates = { isBlocked: false, blockReason: null } as any;
             if (allUsers.find(u => u.id === d.id)) await api.apiUpdateUser(d.id, updates);
             else await api.apiUpdateManualDentist(activeDataId, d.id, updates);
          }
        }
      }
    };

    // Debounce a execução para evitar chamadas excessivas durante updates em massa
    const timer = setTimeout(checkBlocking, 1000);
    return () => clearTimeout(timer);
  }, [jobs, allUsers, manualDentists, dentistPayments, activeDataId, currentUser]);

  const login = async (email: string, pass: string) => { await api.apiLogin(email, pass); };
  const logout = async () => await api.apiLogout();

  const updateUser = async (id: string, u: Partial<User>) => {
    if (!currentUser) return;
    
    const targetUser = allUsers.find(user => user.id === id);
    const isSameOrg = targetUser && targetUser.organizationId === currentUser.organizationId;
    const canManageUsers = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.SUPER_ADMIN;

    if (id === currentUser.id || (canManageUsers && isSameOrg)) {
        await api.apiUpdateUser(id, u);
    } else {
        await api.apiUpdateUserAdmin(id, u);
    }
  };

  const addUser = async (u: User) => await api.apiAddUser(u);
  const deleteUser = async (id: string) => {
      try {
          await api.apiDeleteUserAdmin(id);
      } catch (err) {
          // Se falhar o admin (ex: não é super admin ou admin), tenta o delete direto (se as regras permitirem)
          await api.apiDeleteUser(id);
      }
  };

  const addJob = async (j: Omit<Job, 'id'|'organizationId'>) => {
      const orgId = activeDataId;
      if (!orgId) throw new Error("Nenhum laboratório ativo.");
      const now = new Date();
      const jobId = `job_${Date.now()}`;
      await api.apiAddJob(orgId, { 
          ...j, 
          id: jobId, 
          organizationId: orgId,
          sectorEntryTime: now
      } as Job);
      return jobId;
  };
  const updateJob = async (id: string, u: Partial<Job>) => {
      const orgId = activeDataId;
      if (!orgId) return;
      
      const updates = { ...u };
      if (u.currentSector) {
          updates.sectorEntryTime = new Date();
      }
      
      try {
          await api.apiUpdateJob(orgId, id, updates);

          // Disparar notificação de WhatsApp caso o status seja atualizado para ENTREGUE (DELIVERED)
          if (u.status === 'DELIVERED') {
              const job = jobs.find(j => j.id === id);
              if (job) {
                  const dentist = manualDentists.find(d => d.id === job.dentistId) || allUsers.find(u => u.id === job.dentistId);
                  const dentistPhone = dentist?.phone || '';
                  if (dentistPhone) {
                      await notifyJobLogistics(job, 'DELIVERED', dentistPhone, dentist?.name || 'Dentista');
                  }
              }
          }
      } catch (err: any) {
          handleFirestoreError(err, OperationType.UPDATE, `organizations/${orgId}/jobs/${id}`);
      }
  };

  const addInventoryCategory = async (category: any) => {
    const orgId = activeDataId;
    if(!orgId) return '';
    const id = category.id || `inv_cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await api.apiAddInventoryCategory(orgId, { ...category, id, organizationId: orgId });
    return id;
  };
  const updateInventoryCategory = async (id: string, updates: Partial<import('../types').InventoryCategory>) => {
    const orgId = activeDataId;
    if(!orgId) return;
    await api.apiUpdateInventoryCategory(orgId, id, updates);
  };
  const deleteInventoryCategory = async (id: string) => {
    const orgId = activeDataId;
    if(!orgId) return;
    await api.apiDeleteInventoryCategory(orgId, id);
  };

  const addProductCatalogItem = async (item: Omit<import('../types').ProductCatalogItem, 'id' | 'organizationId'>) => {
    const orgId = activeDataId;
    if(!orgId) return;
    await api.apiAddProductCatalogItem(orgId, { ...item, id: `cat_item_${Date.now()}`, organizationId: orgId });
  };
  const updateProductCatalogItem = async (id: string, updates: Partial<import('../types').ProductCatalogItem>) => {
    const orgId = activeDataId;
    if(!orgId) return;
    await api.apiUpdateProductCatalogItem(orgId, id, updates);
  };
  const deleteProductCatalogItem = async (id: string) => {
    const orgId = activeDataId;
    if(!orgId) return;
    await api.apiDeleteProductCatalogItem(orgId, id);
  };

  const addInventoryItem = async (item: Omit<import('../types').InventoryItem, 'id' | 'organizationId'>) => {
    const orgId = activeDataId;
    if(!orgId) return;
    await api.apiAddInventoryItem(orgId, { ...item, id: `inv_item_${Date.now()}`, organizationId: orgId });
  };
  const updateInventoryItem = async (id: string, updates: Partial<import('../types').InventoryItem>) => {
    const orgId = activeDataId;
    if(!orgId) return;
    await api.apiUpdateInventoryItem(orgId, id, updates);
  };
  const deleteInventoryItem = async (id: string) => {
    const orgId = activeDataId;
    if(!orgId) return;
    await api.apiDeleteInventoryItem(orgId, id);
  };

  const addCommissionRecord = async (rec: Omit<CommissionRecord, 'id' | 'organizationId'>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      try {
          await api.apiAddCommission(orgId, { ...rec, id: `comm_${Date.now()}`, organizationId: orgId } as CommissionRecord);
      } catch (err: any) {
          handleFirestoreError(err, OperationType.CREATE, `organizations/${orgId}/commissions`);
      }
  };
  const updateCommissionStatus = async (id: string, status: CommissionStatus) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiUpdateCommission(orgId, id, { status, paidAt: status === CommissionStatus.PAID ? new Date() : undefined });
  };

  const updateCommissionRecord = async (id: string, updates: Partial<CommissionRecord>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      try {
          await api.apiUpdateCommission(orgId, id, updates);
      } catch (err: any) {
          handleFirestoreError(err, OperationType.UPDATE, `organizations/${orgId}/commissions/${id}`);
      }
  };

  const deleteCommissionRecord = async (id: string) => {
      const orgId = activeDataId;
      if(!orgId) return;
      try {
          await api.apiDeleteCommission(orgId, id);
      } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `organizations/${orgId}/commissions/${id}`);
      }
  };

  const addJobType = async (jt: Omit<JobType, 'id'>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiAddJobType(orgId, { ...jt, id: `jtype_${Date.now()}` } as JobType);
  }
  const updateJobType = async (id: string, u: Partial<JobType>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiUpdateJobType(orgId, id, u);
  }
  const deleteJobType = async (id: string) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiDeleteJobType(orgId, id);
  }

  const addClinicService = async (service: Omit<ClinicService, 'id'>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddClinicService(orgId, { ...service, id: `cservice_${Date.now()}` } as ClinicService);
  };
  const updateClinicService = async (id: string, updates: Partial<ClinicService>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiUpdateClinicService(orgId, id, updates);
  };
  const deleteClinicService = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiDeleteClinicService(orgId, id);
  };

  const addClinicRoom = async (room: Omit<ClinicRoom, 'id'>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddClinicRoom(orgId, { ...room, id: `room_${Date.now()}` } as ClinicRoom);
  };
  const updateClinicRoom = async (id: string, updates: Partial<ClinicRoom>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiUpdateClinicRoom(orgId, id, updates);
  };
  const deleteClinicRoom = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiDeleteClinicRoom(orgId, id);
  };

  const addClinicDentist = async (dentist: Omit<ClinicDentist, 'id'>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddClinicDentist(orgId, { ...dentist, id: `cdentist_${Date.now()}` } as ClinicDentist);
  };
  const updateClinicDentist = async (id: string, updates: Partial<ClinicDentist>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiUpdateClinicDentist(orgId, id, updates);
  };
  const deleteClinicDentist = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiDeleteClinicDentist(orgId, id);
  };

  const addSector = async (name: string) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiAddSector(orgId, { id: `sector_${Date.now()}`, name });
  }
  const deleteSector = async (id: string) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiDeleteSector(orgId, id);
  }

  const addBoxColor = async (color: Omit<BoxColor, 'id'>) => {
      const orgId = activeDataId;
      if (!orgId) return;
      await api.apiAddBoxColor(orgId, { ...color, id: `color_${Date.now()}` } as BoxColor);
  };
  const deleteBoxColor = async (id: string) => {
      const orgId = activeDataId;
      if (!orgId) return;
      await api.apiDeleteBoxColor(orgId, id);
  };

  const updateOrganization = async (id: string, u: Partial<Organization>) => await api.apiUpdateOrganization(id, u);
  const checkSlugAvailability = async (slug: string, currentOrgId: string) => await api.checkSlugAvailability(slug, currentOrgId);
  const updateGlobalSettings = async (u: Partial<GlobalSettings>) => await api.apiUpdateGlobalSettings({ ...u, updatedAt: new Date(), updatedBy: currentUser?.name || 'unknown' });
  const validateCoupon = async (code: string, planId: string) => await api.apiValidateCoupon(code, planId);
  const createSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string, couponCode?: string) => await api.apiCreateSaaSSubscription(orgId, planId, email, name, cpfCnpj, couponCode);
  const createLabWallet = async (p: any) => await api.apiCreateLabSubAccount(p);
  const getSaaSInvoices = async (orgId: string) => await api.apiGetSaaSInvoices(orgId);
  const checkSubscriptionStatus = async (orgId: string) => await api.apiCheckSubscriptionStatus(orgId);
  const setSubscriptionStatus = async (orgId: string, status: string) => await api.apiSetSubscriptionStatus(orgId, status);
  
  const addAlert = async (a: JobAlert) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiAddAlert(orgId, a);
  }
  const dismissAlert = async (id: string) => {
      const orgId = activeDataId;
      if(!orgId || !currentUser) return;
      
      const alertToDismiss = alerts.find(a => a.id === id);
      
      if (alertToDismiss && alertToDismiss.repeatInterval && (alertToDismiss.repeatCount || 0) > (alertToDismiss.repeatedCount || 0)) {
          // Re-schedule
          const nextRepeatedCount = (alertToDismiss.repeatedCount || 0) + 1;
          const nextScheduledFor = new Date();
          nextScheduledFor.setMinutes(nextScheduledFor.getMinutes() + alertToDismiss.repeatInterval);
          
          await api.apiUpdateAlert(orgId, id, {
              readBy: [],
              repeatedCount: nextRepeatedCount,
              scheduledFor: nextScheduledFor
          });
      } else {
          await api.apiMarkAlertAsRead(orgId, id, currentUser.id);
      }
      
      setActiveAlert(null); 
  }
  const addPatient = async (p: Omit<ClinicPatient, 'id' | 'organizationId'>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddPatient(orgId, { ...p, id: `pat_${Date.now()}`, organizationId: orgId } as ClinicPatient);
  }
  const updatePatient = async (id: string, u: Partial<ClinicPatient>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiUpdatePatient(orgId, id, u);
  }
  const deletePatient = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiDeletePatient(orgId, id);
  }
  const addAppointment = async (a: Omit<Appointment, 'id' | 'organizationId'>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      const newAppointment = { ...a, id: `app_${Date.now()}`, organizationId: orgId } as Appointment;
      await api.apiAddAppointment(orgId, newAppointment);

      // Notificação de Confirmação de Consulta
      const patient = patients.find(p => p.id === a.patientId);
      const dentist = clinicDentists.find(d => d.id === a.dentistId);
      if (patient && patient.phone && dentist) {
          await notifyAppointmentCreated(newAppointment, patient, dentist.name);
      }
  }
  const updateAppointment = async (id: string, u: Partial<Appointment>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiUpdateAppointment(orgId, id, u);
  }
  const deleteAppointment = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiDeleteAppointment(orgId, id);
  }
  
  const registerOrganization = async (e: string, p: string, on: string, orn: string, pid: string, t: Date | undefined, c: string | undefined, address?: any) => await api.apiRegisterOrganization(e, p, on, orn, pid, t, c, address);
  const registerOutsourcedLab = async (e: string, p: string, on: string, orn: string, pid: string, t: Date | undefined, c: string | undefined, address?: any) => await api.apiRegisterOutsourcedLab(e, p, on, orn, pid, t, c, address);
  const registerDentist = async (e: string, p: string, n: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string, address?: any) => await api.apiRegisterDentist(e, p, n, clinicName, planId, trialEndsAt, couponCode, address);
  const registerSupplier = async (e: string, p: string, on: string, orn: string, pid: string, t: Date | undefined, c: string | undefined, address?: any) => await api.apiRegisterSupplier(e, p, on, orn, pid, t, c, address);
  const addSupplierOrder = async (order: import('../types').SupplierOrder) => await api.apiAddSupplierOrder(order);
  const updateSupplierOrder = async (id: string, updates: Partial<import('../types').SupplierOrder>) => {
      await api.apiUpdateSupplierOrder(id, updates);
      
      // WhatsApp Notifications
      if (updates.status === 'CONFIRMED' || updates.status === 'SHIPPED' || updates.status === 'DELIVERED') {
          const order = supplierOrders.find(o => o.id === id);
          if (order && order.buyerPhone) {
              await notifySupplierOrder({ ...order, ...updates } as any, updates.status as 'CONFIRMED' | 'SHIPPED' | 'DELIVERED', order.buyerPhone);
          }
      }
  };
  const validateCro = async (uf: string, numero: string, categoria: string) => await api.apiValidateCro(uf, numero, categoria);
  const addSubscriptionPlan = async (p: SubscriptionPlan) => await api.apiAddSubscriptionPlan(p);
  const updateSubscriptionPlan = async (id: string, u: Partial<SubscriptionPlan>) => await api.apiUpdateSubscriptionPlan(id, u);
  const deleteSubscriptionPlan = async (id: string) => await api.apiDeleteSubscriptionPlan(id);
  
  const addConnectionByCode = async (code: string) => {
      if(!currentUser?.organizationId) return;
      await api.apiAddConnectionByCode(currentUser.organizationId, currentUser.id, code);
  };

  const addCoupon = async (c: Coupon) => await api.apiAddCoupon(c);
  const updateCoupon = async (id: string, u: Partial<Coupon>) => await api.apiUpdateCoupon(id, u);
  const deleteCoupon = async (id: string) => await api.apiDeleteCoupon(id);
  const addPayment = async (p: PaymentRecord) => await api.apiAddPayment(p);

  const addLabCoupon = async (c: Omit<LabCoupon, 'id' | 'organizationId' | 'usedCount'>) => {
      const orgId = activeDataId;
      if (!orgId) return;
      const newCoupon: LabCoupon = {
          ...c,
          id: `lab_coup_${Date.now()}`,
          organizationId: orgId,
          usedCount: 0
      };
      await api.apiAddLabCoupon(orgId, newCoupon);
  };
  const updateLabCoupon = async (id: string, u: Partial<LabCoupon>) => {
      const orgId = activeDataId;
      if (!orgId) return;
      await api.apiUpdateLabCoupon(orgId, id, u);
  };
  const deleteLabCoupon = async (id: string) => {
      const orgId = activeDataId;
      if (!orgId) return;
      await api.apiDeleteLabCoupon(orgId, id);
  };
  const validateLabCoupon = async (orgId: string, code: string) => {
      return await api.apiValidateLabCoupon(orgId, code);
  };

  const addManualDentist = async (d: Omit<ManualDentist, 'id' | 'organizationId'>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiAddManualDentist(orgId, { ...d, id: `man_dent_${Date.now()}`, organizationId: orgId } as ManualDentist);
  };
  const updateManualDentist = async (id: string, u: Partial<ManualDentist>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiUpdateManualDentist(orgId, id, u);
  };
  const deleteManualDentist = async (id: string) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiDeleteManualDentist(orgId, id);
  };

  const addOnlineRequisition = async (labId: string, r: Omit<OnlineRequisition, 'id' | 'createdAt' | 'status'>) => {
      const id = `req_${Date.now()}`;
      const now = new Date();
      await api.apiAddOnlineRequisition(labId, {
          ...r,
          id,
          status: 'PENDING',
          createdAt: now,
          sentAt: now
      } as OnlineRequisition);
  };

  const updateOnlineRequisition = async (labId: string, id: string, updates: Partial<OnlineRequisition>) => {
      const finalUpdates = { ...updates };
      const now = new Date();
      if (updates.status === 'ACCEPTED') {
          finalUpdates.acceptedAt = now;
      } else if (updates.status === 'REJECTED') {
          finalUpdates.rejectedAt = now;
      }
      await api.apiUpdateOnlineRequisition(labId, id, finalUpdates);
  };

  const addCardMachine = async (m: Omit<CardMachine, 'id' | 'organizationId' | 'createdAt'>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiAddCardMachine(orgId, { ...m, id: `machine_${Date.now()}`, organizationId: orgId, createdAt: new Date() } as CardMachine);
  };
  const updateCardMachine = async (id: string, u: Partial<CardMachine>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiUpdateCardMachine(orgId, id, u);
  };
  const deleteCardMachine = async (id: string) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiDeleteCardMachine(orgId, id);
  };

  const addBankAccount = async (acc: Omit<BankAccount, 'id' | 'organizationId' | 'createdAt'>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiAddBankAccount(orgId, { ...acc, id: `bank_${Date.now()}`, organizationId: orgId, createdAt: new Date() } as BankAccount);
  };
  const updateBankAccount = async (id: string, u: Partial<BankAccount>) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiUpdateBankAccount(orgId, id, u);
  };
  const deleteBankAccount = async (id: string) => {
      const orgId = activeDataId;
      if(!orgId) return;
      await api.apiDeleteBankAccount(orgId, id);
  };

  const addPriceTable = async (table: Omit<PriceTable, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    const orgId = activeDataId;
    if (!orgId) return;
    try {
      const newTable: PriceTable = {
        ...table,
        id: `tab_${Date.now()}`,
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await api.apiAddPriceTable(orgId, newTable);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, `organizations/${orgId}/priceTables`);
    }
  };

  const updatePriceTable = async (id: string, updates: Partial<PriceTable>) => {
    const orgId = activeDataId;
    if (!orgId) return;
    try {
      await api.apiUpdatePriceTable(orgId, id, updates);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `organizations/${orgId}/priceTables/${id}`);
    }
  };

  const deletePriceTable = async (id: string) => {
    const orgId = activeDataId;
    if (!orgId) return;
    try {
      await api.apiDeletePriceTable(orgId, id);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `organizations/${orgId}/priceTables/${id}`);
    }
  };

  const switchActiveOrganization = (id: string | null) => {
    if (!id) { setActiveOrganization(null); return; }
    
    getDoc(doc(db, 'organizations', id)).then((snap: any) => {
         if (snap.exists()) {
             const data = snap.data();
             const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
             setActiveOrganization({ id: snap.id, ...data, createdAt: createdAtDate } as Organization);
         }
    }).catch((err: any) => {
         logger.warn({ err: err }, `[Firestore] Error in switchActiveOrganization for id ${id}:`);
    });
  };

  const addJobToRoute = async (job: Job, driver: string, shift: 'MORNING' | 'AFTERNOON', date: Date) => {
      const orgId = currentUser?.organizationId;
      if (!orgId) return;
      const dateStr = date.toISOString().split('T')[0];
      const routeId = `route_${dateStr}_${shift}_${driver.replace(/\s+/g, '_')}`;
      const routeSnap = await getDoc(doc(db, 'organizations', orgId, 'routes', routeId));
      if (!routeSnap.exists()) {
          await api.apiAddRoute(orgId, {
              id: routeId, organizationId: orgId, date: date, shift: shift, driverName: driver, status: 'OPEN', createdAt: new Date()
          });
      }
      const dentist = manualDentists.find(d => d.id === job.dentistId);
      const onlineDentist = allUsers.find(u => u.id === job.dentistId);
      const address = dentist ? `${dentist.address}, ${dentist.number} - ${dentist.city}` : (onlineDentist?.address || 'Endereço não cadastrado');
      const routeItem: RouteItem = {
          id: `item_${Date.now()}`, routeId: routeId, jobId: job.id, dentistId: job.dentistId, dentistName: job.dentistName, patientName: job.patientName, address: address, type: 'DELIVERY', order: Date.now() 
      };
      await api.apiAddRouteItem(orgId, routeId, routeItem);
      await api.apiUpdateJob(orgId, job.id, { routeId });
  };

  const generateBatchBoleto = async (dentistId: string, jobIds: string[], dueDate: Date, customAmount?: number) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;

    const dentist = manualDentists.find(d => d.id === dentistId) || allUsers.find(u => u.id === dentistId);
    const dentistName = dentist?.name || 'Dentista';

    const batchId = `bb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    let finalAmount = customAmount !== undefined && customAmount !== null ? customAmount : 0;
    if (!finalAmount && jobIds.length > 0) {
      const jobsInBatch = jobs.filter(j => jobIds.includes(j.id));
      finalAmount = jobsInBatch.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
    }

    const newBatch: BillingBatch = {
      id: batchId,
      organizationId: orgId,
      dentistId,
      dentistName,
      jobIds,
      totalAmount: finalAmount,
      status: 'PENDING',
      dueDate,
      createdAt: new Date(),
      boletoUrl: `https://www.asaas.com/api/v3/payments/dummy_${batchId}/pdf`,
      invoiceUrl: `https://www.asaas.com/api/v3/payments/dummy_${batchId}/invoice`
    };

    if (currentOrg?.financialSettings?.asaasWalletId) {
       try {
         const result = await api.apiGenerateBatchBoleto(orgId, dentistId, jobIds, dueDate, customAmount);
         if (result) {
           if (result.id) newBatch.id = result.id;
           if (result.boletoUrl) newBatch.boletoUrl = result.boletoUrl;
           if (result.invoiceUrl) newBatch.invoiceUrl = result.invoiceUrl;
           if (result.totalAmount && !customAmount) newBatch.totalAmount = result.totalAmount;
         }
       } catch (err) {
         logger.warn({ err: err }, "Real Asaas failed, using robust offline generation:");
       }
    }

    await api.apiAddBillingBatch(orgId, newBatch);
    return newBatch;
  };

  const addDentistPayment = async (p: Omit<DentistPayment, 'id' | 'organizationId' | 'createdAt'>) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    const newPayment: DentistPayment = {
      ...p,
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      createdAt: new Date()
    };
    await api.apiAddDentistPayment(orgId, newPayment);
  };

  const updateDentistPayment = async (id: string, updates: Partial<DentistPayment>) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    await api.apiUpdateDentistPayment(orgId, id, updates);
  };

  const updateBillingBatchStatus = async (id: string, status: BillingBatch['status']) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    await api.apiUpdateBillingBatchStatus(orgId, id, status);

    if (status === 'PAID') {
      try {
        const batch = billingBatches.find(b => b.id === id);
        if (batch) {
          const alreadyPaid = dentistPayments.some(p => p.batchId === id);
          if (!alreadyPaid) {
            await addDentistPayment({
              dentistId: batch.dentistId,
              dentistName: batch.dentistName,
              amount: batch.totalAmount,
              paymentMethod: 'BOLETO',
              paymentDate: new Date(),
              type: 'PAYMENT',
              notes: `Baixa de boleto - Fatura #${batch.id.slice(-6).toUpperCase()}`,
              batchId: batch.id
            });
          }
        }
      } catch (err) {
        logger.error({ err: err }, "Erro ao dar baixa no extrato do faturamento:");
      }
    }
  };

  const addPatientPayment = async (p: Omit<import('../types').PatientPayment, 'id' | 'organizationId' | 'createdAt'>) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    const newPayment: import('../types').PatientPayment = {
      ...p,
      id: `pat_pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      createdAt: new Date()
    };
    await api.apiAddPatientPayment(orgId, newPayment);
  };

  const updatePatientPayment = async (id: string, updates: Partial<import('../types').PatientPayment>) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    await api.apiUpdatePatientPayment(orgId, id, updates);
  };

  const deletePatientPayment = async (id: string) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    await api.apiDeletePatientPayment(orgId, id);
  };

  const addPatientBillingBatch = async (b: Omit<import('../types').PatientBillingBatch, 'id' | 'organizationId' | 'createdAt'>) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    const newBatch: import('../types').PatientBillingBatch = {
      ...b,
      id: `pat_bat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      createdAt: new Date()
    };
    await api.apiAddPatientBillingBatch(orgId, newBatch);
  };

  const updatePatientBillingBatchStatus = async (id: string, status: import('../types').PatientBillingBatch['status']) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    await api.apiUpdatePatientBillingBatchStatus(orgId, id, status);
  };

  const deletePatientBillingBatch = async (id: string) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    await api.apiDeletePatientBillingBatch(orgId, id);
  };

  const addCourier = async (c: Omit<Courier, 'id' | 'organizationId' | 'createdAt'>) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    const newCourier: Courier = {
      ...c,
      id: `cour_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      createdAt: new Date()
    };
    await api.apiAddCourier(orgId, newCourier);
  };

  const updateCourier = async (id: string, updates: Partial<Courier>) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    await api.apiUpdateCourier(orgId, id, updates);
  };

  const deleteCourier = async (id: string) => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;
    await api.apiDeleteCourier(orgId, id);
  };

  const contextValue = useMemo(() => ({
    currentUser, currentOrg, currentPlan, isLoadingAuth, globalSettings,
    allUsers, jobs, jobTypes, clinicServices, clinicRooms, clinicDentists, sectors, boxColors, alerts, commissions,
    allOrganizations, allLaboratories, allPlans, coupons, patients, appointments, manualDentists, priceTables, billingBatches, dentistPayments, 
    patientPayments, patientBillingBatches,
    cardMachines, bankAccounts, inventoryCategories, inventoryItems, productCatalogItems,
    activeAlert,
    allPayments,
    nfcBoxes,
    login, logout, updateUser, addUser, deleteUser,
    addJob, updateJob, addCommissionRecord, updateCommissionStatus, updateCommissionRecord, deleteCommissionRecord,
    addInventoryCategory, updateInventoryCategory, deleteInventoryCategory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    addProductCatalogItem, updateProductCatalogItem, deleteProductCatalogItem,
    addJobType, updateJobType, deleteJobType,
    addClinicService, updateClinicService, deleteClinicService,
    addClinicRoom, updateClinicRoom, deleteClinicRoom,
    addClinicDentist, updateClinicDentist, deleteClinicDentist,
    addSector, deleteSector, addBoxColor, deleteBoxColor,
    cart, addToCart: (i: CartItem) => setCart(p => [...p,i]), removeFromCart: (id: string) => setCart(p => p.filter(i => i.cartItemId !== id)), updateCartItemQty: (id: string, qty: number) => setCart(p => p.map(item => item.cartItemId === id ? { ...item, quantity: Math.max(1, qty), finalPrice: item.unitPrice * Math.max(1, qty) } : item)), clearCart: () => setCart([]),
    uploadFile: api.uploadJobFile,
    getOriginalUrl: api.getOriginalUrl,
    printData, triggerPrint: (j: Job,m: 'SHEET' | 'LABEL' | 'ADDRESS_LABEL' | 'INVOICE_SHEET') => setPrintData({job:j, mode:m}), 
    triggerRoutePrint: (items: RouteItem[], driver: string, shift: string, date: string) => setPrintData({ mode: 'ROUTE', routeItems: items, driver, shift, date }),
    clearPrint: () => setPrintData(null),
    activeOrganization, switchActiveOrganization, userConnections,
    onlineRequisitions, addOnlineRequisition, updateOnlineRequisition, activeManualDentistId,
    updateOrganization, checkSlugAvailability, updateGlobalSettings, validateCoupon, createSubscription, createLabWallet, getSaaSInvoices, checkSubscriptionStatus, setSubscriptionStatus,
    addAlert, dismissAlert, addPatient, updatePatient, deletePatient, addAppointment, updateAppointment, deleteAppointment,
    registerOrganization, registerOutsourcedLab, registerDentist, registerSupplier, validateCro, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
    allSuppliers, allSupplierProducts, supplierOrders, addSupplierOrder, updateSupplierOrder,
    addConnectionByCode, addCoupon, updateCoupon, deleteCoupon, addPayment,
    addManualDentist, updateManualDentist, deleteManualDentist,
    addCardMachine, updateCardMachine, deleteCardMachine,
    addBankAccount, updateBankAccount, deleteBankAccount,
    addPriceTable, updatePriceTable, deletePriceTable,
    addJobToRoute, generateBatchBoleto,
    addDentistPayment, updateDentistPayment, updateBillingBatchStatus,
    addPatientPayment, updatePatientPayment, deletePatientPayment,
    addPatientBillingBatch, updatePatientBillingBatchStatus, deletePatientBillingBatch,
    labCoupons, addLabCoupon, updateLabCoupon, deleteLabCoupon, validateLabCoupon,
    couriers, addCourier, updateCourier, deleteCourier
  }), [
    currentUser, currentOrg, currentPlan, isLoadingAuth, globalSettings,
    allUsers, jobs, jobTypes, clinicServices, clinicRooms, clinicDentists, sectors, boxColors, alerts, commissions,
    allOrganizations, allLaboratories, allPlans, coupons, labCoupons, patients, appointments, manualDentists, priceTables, billingBatches, dentistPayments, activeAlert,
    patientPayments, patientBillingBatches,
    cardMachines, bankAccounts, inventoryCategories, inventoryItems,
    allSuppliers, allSupplierProducts, supplierOrders,
    allPayments, cart, printData, activeOrganization, userConnections, activeDataId, couriers, onlineRequisitions, nfcBoxes
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
