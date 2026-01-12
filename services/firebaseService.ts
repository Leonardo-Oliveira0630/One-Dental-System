
import * as firestorePkg from 'firebase/firestore';
import * as authPkg from 'firebase/auth';
import * as storagePkg from 'firebase/storage';
import * as functionsPkg from 'firebase/functions';

// Fix: Explicitly resolving exports via any-cast to bypass environment-specific resolution failures
const { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, Timestamp, arrayUnion, orderBy, limit 
} = firestorePkg as any;

const { 
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword 
} = authPkg as any;

const { ref, uploadBytes, getDownloadURL } = storagePkg as any;

const { httpsCallable } = functionsPkg as any;

import { db, auth, storage, functions } from './firebaseConfig';
import { 
  User, UserRole, Job, JobType, Sector, JobAlert, ClinicPatient, 
  Appointment, Organization, SubscriptionPlan, OrganizationConnection, 
  Coupon, CommissionRecord, ManualDentist, Expense, BillingBatch, GlobalSettings 
} from '../types';

const toDate = (val: any) => val instanceof Timestamp ? val.toDate() : val;

export const apiLogin = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const apiLogout = () => signOut(auth);

export const getUserProfile = async (uid: string): Promise<User | null> => {
    if (!db) return null;
    const d = await getDoc(doc(db, 'users', uid));
    const userData = d.data();
    return d.exists() && userData ? { id: d.id, ...userData as any } as User : null;
};

export const apiUpdateUser = (id: string, updates: Partial<User>) => updateDoc(doc(db, 'users', id), updates);
export const apiAddUser = (user: User) => setDoc(doc(db, 'users', user.id), user);
export const apiDeleteUser = (id: string) => deleteDoc(doc(db, 'users', id));

export const subscribeGlobalSettings = (cb: (s: GlobalSettings) => void) => {
    return onSnapshot(doc(db, 'settings', 'global'), (snap: any) => {
        if (snap.exists()) {
            cb(snap.data() as GlobalSettings);
        } else {
            const defaults: GlobalSettings = { platformCommission: 5, updatedAt: new Date(), updatedBy: 'system' };
            setDoc(doc(db, 'settings', 'global'), defaults);
            cb(defaults);
        }
    });
};

export const apiUpdateGlobalSettings = (updates: Partial<GlobalSettings>) => updateDoc(doc(db, 'settings', 'global'), updates);

// --- JOBS OTIMIZADO (LIMITE DE LEITURA) ---
export const subscribeJobs = (orgId: string, cb: (jobs: Job[]) => void) => {
    if (!orgId) return () => {};
    const q = query(
        collection(db, 'organizations', orgId, 'jobs'), 
        orderBy('createdAt', 'desc'), 
        limit(200)
    );
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data() as any,
            createdAt: toDate(d.data().createdAt),
            dueDate: toDate(d.data().dueDate),
            history: (d.data().history || []).map((h: any) => ({ ...h, timestamp: toDate(h.timestamp) }))
        } as Job)));
    });
};

export const apiAddJob = (orgId: string, job: Job) => setDoc(doc(db, 'organizations', orgId, 'jobs', job.id), job);
export const apiUpdateJob = (orgId: string, id: string, updates: Partial<Job>) => updateDoc(doc(db, 'organizations', orgId, 'jobs', id), updates);

export const subscribeJobTypes = (orgId: string, cb: (types: JobType[]) => void) => {
    if (!orgId) return () => {};
    const q = collection(db, 'organizations', orgId, 'jobTypes');
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as JobType)));
    });
};

export const apiAddJobType = (orgId: string, type: JobType) => setDoc(doc(db, 'organizations', orgId, 'jobTypes', type.id), type);
export const apiUpdateJobType = (orgId: string, id: string, updates: Partial<JobType>) => updateDoc(doc(db, 'organizations', orgId, 'jobTypes', id), updates);
export const apiDeleteJobType = (orgId: string, id: string) => deleteDoc(doc(db, 'organizations', orgId, 'jobTypes', id));

export const subscribeSectors = (orgId: string, cb: (sectors: Sector[]) => void) => {
    if (!orgId) return () => {};
    const q = collection(db, 'organizations', orgId, 'sectors');
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as Sector)));
    });
};

export const apiAddSector = (orgId: string, sector: { id: string, name: string }) => setDoc(doc(db, 'organizations', orgId, 'sectors', sector.id), sector);
export const apiDeleteSector = (orgId: string, id: string) => deleteDoc(doc(db, 'organizations', orgId, 'sectors', id));

export const subscribeCommissions = (orgId: string, cb: (c: CommissionRecord[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, 'organizations', orgId, 'commissions'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data() as any, 
            createdAt: toDate(d.data().createdAt),
            paidAt: d.data().paidAt ? toDate(d.data().paidAt) : undefined
        } as CommissionRecord)));
    });
};

export const apiAddCommission = (orgId: string, rec: CommissionRecord) => setDoc(doc(db, 'organizations', orgId, 'commissions', rec.id), rec);
export const apiUpdateCommission = (orgId: string, id: string, updates: Partial<CommissionRecord>) => updateDoc(doc(db, 'organizations', orgId, 'commissions', id), updates);

