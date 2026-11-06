import React, { createContext, useContext, useState, useEffect } from 'react';
import { Job, User, ManualDentist, Sector, JobType, Organization, DentistPayment, BillingBatch, UserRole, JobStatus } from '../types';
import { auth, db } from '../services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import * as api from '../services/firebaseService';

interface AppContextType {
  jobs: Job[];
  budgets: Job[];
  allUsers: User[];
  manualDentists: ManualDentist[];
  sectors: Sector[];
  jobTypes: JobType[];
  currentOrg: Organization | null;
  activeOrganization: Organization | null;
  currentUser: User | null;
  isLoadingAuth: boolean;
  dentistPayments: DentistPayment[];
  billingBatches: BillingBatch[];
  commissions: any[];
  commissionGroups: any[];
  nfcBoxes: any[];
  onlineRequisitions: any[];
  couriers: any[];
  routes: any[];
  alerts: any[];
  inventoryItems: any[];
  boxColors: any[];
  priceTables: any[];
  userConnections: any[];
  allLaboratories: any[];
  allSuppliers: any[];
  supplierOrders: any[];
  productCatalogItems: any[];
  cart: any[];
  storeCart: any[];
  patients: any[];
  allPlans: any[];
  currentPlan: any;
  language: string;
  theme: string;
  activeAlert: any;
  printData: any;
  globalSettings: any;
  labCoupons: any[];
  activeManualDentistId: string | null;

  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setJobTypes: React.Dispatch<React.SetStateAction<JobType[]>>;
  updateJob: (id: string, data: Partial<Job>) => Promise<void>;
  addJob: (data: any) => Promise<any>;
  updateBudget: (id: string, data: any) => Promise<void>;
  addBudget: (data: any) => Promise<any>;
  addCommissionRecord: (data: any) => Promise<void>;
  updateCommissionRecord: (id: string, data: any) => Promise<void>;
  deleteCommissionRecord: (id: string) => Promise<void>;
  uploadFile: (file: File) => Promise<string>;
  addJobToRoute: (jobId: string, routeId: string) => Promise<void>;
  updateOnlineRequisition: (id: string, data: any) => Promise<void>;
  triggerPrint: (data: any) => void;
  clearPrint: () => void;
  addAlert: (data: any) => Promise<void>;
  dismissAlert: (id: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (theme: string) => void;
  setLanguage: (lang: string) => void;
  updateUser: (id: string, data: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  registerOrganization: (data: any) => Promise<any>;
  registerOutsourcedLab: (data: any) => Promise<any>;
  registerDentist: (data: any) => Promise<any>;
  registerSupplier: (data: any) => Promise<any>;
  validateCro: (cro: string, state: string) => Promise<boolean>;
  validateCoupon: (code: string) => Promise<any>;
  createSubscription: (data: any) => Promise<any>;
  checkSubscriptionStatus: () => Promise<any>;
  addManualDentist: (data: any) => Promise<any>;
  updateManualDentist: (id: string, data: any) => Promise<void>;
  deleteManualDentist: (id: string) => Promise<void>;
  addDentistPayment: (data: any) => Promise<any>;
  updateDentistPayment: (id: string, data: any) => Promise<void>;
  deleteDentistPayment: (id: string) => Promise<void>;
  updateBillingBatchStatus: (id: string, status: string) => Promise<void>;
  generateBatchBoleto: (dentistId: string, jobIds: string[], dueDate: Date, totalAmount: number) => Promise<any>;
  cardMachines: any[];
  bankAccounts: any[];
  addCardMachine: (data: any) => Promise<any>;
  updateCardMachine: (id: string, data: any) => Promise<void>;
  deleteCardMachine: (id: string) => Promise<void>;
  addBankAccount: (data: any) => Promise<any>;
  updateBankAccount: (id: string, data: any) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  addBoxColor: (data: any) => Promise<any>;
  deleteBoxColor: (id: string) => Promise<void>;
  updateOrganization: (data: any) => Promise<void>;
  checkSlugAvailability: (slug: string) => Promise<boolean>;
  createLabWallet: () => Promise<any>;
  getSaaSInvoices: () => Promise<any[]>;
  updateSupplierOrder: (id: string, data: any) => Promise<void>;
  addToCart: (item: any) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  validateLabCoupon: (code: string) => Promise<any>;
  updateLabCoupon: (id: string, data: any) => Promise<void>;
  addLabCoupon: (data: any) => Promise<any>;
  deleteLabCoupon: (id: string) => Promise<void>;
  addConnectionByCode: (code: string) => Promise<any>;
  switchActiveOrganization: (org: any) => void;
  addJobType: (data: any) => Promise<any>;
  updateJobType: (id: string, data: any) => Promise<void>;
  deleteJobType: (id: string) => Promise<void>;
  updateInventoryItem: (id: string, data: any) => Promise<void>;
}

const defaultLabUser: User = {
  id: 'u-lab-default',
  name: 'Laboratório Labprox',
  role: UserRole.ADMIN,
  email: 'laboratorio@labprox.app',
  organizationId: 'org-1'
};

const defaultLabOrg: Organization = {
  id: 'org-1',
  name: 'Labprox - Laboratório Modelo',
  orgType: 'LAB'
};

const initialJobTypes: JobType[] = [
  {
    id: 'jt-1',
    name: 'Coroa de Zircônia',
    category: 'Monolítico',
    price: 100
  },
  {
    id: 'jt-2',
    name: 'Faceta Emax',
    category: 'Monolítico',
    price: 100
  },
  {
    id: 'jt-3',
    name: 'Prótese Total Superior',
    category: 'Prótese Total',
    price: 350
  },
  {
    id: 'jt-4',
    name: 'Placa Miorelaxante',
    category: 'Placas',
    price: 150
  }
];

const initialJobs: Job[] = [
  {
    id: 'job-1',
    osNumber: '0655',
    boxNumber: '565',
    dentistId: 'd-1',
    dentistName: 'Dr. Carlos Silva',
    clinicName: 'Odonto Silva',
    patientName: 'João Santos',
    status: JobStatus.COMPLETED,
    totalValue: 2000,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-1',
        jobTypeId: 'jt-1',
        name: 'Coroa de Zircônia',
        quantity: 10,
        price: 100
      },
      {
        id: 'item-2',
        jobTypeId: 'jt-2',
        name: 'Faceta Emax',
        quantity: 10,
        price: 100
      }
    ]
  },
  {
    id: 'job-2',
    osNumber: '0656',
    boxNumber: '25L',
    dentistId: 'd-2',
    dentistName: 'Dra. Maria Fernandes',
    clinicName: 'Sorriso Total',
    patientName: 'Ana Oliveira',
    status: JobStatus.DELIVERED,
    totalValue: 350,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date().toISOString(),
    items: [
      {
        id: 'item-3',
        jobTypeId: 'jt-3',
        name: 'Prótese Total Superior',
        quantity: 1,
        price: 350
      }
    ]
  }
];

