
import * as firestorePkg from 'firebase/firestore';
import * as authPkg from 'firebase/auth';
import * as storagePkg from 'firebase/storage';
import * as functionsPkg from 'firebase/functions';
import * as messagingPkg from 'firebase/messaging';

const { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, Timestamp, arrayUnion, arrayRemove, orderBy, limit, increment, addDoc
} = firestorePkg as any;

const { 
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail
} = authPkg as any;

const { ref, uploadBytes, getDownloadURL } = storagePkg as any;
const { httpsCallable } = functionsPkg as any;
const { getToken, onMessage } = messagingPkg as any;

import { db, auth, storage, functions, messaging } from './firebaseConfig';
import { 
  User, UserRole, Job, JobType, Sector, JobAlert, ClinicPatient, 
  Appointment, Organization, SubscriptionPlan, OrganizationConnection, 
  Coupon, CommissionRecord, ManualDentist, Expense, BillingBatch, GlobalSettings, LabRating, DeliveryRoute, RouteItem, BoxColor, ChatMessage, ClinicService, ClinicRoom, ClinicDentist, PatientHistoryRecord 
} from '../types';

// Helper ultra-seguro para datas
const toDate = (val: any) => {
    if (!val) return new Date();
    if (val instanceof Timestamp) return val.toDate();
    if (val?.seconds) return new Date(val.seconds * 1000);
    if (val instanceof Date) return val;
    return new Date(val);
};

// --- PRONTUÁRIO / HISTÓRICO DO PACIENTE ---
export const subscribePatientHistory = (orgId: string, patientId: string, cb: (history: PatientHistoryRecord[]) => void) => {
    if (!orgId || !patientId) return () => {};
    const q = query(
        collection(db, `organizations/${orgId}/patients/${patientId}/history`),
        orderBy('date', 'desc')
    );
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
            date: toDate(d.data().date),
            createdAt: toDate(d.data().createdAt)
        } as PatientHistoryRecord)));
    });
};

export const apiAddPatientHistory = (orgId: string, patientId: string, record: PatientHistoryRecord) => {
    return setDoc(doc(db, `organizations/${orgId}/patients/${patientId}/history`, record.id), record);
};

export const apiDeletePatientHistory = (orgId: string, patientId: string, recordId: string) => {
    return deleteDoc(doc(db, `organizations/${orgId}/patients/${patientId}/history`, recordId));
};

// --- AUTH & PROFILE ---
export const apiLogin = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const apiLogout = () => signOut(auth);
export const apiResetPassword = (email: string) => sendPasswordResetEmail(auth, email);

export const getUserProfile = async (uid: string): Promise<User | null> => {
    if (!db) return null;
    try {
        const d = await getDoc(doc(db, 'users', uid));
        if (d.exists()) {
            return { id: d.id, ...d.data() as any } as User;
        }
    } catch (e) {
        console.error("Erro ao buscar perfil:", e);
    }
    return null;
};

export const apiUpdateUser = (id: string, updates: Partial<User>) => updateDoc(doc(db, 'users', id), updates);

