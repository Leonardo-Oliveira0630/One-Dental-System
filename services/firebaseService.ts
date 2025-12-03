

import { 
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, Timestamp, query, orderBy, arrayUnion 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { db, auth } from './firebaseConfig';
import { Job, User, JobType, Sector, UserRole, JobAlert } from '../types';

// --- HELPERS ---

// Converte Timestamp do Firestore para Date do JS
const convertDates = (data: any): any => {
  if (!data) return data;
  
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => convertDates(item));
  }
  
  if (typeof data === 'object') {
    const newData: any = {};
    for (const key in data) {
      newData[key] = convertDates(data[key]);
    }
    return newData;
  }
  
  return data;
};

// Remove campos undefined recursivamente, pois o Firestore não aceita undefined
const sanitizeData = (data: any): any => {
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  } else if (data !== null && typeof data === 'object') {
    const newObj: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) {
        newObj[key] = sanitizeData(value);
      }
    });
    return newObj;
  }
  return data;
};

// --- AUTHENTICATION ---

export const apiLogin = async (email: string, pass: string) => {
  if (!auth) throw new Error("Firebase Auth not configured");
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
};

export const apiRegister = async (email: string, pass: string, userData: Partial<User>) => {
  if (!auth || !db) throw new Error("Firebase not configured");
  
  // 1. Create Auth User
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const uid = userCredential.user.uid;

  // 2. Create Firestore Profile
  const newUser: User = {
    id: uid,
    email: email,
    name: userData.name || 'Usuário',
    role: userData.role || UserRole.COLLABORATOR,
    clinicName: userData.clinicName,
    sector: userData.sector
  };

  // Sanitize to remove undefined fields (like clinicName for non-clients)
  await setDoc(doc(db, 'users', uid), sanitizeData(newUser));
  return newUser;
};

export const apiLogout = async () => {
  if (!auth) return;
  await signOut(auth);
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  if (!db) return null;
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      // Fallback de segurança para arrays
      customPrices: data.customPrices || [],
    } as User;
  }
  return null;
};

// --- LISTENERS (REAL-TIME) ---

export const subscribeJobs = (callback: (jobs: Job[]) => void) => {
  if (!db) return () => {};
  
  const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => {
      const data = convertDates(doc.data());
      return {
        ...data,
        id: doc.id,
        // Fallbacks de segurança para arrays
        items: data.items || [],
        history: data.history || [],
      }
    }) as Job[];
    callback(jobs);
  });
};

export const subscribeUsers = (callback: (users: User[]) => void) => {
  if (!db) return () => {};
  
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map(doc => {
      const data = convertDates(doc.data());
      return {
        ...data,
        id: doc.id,
        // Fallback de segurança para arrays
        customPrices: data.customPrices || [],
      }
    }) as User[];
    callback(users);
  });
};

export const subscribeJobTypes = (callback: (types: JobType[]) => void) => {
  if (!db) return () => {};
  
  return onSnapshot(collection(db, 'jobTypes'), (snapshot) => {
    const types = snapshot.docs.map(doc => {
      const data = convertDates(doc.data());
      
      // DEEP SANITIZATION FOR VARIATIONS
      const sanitizedGroups = (data.variationGroups || []).map((group: any) => ({
        ...group,
        options: (group.options || []).map((option: any) => ({
          ...option,
          disablesOptions: option.disablesOptions || [] // << CRITICAL FIX
        }))
      }));

      return {
        ...data,
        id: doc.id,
        variationGroups: sanitizedGroups,
      }
    }) as JobType[];
    callback(types);
  });
};

export const subscribeSectors = (callback: (sectors: Sector[]) => void) => {
  if (!db) return () => {};
  
  return onSnapshot(collection(db, 'sectors'), (snapshot) => {
    const sectors = snapshot.docs.map(doc => ({
      ...convertDates(doc.data()),
      id: doc.id
    })) as Sector[];
    callback(sectors);
  });
};

export const subscribeAlerts = (callback: (alerts: JobAlert[]) => void) => {
  if (!db) return () => {};
  
  // In a real app we might want to filter by date to avoid loading old alerts
  const q = query(collection(db, 'alerts'), orderBy('scheduledFor', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(doc => {
      const data = convertDates(doc.data());
      return {
        ...data,
        id: doc.id,
        // Fallback de segurança para arrays
        readBy: data.readBy || [],
      }
    }) as JobAlert[];
    callback(alerts);
  });
};

// --- ACTIONS ---

export const apiAddJob = async (job: Job) => {
  if (!db) return;
  await setDoc(doc(db, 'jobs', job.id), sanitizeData(job));
};

export const apiUpdateJob = async (id: string, updates: Partial<Job>) => {
  if (!db) return;
  await updateDoc(doc(db, 'jobs', id), sanitizeData(updates));
};

export const apiAddUser = async (user: User) => {
  if (!db) return;
  await setDoc(doc(db, 'users', user.id), sanitizeData(user));
};

export const apiUpdateUser = async (id: string, updates: Partial<User>) => {
  if (!db) return;
  await updateDoc(doc(db, 'users', id), sanitizeData(updates));
};

export const apiDeleteUser = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'users', id));
};

export const apiAddJobType = async (type: JobType) => {
  if (!db) return;
  await setDoc(doc(db, 'jobTypes', type.id), sanitizeData(type));
};

export const apiUpdateJobType = async (id: string, updates: Partial<JobType>) => {
  if (!db) return;
  await updateDoc(doc(db, 'jobTypes', id), sanitizeData(updates));
};

export const apiDeleteJobType = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'jobTypes', id));
};

export const apiAddSector = async (sector: Sector) => {
  if (!db) return;
  await setDoc(doc(db, 'sectors', sector.id), sanitizeData(sector));
};

export const apiDeleteSector = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'sectors', id));
};

export const apiAddAlert = async (alert: JobAlert) => {
  if (!db) return;
  await setDoc(doc(db, 'alerts', alert.id), sanitizeData(alert));
};

export const apiMarkAlertAsRead = async (alertId: string, userId: string) => {
  if (!db) return;
  const docRef = doc(db, 'alerts', alertId);
  await updateDoc(docRef, {
    readBy: arrayUnion(userId)
  });
};