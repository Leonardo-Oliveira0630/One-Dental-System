
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { 
  User, Job, JobType, CartItem, UserRole, Sector, JobAlert, Attachment,
  ClinicPatient, Appointment, Organization, SubscriptionPlan, OrganizationConnection, Coupon, CommissionRecord, CommissionStatus, ManualDentist, GlobalSettings, DeliveryRoute, RouteItem, BoxColor
} from '../types';
import { db, auth } from '../services/firebaseConfig';
import * as api from '../services/firebaseService';
import { JobStatus, UrgencyLevel } from '../types';

import * as authPkg from 'firebase/auth';
import * as firestorePkg from 'firebase/firestore';

const { onAuthStateChanged } = authPkg as any;
const { doc, getDoc, onSnapshot } = firestorePkg as any;

interface AppContextType {
  currentUser: User | null;
  currentOrg: Organization | null;
  currentPlan: SubscriptionPlan | null;
  isLoadingAuth: boolean;
  globalSettings: GlobalSettings | null;
  
  allUsers: User[]; 
  jobs: Job[];
  jobTypes: JobType[];
  sectors: Sector[];
  boxColors: BoxColor[];
  alerts: JobAlert[];
  commissions: CommissionRecord[];
  allOrganizations: Organization[];
  allLaboratories: Organization[]; 
  allPlans: SubscriptionPlan[];
  coupons: Coupon[];
  patients: ClinicPatient[];
  appointments: Appointment[];
  manualDentists: ManualDentist[];
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
  
  addBoxColor: (color: Omit<BoxColor, 'id'>) => Promise<void>;
  deleteBoxColor: (id: string) => Promise<void>;

  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  uploadFile: (file: File) => Promise<string>;

  printData: { job?: Job, mode: 'SHEET' | 'LABEL' | 'ROUTE', routeItems?: RouteItem[], driver?: string, shift?: string, date?: string } | null;
  triggerPrint: (job: Job, mode: 'SHEET' | 'LABEL') => void;
  triggerRoutePrint: (items: RouteItem[], driver: string, shift: string, date: string) => void;
  clearPrint: () => void;
  
  activeOrganization: Organization | null;
  switchActiveOrganization: (id: string | null) => void;
  userConnections: OrganizationConnection[];

  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => Promise<void>;
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
  addManualDentist: (d: Omit<ManualDentist, 'id' | 'organizationId'>) => Promise<void>;
  updateManualDentist: (id: string, updates: Partial<ManualDentist>) => Promise<void>;
  deleteManualDentist: (id: string) => Promise<void>;

