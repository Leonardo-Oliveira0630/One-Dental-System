import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
  User, Job, JobType, CartItem, UserRole, Sector, JobAlert, Attachment,
  ClinicPatient, Appointment, Organization, SubscriptionPlan, OrganizationConnection, Coupon
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
  patients: ClinicPatient[];
  appointments: Appointment[];

  userConnections: OrganizationConnection[];
  activeOrganization: Organization | null;
  switchActiveOrganization: (organizationId: string | null) => void;
  addConnectionByCode: (orgCode: string) => Promise<void>;

  allOrganizations: Organization[];
  allPlans: SubscriptionPlan[];
  coupons: Coupon[];
  
  login: (email: string, pass: string) => Promise<void>;
  registerOrganization: (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string) => Promise<User>;
  registerUserInOrg: (email: string, pass: string, name: string, role: UserRole, clinicName?: string) => Promise<User>;
  registerDentist: (email: string, pass: string, name: string, clinicName: string) => Promise<User>;
  logout: () => void;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  
  addJob: (job: Omit<Job, 'id' | 'organizationId'>) => Promise<void>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  addJobType: (type: Omit<JobType, 'id'>) => Promise<void>;
  updateJobType: (id: string, updates: Partial<JobType>) => Promise<void>;
  deleteJobType: (id: string) => Promise<void>;
  addSector: (name: string) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  addAlert: (alert: Omit<JobAlert, 'id' | 'organizationId'>) => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  addPatient: (patient: Omit<ClinicPatient, 'id'|'organizationId'|'dentistId'>) => Promise<void>;
  updatePatient: (id: string, updates: Partial<ClinicPatient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addAppointment: (appt: Omit<Appointment, 'id'|'organizationId'|'dentistId'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  
  addSubscriptionPlan: (plan: SubscriptionPlan) => Promise<void>;
  updateSubscriptionPlan: (id: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  deleteSubscriptionPlan: (id: string) => Promise<void>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  
  createSubscription: (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => Promise<{success: boolean, paymentLink?: string, isMock?: boolean}>;

  addCoupon: (coupon: Coupon) => Promise<void>;
  updateCoupon: (code: string, updates: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (code: string) => Promise<void>;
  validateCoupon: (code: string, planId: string) => Promise<Coupon | null>;

  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  createWebOrder: (patientName: string, dueDate: Date, notes: string, attachments: Attachment[]) => Promise<void>;
  uploadFile: (file: File) => Promise<string>;

  printData: { job: Job, mode: 'SHEET' | 'LABEL' } | null;
  triggerPrint: (job: Job, mode: 'SHEET' | 'LABEL') => void;
  clearPrint: () => void;

  activeAlert: JobAlert | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [userConnections, setUserConnections] = useState<OrganizationConnection[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);

  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<{ job: Job, mode: 'SHEET' | 'LABEL' } | null>(null);
  const [activeAlert, setActiveAlert] = useState<JobAlert | null>(null);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // ACTIONS DEFINED BEFORE EFFECTS
  const switchActiveOrganization = useCallback(async (organizationId: string | null) => {
    if (!organizationId) {
      setActiveOrganization(null);
      setCurrentPlan(null);
      return;
    }
    
    // Prevent refetching if already active to avoid loops
    if (activeOrganization?.id === organizationId) return;

    const orgRef = doc(db, 'organizations', organizationId);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      const orgData = { id: orgSnap.id, ...orgSnap.data() } as Organization;
      setActiveOrganization(orgData);
      
      // Fetch plan immediately for the switched org
      if (orgData.planId) {
          const planRef = doc(db, 'subscriptionPlans', orgData.planId);
          getDoc(planRef).then(snap => {
               if (snap.exists()) setCurrentPlan({ id: snap.id, ...snap.data() } as SubscriptionPlan);
          });
      }
    }
  }, [activeOrganization]);

  const addConnectionByCode = useCallback(async (orgCode: string) => {
    if (currentUser?.role !== UserRole.CLIENT) throw new Error("Only dentists can add partners.");
    await api.apiAddConnectionByCode(currentUser.id, orgCode);
  }, [currentUser]);

  // Auth Listener
  useEffect(() => {
    if (!auth) { setIsLoadingAuth(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await api.getUserProfile(user.uid);
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        setCurrentOrg(null);
        setCurrentPlan(null);
        setUserConnections([]);
        setActiveOrganization(null);
      }
      setIsLoadingAuth(false);
    });
    return unsub;
  }, []);

  // --- GLOBAL PUBLIC DATA LISTENER (Plans) ---
  // Runs once on mount. Allows Register Page to see prices even if logged out.
  useEffect(() => {
      if (!db) return;
      const unsubPlans = api.subscribeSubscriptionPlans(setAllPlans);
      return () => { unsubPlans(); };
  }, []);

  // Org & Plan Listener (For Lab Staff)
  useEffect(() => {
    if (!db || !currentUser) return;

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      const unsubOrgs = api.subscribeAllOrganizations(setAllOrganizations);
      // Removed duplicate subscribeSubscriptionPlans from here
      const unsubUsers = api.subscribeAllUsers(setAllUsers);
      const unsubCoupons = api.subscribeCoupons(setCoupons);
      return () => { unsubOrgs(); unsubUsers(); unsubCoupons(); };
    }

    if (currentUser.organizationId) {
      const orgRef = doc(db, 'organizations', currentUser.organizationId);
      const unsubOrg = onSnapshot(orgRef, async (docSnap) => {
        if (docSnap.exists()) {
          const orgData = { id: docSnap.id, ...docSnap.data() } as Organization;
          setCurrentOrg(orgData);
          if (currentUser.role !== UserRole.CLIENT) {
              setActiveOrganization(orgData);
          }
          
          // REAL-TIME LISTENER FOR PLAN CHANGES
          if (orgData.planId) {
              const planRef = doc(db, 'subscriptionPlans', orgData.planId);
              onSnapshot(planRef, (planSnap) => {
                  if (planSnap.exists()) {
                    setCurrentPlan({ id: planSnap.id, ...planSnap.data() } as SubscriptionPlan);
                  }
              });
          }
        }
      });
      return unsubOrg;
    }
  }, [currentUser]);

  // Connections Listener (Dentists)
  useEffect(() => {
    if (!db || !currentUser || currentUser.role !== UserRole.CLIENT) return;

    const unsub = api.subscribeUserConnections(currentUser.id, async (connections) => {
      setUserConnections(connections);
      
      if (connections.length > 0) {
          setTimeout(() => {
             setActiveOrganization(prev => {
                 if (!prev || !connections.some(c => c.organizationId === prev.id)) {
                     const firstOrgId = connections[0].organizationId;
                     switchActiveOrganization(firstOrgId);
                     return prev;
                 }
                 return prev;
             });
          }, 0);
      } else {
          setActiveOrganization(null);
      }
    });
    return unsub;
  }, [currentUser, switchActiveOrganization]);

  // Scoped Data Listener
  useEffect(() => {
    const targetOrgId = activeOrganization?.id;
    if (!db || !targetOrgId) {
      setJobs([]); setAllUsers([]); setJobTypes([]); setSectors([]); setAlerts([]); setPatients([]); setAppointments([]);
      return;
    }
    
    // If client, fetch the plan details for the active org so Layout knows features
    if (currentUser?.role === UserRole.CLIENT) {
        const orgRef = doc(db, 'organizations', targetOrgId);
        getDoc(orgRef).then(async snap => {
            if(snap.exists()) {
                const od = snap.data() as Organization;
                if (od.planId) {
                    const planRef = doc(db, 'subscriptionPlans', od.planId);
                    const planSnap = await getDoc(planRef);
                    if(planSnap.exists()) setCurrentPlan({ id: planSnap.id, ...planSnap.data() } as SubscriptionPlan);
                }
            }
        });
    }

    const unsubJobs = api.subscribeJobs(targetOrgId, setJobs);
    const unsubUsers = api.subscribeOrgUsers(targetOrgId, setAllUsers);
    const unsubJobTypes = api.subscribeJobTypes(targetOrgId, setJobTypes);
    const unsubSectors = api.subscribeSectors(targetOrgId, setSectors);
    const unsubAlerts = api.subscribeAlerts(targetOrgId, setAlerts);
    
    let unsubPatients = () => {};
    let unsubAppts = () => {};
    if (currentUser?.role === UserRole.CLIENT) {
        unsubPatients = api.subscribeClinicPatients(targetOrgId, currentUser.id, setPatients);
        unsubAppts = api.subscribeAppointments(targetOrgId, currentUser.id, setAppointments);
    }

    return () => { unsubJobs(); unsubUsers(); unsubJobTypes(); unsubSectors(); unsubAlerts(); unsubPatients(); unsubAppts(); };
  }, [activeOrganization, currentUser]);
  
  const orgId = () => { 
      if (activeOrganization?.id) return activeOrganization.id;
      if (!db) return 'mock-org'; 
      return undefined as any; 
  };

  // ... (Wrappers) ...
  const login = async (email: string, pass: string) => { await api.apiLogin(email, pass); };
  const logout = async () => { await api.apiLogout(); };
  const registerOrganization = async (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string) => await api.apiRegisterOrganization(email, pass, ownerName, orgName, planId, trialEndsAt, couponCode);
  const registerUserInOrg = async (email: string, pass: string, name: string, role: UserRole, clinicName?: string) => await api.apiRegisterUserInOrg(email, pass, name, role, orgId(), clinicName);
  const registerDentist = api.apiRegisterDentist;
  
  const updateUser = async (id: string, u: Partial<User>) => await api.apiUpdateUser(id, u);
  const deleteUser = async (id: string) => await api.apiDeleteUser(id);
  const addUser = async (u: User) => await api.apiAddUser(u);
  
  const addJob = async (j: Omit<Job, 'id'|'organizationId'>) => {
     try {
       await api.apiAddJob(orgId(), { ...j, id: `job_${Date.now()}`, organizationId: orgId() });
     } catch (e) {
       alert("Erro ao adicionar trabalho. Nenhuma organização ativa.");
     }
  };
  const updateJob = async (id: string, u: Partial<Job>) => await api.apiUpdateJob(orgId(), id, u);

  const addJobType = async (jt: Omit<JobType, 'id'>) => {
     try { await api.apiAddJobType(orgId(), { ...jt, id: `jtype_${Date.now()}` }); } catch(e) { alert("Erro ao salvar serviço. Organização inválida."); }
  };
  const updateJobType = async (id: string, u: Partial<JobType>) => await api.apiUpdateJobType(orgId(), id, u);
  const deleteJobType = async (id: string) => await api.apiDeleteJobType(orgId(), id);

  const addSector = async (name: string) => {
      try { await api.apiAddSector(orgId(), { id: `sector_${Date.now()}`, name }); } catch(e) { throw e; }
  };
  const deleteSector = async (id: string) => await api.apiDeleteSector(orgId(), id);

  const addAlert = async (a: Omit<JobAlert, 'id'|'organizationId'>) => await api.apiAddAlert(orgId(), { ...a, id: `alert_${Date.now()}`, organizationId: orgId() });
  const dismissAlert = async (id: string) => { if(currentUser) await api.apiMarkAlertAsRead(orgId(), id, currentUser.id); setActiveAlert(null); };

  const addPatient = async (p: Omit<ClinicPatient, 'id'|'organizationId'|'dentistId'>) => { if(currentUser) await api.apiAddPatient(orgId(), { ...p, id: `pat_${Date.now()}`, organizationId: orgId(), dentistId: currentUser.id }); };
  const updatePatient = async (id: string, u: Partial<ClinicPatient>) => await api.apiUpdatePatient(orgId(), id, u);
  const deletePatient = async (id: string) => await api.apiDeletePatient(orgId(), id);

  const addAppointment = async (a: Omit<Appointment, 'id'|'organizationId'|'dentistId'>) => { if(currentUser) await api.apiAddAppointment(orgId(), { ...a, id: `appt_${Date.now()}`, organizationId: orgId(), dentistId: currentUser.id }); };
  const updateAppointment = async (id: string, u: Partial<Appointment>) => await api.apiUpdateAppointment(orgId(), id, u);
  const deleteAppointment = async (id: string) => await api.apiDeleteAppointment(orgId(), id);

  const addSubscriptionPlan = async (p: SubscriptionPlan) => await api.apiAddSubscriptionPlan(p);
  const updateSubscriptionPlan = async (id: string, u: Partial<SubscriptionPlan>) => await api.apiUpdateSubscriptionPlan(id, u);
  const deleteSubscriptionPlan = async (id: string) => await api.apiDeleteSubscriptionPlan(id);
  const updateOrganization = async (id: string, u: Partial<Organization>) => await api.apiUpdateOrganization(id, u);
  const createSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => await api.callCreateSubscription(orgId, planId, email, name, cpfCnpj);
  const addCoupon = async (c: Coupon) => await api.apiAddCoupon(c);
  const updateCoupon = async (id: string, u: Partial<Coupon>) => await api.apiUpdateCoupon(id, u);
  const deleteCoupon = async (id: string) => await api.apiDeleteCoupon(id);
  const validateCoupon = async (code: string, planId: string) => await api.apiValidateCoupon(code, planId);
  const uploadFile = async (file: File) => await api.uploadJobFile(file);

  const createWebOrder = async (patientName: string, dueDate: Date, notes: string, attachments: Attachment[]) => {
    if (!currentUser || cart.length === 0) return;
    const totalVal = cart.reduce((acc, item) => acc + item.finalPrice, 0);
    const newJob: Omit<Job, 'id'> = {
      organizationId: orgId(), patientName, dentistId: currentUser.id, dentistName: currentUser.name, status: JobStatus.WAITING_APPROVAL, urgency: UrgencyLevel.NORMAL,
      items: cart.map(c => ({ id: `item_${c.cartItemId}`, jobTypeId: c.jobType.id, name: c.jobType.name, quantity: c.quantity, price: c.unitPrice, selectedVariationIds: c.selectedVariationIds, variationValues: c.variationValues })),
      history: [{ id: `hist_${Date.now()}`, timestamp: new Date(), action: 'Criado via Loja Virtual', userId: currentUser.id, userName: currentUser.name }],
      attachments, createdAt: new Date(), dueDate: dueDate, totalValue: totalVal, notes
    };
    await addJob(newJob); 
    setCart([]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, currentOrg, currentPlan, isLoadingAuth, allOrganizations, allPlans, coupons,
      allUsers, jobs, jobTypes, sectors, alerts, patients, appointments,
      login, registerOrganization, registerUserInOrg, registerDentist, logout, updateUser, deleteUser, addUser,
      addJob, updateJob, addJobType, updateJobType, deleteJobType, addSector, deleteSector,
      addAlert, dismissAlert, addPatient, updatePatient, deletePatient, addAppointment, updateAppointment, deleteAppointment,
      addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, updateOrganization,
      createSubscription, 
      addCoupon, updateCoupon, deleteCoupon, validateCoupon,
      cart, addToCart: (i) => setCart(p => [...p,i]), removeFromCart: (id) => setCart(p => p.filter(i => i.cartItemId !== id)), clearCart: () => setCart([]),
      createWebOrder, uploadFile,
      printData, triggerPrint: (j,m) => setPrintData({job:j, mode:m}), clearPrint: () => setPrintData(null),
      activeAlert,
      userConnections, activeOrganization, switchActiveOrganization, addConnectionByCode
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};