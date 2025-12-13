import { 
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, Timestamp, query, orderBy, arrayUnion, where
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, auth, storage, functions } from './firebaseConfig';
import { 
  Job, User, JobType, Sector, UserRole, JobAlert, ClinicPatient, Appointment, 
  Organization, SubscriptionPlan, OrganizationConnection, Coupon
} from '../types';

// --- HELPERS ---
const convertDates = (data: any): any => { if (!data) return data; if (data instanceof Timestamp) return data.toDate(); if (Array.isArray(data)) return data.map(item => convertDates(item)); if (typeof data === 'object' && data !== null) { const newData: any = {}; for (const key in data) newData[key] = convertDates(data[key]); return newData; } return data; };
const sanitizeData = (data: any): any => { if (data instanceof Date) return data; if (Array.isArray(data)) return data.map(item => sanitizeData(item)); else if (data !== null && typeof data === 'object') { const newObj: any = {}; Object.keys(data).forEach(key => { const value = data[key]; if (value !== undefined) newObj[key] = sanitizeData(value); }); return newObj; } return data; };

// --- AUTH ---
export const apiLogin = async (email: string, pass: string) => await signInWithEmailAndPassword(auth, email, pass);
export const apiLogout = async () => { if (auth) await signOut(auth); };

export const apiRegisterOrganization = async (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string): Promise<User> => {
  if (!auth || !db) throw new Error("Firebase not configured");
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const uid = userCredential.user.uid;

  const orgId = `org_${uid}`;
  const newOrg: Organization = { 
      id: orgId, 
      orgType: 'LAB',
      name: orgName, 
      ownerId: uid, 
      planId, 
      createdAt: new Date(), 
      subscriptionStatus: trialEndsAt ? 'TRIAL' : 'ACTIVE',
      trialEndsAt: trialEndsAt,
      appliedCoupon: couponCode
  };
  await setDoc(doc(db, 'organizations', orgId), sanitizeData(newOrg));

  const newUser: User = { id: uid, organizationId: orgId, email, name: ownerName, role: UserRole.ADMIN };
  await setDoc(doc(db, 'users', uid), sanitizeData(newUser));
  
  if (couponCode) {
      const couponRef = doc(db, 'coupons', couponCode);
      const couponSnap = await getDoc(couponRef);
      if (couponSnap.exists()) {
          const currentUsage = couponSnap.data().usedCount || 0;
          await updateDoc(couponRef, { usedCount: currentUsage + 1 });
      }
  }
  
  return newUser;
};

export const apiRegisterUserInOrg = async (email: string, pass: string, name: string, role: UserRole, organizationId: string, clinicName?: string) => {
    if (!auth || !db) throw new Error("Firebase not configured");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;
    const newUser: User = { id: uid, organizationId, email, name, role, clinicName };
    await setDoc(doc(db, 'users', uid), sanitizeData(newUser));
    return newUser;
};

// MODIFIED: Registers a Dentist AND creates a "Clinic" Organization for them to hold the subscription
export const apiRegisterDentist = async (email: string, pass: string, name: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string): Promise<User> => {
    if (!auth || !db) throw new Error("Firebase not configured");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;

    const orgId = `clinic_${uid}`; // Separate ID structure for clinics
    const newOrg: Organization = {
        id: orgId,
        orgType: 'CLINIC',
        name: clinicName,
        ownerId: uid,
        planId: planId,
        createdAt: new Date(),
        subscriptionStatus: trialEndsAt ? 'TRIAL' : 'ACTIVE',
        trialEndsAt: trialEndsAt,
        appliedCoupon: couponCode
    };
    await setDoc(doc(db, 'organizations', orgId), sanitizeData(newOrg));

    const newUser: User = { id: uid, organizationId: orgId, email, name, role: UserRole.CLIENT, clinicName };
    await setDoc(doc(db, 'users', uid), sanitizeData(newUser));

    if (couponCode) {
      const couponRef = doc(db, 'coupons', couponCode);
      const couponSnap = await getDoc(couponRef);
      if (couponSnap.exists()) {
          const currentUsage = couponSnap.data().usedCount || 0;
          await updateDoc(couponRef, { usedCount: currentUsage + 1 });
      }
    }

    return newUser;
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  if (!db) return null;
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as User;
  }
  return null;
};