// --- CLINIC ROOMS ---
export const subscribeClinicRooms = (orgId: string, cb: (rooms: ClinicRoom[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/clinicRooms`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as ClinicRoom)));
    });
};
export const apiAddClinicRoom = (orgId: string, room: ClinicRoom) => setDoc(doc(db, `organizations/${orgId}/clinicRooms`, room.id), room);
export const apiUpdateClinicRoom = (orgId: string, id: string, updates: Partial<ClinicRoom>) => updateDoc(doc(db, `organizations/${orgId}/clinicRooms`, id), updates);
export const apiDeleteClinicRoom = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/clinicRooms`, id));

// --- CLINIC DENTISTS (CONTRACTED) ---
export const subscribeClinicDentists = (orgId: string, cb: (dentists: ClinicDentist[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/clinicDentists`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as ClinicDentist)));
    });
};
export const apiAddClinicDentist = (orgId: string, dentist: ClinicDentist) => setDoc(doc(db, `organizations/${orgId}/clinicDentists`, dentist.id), dentist);
export const apiUpdateClinicDentist = (orgId: string, id: string, updates: Partial<ClinicDentist>) => updateDoc(doc(db, `organizations/${orgId}/clinicDentists`, id), updates);
export const apiDeleteClinicDentist = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/clinicDentists`, id));

// --- CLINIC SERVICES ---
export const subscribeClinicServices = (orgId: string, cb: (services: ClinicService[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/clinicServices`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as ClinicService)));
    });
};
export const apiAddClinicService = (orgId: string, service: ClinicService) => setDoc(doc(db, `organizations/${orgId}/clinicServices`, service.id), service);
export const apiUpdateClinicService = (orgId: string, id: string, updates: Partial<ClinicService>) => updateDoc(doc(db, `organizations/${orgId}/clinicServices`, id), updates);
export const apiDeleteClinicService = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/clinicServices`, id));

// --- FINANCE & ASAAS ---
export const apiGetAsaasBalance = async (orgId: string) => {
    const fn = httpsCallable(functions, 'getAsaasBalance');
    return (await fn({ orgId })).data;
};

// --- WITHDRAWAL ---
export const apiRequestWithdrawal = async (orgId: string, amount: number) => {
    const fn = httpsCallable(functions, 'requestAsaasTransfer');
    return (await fn({ orgId, amount })).data;
};

// --- CHAT FUNCTIONS ---
export const subscribeChatMessages = (orgId: string, jobId: string, cb: (msgs: ChatMessage[]) => void) => {
    if (!orgId || !jobId) return () => {};
    const q = query(collection(db, `organizations/${orgId}/jobs/${jobId}/messages`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({
            id: d.id, ...d.data(),
            createdAt: toDate(d.data().createdAt),
            updatedAt: d.data().updatedAt ? toDate(d.data().updatedAt) : undefined
        } as ChatMessage)));
    });
};

export const apiSendChatMessage = async (orgId: string, jobId: string, msg: Omit<ChatMessage, 'id'>) => {
    return await addDoc(collection(db, `organizations/${orgId}/jobs/${jobId}/messages`), msg);
};

export const apiUpdateChatMessage = async (orgId: string, jobId: string, msgId: string, updates: Partial<ChatMessage>) => {
    return await updateDoc(doc(db, `organizations/${orgId}/jobs/${jobId}/messages`, msgId), { ...updates, updatedAt: new Date() });
};

export const apiDeleteChatMessage = async (orgId: string, jobId: string, msgId: string) => {
    return await updateDoc(doc(db, `organizations/${orgId}/jobs/${jobId}/messages`, msgId), { deleted: true, text: 'Esta mensagem foi apagada.' });
};

// --- NOTIFICATIONS ---
export const apiRequestNotificationPermission = async (userId: string) => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { 
                vapidKey: 'BFvA_8tS7e7Wf4U2Dk7Kz7X5I-x1v_3T7T7T7T7T7T7T' 
            });
            if (token) {
                await updateDoc(doc(db, 'users', userId), {
                    fcmTokens: arrayUnion(token)
                });
                return token;
            }
        }
        return null;
    } catch (error) {
        console.error("Erro ao obter token de notificação:", error);
        return null;
    }
};

export const apiListenToForegroundMessages = (callback: (payload: any) => void) => {
    if (!messaging) return () => {};
    return onMessage(messaging, (payload: any) => {
        console.log("Mensagem em foreground recebida:", payload);
        callback(payload);
    });
};

export const apiUpdateUserAdmin = async (targetUserId: string, updates: Partial<User>) => {
  const fn = httpsCallable(functions, 'updateUserAdmin');
  return (await fn({ targetUserId, updates })).data;
};
export const apiAddUser = (user: User) => setDoc(doc(db, 'users', user.id), user);
export const apiDeleteUser = (id: string) => deleteDoc(doc(db, 'users', id));
export const subscribeGlobalSettings = (cb: (s: GlobalSettings) => void) => {
    return onSnapshot(doc(db, 'settings', 'global'), (snap: any) => {
        if (snap.exists()) cb(snap.data() as GlobalSettings);
        else {
            const defaults: GlobalSettings = { platformCommission: 5, updatedAt: new Date(), updatedBy: 'system' };
            setDoc(doc(db, 'settings', 'global'), defaults);
            cb(defaults);
        }
    });
};
export const apiUpdateGlobalSettings = (updates: Partial<GlobalSettings>) => updateDoc(doc(db, 'settings', 'global'), updates);

