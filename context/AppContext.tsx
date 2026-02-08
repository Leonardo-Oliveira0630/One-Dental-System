import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebaseConfig';
import * as api from '../services/firebaseService';
import * as authPkg from 'firebase/auth';
import { 
  User, Job, JobType, Sector, BoxColor, ManualDentist, 
  Coupon, GlobalSettings, Organization, SubscriptionPlan, 
  CartItem, ClinicPatient, Appointment, OrganizationConnection,
  CommissionRecord, JobAlert, ClinicRoom, ClinicDentist, ClinicService,
  UserRole, CommissionStatus
} from '../types';

const { onAuthStateChanged } = authPkg as any;

interface AppContextType {
  currentUser: User | null;
  isLoadingAuth: boolean;
  jobs: Job[];
  jobTypes: JobType[];
  sectors: Sector[];
  boxColors: BoxColor[];
  allUsers: User[];
  manualDentists: ManualDentist[];
  coupons: Coupon[];
  allPlans: SubscriptionPlan[];
  globalSettings: GlobalSettings | null;
  allOrganizations: Organization[];
  allLaboratories: Organization[];
  cart: CartItem[];
  patients: ClinicPatient[];
  appointments: Appointment[];
  clinicRooms: ClinicRoom[];
  clinicDentists: ClinicDentist[];
  clinicServices: ClinicService[];
  userConnections: OrganizationConnection[];
  activeOrganization: Organization | null;
  printData: any;
  activeAlert: JobAlert | null;
  commissions: CommissionRecord[];
  currentOrg: Organization | null;
  currentPlan: SubscriptionPlan | null;

  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  registerOrganization: (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string) => Promise<User>;
  registerDentist: (email: string, pass: string, name: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'organizationId'>) => Promise<void>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  addJobType: (type: Omit<JobType, 'id'>) => Promise<void>;
  updateJobType: (id: string, updates: Partial<JobType>) => Promise<void>;
  deleteJobType: (id: string) => Promise<void>;
  addSector: (name: string) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  addBoxColor: (color: Omit<BoxColor, 'id'>) => Promise<void>;
  deleteBoxColor: (id: string) => Promise<void>;
  addManualDentist: (d: Omit<ManualDentist, 'id' | 'organizationId'>) => Promise<void>;
  updateManualDentist: (id: string, updates: Partial<ManualDentist>) => Promise<void>;
  deleteManualDentist: (id: string) => Promise<void>;
  addCommissionRecord: (rec: Omit<CommissionRecord, 'id'>) => Promise<void>;
  updateCommissionStatus: (id: string, status: CommissionStatus) => Promise<void>;
  addAlert: (alert: JobAlert) => Promise<void>;
  dismissAlert: (id: string) => Promise<void>;
  addPatient: (p: Omit<ClinicPatient, 'id' | 'organizationId'>) => Promise<void>;
  updatePatient: (id: string, updates: Partial<ClinicPatient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addAppointment: (a: Appointment) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  addClinicRoom: (room: Omit<ClinicRoom, 'id'>) => Promise<void>;
  updateClinicRoom: (id: string, updates: Partial<ClinicRoom>) => Promise<void>;
  deleteClinicRoom: (id: string) => Promise<void>;
  addClinicDentist: (dentist: Omit<ClinicDentist, 'id'>) => Promise<void>;
  updateClinicDentist: (id: string, updates: Partial<ClinicDentist>) => Promise<void>;
  deleteClinicDentist: (id: string) => Promise<void>;
  addClinicService: (service: Omit<ClinicService, 'id'>) => Promise<void>;
  updateClinicService: (id: string, updates: Partial<ClinicService>) => Promise<void>;
  deleteClinicService: (id: string) => Promise<void>;
  addSubscriptionPlan: (p: SubscriptionPlan) => Promise<void>;
  updateSubscriptionPlan: (id: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  deleteSubscriptionPlan: (id: string) => Promise<void>;
  addCoupon: (c: Coupon) => Promise<void>;
  updateCoupon: (id: string, updates: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  validateCoupon: (code: string, planId: string) => Promise<Coupon | null>;
  createSubscription: (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => Promise<any>;
  checkSubscriptionStatus: (orgId: string) => Promise<any>;
  createLabWallet: (payload: any) => Promise<any>;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => Promise<void>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  triggerPrint: (job: Job, mode: 'SHEET' | 'LABEL') => void;
  triggerRoutePrint: (routeItems: any[], driver: string, shift: string, date: string) => void;
  clearPrint: () => void;
  uploadFile: (file: File) => Promise<string>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  switchActiveOrganization: (orgId: string) => void;
  addConnectionByCode: (code: string) => Promise<void>;
  addJobToRoute: (job: Job, driver: string, shift: 'MORNING' | 'AFTERNOON', date: Date) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [boxColors, setBoxColors] = useState<BoxColor[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [manualDentists, setManualDentists] = useState<ManualDentist[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allLaboratories, setAllLaboratories] = useState<Organization[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinicRooms, setClinicRooms] = useState<ClinicRoom[]>([]);
  const [clinicDentists, setClinicDentists] = useState<ClinicDentist[]>([]);
  const [clinicServices, setClinicServices] = useState<ClinicService[]>([]);
  const [userConnections, setUserConnections] = useState<OrganizationConnection[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [activeAlert, setActiveAlert] = useState<JobAlert | null>(null);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);

  const currentOrg = allOrganizations.find(o => o.id === currentUser?.organizationId) || null;
  const currentPlan = allPlans.find(p => p.id === currentOrg?.planId) || null;

  useEffect(() => {
    return onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        const profile = await api.getUserProfile(user.uid);
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
      }
      setIsLoadingAuth(false);
    });
  }, []);

  // Global Subscriptions
  /* UseEffect to subscribe to global collections as per instructions */
  useEffect(() => {
    if (!db) return;
    
    let unsubPlans = () => {};
    let unsubCoupons = () => {};
    let unsubSettings = () => {};
    let unsubOrgs = () => {};
    let unsubLabs = () => {};

    try {
        unsubPlans = api.subscribeSubscriptionPlans((plans) => {
            setAllPlans(plans);
        });
        
        unsubCoupons = api.subscribeCoupons((coups) => {
            setCoupons(coups);
        });
        
        unsubSettings = api.subscribeGlobalSettings((settings) => {
            setGlobalSettings(settings);
        });

        unsubOrgs = api.subscribeAllOrganizations(setAllOrganizations);
        unsubLabs = api.subscribeAllLaboratories(setAllLaboratories);
    } catch (err) {
        console.warn("[ProTrack] Falha ao assinar coleções globais:", err);
    }

    return () => { 
        unsubPlans(); 
        unsubCoupons(); 
        unsubSettings(); 
        unsubOrgs();
        unsubLabs();
    };
  }, []);

  // Organization-specific subscriptions
  useEffect(() => {
    if (currentUser?.organizationId) {
      const orgId = currentUser.organizationId;
      const unsubs = [
        api.subscribeJobs(orgId, setJobs),
        api.subscribeJobTypes(orgId, setJobTypes),
        api.subscribeSectors(orgId, setSectors),
        api.subscribeBoxColors(orgId, setBoxColors),
        api.subscribeOrgUsers(orgId, setAllUsers),
        api.subscribeManualDentists(orgId, setManualDentists),
        api.subscribeCommissions(orgId, setCommissions),
        api.subscribeAlerts(orgId, (alerts) => {
            const now = new Date();
            const active = alerts.find(a => !a.readBy.includes(currentUser.id) && new Date(a.scheduledFor) <= now);
            setActiveAlert(active || null);
        }),
        api.subscribePatients(orgId, setPatients),
        api.subscribeAppointments(orgId, setAppointments),
        api.subscribeClinicRooms(orgId, setClinicRooms),
        api.subscribeClinicDentists(orgId, setClinicDentists),
        api.subscribeClinicServices(orgId, setClinicServices),
        api.subscribeUserConnections(orgId, setUserConnections)
      ];
      return () => unsubs.forEach(unsub => unsub());
    }
  }, [currentUser]);

  // Methods implementation
  const login = (email: string, pass: string) => api.apiLogin(email, pass);
  const logout = () => api.apiLogout();
  
  const addJob = async (job: any) => {
    if (currentUser?.organizationId) {
        const id = `job_${Date.now()}`;
        await api.apiAddJob(currentUser.organizationId, { ...job, id, organizationId: currentUser.organizationId });
    }
  };

  const updateJob = async (id: string, updates: any) => {
    if (currentUser?.organizationId) {
        await api.apiUpdateJob(currentUser.organizationId, id, updates);
    }
  };

  const addJobType = async (type: any) => {
    if (currentUser?.organizationId) {
        const id = `type_${Date.now()}`;
        await api.apiAddJobType(currentUser.organizationId, { ...type, id });
    }
  };

  const updateJobType = async (id: string, updates: any) => {
    if (currentUser?.organizationId) {
        await api.apiUpdateJobType(currentUser.organizationId, id, updates);
    }
  };

  const deleteJobType = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeleteJobType(currentUser.organizationId, id);
    }
  };