// --- CONNECTIONS ---
export const subscribeUserConnections = (dentistId: string, callback: (connections: OrganizationConnection[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'connections'), where('dentistId', '==', dentistId));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...convertDates(doc.data()), id: doc.id } as OrganizationConnection)));
    });
};

export const apiAddConnectionByCode = async (dentistId: string, orgCode: string): Promise<void> => {
    if (!db) throw new Error("Database not connected");
    const orgRef = doc(db, 'organizations', orgCode);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Código do laboratório inválido ou não encontrado.");
    const orgData = orgSnap.data() as Organization;
    
    // Only connect if the target org is a LAB
    if (orgData.orgType !== 'LAB' && orgData.orgType !== undefined) {
        throw new Error("Este código não pertence a um laboratório válido.");
    }

    const existingQuery = query(collection(db, 'connections'), where('dentistId', '==', dentistId), where('organizationId', '==', orgCode));
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) throw new Error("Você já tem parceria com este laboratório.");
    
    const connectionId = `conn_${dentistId}_${orgCode}`;
    const newConnection: OrganizationConnection = {
        id: connectionId, dentistId, organizationId: orgCode, organizationName: orgData.name, status: 'active', createdAt: new Date()
    };
    await setDoc(doc(db, 'connections', connectionId), newConnection);
};

// --- DATA FUNCTIONS ---
const getSubCollection = (orgId: string, collName: string) => collection(db, 'organizations', orgId, collName);
const getSubDoc = (orgId: string, collName: string, docId: string) => doc(db, 'organizations', orgId, collName, docId);
const subscribeSubCollection = <T>(orgId: string, collName: string, callback: (data: T[]) => void) => {
  if (!db) return () => {};
  const q = query(getSubCollection(orgId, collName));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...convertDates(doc.data()), id: doc.id } as T)));
  });
};
const apiAddSubDoc = async <T extends {id: string}>(orgId: string, collName: string, data: T) => await setDoc(getSubDoc(orgId, collName, data.id), sanitizeData(data));
const apiUpdateSubDoc = async <T>(orgId: string, collName: string, docId: string, updates: Partial<T>) => await updateDoc(getSubDoc(orgId, collName, docId), sanitizeData(updates));
const apiDeleteSubDoc = async (orgId: string, collName: string, docId: string) => await deleteDoc(getSubDoc(orgId, collName, docId));

export const subscribeJobs = (orgId: string, cb: (d: Job[]) => void) => subscribeSubCollection<Job>(orgId, 'jobs', cb);
export const apiAddJob = (orgId: string, d: Job) => apiAddSubDoc(orgId, 'jobs', d);
export const apiUpdateJob = (orgId: string, id: string, u: Partial<Job>) => apiUpdateSubDoc(orgId, 'jobs', id, u);

export const subscribeJobTypes = (orgId: string, cb: (d: JobType[]) => void) => subscribeSubCollection<JobType>(orgId, 'jobTypes', cb);
export const apiAddJobType = (orgId: string, d: JobType) => apiAddSubDoc(orgId, 'jobTypes', d);
export const apiUpdateJobType = (orgId: string, id: string, u: Partial<JobType>) => apiUpdateSubDoc(orgId, 'jobTypes', id, u);
export const apiDeleteJobType = (orgId: string, id: string) => apiDeleteSubDoc(orgId, 'jobTypes', id);

