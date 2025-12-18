
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, Timestamp, query, orderBy, arrayUnion, where, QuerySnapshot, DocumentData
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
  Organization, SubscriptionPlan, OrganizationConnection, Coupon, CommissionRecord
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
          const currentUsage = (couponSnap.data() as any).usedCount || 0;
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

export const apiRegisterDentist = async (email: string, pass: string, name: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string): Promise<User> => {
    if (!auth || !db) throw new Error("Firebase not configured");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;

    const orgId = `clinic_${uid}`;
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

// --- COMMISSIONS ---
export const subscribeCommissions = (orgId: string, cb: (d: CommissionRecord[]) => void) => subscribeSubCollection<CommissionRecord>(orgId, 'commissions', cb);
export const apiAddCommission = (orgId: string, d: CommissionRecord) => apiAddSubDoc(orgId, 'commissions', d);
export const apiUpdateCommission = (orgId: string, id: string, u: Partial<CommissionRecord>) => apiUpdateSubDoc(orgId, 'commissions', id, u);

// --- DATA FUNCTIONS ---
const getSubCollection = (orgId: string, collName: string) => collection(db, 'organizations', orgId, collName);
const getSubDoc = (orgId: string, collName: string, docId: string) => doc(db, 'organizations', orgId, collName, docId);

const subscribeSubCollection = <T>(orgId: string, collName: string, callback: (data: T[]) => void) => {
  if (!db) return () => {};
  const q = query(getSubCollection(orgId, collName));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    callback(snapshot.docs.map(doc => ({ ...(convertDates(doc.data()) as any), id: doc.id } as T)));
  });
};

const apiAddSubDoc = async <T extends {id: string}>(orgId: string, collName: string, data: T) => await setDoc(getSubDoc(orgId, collName, data.id), sanitizeData(data));
const apiUpdateSubDoc = async <T>(orgId: string, collName: string, docId: string, updates: Partial<T>) => await updateDoc(getSubDoc(orgId, collName, docId), sanitizeData(updates));
const apiDeleteSubDoc = async (orgId: string, collName: string, docId: string) => await deleteDoc(getSubDoc(orgId, collName, docId));

// --- JOBS & ASSETS ---
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

export const subscribeOrgUsers = (orgId: string, callback: (users: User[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    callback(snapshot.docs.map(doc => ({ ...(convertDates(doc.data()) as any), id: doc.id } as User)));
  });
};
export const apiAddUser = async (user: User) => await setDoc(doc(db, 'users', user.id), sanitizeData(user));
export const apiUpdateUser = async (id: string, updates: Partial<User>) => await updateDoc(doc(db, 'users', id), sanitizeData(updates));
export const apiDeleteUser = async (id: string) => await deleteDoc(doc(db, 'users', id));

// --- CLOUD FUNCTIONS CALLS ---
export const apiCreateOrderPayment = async (jobData: any, paymentData: any) => {
    const fn = httpsCallable(functions, 'createOrderPayment');
    const result: any = await fn({ jobData, paymentData });
    return result.data;
};

export const apiManageOrderDecision = async (orgId: string, jobId: string, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) => {
    const fn = httpsCallable(functions, 'manageOrderDecision');
    const result: any = await fn({ orgId, jobId, decision, rejectionReason });
    return result.data;
};

export const apiCreateSaaSSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => {
    const fn = httpsCallable(functions, 'createSaaSSubscription');
    const result: any = await fn({ orgId, planId, email, name, cpfCnpj });
    return result.data;
};

export const apiCheckSubscriptionStatus = async (orgId: string) => {
    const fn = httpsCallable(functions, 'checkSubscriptionStatus');
    const result: any = await fn({ orgId });
    return result.data;
};

export const apiGetSaaSInvoices = async (orgId: string) => {
    const fn = httpsCallable(functions, 'getSaaSInvoices');
    const result: any = await fn({ orgId });
    return result.data;
};