export const subscribeJobs = (orgId: string, cb: (jobs: Job[]) => void) => {
    if (!orgId) {
        console.warn("[ProTrack] Tentativa de assinar trabalhos sem orgId");
        return () => {};
    }
    
    const q = query(collection(db, `organizations/${orgId}/jobs`));
    
    return onSnapshot(q, (snap: any) => {
        try {
            const rawJobs = snap.docs.map((d: any) => {
                const data = d.data();
                return { 
                    id: d.id, 
                    ...data,
                    createdAt: toDate(data.createdAt), 
                    dueDate: toDate(data.dueDate),
                    history: (data.history || []).map((h: any) => ({ ...h, timestamp: toDate(h.timestamp) }))
                } as Job;
            });
            
            const sortedJobs = rawJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            cb(sortedJobs);
        } catch (err) {
            console.error("[ProTrack] Erro ao processar lista de trabalhos:", err);
        }
    }, (error: any) => {
        console.error(`[ProTrack] Erro crítico Firestore (subscribeJobs) para ${orgId}:`, error);
    });
};

export const apiAddJob = (orgId: string, job: Job) => setDoc(doc(db, `organizations/${orgId}/jobs`, job.id), job);
export const apiUpdateJob = (orgId: string, id: string, updates: Partial<Job>) => updateDoc(doc(db, `organizations/${orgId}/jobs`, id), updates);

export const subscribeJobTypes = (orgId: string, cb: (types: JobType[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/jobTypes`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as JobType)));
    });
};
export const apiAddJobType = (orgId: string, type: JobType) => setDoc(doc(db, `organizations/${orgId}/jobTypes`, type.id), type);
export const apiUpdateJobType = (orgId: string, id: string, updates: Partial<JobType>) => updateDoc(doc(db, `organizations/${orgId}/jobTypes`, id), updates);
export const apiDeleteJobType = (id: string, id2: string) => deleteDoc(doc(db, `organizations/${id}/jobTypes`, id2));

export const subscribeSectors = (orgId: string, cb: (sectors: Sector[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/sectors`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as Sector)));
    });
};
export const apiAddSector = (orgId: string, sector: { id: string, name: string }) => setDoc(doc(db, `organizations/${orgId}/sectors`, sector.id), sector);
export const apiUpdateSector = (orgId: string, id: string, name: string) => updateDoc(doc(db, `organizations/${orgId}/sectors`, id), { name });
export const apiDeleteSector = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/sectors`, id));

export const subscribeBoxColors = (orgId: string, cb: (colors: BoxColor[]) => void) => {
  if (!orgId) return () => {};
  return onSnapshot(collection(db, `organizations/${orgId}/boxColors`), (snap: any) => {
    cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as BoxColor)));
  });
};
export const apiAddBoxColor = (orgId: string, color: BoxColor) => setDoc(doc(db, `organizations/${orgId}/boxColors`, color.id), color);
export const apiDeleteBoxColor = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/boxColors`, id));

export const subscribeCommissions = (orgId: string, cb: (c: CommissionRecord[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, `organizations/${orgId}/commissions`));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt),
            paidAt: d.data().paidAt ? toDate(d.data().paidAt) : undefined
        } as CommissionRecord)));
    });
};
export const apiAddCommission = (orgId: string, rec: CommissionRecord) => setDoc(doc(db, `organizations/${orgId}/commissions`, rec.id), rec);
export const apiUpdateCommission = (orgId: string, id: string, updates: Partial<CommissionRecord>) => updateDoc(doc(db, `organizations/${orgId}/commissions`, id), updates);