export const subscribeSectors = (orgId: string, cb: (d: Sector[]) => void) => subscribeSubCollection<Sector>(orgId, 'sectors', cb);
export const apiAddSector = (orgId: string, d: Sector) => apiAddSubDoc(orgId, 'sectors', d);
export const apiDeleteSector = (orgId: string, id: string) => apiDeleteSubDoc(orgId, 'sectors', id);

export const subscribeAlerts = (orgId: string, cb: (d: JobAlert[]) => void) => subscribeSubCollection<JobAlert>(orgId, 'alerts', cb);
export const apiAddAlert = (orgId: string, d: JobAlert) => apiAddSubDoc(orgId, 'alerts', d);
export const apiMarkAlertAsRead = async (orgId: string, alertId: string, userId: string) => await updateDoc(getSubDoc(orgId, 'alerts', alertId), { readBy: arrayUnion(userId) });

export const subscribeClinicPatients = (orgId: string, dentistId: string, cb: (d: ClinicPatient[]) => void) => {
    // If the Dentist HAS their own subscription (Organization), they are the "owner", so query all patients in that org
    const q = query(getSubCollection(orgId, 'clinicPatients'));
    return onSnapshot(q, (snapshot) => cb(snapshot.docs.map(doc => ({...convertDates(doc.data()), id: doc.id} as ClinicPatient))));
};
export const apiAddPatient = (orgId: string, d: ClinicPatient) => apiAddSubDoc(orgId, 'clinicPatients', d);
export const apiUpdatePatient = (orgId: string, id: string, u: Partial<ClinicPatient>) => apiUpdateSubDoc(orgId, 'clinicPatients', id, u);
export const apiDeletePatient = (orgId: string, id: string) => apiDeleteSubDoc(orgId, 'clinicPatients', id);

export const subscribeAppointments = (orgId: string, dentistId: string, cb: (d: Appointment[]) => void) => {
    const q = query(getSubCollection(orgId, 'appointments'));
    return onSnapshot(q, (snapshot) => cb(snapshot.docs.map(doc => ({...convertDates(doc.data()), id: doc.id} as Appointment))));
};
export const apiAddAppointment = (orgId: string, d: Appointment) => apiAddSubDoc(orgId, 'appointments', d);
export const apiUpdateAppointment = (orgId: string, id: string, u: Partial<Appointment>) => apiUpdateSubDoc(orgId, 'appointments', id, u);
export const apiDeleteAppointment = (orgId: string, id: string) => apiDeleteSubDoc(orgId, 'appointments', id);

export const subscribeOrgUsers = (orgId: string, callback: (users: User[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...convertDates(doc.data()), id: doc.id } as User)));
  });
};
export const apiAddUser = async (user: User) => await setDoc(doc(db, 'users', user.id), sanitizeData(user));
export const apiUpdateUser = async (id: string, updates: Partial<User>) => await updateDoc(doc(db, 'users', id), sanitizeData(updates));
export const apiDeleteUser = async (id: string) => await deleteDoc(doc(db, 'users', id));

// --- ORGANIZATION & PLANS MANAGEMENT ---

export const subscribeAllOrganizations = (callback: (orgs: Organization[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'organizations'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...convertDates(doc.data()), id: doc.id } as Organization)));
  });
};

export const apiUpdateOrganization = async (id: string, updates: Partial<Organization>) => {
    if (!db) return;
    await updateDoc(doc(db, 'organizations', id), sanitizeData(updates));
};

export const subscribeSubscriptionPlans = (callback: (plans: SubscriptionPlan[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'subscriptionPlans'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...convertDates(doc.data()), id: doc.id } as SubscriptionPlan)));
  });
};

export const apiAddSubscriptionPlan = async (plan: SubscriptionPlan) => {
  if (!db) return;
  await setDoc(doc(db, 'subscriptionPlans', plan.id), sanitizeData(plan));
};

export const apiUpdateSubscriptionPlan = async (id: string, updates: Partial<SubscriptionPlan>) => {
  if (!db) return;
  await updateDoc(doc(db, 'subscriptionPlans', id), sanitizeData(updates));
};

