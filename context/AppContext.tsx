import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
  User, Job, JobType, CartItem, UserRole, Sector, JobAlert, Attachment,
  ClinicPatient, Appointment, Organization, SubscriptionPlan, OrganizationConnection, Coupon, CommissionRecord, CommissionStatus
} from '../types';
import { db, auth } from '../services/firebaseConfig';
import * as api from '../services/firebaseService';
import { JobStatus, UrgencyLevel } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface AppContextType {
  currentUser: User | null;
  currentOrg: Organization | null;
  currentPlan: SubscriptionPlan | null;
  isLoadingAuth: boolean;
  
  allUsers: User[]; 
  jobs: Job[];
  jobTypes: JobType[];
  sectors: Sector[];
  alerts: JobAlert[];
  commissions: CommissionRecord[];
  allOrganizations: Organization[];
  allPlans: SubscriptionPlan[];
  coupons: Coupon[];
  patients: ClinicPatient[];
  appointments: Appointment[];
  activeAlert: JobAlert | null;

  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  addJob: (job: Omit<Job, 'id' | 'organizationId'>) => Promise<void>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  
  addCommissionRecord: (rec: Omit<CommissionRecord, 'id' | 'organizationId'>) => Promise<void>;
  updateCommissionStatus: (id: string, status: CommissionStatus) => Promise<void>;

  addJobType: (type: Omit<JobType, 'id'>) => Promise<void>;
  updateJobType: (id: string, updates: Partial<JobType>) => Promise<void>;
  deleteJobType: (id: string) => Promise<void>;
  addSector: (name: string) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  uploadFile: (file: File) => Promise<string>;

  printData: { job: Job, mode: 'SHEET' | 'LABEL' } | null;
  triggerPrint: (job: Job, mode: 'SHEET' | 'LABEL') => void;
  clearPrint: () => void;
  
  activeOrganization: Organization | null;
  switchActiveOrganization: (id: string | null) => void;
  userConnections: OrganizationConnection[];

  // --- SaaS & Management Methods ---
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  validateCoupon: (code: string, planId: string) => Promise<Coupon | null>;
  createSubscription: (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => Promise<any>;
  createLabWallet: (payload: any) => Promise<any>;
  getSaaSInvoices: (orgId: string) => Promise<any>;
  checkSubscriptionStatus: (orgId: string) => Promise<any>;
  addAlert: (alert: JobAlert) => Promise<void>;
  dismissAlert: (id: string) => Promise<void>;
  addPatient: (p: Omit<ClinicPatient, 'id' | 'organizationId'>) => Promise<void>;
  updatePatient: (id: string, updates: Partial<ClinicPatient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addAppointment: (a: Omit<Appointment, 'id' | 'organizationId'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  registerOrganization: (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string) => Promise<User>;
  registerDentist: (email: string, pass: string, name: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string) => Promise<User>;
  addSubscriptionPlan: (plan: SubscriptionPlan) => Promise<void>;
  updateSubscriptionPlan: (id: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  deleteSubscriptionPlan: (id: string) => Promise<void>;
  addConnectionByCode: (code: string) => Promise<void>;
  addCoupon: (c: Coupon) => Promise<void>;
  updateCoupon: (code: string, updates: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
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
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeAlert, setActiveAlert] = useState<JobAlert | null>(null);

  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [userConnections, setUserConnections] = useState<OrganizationConnection[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<{ job: Job, mode: 'SHEET' | 'LABEL' } | null>(null);

  const orgId = () => activeOrganization?.id || currentUser?.organizationId || 'mock-org';

  useEffect(() => {
    if (!auth) { setIsLoadingAuth(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await api.getUserProfile(user.uid);
        setCurrentUser(profile);
        
        if (profile?.organizationId) {
            const orgRef = doc(db, 'organizations', profile.organizationId);
            const unsubOrg = onSnapshot(orgRef, (snap) => {
                if (snap.exists()) {
                    const oData = { id: snap.id, ...snap.data() } as Organization;
                    setCurrentOrg(oData);
                    
                    const planRef = doc(db, 'subscriptionPlans', oData.planId);
                    getDoc(planRef).then(pSnap => {
                        if (pSnap.exists()) setCurrentPlan({ id: pSnap.id, ...pSnap.data() } as SubscriptionPlan);
                    });
                }
            });
            return () => unsubOrg();
        }
      } else {
        setCurrentUser(null);
        setCurrentOrg(null);
        setCurrentPlan(null);
      }
      setIsLoadingAuth(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!db || !currentUser) return;
    const targetOrgId = orgId();
    if (!targetOrgId) return;

    const unsubJobs = api.subscribeJobs(targetOrgId, setJobs);
    const unsubUsers = api.subscribeOrgUsers(targetOrgId, setAllUsers);
    const unsubJobTypes = api.subscribeJobTypes(targetOrgId, setJobTypes);
    const unsubSectors = api.subscribeSectors(targetOrgId, setSectors);
    const unsubComms = api.subscribeCommissions(targetOrgId, setCommissions);
    const unsubPatients = api.subscribePatients(targetOrgId, setPatients);
    const unsubAppointments = api.subscribeAppointments(targetOrgId, setAppointments);
    const unsubAlerts = api.subscribeAlerts(targetOrgId, setAlerts);

    // Conexões do Dentista
    let unsubConns = () => {};
    if (currentUser.role === UserRole.CLIENT && currentUser.organizationId) {
        unsubConns = api.subscribeUserConnections(currentUser.organizationId, setUserConnections);
    }

    const unsubPlans = api.subscribeSubscriptionPlans(setAllPlans);

    if (currentUser.role === UserRole.SUPER_ADMIN) {
        const unsubOrgs = api.subscribeAllOrganizations(setAllOrganizations);
        const unsubCoupons = api.subscribeCoupons(setCoupons);
        return () => { unsubJobs(); unsubUsers(); unsubJobTypes(); unsubSectors(); unsubComms(); unsubPatients(); unsubAppointments(); unsubAlerts(); unsubOrgs(); unsubPlans(); unsubCoupons(); unsubConns(); };
    }

    return () => { unsubJobs(); unsubUsers(); unsubJobTypes(); unsubSectors(); unsubComms(); unsubPatients(); unsubAppointments(); unsubAlerts(); unsubPlans(); unsubConns(); };
  }, [currentUser, activeOrganization]);

  const login = async (email: string, pass: string) => { await api.apiLogin(email, pass); };
  const logout = () => { api.apiLogout(); };
  const updateUser = async (id: string, u: Partial<User>) => { await api.apiUpdateUser(id, u); };
  const addUser = async (u: User) => { await api.apiAddUser(u); };
  const deleteUser = async (id: string) => { await api.apiDeleteUser(id); };

  const addJob = async (j: Omit<Job, 'id'|'organizationId'>) => { await api.apiAddJob(orgId(), { ...j, id: `job_${Date.now()}`, organizationId: orgId() } as Job); };
  const updateJob = async (id: string, u: Partial<Job>) => { await api.apiUpdateJob(orgId(), id, u); };

  const addCommissionRecord = async (rec: Omit<CommissionRecord, 'id' | 'organizationId'>) => {
      await api.apiAddCommission(orgId(), { ...rec, id: `comm_${Date.now()}`, organizationId: orgId() } as CommissionRecord);
  };
  const updateCommissionStatus = async (id: string, status: CommissionStatus) => {
      await api.apiUpdateCommission(orgId(), id, { status, paidAt: status === CommissionStatus.PAID ? new Date() : undefined });
  };

  const addJobType = async (jt: Omit<JobType, 'id'>) => { await api.apiAddJobType(orgId(), { ...jt, id: `jtype_${Date.now()}` } as JobType); };
  const updateJobType = async (id: string, u: Partial<JobType>) => { await api.apiUpdateJobType(orgId(), id, u); };
  const deleteJobType = async (id: string) => { await api.apiDeleteJobType(orgId(), id); };
  const addSector = async (name: string) => { await api.apiAddSector(orgId(), { id: `sector_${Date.now()}`, name }); };
  const deleteSector = async (id: string) => { await api.apiDeleteSector(orgId(), id); };

  const updateOrganization = async (id: string, u: Partial<Organization>) => { await api.apiUpdateOrganization(id, u); };
  const validateCoupon = async (code: string, planId: string) => await api.apiValidateCoupon(code, planId);
  const createSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => await api.apiCreateSaaSSubscription(orgId, planId, email, name, cpfCnpj);
  const createLabWallet = async (p: any) => await api.apiCreateLabSubAccount(p);
  const getSaaSInvoices = async (orgId: string) => await api.apiGetSaaSInvoices(orgId);
  const checkSubscriptionStatus = async (orgId: string) => await api.apiCheckSubscriptionStatus(orgId);
  
  const addAlert = async (a: JobAlert) => { await api.apiAddAlert(orgId(), a); };
  const dismissAlert = async (id: string) => { await api.apiMarkAlertAsRead(orgId(), id, currentUser?.id || ''); };
  
  const addPatient = async (p: Omit<ClinicPatient, 'id' | 'organizationId'>) => { await api.apiAddPatient(orgId(), { ...p, id: `pat_${Date.now()}`, organizationId: orgId() } as ClinicPatient); };
  const updatePatient = async (id: string, u: Partial<ClinicPatient>) => { await api.apiUpdatePatient(orgId(), id, u); };
  
  // FIX: Adicionado async/await para satisfazer Promise<void>
  const borderDeletePatient = async (id: string) => { await api.apiDeletePatient(orgId(), id); };
  
  const addAppointment = async (a: Omit<Appointment, 'id' | 'organizationId'>) => { await api.apiAddAppointment(orgId(), { ...a, id: `app_${Date.now()}`, organizationId: orgId() } as Appointment); };
  const updateAppointment = async (id: string, u: Partial<Appointment>) => { await api.apiUpdateAppointment(orgId(), id, u); };
  
  // FIX: Adicionado async/await para satisfazer Promise<void>
  const borderDeleteAppointment = async (id: string) => { await api.apiDeleteAppointment(orgId(), id); };
  
  const registerOrganization = async (e: string, p: string, on: string, orn: string, pid: string, t: Date | undefined, c: string | undefined) => await api.apiRegisterOrganization(e, p, on, orn, pid, t, c);
  const registerDentist = async (e: string, p: string, n: string, cn: string, pid: string, t: Date | undefined, c: string | undefined) => await api.apiRegisterDentist(e, p, n, cn, pid, t, c);
  
  const addSubscriptionPlan = async (p: SubscriptionPlan) => { await api.apiAddSubscriptionPlan(p); };
  const updateSubscriptionPlan = async (id: string, u: Partial<SubscriptionPlan>) => { await api.apiUpdateSubscriptionPlan(id, u); };
  const deleteSubscriptionPlan = async (id: string) => { await api.apiDeleteSubscriptionPlan(id); };
  
  const addConnectionByCode = async (code: string) => { 
      if(!currentUser?.organizationId) return;
      await api.apiAddConnectionByCode(currentUser.organizationId, currentUser?.id || '', code); 
  };
  
  const addCoupon = async (c: Coupon) => { await api.apiAddCoupon(c); };
  const updateCoupon = async (id: string, u: Partial<Coupon>) => { await api.apiUpdateCoupon(id, u); };
  const deleteCoupon = async (id: string) => { await api.apiDeleteCoupon(id); };

  const switchActiveOrganization = (id: string | null) => {
    if (!id) {
        setActiveOrganization(null);
        return;
    }
    const found = allOrganizations.find(o => o.id === id);
    if (found) setActiveOrganization(found);
    else setActiveOrganization(null);
  };

  return (
    <AppContext.Provider value={{
      currentUser, currentOrg, currentPlan, isLoadingAuth,
      allUsers, jobs, jobTypes, sectors, alerts, commissions,
      allOrganizations, allPlans, coupons, patients, appointments, activeAlert,
      login, logout, updateUser, addUser, deleteUser,
      addJob, updateJob, addCommissionRecord, updateCommissionStatus,
      addJobType, updateJobType, deleteJobType, addSector, deleteSector,
      cart, addToCart: (i) => setCart(p => [...p,i]), removeFromCart: (id) => setCart(p => p.filter(i => i.cartItemId !== id)), clearCart: () => setCart([]),
      uploadFile: api.uploadJobFile,
      printData, triggerPrint: (j,m) => setPrintData({job:j, mode:m}), clearPrint: () => setPrintData(null),
      activeOrganization, switchActiveOrganization, userConnections,
      updateOrganization, validateCoupon, createSubscription, createLabWallet, getSaaSInvoices, checkSubscriptionStatus,
      addAlert, dismissAlert, addPatient, updatePatient, deletePatient: borderDeletePatient, addAppointment, updateAppointment, deleteAppointment: borderDeleteAppointment,
      registerOrganization, registerDentist, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
      addConnectionByCode, addCoupon, updateCoupon, deleteCoupon
    }}>
      {children}
    </AppContext.Provider>
  );
};