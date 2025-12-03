
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
  User, Job, JobType, CartItem, UserRole, Sector, BoxColor, JobAlert, Attachment,
  ClinicPatient, Appointment 
} from '../types';
import { 
  MOCK_USERS, MOCK_JOBS, JOB_TYPES as INITIAL_JOB_TYPES, MOCK_SECTORS,
  MOCK_PATIENTS, MOCK_APPOINTMENTS 
} from '../services/mockData';
import { db, auth } from '../services/firebaseConfig';
import { 
  subscribeJobs, subscribeUsers, subscribeJobTypes, subscribeSectors, subscribeAlerts,
  apiAddJob, apiUpdateJob, apiAddUser, apiUpdateUser, apiDeleteUser,
  apiAddJobType, apiUpdateJobType, apiDeleteJobType,
  apiAddSector, apiDeleteSector,
  apiLogin, apiRegister, apiLogout, getUserProfile,
  apiAddAlert, apiMarkAlertAsRead,
  uploadJobFile,
  subscribeClinicPatients, apiAddPatient, apiUpdatePatient, apiDeletePatient,
  subscribeAppointments, apiAddAppointment, apiUpdateAppointment, apiDeleteAppointment
} from '../services/firebaseService';
import { JobStatus, UrgencyLevel } from '../types';
import { onAuthStateChanged } from 'firebase/auth';