export const subscribeAlerts = (orgId: string, cb: (a: JobAlert[]) => void) => {
    if (!orgId) return () => {};
    const q = collection(db, 'organizations', orgId, 'alerts');
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data() as any, 
            createdAt: toDate(d.data().createdAt),
            scheduledFor: toDate(d.data().scheduledFor)
        } as JobAlert)));
    });
};

export const apiAddAlert = (orgId: string, alert: JobAlert) => setDoc(doc(db, 'organizations', orgId, 'alerts', alert.id), alert);
export const apiMarkAlertAsRead = (orgId: string, id: string, userId: string) => updateDoc(doc(db, 'organizations', orgId, 'alerts', id), {
    readBy: arrayUnion(userId)
});

export const subscribePatients = (orgId: string, cb: (p: ClinicPatient[]) => void) => {
    if (!orgId) return () => {};
    const q = collection(db, 'organizations', orgId, 'patients');
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as ClinicPatient)));
    });
};

export const apiAddPatient = (orgId: string, p: ClinicPatient) => setDoc(doc(db, 'organizations', orgId, 'patients', p.id), p);
export const apiUpdatePatient = (orgId: string, id: string, u: Partial<ClinicPatient>) => updateDoc(doc(db, 'organizations', orgId, 'patients', id), u);
export const apiDeletePatient = (orgId: string, id: string) => deleteDoc(doc(db, 'organizations', orgId, 'patients', id));

export const subscribeAppointments = (orgId: string, cb: (a: Appointment[]) => void) => {
    if (!orgId) return () => {};
    const q = collection(db, 'organizations', orgId, 'appointments');
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, date: toDate(d.data().date) } as Appointment)));
    });
};

export const apiAddAppointment = (orgId: string, a: Appointment) => setDoc(doc(db, 'organizations', orgId, 'appointments', a.id), a);
export const apiUpdateAppointment = (orgId: string, id: string, u: Partial<Appointment>) => updateDoc(doc(db, 'organizations', orgId, 'appointments', id), u);
export const apiDeleteAppointment = (orgId: string, id: string) => deleteDoc(doc(db, 'organizations', orgId, 'appointments', id));

export const subscribeAllOrganizations = (cb: (o: Organization[]) => void) => {
    return onSnapshot(collection(db, 'organizations'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as Organization)));
    });
};

// Funçao para dentistas listarem laboratórios (Público)
export const subscribeAllLaboratories = (cb: (o: Organization[]) => void) => {
    const q = query(collection(db, 'organizations'), where('orgType', '==', 'LAB'));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as Organization)));
    });
};

export const subscribeSubscriptionPlans = (cb: (p: SubscriptionPlan[]) => void) => {
    return onSnapshot(collection(db, 'subscriptionPlans'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as SubscriptionPlan)));
    });
};

export const subscribeCoupons = (cb: (c: Coupon[]) => void) => {
    return onSnapshot(collection(db, 'coupons'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data() as any,
            validUntil: d.data().validUntil ? toDate(d.data().validUntil) : undefined
        } as Coupon)));
    });
};

export const apiUpdateOrganization = (id: string, u: Partial<Organization>) => updateDoc(doc(db, 'organizations', id), u);

export const apiValidateCoupon = async (code: string, planId: string): Promise<Coupon | null> => {
    const q = query(collection(db, 'coupons'), where('code', '==', code.toUpperCase()), where('active', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const c = { id: snap.docs[0].id, ...snap.docs[0].data() as any } as Coupon;
    if (c.validUntil && toDate(c.validUntil) < new Date()) return null;
    if (c.maxUses && c.usedCount >= c.maxUses) return null;
    return c;
};

export const apiCreateSaaSSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => {
    const fn = httpsCallable(functions, 'createSaaSSubscription');
    const res = await fn({ orgId, planId, email, name, cpfCnpj });
    return res.data as any;
};

export const apiCreateLabSubAccount = async (payload: any) => {
    const fn = httpsCallable(functions, 'createLabSubAccount');
    const res = await fn(payload);
    return res.data as any;
};

export const apiGetSaaSInvoices = async (orgId: string) => {
    const fn = httpsCallable(functions, 'getSaaSInvoices');
    const res = await fn({ orgId });
    return res.data as any;
};

export const apiCheckSubscriptionStatus = async (orgId: string) => {
    const fn = httpsCallable(functions, 'checkSubscriptionStatus');
    const res = await fn({ orgId });
    return res.data as any;
};

export const apiRegisterOrganization = async (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string): Promise<User> => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const orgId = `org_${Date.now()}`;
    const org: Organization = {
        id: orgId, name: orgName, planId, subscriptionStatus: trialEndsAt ? 'TRIAL' : 'PENDING', trialEndsAt, createdAt: new Date(), orgType: 'LAB'
    };
    await setDoc(doc(db, 'organizations', orgId), org);
    const profile: User = { id: userCred.user.uid, name: ownerName, email, role: UserRole.ADMIN, organizationId: orgId };
    await setDoc(doc(db, 'users', userCred.user.uid), profile);
    return profile;
};

export const apiRegisterDentist = async (email: string, pass: string, name: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string): Promise<User> => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const orgId = `clinic_${Date.now()}`;
    const org: Organization = {
        id: orgId, name: clinicName, planId, subscriptionStatus: trialEndsAt ? 'TRIAL' : 'PENDING', trialEndsAt, createdAt: new Date(), orgType: 'CLINIC'
    };
    await setDoc(doc(db, 'organizations', orgId), org);
    const profile: User = { id: userCred.user.uid, name, email, role: UserRole.CLIENT, organizationId: orgId, clinicName };
    await setDoc(doc(db, 'users', userCred.user.uid), profile);
    return profile;
};