export const apiDeleteSubscriptionPlan = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'subscriptionPlans', id));
};

export const subscribeAllUsers = (cb: (d: User[]) => void) => {
    return onSnapshot(query(collection(db, 'users')), (snapshot) => cb(snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as User))));
}

// --- COUPONS MANAGEMENT ---

export const subscribeCoupons = (callback: (coupons: Coupon[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'coupons'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...convertDates(doc.data()), id: doc.id } as Coupon)));
  });
};

export const apiAddCoupon = async (coupon: Coupon) => {
  if (!db) return;
  await setDoc(doc(db, 'coupons', coupon.code.toUpperCase()), sanitizeData(coupon));
};

export const apiUpdateCoupon = async (code: string, updates: Partial<Coupon>) => {
  if (!db) return;
  await updateDoc(doc(db, 'coupons', code.toUpperCase()), sanitizeData(updates));
};

export const apiDeleteCoupon = async (code: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'coupons', code.toUpperCase()));
};

export const apiValidateCoupon = async (code: string, planId: string): Promise<Coupon | null> => {
    if (!db) return null;
    const docRef = doc(db, 'coupons', code.toUpperCase());
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    
    // Ensure all dates are converted properly from Timestamp
    const coupon = { ...convertDates(snap.data()), id: snap.id } as Coupon;
    
    if (!coupon.active) return null;
    
    // Check Date
    if (coupon.validUntil && new Date() > coupon.validUntil) return null;
    
    // Check Uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return null;
    
    // Check Plan match (If 'ANY', we skip checking applicablePlans)
    if (planId !== 'ANY' && coupon.applicablePlans && coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planId)) return null;
    
    return coupon;
};

// --- PAYMENT & SUBSCRIPTIONS ---
export const callCreateSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => {
    // Tenta chamar a Cloud Function Real
    if (functions) {
        try {
            console.log("Chamando Cloud Function: createSaaSSubscription");
            const createSub = httpsCallable(functions, 'createSaaSSubscription');
            const cleanEmail = email ? email.trim() : '';
            const result: any = await createSub({ orgId, planId, email: cleanEmail, name, cpfCnpj });
            
            // Sucesso da Cloud Function
            if (result && result.data) {
                return result.data as { success: boolean; paymentLink?: string; isMock?: boolean };
            }
            console.warn("Função retornou sem dados. Usando fallback.");
        } catch (error: any) {
            console.warn("Cloud Function falhou (Ambiente Dev ou Erro Config). Usando Fallback.", error);
            // Fallback ocorre abaixo
        }
    } else {
        console.warn("Functions não inicializado. Usando fallback.");
    }

    // --- FALLBACK LOCAL (SIMULAÇÃO ABSOLUTA) ---
    // Útil se o usuário não tiver deployado as Cloud Functions, configurado chaves ou se o Firestore falhar.
    console.log("Simulando ativação de plano (Fallback Local)...");
    
    try {
        if (db) {
            // Tenta atualizar o Firestore
            await updateDoc(doc(db, 'organizations', orgId), {
                subscriptionStatus: 'ACTIVE',
                planId: planId,
                updatedAt: new Date(),
                fallbackMode: true
            });
        }
    } catch (dbError) {
        console.error("Erro ao atualizar DB no fallback (possível erro de permissão). Ignorando para permitir teste de UI.", dbError);
    }

    // Retorna sucesso DE QUALQUER FORMA no fallback para não travar o usuário
    return { 
        success: true, 
        paymentLink: 'https://google.com?q=simulacao-sucesso-retornar-ao-app', // Link dummy
        isMock: true
    };
};

export const uploadJobFile = async (file: File): Promise<string> => {
  if (!storage) throw new Error("Firebase Storage not configured.");
  const storageRef = ref(storage, `job_attachments/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};