interface AppContextType {
  // ... (previous properties)
  currentUser: User | null;
  isLoadingAuth: boolean;
  allUsers: User[];
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, role: UserRole, clinicName?: string) => Promise<void>;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  jobs: Job[];
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  jobTypes: JobType[];
  addJobType: (type: JobType) => Promise<void>;
  updateJobType: (id: string, updates: Partial<JobType>) => Promise<void>;
  deleteJobType: (id: string) => void;
  sectors: Sector[];
  addSector: (name: string) => void;
  deleteSector: (id: string) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  createWebOrder: (patientName: string, dueDate: Date, notes: string, attachments: Attachment[]) => void;
  uploadFile: (file: File) => Promise<string>;
  printData: { job: Job, mode: 'SHEET' | 'LABEL' } | null;
  triggerPrint: (job: Job, mode: 'SHEET' | 'LABEL') => void;
  clearPrint: () => void;
  addAlert: (alert: JobAlert) => void;
  activeAlert: JobAlert | null;
  dismissAlert: (alertId: string) => void;

  // --- CMS PROPERTIES ---
  patients: ClinicPatient[];
  addPatient: (patient: ClinicPatient) => void;
  updatePatient: (id: string, updates: Partial<ClinicPatient>) => void;
  deletePatient: (id: string) => void;
  appointments: Appointment[];
  addAppointment: (appt: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  // ... (previous state)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<{ job: Job, mode: 'SHEET' | 'LABEL' } | null>(null);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<JobAlert | null>(null);

  // --- CMS STATE ---
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // ... (Auth & Core Data Listeners remain same) ...
  useEffect(() => {
    // 1. Firebase Auth Listener
    if (auth) {
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            if (profile) setCurrentUser(profile);
            else setCurrentUser({ id: firebaseUser.uid, email: firebaseUser.email || '', name: firebaseUser.displayName || 'Usuário', role: UserRole.COLLABORATOR });
          } catch (error) { console.error(error); }
        } else {
          setCurrentUser(null);
        }
        setIsLoadingAuth(false);
      });
      return () => unsubscribeAuth();
    } else {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (!db) {
      console.log("Using Local Mock Data");
      setAllUsers(MOCK_USERS);
      setJobs(MOCK_JOBS);
      setJobTypes(INITIAL_JOB_TYPES);
      setSectors(MOCK_SECTORS);
      setPatients(MOCK_PATIENTS);
      setAppointments(MOCK_APPOINTMENTS);
      return;
    }
    const unsubJobs = subscribeJobs(setJobs);
    const unsubUsers = subscribeUsers(setAllUsers);
    const unsubTypes = subscribeJobTypes(setJobTypes);
    const unsubSectors = subscribeSectors(setSectors);
    const unsubAlerts = subscribeAlerts(setAlerts);
    return () => { unsubJobs(); unsubUsers(); unsubTypes(); unsubSectors(); unsubAlerts(); };
  }, []);

  // --- CMS LISTENERS ---
  useEffect(() => {
    if (!db || !currentUser || currentUser.role !== UserRole.CLIENT) return;
    
    // Subscribe to Clinic Data only for Dentists
    const unsubPatients = subscribeClinicPatients(currentUser.id, setPatients);
    const unsubAppts = subscribeAppointments(currentUser.id, setAppointments);

    return () => { unsubPatients(); unsubAppts(); };
  }, [currentUser]);

  // ... (Alert Logic & Core Actions remain same) ...
  useEffect(() => {
    if (!currentUser || alerts.length === 0) return;
    const checkAlerts = () => {
        const now = new Date();
        const pending = alerts.find(a => {
            const isDue = new Date(a.scheduledFor) <= now;
            const notRead = !a.readBy.includes(currentUser.id);
            const isTarget = currentUser.role === UserRole.ADMIN || (a.targetUserId && a.targetUserId === currentUser.id) || (a.targetSector && a.targetSector === currentUser.sector);
            return isDue && notRead && isTarget;
        });
        if (pending) setActiveAlert(pending);
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [alerts, currentUser]);

  const login = async (email: string, pass: string) => { if (auth) await apiLogin(email, pass); else { const found = allUsers.find(u => u.email === email); if (found) setCurrentUser(found); else setCurrentUser({ id: 'mock-user', name: 'Usuário Mock', email, role: UserRole.ADMIN }); } };
  const register = async (email: string, pass: string, name: string, role: UserRole, clinicName?: string) => { if (auth) await apiRegister(email, pass, { name, role, clinicName }); else alert("O cadastro requer o Firebase configurado."); };
  const logout = () => { if (auth) apiLogout(); setCurrentUser(null); };
  const addUser = (user: User) => { if (db) apiAddUser(user); else setAllUsers(prev => [...prev, user]); };
  const updateUser = (id: string, updates: Partial<User>) => { if (db) apiUpdateUser(id, updates); else setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u)); }
  const deleteUser = (id: string) => { if (db) apiDeleteUser(id); else setAllUsers(prev => prev.filter(u => u.id !== id)); };
  const addSector = (name: string) => { const newSector = { id: `sector_${Date.now()}`, name }; if (db) apiAddSector(newSector); else setSectors(prev => [...prev, newSector]); };
  const deleteSector = (id: string) => { if (db) apiDeleteSector(id); else setSectors(prev => prev.filter(s => s.id !== id)); };
  const addJob = (job: Job) => { if (db) apiAddJob(job); else setJobs(prev => [job, ...prev]); };
  const updateJob = (id: string, updates: Partial<Job>) => { if (db) apiUpdateJob(id, updates); else setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j)); };
  const addJobType = async (type: JobType) => { if (db) await apiAddJobType(type); else setJobTypes(prev => [...prev, type]); };
  const updateJobType = async (id: string, updates: Partial<JobType>) => { if (db) await apiUpdateJobType(id, updates); else setJobTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)); };
  const deleteJobType = (id: string) => { if (db) apiDeleteJobType(id); else setJobTypes(prev => prev.filter(t => t.id !== id)); };
  const addToCart = (item: CartItem) => { setCart(prev => [...prev, item]); };
  const removeFromCart = (cartItemId: string) => { setCart(prev => prev.filter(i => i.cartItemId !== cartItemId)); };
  const clearCart = () => setCart([]);
  const createWebOrder = (patientName: string, dueDate: Date, notes: string, attachments: Attachment[]) => {
    if (!currentUser || cart.length === 0) return;
    const totalVal = cart.reduce((acc, item) => acc + item.finalPrice, 0);
    const newJob: Job = {
      id: `job_${Date.now()}`, patientName, dentistId: currentUser.id, dentistName: currentUser.name, status: JobStatus.WAITING_APPROVAL, urgency: UrgencyLevel.NORMAL,
      items: cart.map(c => ({ id: `item_${c.cartItemId}`, jobTypeId: c.jobType.id, name: c.jobType.name, quantity: c.quantity, price: c.unitPrice, selectedVariationIds: c.selectedVariationIds, variationValues: c.variationValues })),
      history: [{ id: `hist_${Date.now()}`, timestamp: new Date(), action: 'Criado via Loja Virtual', userId: currentUser.id, userName: currentUser.name }],
      attachments, createdAt: new Date(), dueDate: dueDate, totalValue: totalVal, notes
    };
    addJob(newJob); clearCart();
  };
  const uploadFile = async (file: File) => { return await uploadJobFile(file); };
  const triggerPrint = (job: Job, mode: 'SHEET' | 'LABEL') => { setPrintData({ job, mode }); };
  const clearPrint = () => setPrintData(null);
  const addAlert = (alert: JobAlert) => { if (db) apiAddAlert(alert); else setAlerts(prev => [...prev, alert]); };
  const dismissAlert = (alertId: string) => { if (currentUser) { if (db) apiMarkAlertAsRead(alertId, currentUser.id); else setAlerts(prev => prev.map(a => a.id === alertId ? {...a, readBy: [...a.readBy, currentUser.id]} : a)); } setActiveAlert(null); };

  // --- CMS ACTIONS ---
  const addPatient = (patient: ClinicPatient) => { if (db) apiAddPatient(patient); else setPatients(prev => [...prev, patient]); };
  const updatePatient = (id: string, updates: Partial<ClinicPatient>) => { if (db) apiUpdatePatient(id, updates); else setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p)); };
  const deletePatient = (id: string) => { if (db) apiDeletePatient(id); else setPatients(prev => prev.filter(p => p.id !== id)); };
  
  const addAppointment = (appt: Appointment) => { if (db) apiAddAppointment(appt); else setAppointments(prev => [...prev, appt]); };
  const updateAppointment = (id: string, updates: Partial<Appointment>) => { if (db) apiUpdateAppointment(id, updates); else setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a)); };
  const deleteAppointment = (id: string) => { if (db) apiDeleteAppointment(id); else setAppointments(prev => prev.filter(a => a.id !== id)); };

  return (
    <AppContext.Provider value={{ 
      currentUser, isLoadingAuth, allUsers, login, register, logout, addUser, updateUser, deleteUser,
      jobs, addJob, updateJob, jobTypes, addJobType, updateJobType, deleteJobType, sectors, addSector, deleteSector,
      cart, addToCart, removeFromCart, clearCart, createWebOrder, uploadFile, printData, triggerPrint, clearPrint,
      addAlert, activeAlert, dismissAlert,
      patients, addPatient, updatePatient, deletePatient,
      appointments, addAppointment, updateAppointment, deleteAppointment
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
