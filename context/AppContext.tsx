
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Job, JobType, CartItem, UserRole, Sector, BoxColor, JobAlert } from '../types';
import { MOCK_USERS, MOCK_JOBS, JOB_TYPES as INITIAL_JOB_TYPES, MOCK_SECTORS } from '../services/mockData';
import { db, auth } from '../services/firebaseConfig';
import { 
  subscribeJobs, subscribeUsers, subscribeJobTypes, subscribeSectors, subscribeAlerts,
  apiAddJob, apiUpdateJob, apiAddUser, apiUpdateUser, apiDeleteUser,
  apiAddJobType, apiUpdateJobType, apiDeleteJobType,
  apiAddSector, apiDeleteSector,
  apiLogin, apiRegister, apiLogout, getUserProfile,
  apiAddAlert, apiMarkAlertAsRead
} from '../services/firebaseService';
import { JobStatus, UrgencyLevel } from '../types';
import { onAuthStateChanged } from 'firebase/auth';

interface AppContextType {
  currentUser: User | null;
  isLoadingAuth: boolean;
  allUsers: User[];
  
  // Auth Methods
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
  addJobType: (type: JobType) => void;
  updateJobType: (id: string, updates: Partial<JobType>) => void;
  deleteJobType: (id: string) => void;

  sectors: Sector[];
  addSector: (name: string) => void;
  deleteSector: (id: string) => void;

  cart: CartItem[];
  addToCart: (item: JobType) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  createWebOrder: (patientName: string, dueDate: Date, notes: string) => void;

  // Print System
  printData: { job: Job, mode: 'SHEET' | 'LABEL' } | null;
  triggerPrint: (job: Job, mode: 'SHEET' | 'LABEL') => void;
  clearPrint: () => void;

