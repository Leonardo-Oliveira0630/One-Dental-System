
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, Timestamp, query, orderBy, arrayUnion, where
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebaseConfig';
import { Job, User, JobType, Sector, UserRole, JobAlert, ClinicPatient, Appointment } from '../types';

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

// --- STORAGE ---

export const uploadJobFile = async (file: File): Promise<string> => {
  // Se o storage não estiver configurado (modo local/mock), retorna URL falsa
  if (!storage) {
    console.warn("Storage não configurado. Retornando URL simulada.");
    return new Promise(resolve => setTimeout(() => resolve(`https://mock-storage.com/${file.name}`), 1000));
  }

  try {
    // Cria uma referência: uploads/timestamp_nomearquivo
    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    
    // Faz o upload
    const snapshot = await uploadBytes(storageRef, file);
    
    // Pega a URL pública
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Erro no upload:", error);
    throw new Error("Falha ao enviar arquivo.");
  }
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
        attachments: data.attachments || [],
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

// --- CLINIC FEATURES ---

export const subscribeClinicPatients = (dentistId: string, callback: (patients: ClinicPatient[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'clinicPatients'), where('dentistId', '==', dentistId), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const patients = snapshot.docs.map(doc => ({ ...convertDates(doc.data()), id: doc.id })) as ClinicPatient[];
    callback(patients);
  });
};

export const apiAddPatient = async (patient: ClinicPatient) => {
  if (!db) return;
  await setDoc(doc(db, 'clinicPatients', patient.id), sanitizeData(patient));
};

export const apiUpdatePatient = async (id: string, updates: Partial<ClinicPatient>) => {
  if (!db) return;
  await updateDoc(doc(db, 'clinicPatients', id), sanitizeData(updates));
};

export const apiDeletePatient = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'clinicPatients', id));
};

export const subscribeAppointments = (dentistId: string, callback: (appts: Appointment[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'appointments'), where('dentistId', '==', dentistId), orderBy('date', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const appts = snapshot.docs.map(doc => ({ ...convertDates(doc.data()), id: doc.id })) as Appointment[];
    callback(appts);
  });
};

export const apiAddAppointment = async (appt: Appointment) => {
  if (!db) return;
  await setDoc(doc(db, 'appointments', appt.id), sanitizeData(appt));
};

export const apiUpdateAppointment = async (id: string, updates: Partial<Appointment>) => {
  if (!db) return;
  await updateDoc(doc(db, 'appointments', id), sanitizeData(updates));
};

export const apiDeleteAppointment = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'appointments', id));
};