const initialDentists: ManualDentist[] = [
  {
    id: 'd-1',
    name: 'Dr. Carlos Silva',
    clinicName: 'Odonto Silva',
    phone: '(11) 98765-4321',
    email: 'carlos@odontosilva.com'
  },
  {
    id: 'd-2',
    name: 'Dra. Maria Fernandes',
    clinicName: 'Sorriso Total',
    phone: '(11) 91234-5678',
    email: 'maria@sorrisototal.com'
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [budgets] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>(initialJobTypes);

  const [currentUser, setCurrentUser] = useState<User | null>(defaultLabUser);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(defaultLabOrg);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setIsLoadingAuth(true);
        try {
          const profile = await api.getUserProfile(authUser.uid);
          if (profile) {
            setCurrentUser(profile);
            if (profile.organizationId) {
              const orgSnap = await getDoc(doc(db, 'organizations', profile.organizationId));
              if (orgSnap.exists()) {
                setCurrentOrg({ id: orgSnap.id, ...orgSnap.data() } as Organization);
              }
            }
          }
        } catch (err) {
          console.error("Error loading user profile", err);
        } finally {
          setIsLoadingAuth(false);
        }
      }
    });

    return () => unsub();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoadingAuth(true);
    try {
      await api.apiLogin(email, pass);
      if (auth.currentUser) {
        const profile = await api.getUserProfile(auth.currentUser.uid);
        if (profile) {
          setCurrentUser(profile);
          if (profile.organizationId) {
            const orgSnap = await getDoc(doc(db, 'organizations', profile.organizationId));
            if (orgSnap.exists()) {
              setCurrentOrg({ id: orgSnap.id, ...orgSnap.data() } as Organization);
            }
          }
        }
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    try {
      await api.apiLogout();
      setCurrentUser(null);
      setCurrentOrg(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const [allUsers] = useState<User[]>([
    {
      id: 'u-1',
      name: 'Administrador Labprox',
      role: UserRole.ADMIN,
      email: 'admin@labprox.app'
    }
  ]);

  const [manualDentists] = useState<ManualDentist[]>(initialDentists);

  const [sectors] = useState<Sector[]>([
    { id: 's-1', name: 'Gesso' },
    { id: 's-2', name: 'CAD/CAM' },
    { id: 's-3', name: 'Cerâmica' },
    { id: 's-4', name: 'Acabamento' }
  ]);

  const dentistPayments: DentistPayment[] = [
    {
      id: 'pay-1',
      dentistId: 'd-1',
      dentistName: 'Dr. Carlos Silva',
      amount: 1000,
      paymentMethod: 'PIX',
      paymentDate: new Date().toISOString(),
      notes: 'Pagamento parcial OS 0655'
    }
  ];

  const billingBatches: BillingBatch[] = [];
  const [commissions] = useState<any[]>([]);
  const [commissionGroups] = useState<any[]>([]);
  const [nfcBoxes] = useState<any[]>([]);
  const [onlineRequisitions] = useState<any[]>([]);
  const [couriers] = useState<any[]>([]);
  const [routes] = useState<any[]>([]);
  const [alerts] = useState<any[]>([]);
  const [inventoryItems] = useState<any[]>([]);
  const [boxColors] = useState<any[]>([]);
  const [priceTables] = useState<any[]>([]);
  const [userConnections] = useState<any[]>([]);
  const [allLaboratories] = useState<any[]>([]);
  const [allSuppliers] = useState<any[]>([]);
  const [supplierOrders] = useState<any[]>([]);
  const [productCatalogItems] = useState<any[]>([]);
  const [cart] = useState<any[]>([]);
  const [storeCart] = useState<any[]>([]);
  const [patients] = useState<any[]>([]);
  const [allPlans] = useState<any[]>([]);
  const [labCoupons] = useState<any[]>([]);
  const [cardMachines] = useState<any[]>([]);
  const [bankAccounts] = useState<any[]>([]);

  const [language, setLanguageState] = useState<string>('pt-BR');
  const [theme, setThemeState] = useState<string>('light');
  const [printData, setPrintData] = useState<any>(null);

  const asyncNoop = async () => {};
  const asyncResultNoop = async (data?: any) => data || {};

  return (
    <AppContext.Provider value={{
      jobs,
      budgets,
      allUsers,
      manualDentists,
      sectors,
      jobTypes,
      currentOrg,
      activeOrganization: currentOrg,
      currentUser,
      isLoadingAuth,
      dentistPayments,
      billingBatches,
      commissions,
      commissionGroups,
      nfcBoxes,
      onlineRequisitions,
      couriers,
      routes,
      alerts,
      inventoryItems,
      boxColors,
      priceTables,
      userConnections,
      allLaboratories,
      allSuppliers,
      supplierOrders,
      productCatalogItems,
      cart,
      storeCart,
      patients,
      allPlans,
      currentPlan: { id: 'pro', name: 'Plano Pro' },
      language,
      theme,
      activeAlert: null,
      printData,
      globalSettings: {},
      labCoupons,
      activeManualDentistId: null,

      setJobs,
      setJobTypes,
      updateJob: async (id: string, data: Partial<Job>) => {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, ...data } : j));
        if (currentOrg?.id) {
          try {
            await api.apiUpdateJob(currentOrg.id, id, data);
          } catch (err) {
            console.error('[AppContext] Error updating job in Firestore:', err);
          }
        }
      },
      addJob: asyncResultNoop,
      updateBudget: asyncNoop,
      addBudget: asyncResultNoop,
      addCommissionRecord: asyncNoop,
      updateCommissionRecord: asyncNoop,
      deleteCommissionRecord: asyncNoop,
      uploadFile: async () => '',
      addJobToRoute: asyncNoop,
      updateOnlineRequisition: asyncNoop,
      triggerPrint: (data) => setPrintData(data),
      clearPrint: () => setPrintData(null),
      addAlert: asyncNoop,
      dismissAlert: asyncNoop,
      login,
      logout,
      setTheme: (t) => setThemeState(t),
      setLanguage: (l) => setLanguageState(l),
      updateUser: asyncNoop,
      deleteUser: asyncNoop,
      registerOrganization: asyncResultNoop,
      registerOutsourcedLab: asyncResultNoop,
      registerDentist: asyncResultNoop,
      registerSupplier: asyncResultNoop,
      validateCro: async () => true,
      validateCoupon: asyncResultNoop,
      createSubscription: asyncResultNoop,
      checkSubscriptionStatus: asyncResultNoop,
      addManualDentist: asyncResultNoop,
      updateManualDentist: asyncNoop,
      deleteManualDentist: asyncNoop,
      addDentistPayment: asyncResultNoop,
      updateDentistPayment: asyncNoop,
      deleteDentistPayment: asyncNoop,
      updateBillingBatchStatus: asyncNoop,
      generateBatchBoleto: asyncResultNoop,
      cardMachines,
      bankAccounts,
      addCardMachine: asyncResultNoop,
      updateCardMachine: asyncNoop,
      deleteCardMachine: asyncNoop,
      addBankAccount: asyncResultNoop,
      updateBankAccount: asyncNoop,
      deleteBankAccount: asyncNoop,
      addBoxColor: asyncResultNoop,
      deleteBoxColor: asyncNoop,
      updateOrganization: asyncNoop,
      checkSlugAvailability: async () => true,
      createLabWallet: asyncResultNoop,
      getSaaSInvoices: async () => [],
      updateSupplierOrder: asyncNoop,
      addToCart: () => {},
      removeFromCart: () => {},
      updateCartItemQty: () => {},
      clearCart: () => {},
      validateLabCoupon: asyncResultNoop,
      updateLabCoupon: asyncNoop,
      addLabCoupon: asyncResultNoop,
      deleteLabCoupon: asyncNoop,
      addConnectionByCode: asyncResultNoop,
      switchActiveOrganization: () => {},
      addJobType: asyncResultNoop,
      updateJobType: asyncNoop,
      deleteJobType: asyncNoop,
      updateInventoryItem: asyncNoop
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