  addJobToRoute: (job: Job, driver: string, shift: 'MORNING' | 'AFTERNOON', date: Date) => Promise<void>;
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
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [boxColors, setBoxColors] = useState<BoxColor[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allLaboratories, setAllLaboratories] = useState<Organization[]>([]);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [manualDentists, setManualDentists] = useState<ManualDentist[]>([]);
  const [activeAlert, setActiveAlert] = useState<JobAlert | null>(null);

  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [userConnections, setUserConnections] = useState<OrganizationConnection[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<AppContextType['printData']>(null);

  // LOG DE ESTADO CRÍTICO
  useEffect(() => {
      console.log("[AppContext] Status Log:", { 
          hasUser: !!currentUser, 
          role: currentUser?.role, 
          orgId: currentUser?.organizationId,
          activeOrgId: activeOrganization?.id 
      });
  }, [currentUser, activeOrganization]);

  // ID Crítico: Decidimos qual laboratório escutar agora
  const activeDataId = useMemo(() => {
      if (currentUser?.role === UserRole.CLIENT) {
          return activeOrganization?.id || null;
      }
      return currentUser?.organizationId || null;
  }, [currentUser, activeOrganization]);

  useEffect(() => {
    if (!currentUser || alerts.length === 0) {
        setActiveAlert(null);
        return;
    }
    const checkAlerts = () => {
        const now = new Date();
        const alertToShow = alerts.find(a => {
            const isScheduled = new Date(a.scheduledFor) <= now;
            const notRead = !a.readBy?.includes(currentUser.id);
            const forMe = (a.targetUserId === currentUser.id) || (a.targetSector && a.targetSector === currentUser.sector);
            return isScheduled && notRead && forMe;
        });
        if (alertToShow && (!activeAlert || activeAlert.id !== alertToShow.id)) {
            setActiveAlert(alertToShow);
        } else if (!alertToShow) {
            setActiveAlert(null);
        }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 10000);
    return () => clearInterval(interval);
  }, [alerts, currentUser, activeAlert]);

  useEffect(() => {
    if (!db) return;
    const unsubPlans = api.subscribeSubscriptionPlans(setAllPlans);
    const unsubCoupons = api.subscribeCoupons(setCoupons);
    const unsubSettings = api.subscribeGlobalSettings(setGlobalSettings);
    return () => { unsubPlans(); unsubCoupons(); unsubSettings(); };
  }, []);

  useEffect(() => {
    if (!auth) { setIsLoadingAuth(false); return; }
    const unsub = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        const profile = await api.getUserProfile(user.uid);
        if (profile) {
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
                                if (pSnap.exists()) setCurrentPlan({ id: pSnap.id, ...pSnap.data() as any } as SubscriptionPlan);
                            });
                        }
                    }
                });
                if (profile.role === UserRole.CLIENT) {
                    api.subscribeUserConnections(profileOrgId, (conns) => {
                        setUserConnections(conns);
                        if (conns.length > 0 && !activeOrganization) {
                             const firstOrgId = conns[0].organizationId;
                             getDoc(doc(db, 'organizations', firstOrgId)).then((snap: any) => {
                                 if(snap.exists()) setActiveOrganization({ id: snap.id, ...snap.data() as any } as Organization);
                             });
                        }
                    });
                    api.subscribeAllLaboratories(setAllLaboratories);
                }
            }
        }
      } else {
        setCurrentUser(null);
        setCurrentOrg(null);
        setCurrentPlan(null);
        setActiveOrganization(null);
        setUserConnections([]);
        setAllLaboratories([]);
      }
      setIsLoadingAuth(false);
    });
    return unsub;
  }, []);

  // ESCUTA DE TRABALHOS (JOBS) - CENTRALIZADA
  useEffect(() => {
    if (!db || !currentUser || !activeDataId) {
        setJobs([]); // Limpa se não tiver ID ativo
        return;
    }
    
    console.log(`[AppContext] Ativando subscrição para ORG: ${activeDataId}`);
    
    const unsubs: (() => void)[] = [];
    
    // Subs aos trabalhos do laboratório ativo selecionado
    unsubs.push(api.subscribeJobs(activeDataId, (newJobs) => {
        setJobs(newJobs);
    }));
    
    unsubs.push(api.subscribeJobTypes(activeDataId, setJobTypes));

    // Dados da própria clínica/lab do usuário logado
    const myOrgId = currentUser.organizationId;
    if (myOrgId) {
        unsubs.push(api.subscribePatients(myOrgId, setPatients));
        unsubs.push(api.subscribeAppointments(myOrgId, setAppointments));
        
        if (currentUser.role !== UserRole.CLIENT) {
            unsubs.push(api.subscribeOrgUsers(myOrgId, setAllUsers));
            unsubs.push(api.subscribeSectors(myOrgId, setSectors));
            unsubs.push(api.subscribeBoxColors(myOrgId, setBoxColors));
            unsubs.push(api.subscribeCommissions(myOrgId, setCommissions));
            unsubs.push(api.subscribeAlerts(myOrgId, setAlerts));
            unsubs.push(api.subscribeManualDentists(myOrgId, setManualDentists));
        }
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
        unsubs.push(api.subscribeAllOrganizations(setAllOrganizations));
    }

    return () => {
        console.log(`[AppContext] Limpando subs para ORG: ${activeDataId}`);
        unsubs.forEach(u => u());
    };
  }, [currentUser, activeDataId]);

  const login = async (email: string, pass: string) => { await api.apiLogin(email, pass); };
  const logout = async () => await api.apiLogout();

  const updateUser = async (id: string, u: Partial<User>) => {
    if (!currentUser) return;
    if (id === currentUser.id) {
      await api.apiUpdateUser(id, u);
    } else {
      await api.apiUpdateUserAdmin(id, u);
    }
  };

  const addUser = async (u: User) => await api.apiAddUser(u);
  const deleteUser = async (id: string) => await api.apiDeleteUser(id);

  const addJob = async (j: Omit<Job, 'id'|'organizationId'>) => {
      const orgId = activeDataId;
      if (!orgId) throw new Error("Nenhum laboratório ativo.");
      await api.apiAddJob(orgId, { ...j, id: `job_${Date.now()}`, organizationId: orgId } as Job);
  };
  const updateJob = async (id: string, u: Partial<Job>) => {
      const orgId = activeDataId;
      if (!orgId) return;
      await api.apiUpdateJob(orgId, id, u);
  };

  const addCommissionRecord = async (rec: Omit<CommissionRecord, 'id' | 'organizationId'>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddCommission(orgId, { ...rec, id: `comm_${Date.now()}`, organizationId: orgId } as CommissionRecord);
  };
  const updateCommissionStatus = async (id: string, status: CommissionStatus) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiUpdateCommission(orgId, id, { status, paidAt: status === CommissionStatus.PAID ? new Date() : undefined });
  };

  const addJobType = async (jt: Omit<JobType, 'id'>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddJobType(orgId, { ...jt, id: `jtype_${Date.now()}` } as JobType);
  }
  const updateJobType = async (id: string, u: Partial<JobType>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiUpdateJobType(orgId, id, u);
  }
  const deleteJobType = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiDeleteJobType(orgId, id);
  }
  const addSector = async (name: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddSector(orgId, { id: `sector_${Date.now()}`, name });
  }
  const deleteSector = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiDeleteSector(orgId, id);
  }

  const addBoxColor = async (color: Omit<BoxColor, 'id'>) => {
      const orgId = currentUser?.organizationId;
      if (!orgId) return;
      await api.apiAddBoxColor(orgId, { ...color, id: `color_${Date.now()}` } as BoxColor);
  };
  const deleteBoxColor = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if (!orgId) return;
      await api.apiDeleteBoxColor(orgId, id);
  };

  const updateOrganization = async (id: string, u: Partial<Organization>) => await api.apiUpdateOrganization(id, u);
  const updateGlobalSettings = async (u: Partial<GlobalSettings>) => await api.apiUpdateGlobalSettings({ ...u, updatedAt: new Date(), updatedBy: currentUser?.name || 'unknown' });
  const validateCoupon = async (code: string, planId: string) => await api.apiValidateCoupon(code, planId);
  const createSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => await api.apiCreateSaaSSubscription(orgId, planId, email, name, cpfCnpj);
  const createLabWallet = async (p: any) => await api.apiCreateLabSubAccount(p);
  const getSaaSInvoices = async (orgId: string) => await api.apiGetSaaSInvoices(orgId);
  const checkSubscriptionStatus = async (orgId: string) => await api.apiCheckSubscriptionStatus(orgId);
  
  const addAlert = async (a: JobAlert) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddAlert(orgId, a);
  }
  const dismissAlert = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId || !currentUser) return;
      await api.apiMarkAlertAsRead(orgId, id, currentUser.id);
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
      await api.apiAddAppointment(orgId, { ...a, id: `app_${Date.now()}`, organizationId: orgId } as Appointment);
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
  
  const registerOrganization = async (e: string, p: string, on: string, orn: string, pid: string, t: Date | undefined, c: string | undefined) => await api.apiRegisterOrganization(e, p, on, orn, pid, t, c);
  const registerDentist = async (e: string, p: string, n: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string) => await api.apiRegisterDentist(e, p, n, clinicName, planId, trialEndsAt, couponCode);
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

  const addManualDentist = async (d: Omit<ManualDentist, 'id' | 'organizationId'>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiAddManualDentist(orgId, { ...d, id: `man_dent_${Date.now()}`, organizationId: orgId } as ManualDentist);
  };
  const updateManualDentist = async (id: string, u: Partial<ManualDentist>) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiUpdateManualDentist(orgId, id, u);
  };
  const deleteManualDentist = async (id: string) => {
      const orgId = currentUser?.organizationId;
      if(!orgId) return;
      await api.apiDeleteManualDentist(orgId, id);
  };

  const switchActiveOrganization = (id: string | null) => {
    if (!id) {
        setActiveOrganization(null);
        return;
    }
    const found = userConnections.find(o => o.organizationId === id);
    if (found) {
        getDoc(doc(db, 'organizations', id)).then((snap: any) => {
             if(snap.exists()) setActiveOrganization({ id: snap.id, ...snap.data() as any } as Organization);
        });
    }
  };

  const addJobToRoute = async (job: Job, driver: string, shift: 'MORNING' | 'AFTERNOON', date: Date) => {
      const orgId = currentUser?.organizationId;
      if (!orgId) return;

      const dateStr = date.toISOString().split('T')[0];
      const routeId = `route_${dateStr}_${shift}_${driver.replace(/\s+/g, '_')}`;
      
      const routeSnap = await getDoc(doc(db, 'organizations', orgId, 'routes', routeId));
      if (!routeSnap.exists()) {
          await api.apiAddRoute(orgId, {
              id: routeId,
              organizationId: orgId,
              date: date,
              shift: shift,
              driverName: driver,
              status: 'OPEN',
              createdAt: new Date()
          });
      }

      const dentist = manualDentists.find(d => d.id === job.dentistId);
      const onlineDentist = allUsers.find(u => u.id === job.dentistId);
      const address = dentist ? `${dentist.address}, ${dentist.number} - ${dentist.city}` : (onlineDentist?.address || 'Endereço não cadastrado');

      const routeItem: RouteItem = {
          id: `item_${Date.now()}`,
          routeId: routeId,
          jobId: job.id,
          dentistId: job.dentistId,
          dentistName: job.dentistName,
          patientName: job.patientName,
          address: address,
          type: 'DELIVERY',
          order: Date.now() 
      };

      await api.apiAddRouteItem(orgId, routeId, routeItem);
      await api.apiUpdateJob(orgId, job.id, { routeId });
  };

  return (
    <AppContext.Provider value={{
      currentUser, currentOrg, currentPlan, isLoadingAuth, globalSettings,
      allUsers, jobs, jobTypes, sectors, boxColors, alerts, commissions,
      allOrganizations, allLaboratories, allPlans, coupons, patients, appointments, manualDentists, activeAlert,
      login, logout, updateUser, addUser, deleteUser,
      addJob, updateJob, addCommissionRecord, updateCommissionStatus,
      addJobType, updateJobType, deleteJobType, addSector, deleteSector, addBoxColor, deleteBoxColor,
      cart, addToCart: (i) => setCart(p => [...p,i]), removeFromCart: (id) => setCart(p => p.filter(i => i.cartItemId !== id)), clearCart: () => setCart([]),
      uploadFile: api.uploadJobFile,
      printData, triggerPrint: (j,m) => setPrintData({job:j, mode:m}), 
      triggerRoutePrint: (items, driver, shift, date) => setPrintData({ mode: 'ROUTE', routeItems: items, driver, shift, date }),
      clearPrint: () => setPrintData(null),
      activeOrganization, switchActiveOrganization, userConnections,
      updateOrganization, updateGlobalSettings, validateCoupon, createSubscription, createLabWallet, getSaaSInvoices, checkSubscriptionStatus,
      addAlert, dismissAlert, addPatient, updatePatient, deletePatient, addAppointment, updateAppointment, deleteAppointment,
      registerOrganization, registerDentist, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
      addConnectionByCode, addCoupon, updateCoupon, deleteCoupon,
      addManualDentist, updateManualDentist, deleteManualDentist, addJobToRoute
    }}>
      {children}
    </AppContext.Provider>
  );
};