  // Alert System
  addAlert: (alert: JobAlert) => void;
  activeAlert: JobAlert | null; // The alert currently popping up for the user
  dismissAlert: (alertId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<{ job: Job, mode: 'SHEET' | 'LABEL' } | null>(null);
  
  // Alert State
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<JobAlert | null>(null);

  // --- INITIALIZATION & REAL-TIME SYNC ---
  useEffect(() => {
    // 1. Firebase Auth Listener
    if (auth) {
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // User is signed in, fetch profile details from Firestore
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            if (profile) {
              setCurrentUser(profile);
            } else {
              // Fallback if profile doesn't exist yet (race condition)
               setCurrentUser({ 
                 id: firebaseUser.uid, 
                 email: firebaseUser.email || '', 
                 name: firebaseUser.displayName || 'Usuário', 
                 role: UserRole.COLLABORATOR // Default fallback
               });
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
          }
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
    // 2. Data Listeners (Only if DB is configured)
    if (!db) {
      console.log("Using Local Mock Data");
      setAllUsers(MOCK_USERS);
      setJobs(MOCK_JOBS);
      setJobTypes(INITIAL_JOB_TYPES);
      setSectors(MOCK_SECTORS);
      return;
    }

    console.log("Listening to Firebase Data...");
    const unsubJobs = subscribeJobs((data) => setJobs(data));
    const unsubUsers = subscribeUsers((data) => setAllUsers(data));
    const unsubTypes = subscribeJobTypes((data) => setJobTypes(data));
    const unsubSectors = subscribeSectors((data) => setSectors(data));
    const unsubAlerts = subscribeAlerts((data) => setAlerts(data));

    return () => {
      unsubJobs();
      unsubUsers();
      unsubTypes();
      unsubSectors();
      unsubAlerts();
    };
  }, []);

  // --- ALERT MONITORING LOGIC ---
  useEffect(() => {
    if (!currentUser || alerts.length === 0) return;

    const checkAlerts = () => {
        const now = new Date();
        
        // Find an alert that:
        // 1. Is scheduled for now or past
        // 2. Has NOT been read by current user
        // 3. Is targeted to current user (ID match, Sector match, or User is Admin)
        const pending = alerts.find(a => {
            const isDue = new Date(a.scheduledFor) <= now;
            const notRead = !a.readBy.includes(currentUser.id);
            
            const isTarget = 
                currentUser.role === UserRole.ADMIN || // Admin sees everything? Maybe too noisy. Let's keep explicit targets + admin override if needed
                (a.targetUserId && a.targetUserId === currentUser.id) || 
                (a.targetSector && a.targetSector === currentUser.sector);

            return isDue && notRead && isTarget;
        });

        if (pending) {
            setActiveAlert(pending);
        }
    };

    // Check immediately and then every 30 seconds
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);

  }, [alerts, currentUser]);


  // --- AUTH LOGIC ---
  const login = async (email: string, pass: string) => {
    if (auth) {
      await apiLogin(email, pass);
      // State updated by onAuthStateChanged listener
    } else {
      // Mock Login Fallback
      const found = allUsers.find(u => u.email === email);
      if (found) {
        setCurrentUser(found);
      } else {
         // Create mock session
         setCurrentUser({ 
            id: 'mock-user', 
            name: 'Usuário Mock', 
            email, 
            role: UserRole.ADMIN 
         });
      }
    }
  };

  const register = async (email: string, pass: string, name: string, role: UserRole, clinicName?: string) => {
    if (auth) {
       await apiRegister(email, pass, { name, role, clinicName });
    } else {
       alert("O cadastro requer o Firebase configurado.");
    }
  };

  const logout = () => {
    if (auth) apiLogout();
    setCurrentUser(null);
  };

  // --- CRUD WRAPPERS (Hybrid: DB or Local) ---

  const addUser = (user: User) => {
    if (db) apiAddUser(user);
    else setAllUsers(prev => [...prev, user]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    if (db) apiUpdateUser(id, updates);
    else setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }

  const deleteUser = (id: string) => {
    if (db) apiDeleteUser(id);
    else setAllUsers(prev => prev.filter(u => u.id !== id));
  };

  const addSector = (name: string) => {
    const newSector = { id: Math.random().toString(), name };
    if (db) apiAddSector(newSector);
    else setSectors(prev => [...prev, newSector]);
  };

  const deleteSector = (id: string) => {
    if (db) apiDeleteSector(id);
    else setSectors(prev => prev.filter(s => s.id !== id));
  };

  const addJob = (job: Job) => {
    if (db) apiAddJob(job);
    else setJobs(prev => [job, ...prev]);
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
    if (db) apiUpdateJob(id, updates);
    else setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const addJobType = (type: JobType) => {
    if (db) apiAddJobType(type);
    else setJobTypes(prev => [...prev, type]);
  };
  
  const updateJobType = (id: string, updates: Partial<JobType>) => {
    if (db) apiUpdateJobType(id, updates);
    else setJobTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteJobType = (id: string) => {
    if (db) apiDeleteJobType(id);
    else setJobTypes(prev => prev.filter(t => t.id !== id));
  };

  // --- CART & WEB ORDERS ---
  const addToCart = (item: JobType) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => setCart([]);

  const createWebOrder = (patientName: string, dueDate: Date, notes: string) => {
    if (!currentUser) return;
    
    const totalVal = cart.reduce((acc, item) => acc + (item.basePrice * item.quantity), 0);
    
    const newJob: Job = {
      id: Math.random().toString(36).substr(2, 9),
      patientName,
      dentistId: currentUser.id,
      dentistName: currentUser.name,
      status: JobStatus.WAITING_APPROVAL,
      urgency: UrgencyLevel.NORMAL,
      items: cart.map(c => ({ 
        id: Math.random().toString(), 
        jobTypeId: c.id, 
        name: c.name, 
        quantity: c.quantity, 
        price: c.basePrice,
        selectedVariationIds: []
      })),
      history: [{
        id: Math.random().toString(),
        timestamp: new Date(),
        action: 'Criado via Loja Virtual',
        userId: currentUser.id,
        userName: currentUser.name
      }],
      createdAt: new Date(),
      dueDate: dueDate,
      totalValue: totalVal,
      notes
    };

    addJob(newJob);
    clearCart();
  };

  // --- PRINT SYSTEM ---
  const triggerPrint = (job: Job, mode: 'SHEET' | 'LABEL') => {
    setPrintData({ job, mode });
  };

  const clearPrint = () => setPrintData(null);

  // --- ALERT SYSTEM ---
  const addAlert = (alert: JobAlert) => {
      if (db) apiAddAlert(alert);
      else setAlerts(prev => [...prev, alert]);
  };

  const dismissAlert = (alertId: string) => {
      if (currentUser) {
          if (db) apiMarkAlertAsRead(alertId, currentUser.id);
          else {
              // Mock update
              setAlerts(prev => prev.map(a => a.id === alertId ? {...a, readBy: [...a.readBy, currentUser.id]} : a));
          }
      }
      setActiveAlert(null);
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, isLoadingAuth, allUsers, login, register, logout, addUser, updateUser, deleteUser,
      jobs, addJob, updateJob, 
      jobTypes, addJobType, updateJobType, deleteJobType,
      sectors, addSector, deleteSector,
      cart, addToCart, removeFromCart, clearCart, createWebOrder,
      printData, triggerPrint, clearPrint,
      addAlert, activeAlert, dismissAlert
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