export const apiAddSubscriptionPlan = (p: SubscriptionPlan) => setDoc(doc(db, 'subscriptionPlans', p.id), p);
export const apiUpdateSubscriptionPlan = (id: string, u: Partial<SubscriptionPlan>) => updateDoc(doc(db, 'subscriptionPlans', id), u);
export const apiDeleteSubscriptionPlan = (id: string) => deleteDoc(doc(db, 'subscriptionPlans', id));

export const apiAddConnectionByCode = async (clinicOrgId: string, dentistId: string, code: string) => {
    const orgSnap = await getDoc(doc(db, 'organizations', code));
    if (!orgSnap.exists()) throw new Error("Laboratório não encontrado.");
    const orgData = orgSnap.data() as any;
    const conn: OrganizationConnection = {
        id: `conn_${Date.now()}`, organizationId: code, organizationName: orgData.name, status: 'ACTIVE', createdAt: new Date()
    };
    await setDoc(doc(db, 'organizations', clinicOrgId, 'connections', conn.id), conn);
};

export const subscribeUserConnections = (orgId: string, cb: (c: OrganizationConnection[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, 'organizations', orgId, 'connections'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as OrganizationConnection)));
    });
};

export const apiAddCoupon = (c: Coupon) => setDoc(doc(db, 'coupons', c.id), c);
export const apiUpdateCoupon = (id: string, u: Partial<Coupon>) => updateDoc(doc(db, 'coupons', id), u);
export const apiDeleteCoupon = (id: string) => deleteDoc(doc(db, 'coupons', id));

export const apiAddManualDentist = (orgId: string, d: ManualDentist) => setDoc(doc(db, 'organizations', orgId, 'manualDentists', d.id), d);
export const apiUpdateManualDentist = (orgId: string, id: string, u: Partial<ManualDentist>) => updateDoc(doc(db, 'organizations', orgId, 'manualDentists', id), u);
export const apiDeleteManualDentist = (orgId: string, id: string) => deleteDoc(doc(db, 'organizations', orgId, 'manualDentists', id));

export const subscribeManualDentists = (orgId: string, cb: (d: ManualDentist[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, 'organizations', orgId, 'manualDentists'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as ManualDentist)));
    });
};

export const uploadJobFile = async (file: File): Promise<string> => {
    const fileRef = ref(storage, `jobs/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
};

export const apiCreateOrderPayment = async (jobData: any, paymentData: any) => {
    const fn = httpsCallable(functions, 'createOrderPayment');
    const res = await fn({ jobData, paymentData });
    return res.data as any;
};

export const apiManageOrderDecision = async (orgId: string, jobId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => {
    const fn = httpsCallable(functions, 'manageOrderDecision');
    const res = await fn({ orgId, jobId, decision, reason });
    return res.data as any;
};

export const apiRegisterUserInOrg = async (email: string, pass: string, name: string, role: UserRole, organizationId: string) => {
    const fn = httpsCallable(functions, 'registerUserInOrg');
    const res = await fn({ email, pass, name, role, organizationId });
    return res.data as any;
};

export const subscribeOrgUsers = (orgId: string, cb: (u: User[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as User)));
    });
};

export const subscribeBillingBatches = (orgId: string, cb: (b: BillingBatch[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, 'organizations', orgId, 'billingBatches'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt), dueDate: toDate(d.data().dueDate)
        } as BillingBatch)));
    });
};

export const apiGenerateBatchBoleto = async (orgId: string, dentistId: string, jobIds: string[], dueDate: Date) => {
    const fn = httpsCallable(functions, 'generateBatchBoleto');
    const res = await fn({ orgId, dentistId, jobIds, dueDate });
    return res.data as any;
};

export const subscribeExpenses = (orgId: string, cb: (e: Expense[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, 'organizations', orgId, 'expenses'), orderBy('date', 'desc'), limit(100));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any, date: toDate(d.data().date), createdAt: toDate(d.data().createdAt)
        } as Expense)));
    });
};

export const apiAddExpense = (orgId: string, expense: Expense) => setDoc(doc(db, 'organizations', orgId, 'expenses', expense.id), expense);
export const apiDeleteExpense = (orgId: string, id: string) => deleteDoc(doc(db, 'organizations', orgId, 'expenses', id));