// --- ADDITIONAL SUBSCRIPTIONS ---
export const subscribeAllOrganizations = (cb: (d: Organization[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'organizations'));
    return onSnapshot(q, (snapshot) => {
        cb(snapshot.docs.map(doc => ({ ...(convertDates(doc.data()) as any), id: doc.id } as Organization)));
    });
};

export const subscribePatients = (orgId: string, cb: (d: ClinicPatient[]) => void) => subscribeSubCollection<ClinicPatient>(orgId, 'patients', cb);
export const apiAddPatient = (orgId: string, d: ClinicPatient) => apiAddSubDoc(orgId, 'patients', d);
export const apiUpdatePatient = (orgId: string, id: string, u: Partial<ClinicPatient>) => apiUpdateSubDoc(orgId, 'patients', id, u);
export const apiDeletePatient = (orgId: string, id: string) => apiDeleteSubDoc(orgId, 'patients', id);

export const subscribeAppointments = (orgId: string, cb: (d: Appointment[]) => void) => subscribeSubCollection<Appointment>(orgId, 'appointments', cb);
export const apiAddAppointment = (orgId: string, d: Appointment) => apiAddSubDoc(orgId, 'appointments', d);
export const apiUpdateAppointment = (orgId: string, id: string, u: Partial<Appointment>) => apiUpdateSubDoc(orgId, 'appointments', id, u);
export const apiDeleteAppointment = (orgId: string, id: string) => apiDeleteSubDoc(orgId, 'appointments', id);

export const subscribeCoupons = (cb: (d: Coupon[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'coupons'));
    return onSnapshot(q, (snapshot) => {
        cb(snapshot.docs.map(doc => ({ ...(convertDates(doc.data()) as any), id: doc.id } as Coupon)));
    });
};

export const apiAddCoupon = async (c: Coupon) => await setDoc(doc(db, 'coupons', c.id), sanitizeData(c));
export const apiUpdateCoupon = async (id: string, updates: Partial<Coupon>) => await updateDoc(doc(db, 'coupons', id), sanitizeData(updates));
export const apiDeleteCoupon = async (id: string) => await deleteDoc(doc(db, 'coupons', id));

export const apiValidateCoupon = async (code: string, planId: string): Promise<Coupon | null> => {
    if (!db) return null;
    const docSnap = await getDoc(doc(db, 'coupons', code.toUpperCase()));
    if (docSnap.exists()) {
        const c = convertDates(docSnap.data()) as Coupon;
        if (!c.active) return null;
        if (c.validUntil && c.validUntil < new Date()) return null;
        if (c.maxUses && c.usedCount >= c.maxUses) return null;
        if (c.applicablePlans && planId !== 'ANY' && !c.applicablePlans.includes(planId)) return null;
        return c;
    }
    return null;
};

export const apiAddConnectionByCode = async (orgId: string, dentistId: string, organizationId: string) => {
    const orgSnap = await getDoc(doc(db, 'organizations', organizationId));
    if (!orgSnap.exists()) throw new Error("Laboratório não encontrado.");
    const orgData = orgSnap.data() as Organization;
    
    const connId = `conn_${dentistId}_${organizationId}`;
    const conn: OrganizationConnection = {
        id: connId,
        dentistId,
        organizationId,
        organizationName: orgData.name,
        status: 'active',
        createdAt: new Date()
    };
    await setDoc(doc(db, 'organizations', orgId, 'connections', connId), sanitizeData(conn));
};

export const apiUpdateOrganization = async (id: string, updates: Partial<Organization>) => await updateDoc(doc(db, 'organizations', id), sanitizeData(updates));

export const subscribeSubscriptionPlans = (callback: (plans: SubscriptionPlan[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'subscriptionPlans'));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    callback(snapshot.docs.map(doc => ({ ...(convertDates(doc.data()) as any), id: doc.id } as SubscriptionPlan)));
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

export const uploadJobFile = async (file: File): Promise<string> => {
  if (!storage) throw new Error("Firebase Storage not configured.");
  const storageRef = ref(storage, `job_attachments/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};