export const subscribeAlerts = (orgId: string, cb: (a: JobAlert[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/alerts`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt),
            scheduledFor: toDate(d.data().scheduledFor)
        } as JobAlert)));
    });
};
export const apiAddAlert = (orgId: string, alert: JobAlert) => setDoc(doc(db, `organizations/${orgId}/alerts`, alert.id), alert);
export const apiMarkAlertAsRead = (orgId: string, id: string, userId: string) => updateDoc(doc(db, `organizations/${orgId}/alerts`, id), { readBy: arrayUnion(userId) });

export const subscribePatients = (orgId: string, cb: (p: ClinicPatient[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/patients`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as ClinicPatient)));
    });
};
export const apiAddPatient = (orgId: string, p: ClinicPatient) => setDoc(doc(db, `organizations/${orgId}/patients`, p.id), p);
export const apiUpdatePatient = (orgId: string, id: string, u: Partial<ClinicPatient>) => updateDoc(doc(db, `organizations/${orgId}/patients`, id), u);
export const apiDeletePatient = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/patients`, id));

export const subscribeAppointments = (orgId: string, cb: (a: Appointment[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/appointments`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, date: toDate(d.data().date) } as Appointment)));
    });
};
export const apiAddAppointment = (orgId: string, a: Appointment) => setDoc(doc(db, `organizations/${orgId}/appointments`, a.id), a);
export const apiUpdateAppointment = (orgId: string, id: string, u: Partial<Appointment>) => updateDoc(doc(db, `organizations/${orgId}/appointments`, id), u);
export const apiDeleteAppointment = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/appointments`, id));

export const subscribeAllOrganizations = (cb: (o: Organization[]) => void) => {
    return onSnapshot(collection(db, 'organizations'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as Organization)));
    });
};
export const subscribeAllLaboratories = (cb: (o: Organization[]) => void) => {
    // Garantimos que a busca pegue todos os orgType == 'LAB' sem filtros extras de segurança
    const q = query(collection(db, 'organizations'), where('orgType', '==', 'LAB'));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data() as any, 
            createdAt: toDate(d.data().createdAt) 
        } as Organization)));
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
            id: d.id, ...d.data() as any,
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

export const apiAddCoupon = (c: Coupon) => setDoc(doc(db, 'coupons', c.id), c);
export const apiUpdateCoupon = (id: string, u: Partial<Coupon>) => updateDoc(doc(db, 'coupons', id), u);
export const apiDeleteCoupon = (id: string) => deleteDoc(doc(db, 'coupons', id));

export const apiCreateSaaSSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string) => {
    const fn = httpsCallable(functions, 'createSaaSSubscription');
    return (await fn({ orgId, planId, email, name, cpfCnpj })).data;
};
export const apiCreateLabSubAccount = async (payload: any) => {
    const fn = httpsCallable(functions, 'createLabSubAccount');
    return (await fn(payload)).data;
};
export const apiGetSaaSInvoices = async (orgId: string) => {
    const fn = httpsCallable(functions, 'getSaaSInvoices');
    return (await fn({ orgId })).data;
};
export const apiCheckSubscriptionStatus = async (orgId: string) => {
    const fn = httpsCallable(functions, 'checkSubscriptionStatus');
    return (await fn({ orgId })).data;
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
    const conn: OrganizationConnection = { id: `conn_${Date.now()}`, organizationId: code, organizationName: orgData.name, status: 'ACTIVE', createdAt: new Date() };
    await setDoc(doc(db, `organizations/${clinicOrgId}/connections`, conn.id), conn);
};
export const subscribeUserConnections = (orgId: string, cb: (c: OrganizationConnection[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/connections`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as OrganizationConnection)));
    });
};
export const apiAddManualDentist = (orgId: string, d: ManualDentist) => setDoc(doc(db, `organizations/${orgId}/manualDentists`, d.id), d);
export const apiUpdateManualDentist = (orgId: string, id: string, u: Partial<ManualDentist>) => updateDoc(doc(db, `organizations/${orgId}/manualDentists`, id), u);
export const apiDeleteManualDentist = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/manualDentists`, id));
export const subscribeManualDentists = (orgId: string, cb: (d: ManualDentist[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/manualDentists`), (snap: any) => {
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
    return (await fn({ jobData, paymentData })).data;
};
export const apiManageOrderDecision = async (orgId: string, jobId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => {
    const fn = httpsCallable(functions, 'manageOrderDecision');
    return (await fn({ orgId, jobId, decision, reason })).data;
};
export const apiRegisterUserInOrg = async (email: string, pass: string, name: string, role: UserRole, organizationId: string) => {
    const fn = httpsCallable(functions, 'registerUserInOrg');
    return (await fn({ email, pass, name, role, organizationId })).data;
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
    return onSnapshot(collection(db, `organizations/${orgId}/billingBatches`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt), dueDate: toDate(d.data().dueDate) } as BillingBatch)));
    });
};
export const apiGenerateBatchBoleto = async (orgId: string, dentistId: string, jobIds: string[], dueDate: Date) => {
    const fn = httpsCallable(functions, 'generateBatchBoleto');
    return (await fn({ orgId, dentistId, jobIds, dueDate })).data;
};
export const subscribeExpenses = (orgId: string, cb: (e: Expense[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, `organizations/${orgId}/expenses`), limit(100));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, date: toDate(d.data().date), createdAt: toDate(d.data().createdAt) } as Expense)));
    });
};
export const apiAddExpense = (orgId: string, expense: Expense) => setDoc(doc(db, `organizations/${orgId}/expenses`, expense.id), expense);
export const apiDeleteExpense = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/expenses`, id));
export const apiAddLabRating = async (rating: LabRating) => {
    const labRef = doc(db, 'organizations', rating.labId);
    const ratingRef = doc(db, `organizations/${rating.labId}/ratings`, rating.id);
    const jobRef = doc(db, `organizations/${rating.labId}/jobs`, rating.jobId);
    await setDoc(ratingRef, rating);
    await updateDoc(jobRef, { ratingId: rating.id });
    const labSnap = await getDoc(labRef);
    const labData = labSnap.data() as Organization;
    const currentCount = labData.ratingCount || 0;
    const currentAvg = labData.ratingAverage || 0;
    const newCount = currentCount + 1;
    const newAvg = ((currentAvg * currentCount) + rating.score) / newCount;
    await updateDoc(labRef, { ratingAverage: newAvg, ratingCount: newCount });
};
export const subscribeLabRatings = (labId: string, cb: (r: LabRating[]) => void) => {
    if (!labId) return () => {};
    const q = query(collection(db, `organizations/${labId}/ratings`), limit(50));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as LabRating)));
    });
};
export const subscribeRoutes = (orgId: string, cb: (routes: DeliveryRoute[]) => void) => {
  if (!orgId) return () => {};
  const q = query(collection(db, `organizations/${orgId}/routes`), limit(50));
  return onSnapshot(q, (snap: any) => {
    cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, date: toDate(d.data().date), createdAt: toDate(d.data().createdAt) } as DeliveryRoute)));
  });
};
export const apiAddRoute = (orgId: string, route: DeliveryRoute) => setDoc(doc(db, `organizations/${orgId}/routes`, route.id), route);
export const apiUpdateRoute = (orgId: string, id: string, updates: Partial<DeliveryRoute>) => updateDoc(doc(db, `organizations/${orgId}/routes`, id), updates);
export const subscribeRouteItems = (orgId: string, routeId: string, cb: (items: RouteItem[]) => void) => {
  if (!orgId || !routeId) return () => {};
  const q = query(collection(db, `organizations/${orgId}/routes/${routeId}/items`), orderBy('order', 'asc'));
  return onSnapshot(q, (snap: any) => {
    cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as RouteItem)));
  });
};
export const apiAddRouteItem = (orgId: string, routeId: string, item: RouteItem) => setDoc(doc(db, `organizations/${orgId}/routes/${routeId}/items`, item.id), item);
export const apiDeleteRouteItem = (orgId: string, routeId: string, itemId: string) => deleteDoc(doc(db, `organizations/${orgId}/routes/${routeId}/items`, itemId));