  const addSector = async (name: string) => {
    if (currentUser?.organizationId) {
        const id = `sec_${Date.now()}`;
        await api.apiAddSector(currentUser.organizationId, { id, name });
    }
  };

  const deleteSector = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeleteSector(currentUser.organizationId, id);
    }
  };

  const addBoxColor = async (color: any) => {
    if (currentUser?.organizationId) {
        const id = `color_${Date.now()}`;
        await api.apiAddBoxColor(currentUser.organizationId, { ...color, id });
    }
  };

  const deleteBoxColor = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeleteBoxColor(currentUser.organizationId, id);
    }
  };

  const addManualDentist = async (d: any) => {
    if (currentUser?.organizationId) {
        const id = `dentist_${Date.now()}`;
        await api.apiAddManualDentist(currentUser.organizationId, { ...d, id, organizationId: currentUser.organizationId });
    }
  };

  const updateManualDentist = async (id: string, updates: any) => {
    if (currentUser?.organizationId) {
        await api.apiUpdateManualDentist(currentUser.organizationId, id, updates);
    }
  };

  const deleteManualDentist = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeleteManualDentist(currentUser.organizationId, id);
    }
  };

  const addCommissionRecord = async (rec: any) => {
    if (currentUser?.organizationId) {
        const id = `comm_${Date.now()}`;
        await api.apiAddCommission(currentUser.organizationId, { ...rec, id });
    }
  };

  const updateCommissionStatus = async (id: string, status: CommissionStatus) => {
    if (currentUser?.organizationId) {
        await api.apiUpdateCommission(currentUser.organizationId, id, { status, paidAt: status === CommissionStatus.PAID ? new Date() : undefined });
    }
  };

  const addAlert = async (alert: JobAlert) => {
    if (currentUser?.organizationId) {
        await api.apiAddAlert(currentUser.organizationId, alert);
    }
  };

  const dismissAlert = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiMarkAlertAsRead(currentUser.organizationId, id, currentUser.id);
    }
  };

  const addPatient = async (p: any) => {
    if (currentUser?.organizationId) {
        const id = `patient_${Date.now()}`;
        await api.apiAddPatient(currentUser.organizationId, { ...p, id, organizationId: currentUser.organizationId });
    }
  };

  const updatePatient = async (id: string, updates: any) => {
    if (currentUser?.organizationId) {
        await api.apiUpdatePatient(currentUser.organizationId, id, updates);
    }
  };

  const deletePatient = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeletePatient(currentUser.organizationId, id);
    }
  };

  const addAppointment = async (a: Appointment) => {
    if (currentUser?.organizationId) {
        await api.apiAddAppointment(currentUser.organizationId, a);
    }
  };

  const updateAppointment = async (id: string, updates: any) => {
    if (currentUser?.organizationId) {
        await api.apiUpdateAppointment(currentUser.organizationId, id, updates);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeleteAppointment(currentUser.organizationId, id);
    }
  };

  const addClinicRoom = async (room: any) => {
    if (currentUser?.organizationId) {
        const id = `room_${Date.now()}`;
        await api.apiAddClinicRoom(currentUser.organizationId, { ...room, id });
    }
  };

  const updateClinicRoom = async (id: string, updates: any) => {
    if (currentUser?.organizationId) {
        await api.apiUpdateClinicRoom(currentUser.organizationId, id, updates);
    }
  };

  const deleteClinicRoom = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeleteClinicRoom(currentUser.organizationId, id);
    }
  };

  const addClinicDentist = async (dentist: any) => {
    if (currentUser?.organizationId) {
        const id = `dentist_${Date.now()}`;
        await api.apiAddClinicDentist(currentUser.organizationId, { ...dentist, id });
    }
  };

  const updateClinicDentist = async (id: string, updates: any) => {
    if (currentUser?.organizationId) {
        await api.apiUpdateClinicDentist(currentUser.organizationId, id, updates);
    }
  };

  const deleteClinicDentist = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeleteClinicDentist(currentUser.organizationId, id);
    }
  };

  const addClinicService = async (service: any) => {
    if (currentUser?.organizationId) {
        const id = `svc_${Date.now()}`;
        await api.apiAddClinicService(currentUser.organizationId, { ...service, id });
    }
  };

  const updateClinicService = async (id: string, updates: any) => {
    if (currentUser?.organizationId) {
        await api.apiUpdateClinicService(currentUser.organizationId, id, updates);
    }
  };

  const deleteClinicService = async (id: string) => {
    if (currentUser?.organizationId) {
        await api.apiDeleteClinicService(currentUser.organizationId, id);
    }
  };

  const addSubscriptionPlan = (p: SubscriptionPlan) => api.apiAddSubscriptionPlan(p);
  const updateSubscriptionPlan = (id: string, updates: any) => api.apiUpdateSubscriptionPlan(id, updates);
  const deleteSubscriptionPlan = (id: string) => api.apiDeleteSubscriptionPlan(id);

  const addCoupon = (c: Coupon) => api.apiAddCoupon(c);
  const updateCoupon = (id: string, updates: any) => api.apiUpdateCoupon(id, updates);
  const deleteCoupon = (id: string) => api.apiDeleteCoupon(id);
  const validateCoupon = (code: string, planId: string) => api.apiValidateCoupon(code, planId);

  const createSubscription = (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => 
    api.apiCreateSaaSSubscription(orgId, planId, email, name, cpfCnpj);
  
  const checkSubscriptionStatus = (orgId: string) => api.apiCheckSubscriptionStatus(orgId);
  const createLabWallet = (payload: any) => api.apiCreateLabSubAccount(payload);
  
  const updateGlobalSettings = (updates: any) => api.apiUpdateGlobalSettings(updates);
  const updateOrganization = (id: string, updates: any) => api.apiUpdateOrganization(id, updates);
  
  const triggerPrint = (job: Job, mode: 'SHEET' | 'LABEL') => setPrintData({ job, mode });
  const triggerRoutePrint = (routeItems: any[], driver: string, shift: string, date: string) => setPrintData({ routeItems, driver, shift, date, mode: 'ROUTE' });
  const clearPrint = () => setPrintData(null);
  const uploadFile = (file: File) => api.uploadJobFile(file);

  const addToCart = (item: CartItem) => setCart([...cart, item]);
  const removeFromCart = (id: string) => setCart(cart.filter(i => i.cartItemId !== id));
  const clearCart = () => setCart([]);

  const switchActiveOrganization = (orgId: string) => {
    const org = allLaboratories.find(l => l.id === orgId);
    setActiveOrganization(org || null);
  };

  const addConnectionByCode = async (code: string) => {
    if (currentUser?.organizationId) {
        await api.apiAddConnectionByCode(currentUser.organizationId, currentUser.id, code);
    }
  };

  const addJobToRoute = async (job: Job, driver: string, shift: 'MORNING' | 'AFTERNOON', date: Date) => {
    if (currentUser?.organizationId) {
        const routeId = `route_${date.toISOString().split('T')[0]}_${shift}_${driver.replace(/\s+/g, '_')}`;
        await api.apiAddRoute(currentUser.organizationId, {
            id: routeId,
            organizationId: currentUser.organizationId,
            date,
            shift,
            driverName: driver,
            status: 'OPEN',
            createdAt: new Date()
        });
        const dentist = manualDentists.find(d => d.id === job.dentistId) || allUsers.find(u => u.id === job.dentistId);
        const address = dentist?.address ? `${dentist.address}, ${dentist.number} - ${dentist.city}` : 'Endereço não informado';
        
        await api.apiAddRouteItem(currentUser.organizationId, routeId, {
            id: `item_${job.id}`,
            routeId,
            jobId: job.id,
            dentistId: job.dentistId,
            dentistName: job.dentistName,
            patientName: job.patientName,
            address,
            type: 'DELIVERY',
            order: 0
        });
        await api.apiUpdateJob(currentUser.organizationId, job.id, { routeId });
    }
  };

  const updateUser = (id: string, updates: Partial<User>) => api.apiUpdateUser(id, updates);
  const deleteUser = (id: string) => api.apiDeleteUser(id);
  const registerOrganization = api.apiRegisterOrganization;
  const registerDentist = api.apiRegisterDentist;

  const value = {
    currentUser, isLoadingAuth, jobs, jobTypes, sectors, boxColors, allUsers, 
    manualDentists, coupons, allPlans, globalSettings, allOrganizations, 
    allLaboratories, cart, patients, appointments, clinicRooms, clinicDentists, 
    clinicServices, userConnections, activeOrganization, printData, activeAlert,
    commissions, currentOrg, currentPlan,
    login, logout, registerOrganization, registerDentist, updateUser, deleteUser,
    addJob, updateJob, addJobType, updateJobType, deleteJobType, addSector, deleteSector,
    addBoxColor, deleteBoxColor, addManualDentist, updateManualDentist, deleteManualDentist,
    addCommissionRecord, updateCommissionStatus, addAlert, dismissAlert, addPatient,
    updatePatient, deletePatient, addAppointment, updateAppointment, deleteAppointment,
    addClinicRoom, updateClinicRoom, deleteClinicRoom, addClinicDentist, updateClinicDentist,
    deleteClinicDentist, addClinicService, updateClinicService, deleteClinicService,
    addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, addCoupon,
    updateCoupon, deleteCoupon, validateCoupon, createSubscription, checkSubscriptionStatus,
    createLabWallet, updateGlobalSettings, triggerPrint, triggerRoutePrint, clearPrint,
    uploadFile, addToCart, removeFromCart, clearCart, switchActiveOrganization,
    addConnectionByCode, addJobToRoute, updateOrganization
  };

  return <AppContext.Provider value={value as any}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};
