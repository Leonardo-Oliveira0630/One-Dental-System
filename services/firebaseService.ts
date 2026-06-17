
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
  Coupon, LabCoupon, CommissionRecord, ManualDentist, Expense, BillingBatch, GlobalSettings, LabRating, DeliveryRoute, RouteItem, BoxColor, ChatMessage, ClinicService, ClinicRoom, ClinicDentist, PatientHistoryRecord, PaymentRecord, PriceTable, DentistPayment, CardMachine, BankAccount,
  Tutorial, Courier, ClinicBudget, ClinicPrescription, ClinicClinicalCard, ClinicAnamnesis, ClinicPatientFinance
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
    }, (error: any) => console.warn(`[Firestore] Erro silencioso em subscribePatientHistory: ${error.code}`));
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
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeClinicRooms: ${error.code}`));
};
export const apiAddClinicRoom = (orgId: string, room: ClinicRoom) => setDoc(doc(db, `organizations/${orgId}/clinicRooms`, room.id), room);
export const apiUpdateClinicRoom = (orgId: string, id: string, updates: Partial<ClinicRoom>) => updateDoc(doc(db, `organizations/${orgId}/clinicRooms`, id), updates);
export const apiDeleteClinicRoom = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/clinicRooms`, id));

// --- CLINIC DENTISTS (CONTRACTED) ---
export const subscribeClinicDentists = (orgId: string, cb: (dentists: ClinicDentist[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/clinicDentists`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as ClinicDentist)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeClinicDentists: ${error.code}`));
};
export const apiAddClinicDentist = (orgId: string, dentist: ClinicDentist) => setDoc(doc(db, `organizations/${orgId}/clinicDentists`, dentist.id), dentist);
export const apiUpdateClinicDentist = (orgId: string, id: string, updates: Partial<ClinicDentist>) => updateDoc(doc(db, `organizations/${orgId}/clinicDentists`, id), updates);
export const apiDeleteClinicDentist = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/clinicDentists`, id));

// --- CLINIC SERVICES ---
export const subscribeClinicServices = (orgId: string, cb: (services: ClinicService[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/clinicServices`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as ClinicService)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeClinicServices: ${error.code}`));
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
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeChatMessages: ${error.code}`));
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
export const apiDeleteUserAdmin = async (targetUserId: string) => {
  const fn = httpsCallable(functions, 'deleteUserAdmin');
  return (await fn({ targetUserId })).data;
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
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeGlobalSettings: ${error.code}`));
};
export const apiUpdateGlobalSettings = (updates: Partial<GlobalSettings>) => updateDoc(doc(db, 'settings', 'global'), updates);

export const subscribeJobs = (orgId: string, userId: string | null, isClient: boolean, cb: (jobs: Job[]) => void) => {
    if (!orgId) return () => {};
    
    // Performance: Filter out jobs finished more than 3 months ago by default
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    let q = query(
        collection(db, `organizations/${orgId}/jobs`),
        where('createdAt', '>=', threeMonthsAgo),
        orderBy('createdAt', 'desc'),
        limit(1000)
    );
    
    if (isClient && userId) {
        q = query(
            collection(db, `organizations/${orgId}/jobs`), 
            where('dentistId', '==', userId),
            where('createdAt', '>=', threeMonthsAgo),
            orderBy('createdAt', 'desc'),
            limit(1000)
        );
    }

    // Cache local para evitar mapeamento integral em cada update delta
    let jobsCache: Map<string, Job> = new Map();

    return onSnapshot(q, (snap: any) => {
        try {
            let hasChanges = false;
            
            snap.docChanges().forEach((change: any) => {
                const docId = change.doc.id;
                
                if (change.type === 'removed') {
                    jobsCache.delete(docId);
                    hasChanges = true;
                } else {
                    const data = change.doc.data();
                    const job = { 
                        id: docId, 
                        ...data,
                        createdAt: toDate(data.createdAt), 
                        dueDate: toDate(data.dueDate),
                        sectorEntryTime: data.sectorEntryTime ? toDate(data.sectorEntryTime) : undefined,
                        history: (data.history || []).map((h: any) => ({ ...h, timestamp: toDate(h.timestamp) })),
                        sectorMovements: (data.sectorMovements || []).map((m: any) => ({
                            ...m,
                            entryTime: toDate(m.entryTime),
                            exitTime: m.exitTime ? toDate(m.exitTime) : undefined
                        })),
                        itemExecutions: (data.itemExecutions || []).map((e: any) => ({ ...e, timestamp: toDate(e.timestamp) }))
                    } as Job;
                    jobsCache.set(docId, job);
                    hasChanges = true;
                }
            });

            if (hasChanges || jobsCache.size === 0) {
              const sortedJobs = Array.from(jobsCache.values()).sort((a: Job, b: Job) => b.createdAt.getTime() - a.createdAt.getTime());
              cb(sortedJobs);
            }
        } catch (err) {
            console.error("[ProTrack] Erro ao processar lista de trabalhos:", err);
        }
    }, (error: any) => {
        console.warn(`[Firestore] Erro em subscribeJobs para ${orgId}: ${error.code}`);
    });
};

export const apiAddJob = (orgId: string, job: Job) => setDoc(doc(db, `organizations/${orgId}/jobs`, job.id), job);
export const apiUpdateJob = (orgId: string, id: string, updates: Partial<Job>) => updateDoc(doc(db, `organizations/${orgId}/jobs`, id), updates);

export const subscribeDentistJobs = (orgId: string, dentistId: string, cb: (jobs: Job[]) => void) => {
    if (!orgId || !dentistId) return () => {};
    const q = query(
        collection(db, `organizations/${orgId}/jobs`), 
        where('dentistId', '==', dentistId),
        orderBy('createdAt', 'desc'),
        limit(1000)
    );

    let jobsCache: Map<string, Job> = new Map();

    return onSnapshot(q, (snap: any) => {
        try {
            let hasChanges = false;
            snap.docChanges().forEach((change: any) => {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                    jobsCache.delete(docId);
                    hasChanges = true;
                } else {
                    const data = change.doc.data();
                    const job = { 
                        id: docId, 
                        ...data,
                        createdAt: toDate(data.createdAt), 
                        dueDate: toDate(data.dueDate),
                        sectorEntryTime: data.sectorEntryTime ? toDate(data.sectorEntryTime) : undefined,
                        history: (data.history || []).map((h: any) => ({ ...h, timestamp: toDate(h.timestamp) })),
                        sectorMovements: (data.sectorMovements || []).map((m: any) => ({
                            ...m,
                            entryTime: toDate(m.entryTime),
                            exitTime: m.exitTime ? toDate(m.exitTime) : undefined
                        })),
                        itemExecutions: (data.itemExecutions || []).map((e: any) => ({ ...e, timestamp: toDate(e.timestamp) }))
                    } as Job;
                    jobsCache.set(docId, job);
                    hasChanges = true;
                }
            });

            if (hasChanges || jobsCache.size === 0) {
              const sortedJobs = Array.from(jobsCache.values()).sort((a: Job, b: Job) => b.createdAt.getTime() - a.createdAt.getTime());
              cb(sortedJobs);
            }
        } catch (err) {
            console.error("[ProTrack] Erro ao processar lista de trabalhos do dentista:", err);
        }
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeDentistJobs: ${error.code}`));
};

export const getDentistJobs = async (orgId: string, dentistId: string): Promise<Job[]> => {
    const q = query(
        collection(db, `organizations/${orgId}/jobs`), 
        where('dentistId', '==', dentistId),
        where('status', 'in', ['COMPLETED', 'DELIVERED'])
    );
    const snap = await getDocs(q);
    return snap.docs.map((d: any) => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: toDate(data.createdAt),
            dueDate: toDate(data.dueDate),
            sectorEntryTime: data.sectorEntryTime ? toDate(data.sectorEntryTime) : undefined,
            history: (data.history || []).map((h: any) => ({ ...h, timestamp: toDate(h.timestamp) })),
            sectorMovements: (data.sectorMovements || []).map((m: any) => ({
                ...m,
                entryTime: toDate(m.entryTime),
                exitTime: m.exitTime ? toDate(m.exitTime) : undefined
            })),
            itemExecutions: (data.itemExecutions || []).map((e: any) => ({ ...e, timestamp: toDate(e.timestamp) }))
        } as Job;
    });
};

export const subscribeJobTypes = (orgId: string, cb: (types: JobType[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/jobTypes`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as JobType)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeJobTypes: ${error.code}`));
};
export const apiAddJobType = (orgId: string, type: JobType) => setDoc(doc(db, `organizations/${orgId}/jobTypes`, type.id), type);
export const apiUpdateJobType = (orgId: string, id: string, updates: Partial<JobType>) => updateDoc(doc(db, `organizations/${orgId}/jobTypes`, id), updates);
export const apiDeleteJobType = (id: string, id2: string) => deleteDoc(doc(db, `organizations/${id}/jobTypes`, id2));

// --- INVENTORY ---
export const subscribeInventoryCategories = (orgId: string, cb: (categories: any[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/inventoryCategories`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any })));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeInventoryCategories: ${error.code}`));
};
export const apiAddInventoryCategory = (orgId: string, category: any) => setDoc(doc(db, `organizations/${orgId}/inventoryCategories`, category.id), category);
export const apiUpdateInventoryCategory = (orgId: string, id: string, updates: any) => updateDoc(doc(db, `organizations/${orgId}/inventoryCategories`, id), updates);
export const apiDeleteInventoryCategory = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/inventoryCategories`, id));

export const subscribeInventoryItems = (orgId: string, cb: (items: any[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/inventoryItems`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any })));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeInventoryItems: ${error.code}`));
};
export const apiAddInventoryItem = (orgId: string, item: any) => setDoc(doc(db, `organizations/${orgId}/inventoryItems`, item.id), item);
export const apiUpdateInventoryItem = (orgId: string, id: string, updates: any) => updateDoc(doc(db, `organizations/${orgId}/inventoryItems`, id), updates);
export const apiDeleteInventoryItem = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/inventoryItems`, id));

// --- PRICE TABLES ---
export const subscribePriceTables = (orgId: string, cb: (tables: PriceTable[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/priceTables`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
            createdAt: toDate(d.data().createdAt),
            updatedAt: toDate(d.data().updatedAt)
        } as PriceTable)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePriceTables: ${error.code}`));
};
export const apiAddPriceTable = (orgId: string, table: PriceTable) => setDoc(doc(db, `organizations/${orgId}/priceTables`, table.id), table);
export const apiUpdatePriceTable = (orgId: string, id: string, updates: Partial<PriceTable>) => updateDoc(doc(db, `organizations/${orgId}/priceTables`, id), { ...updates, updatedAt: new Date() });
export const apiDeletePriceTable = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/priceTables`, id));

export const subscribeSectors = (orgId: string, cb: (sectors: Sector[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/sectors`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as Sector)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeSectors: ${error.code}`));
};
export const apiAddSector = (orgId: string, sector: { id: string, name: string }) => setDoc(doc(db, `organizations/${orgId}/sectors`, sector.id), sector);
export const apiUpdateSector = (orgId: string, id: string, name: string) => updateDoc(doc(db, `organizations/${orgId}/sectors`, id), { name });
export const apiDeleteSector = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/sectors`, id));

export const subscribeBoxColors = (orgId: string, cb: (colors: BoxColor[]) => void) => {
  if (!orgId) return () => {};
  return onSnapshot(collection(db, `organizations/${orgId}/boxColors`), (snap: any) => {
    cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as BoxColor)));
  }, (error: any) => console.warn(`[Firestore] Erro em subscribeBoxColors: ${error.code}`));
};
export const apiAddBoxColor = (orgId: string, color: BoxColor) => setDoc(doc(db, `organizations/${orgId}/boxColors`, color.id), color);
export const apiDeleteBoxColor = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/boxColors`, id));

export const subscribeCommissions = (orgId: string, cb: (c: CommissionRecord[]) => void) => {
    if (!orgId) return () => {};
    // Performance: Only fetch commissions from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const q = query(
        collection(db, `organizations/${orgId}/commissions`),
        where('createdAt', '>=', ninetyDaysAgo),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt),
            paidAt: d.data().paidAt ? toDate(d.data().paidAt) : undefined
        } as CommissionRecord)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeCommissions: ${error.code}`));
};
export const apiAddCommission = (orgId: string, rec: CommissionRecord) => setDoc(doc(db, `organizations/${orgId}/commissions`, rec.id), rec);
export const apiUpdateCommission = (orgId: string, id: string, updates: Partial<CommissionRecord>) => updateDoc(doc(db, `organizations/${orgId}/commissions`, id), updates);
export const apiDeleteCommission = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/commissions`, id));

export const subscribeAlerts = (orgId: string, cb: (a: JobAlert[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/alerts`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt),
            scheduledFor: toDate(d.data().scheduledFor)
        } as JobAlert)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeAlerts: ${error.code}`));
};
export const apiAddAlert = (orgId: string, alert: JobAlert) => setDoc(doc(db, `organizations/${orgId}/alerts`, alert.id), alert);
export const apiMarkAlertAsRead = (orgId: string, id: string, userId: string) => updateDoc(doc(db, `organizations/${orgId}/alerts`, id), { readBy: arrayUnion(userId) });

export const subscribePatients = (orgId: string, cb: (p: ClinicPatient[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/patients`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as ClinicPatient)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePatients: ${error.code}`));
};
export const apiAddPatient = (orgId: string, p: ClinicPatient) => setDoc(doc(db, `organizations/${orgId}/patients`, p.id), p);
export const apiUpdatePatient = (orgId: string, id: string, u: Partial<ClinicPatient>) => updateDoc(doc(db, `organizations/${orgId}/patients`, id), u);
export const apiDeletePatient = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/patients`, id));

// Budgets Subcollection
export const subscribePatientBudgets = (orgId: string, patientId: string, cb: (b: ClinicBudget[]) => void) => {
    if (!orgId || !patientId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/patients/${patientId}/budgets`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data(), 
            date: toDate(d.data().date), 
            createdAt: toDate(d.data().createdAt) 
        } as ClinicBudget)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePatientBudgets: ${error.code}`));
};
export const apiAddPatientBudget = (orgId: string, patientId: string, b: ClinicBudget) => setDoc(doc(db, `organizations/${orgId}/patients/${patientId}/budgets`, b.id), b);
export const apiDeletePatientBudget = (orgId: string, patientId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/patients/${patientId}/budgets`, id));

// Prescriptions Subcollection
export const subscribePatientPrescriptions = (orgId: string, patientId: string, cb: (p: ClinicPrescription[]) => void) => {
    if (!orgId || !patientId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/patients/${patientId}/prescriptions`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data(), 
            date: toDate(d.data().date), 
            createdAt: toDate(d.data().createdAt) 
        } as ClinicPrescription)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePatientPrescriptions: ${error.code}`));
};
export const apiAddPatientPrescription = (orgId: string, patientId: string, p: ClinicPrescription) => setDoc(doc(db, `organizations/${orgId}/patients/${patientId}/prescriptions`, p.id), p);
export const apiDeletePatientPrescription = (orgId: string, patientId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/patients/${patientId}/prescriptions`, id));

// Clinical Cards Subcollection
export const subscribePatientClinicalCards = (orgId: string, patientId: string, cb: (cc: ClinicClinicalCard[]) => void) => {
    if (!orgId || !patientId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/patients/${patientId}/clinical_cards`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data(), 
            date: toDate(d.data().date), 
            createdAt: toDate(d.data().createdAt) 
        } as ClinicClinicalCard)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePatientClinicalCards: ${error.code}`));
};
export const apiAddPatientClinicalCard = (orgId: string, patientId: string, cc: ClinicClinicalCard) => setDoc(doc(db, `organizations/${orgId}/patients/${patientId}/clinical_cards`, cc.id), cc);
export const apiDeletePatientClinicalCard = (orgId: string, patientId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/patients/${patientId}/clinical_cards`, id));

// Anamnesis Subcollection
export const subscribePatientAnamnesis = (orgId: string, patientId: string, cb: (an: ClinicAnamnesis[]) => void) => {
    if (!orgId || !patientId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/patients/${patientId}/anamnesis`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data(), 
            updatedAt: toDate(d.data().updatedAt) 
        } as ClinicAnamnesis)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePatientAnamnesis: ${error.code}`));
};
export const apiSavePatientAnamnesis = (orgId: string, patientId: string, an: ClinicAnamnesis) => setDoc(doc(db, `organizations/${orgId}/patients/${patientId}/anamnesis`, an.id), an);

// Patient Finance Subcollection
export const subscribePatientFinance = (orgId: string, patientId: string, cb: (f: ClinicPatientFinance[]) => void) => {
    if (!orgId || !patientId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/patients/${patientId}/finance`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, 
            ...d.data(), 
            date: toDate(d.data().date), 
            createdAt: toDate(d.data().createdAt) 
        } as ClinicPatientFinance)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePatientFinance: ${error.code}`));
};
export const apiAddPatientFinance = (orgId: string, patientId: string, f: ClinicPatientFinance) => setDoc(doc(db, `organizations/${orgId}/patients/${patientId}/finance`, f.id), f);
export const apiDeletePatientFinance = (orgId: string, patientId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/patients/${patientId}/finance`, id));

export const subscribeAppointments = (orgId: string, cb: (a: Appointment[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/appointments`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, date: toDate(d.data().date) } as Appointment)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeAppointments: ${error.code}`));
};
export const apiAddAppointment = (orgId: string, a: Appointment) => setDoc(doc(db, `organizations/${orgId}/appointments`, a.id), a);
export const apiUpdateAppointment = (orgId: string, id: string, u: Partial<Appointment>) => updateDoc(doc(db, `organizations/${orgId}/appointments`, id), u);
export const apiDeleteAppointment = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/appointments`, id));

export const subscribeAllOrganizations = (cb: (o: Organization[]) => void) => {
    return onSnapshot(collection(db, 'organizations'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as Organization)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeAllOrganizations: ${error.code}`));
};
export const subscribeAllLaboratories = (cb: (o: Organization[]) => void) => {
    return onSnapshot(collection(db, 'organizations'), (snap: any) => {
        const orgs = snap.docs
            .map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as Organization))
            .filter((org: any) => {
                const type = (org.orgType || 'LAB').toUpperCase();
                return type === 'LAB';
            });
        cb(orgs);
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeAllLaboratories: ${error.code}`));
};
export const getOrganizationBySlug = async (slug: string): Promise<Organization | null> => {
    // 1. Try finding by storeSlug
    const q = query(collection(db, 'organizations'), where('storeSlug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as Organization;
    }
    // 2. Fallback to direct document mapping by id
    try {
        const docSnap = await getDoc(doc(db, 'organizations', slug));
        if (docSnap.exists() && docSnap.data().orgType !== 'CLINIC') {
            return { id: docSnap.id, ...docSnap.data() as any, createdAt: toDate(docSnap.data().createdAt) } as Organization;
        }
    } catch (e) {
        console.warn("getOrganizationBySlug document lookup fallback failed:", e);
    }
    return null;
};
export const subscribeSubscriptionPlans = (cb: (p: SubscriptionPlan[]) => void) => {
    return onSnapshot(collection(db, 'subscriptionPlans'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as SubscriptionPlan)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeSubscriptionPlans: ${error.code}`));
};
export const subscribeCoupons = (cb: (c: Coupon[]) => void) => {
    return onSnapshot(collection(db, 'coupons'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any,
            validUntil: d.data().validUntil ? toDate(d.data().validUntil) : undefined
        } as Coupon)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeCoupons: ${error.code}`));
};
export const apiUpdateOrganization = (id: string, u: Partial<Organization>) => updateDoc(doc(db, 'organizations', id), u);
export const apiValidateCoupon = async (code: string, planId: string): Promise<Coupon | null> => {
    const q = query(collection(db, 'coupons'), where('code', '==', code.toUpperCase()), where('active', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const c = { id: snap.docs[0].id, ...snap.docs[0].data() as any } as Coupon;
    if (c.validUntil && toDate(c.validUntil) < new Date()) return null;
    if (c.maxUses && c.usedCount >= c.maxUses) return null;
    if (c.applicablePlans && c.applicablePlans.length > 0 && !c.applicablePlans.includes(planId)) return null;
    return c;
};

export const apiAddCoupon = (c: Coupon) => setDoc(doc(db, 'coupons', c.id), c);
export const apiUpdateCoupon = (id: string, u: Partial<Coupon>) => updateDoc(doc(db, 'coupons', id), u);
export const apiDeleteCoupon = (id: string) => deleteDoc(doc(db, 'coupons', id));

export const apiCreateSaaSSubscription = async (orgId: string, planId: string, email: string, name: string, cpfCnpj: string, couponCode?: string) => {
    const fn = httpsCallable(functions, 'createSaaSSubscription');
    return (await fn({ orgId, planId, email, name, cpfCnpj, couponCode })).data;
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
export const apiSetSubscriptionStatus = async (orgId: string, status: string) => {
    const fn = httpsCallable(functions, 'setSubscriptionStatus');
    return (await fn({ orgId, status })).data;
};
export const apiRegisterOrganization = async (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string, address?: Partial<User>): Promise<User> => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const orgId = `org_${Date.now()}`;
    const org: Organization = {
        id: orgId, name: orgName, planId, subscriptionStatus: trialEndsAt ? 'TRIAL' : 'PENDING', trialEndsAt, createdAt: new Date(), orgType: 'LAB',
        ...(address || {})
    };
    await setDoc(doc(db, 'organizations', orgId), org);
    const profile: User = { id: userCred.user.uid, name: ownerName, email, role: UserRole.ADMIN, organizationId: orgId, ...(address || {}) };
    await setDoc(doc(db, 'users', userCred.user.uid), profile);
    return profile;
};
export const apiRegisterOutsourcedLab = async (email: string, pass: string, ownerName: string, orgName: string, planId: string, trialEndsAt?: Date, couponCode?: string, address?: Partial<User>): Promise<User> => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const orgId = `outorg_${Date.now()}`;
    const org: Organization = {
        id: orgId, name: orgName, planId, subscriptionStatus: trialEndsAt ? 'TRIAL' : 'PENDING', trialEndsAt, createdAt: new Date(), orgType: 'LAB_OUTSOURCED',
        ...(address || {})
    };
    await setDoc(doc(db, 'organizations', orgId), org);
    const profile: User = { id: userCred.user.uid, name: ownerName, email, role: UserRole.ADMIN, organizationId: orgId, ...(address || {}) };
    await setDoc(doc(db, 'users', userCred.user.uid), profile);
    return profile;
};
export const apiRegisterDentist = async (email: string, pass: string, name: string, clinicName: string, planId: string, trialEndsAt?: Date, couponCode?: string, address?: Partial<User>): Promise<User> => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const orgId = `clinic_${Date.now()}`;
    const org: Organization = {
        id: orgId, name: clinicName, planId, subscriptionStatus: trialEndsAt ? 'TRIAL' : 'PENDING', trialEndsAt, createdAt: new Date(), orgType: 'CLINIC',
        ...(address || {})
    };
    await setDoc(doc(db, 'organizations', orgId), org);
    const profile: User = { id: userCred.user.uid, name, email, role: UserRole.CLIENT, organizationId: orgId, clinicName, ...(address || {}) };
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
    
    let clinicName = 'Clínica/Dentista';
    const clinicSnap = await getDoc(doc(db, 'organizations', clinicOrgId));
    if (clinicSnap.exists()) {
        clinicName = clinicSnap.data().name || clinicName;
    }
    
    // Create connection ID
    const connId = `conn_${clinicOrgId}_${code}`;

    // Add for Clinic
    const connClinic: OrganizationConnection = { id: connId, organizationId: code, organizationName: orgData.name, status: 'ACTIVE', createdAt: new Date() };
    await setDoc(doc(db, `organizations/${clinicOrgId}/connections`, connId), connClinic);

    // Add for Lab
    const connLab: OrganizationConnection = { id: connId, organizationId: clinicOrgId, organizationName: clinicName, status: 'ACTIVE', createdAt: new Date() };
    await setDoc(doc(db, `organizations/${code}/connections`, connId), connLab);
};
export const subscribeUserConnections = (orgId: string, cb: (c: OrganizationConnection[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/connections`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as OrganizationConnection)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeUserConnections: ${error.code}`));
};
export const apiAddManualDentist = (orgId: string, d: ManualDentist) => setDoc(doc(db, `organizations/${orgId}/manualDentists`, d.id), d);
export const apiUpdateManualDentist = (orgId: string, id: string, u: Partial<ManualDentist>) => updateDoc(doc(db, `organizations/${orgId}/manualDentists`, id), u);
export const apiDeleteManualDentist = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/manualDentists`, id));
export const subscribeManualDentists = (orgId: string, cb: (d: ManualDentist[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/manualDentists`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as ManualDentist)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeManualDentists: ${error.code}`));
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
export const apiRegisterUserInOrg = async (email: string, pass: string, name: string, role: UserRole, organizationId: string, sector?: string) => {
    const fn = httpsCallable(functions, 'registerUserInOrg');
    return (await fn({ email, pass, name, role, organizationId, sector })).data;
};
export const apiValidateCro = async (uf: string, numero: string, categoria: string) => {
    const fn = httpsCallable(functions, 'validateCro');
    return (await fn({ uf, numero, categoria })).data as any;
};

// SUBSCRIÇÃO DE USUÁRIOS POR ORGANIZAÇÃO
export const subscribeOrgUsers = (orgId: string, cb: (u: User[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as User)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeOrgUsers para ${orgId}: ${error.code}`));
};

// NOVO: SUBSCRIÇÃO GLOBAL PARA SUPER ADMIN
export const subscribeAllUsers = (cb: (u: User[]) => void) => {
    return onSnapshot(collection(db, 'users'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as User)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeAllUsers: ${error.code}`));
};

export const subscribeAllPayments = (cb: (p: PaymentRecord[]) => void) => {
    return onSnapshot(collection(db, 'payments'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any, 
            createdAt: toDate(d.data().createdAt),
            dueDate: toDate(d.data().dueDate),
            paymentDate: d.data().paymentDate ? toDate(d.data().paymentDate) : undefined
        } as PaymentRecord)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeAllPayments: ${error.code}`));
};

export const apiAddPayment = (p: PaymentRecord) => setDoc(doc(db, 'payments', p.id), p);

export const subscribeBillingBatches = (orgId: string, cb: (b: BillingBatch[]) => void) => {
    if (!orgId) return () => {};
    // Performance: Limit to the 200 most recent batches
    const q = query(
        collection(db, `organizations/${orgId}/billingBatches`),
        orderBy('createdAt', 'desc'),
        limit(200)
    );
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt), dueDate: toDate(d.data().dueDate) } as BillingBatch)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeBillingBatches: ${error.code}`));
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
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeExpenses: ${error.code}`));
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
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeLabRatings: ${error.code}`));
};
export const subscribeRoutes = (orgId: string, cb: (routes: DeliveryRoute[]) => void) => {
  if (!orgId) return () => {};
  const q = query(collection(db, `organizations/${orgId}/routes`), limit(50));
  return onSnapshot(q, (snap: any) => {
    cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, date: toDate(d.data().date), createdAt: toDate(d.data().createdAt) } as DeliveryRoute)));
  }, (error: any) => console.warn(`[Firestore] Erro em subscribeRoutes: ${error.code}`));
};
export const apiAddRoute = (orgId: string, route: DeliveryRoute) => setDoc(doc(db, `organizations/${orgId}/routes`, route.id), route);
export const apiUpdateRoute = (orgId: string, id: string, updates: Partial<DeliveryRoute>) => updateDoc(doc(db, `organizations/${orgId}/routes`, id), updates);
export const subscribeRouteItems = (orgId: string, routeId: string, cb: (items: RouteItem[]) => void) => {
  if (!orgId || !routeId) return () => {};
  const q = query(collection(db, `organizations/${orgId}/routes/${routeId}/items`), orderBy('order', 'asc'));
  return onSnapshot(q, (snap: any) => {
    cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as RouteItem)));
  }, (error: any) => console.warn(`[Firestore] Erro em subscribeRouteItems: ${error.code}`));
};
export const apiAddRouteItem = (orgId: string, routeId: string, item: RouteItem) => setDoc(doc(db, `organizations/${orgId}/routes/${routeId}/items`, item.id), item);
export const apiDeleteRouteItem = (orgId: string, routeId: string, itemId: string) => deleteDoc(doc(db, `organizations/${orgId}/routes/${routeId}/items`, itemId));
export const apiUpdateRouteItem = (orgId: string, routeId: string, itemId: string, updates: Partial<RouteItem>) => updateDoc(doc(db, `organizations/${orgId}/routes/${routeId}/items`, itemId), updates);

export const subscribeCouriers = (orgId: string, cb: (couriers: Courier[]) => void) => {
  if (!orgId) return () => {};
  const q = query(collection(db, `organizations/${orgId}/couriers`), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap: any) => {
    cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any, createdAt: toDate(d.data().createdAt) } as Courier)));
  }, (error: any) => console.warn(`[Firestore] Erro em subscribeCouriers: ${error.code}`));
};

export const apiAddCourier = (orgId: string, courier: Courier) => {
  return setDoc(doc(db, `organizations/${orgId}/couriers`, courier.id), {
    ...courier,
    createdAt: courier.createdAt instanceof Date ? courier.createdAt : new Date(courier.createdAt)
  });
};

export const apiUpdateCourier = (orgId: string, id: string, updates: Partial<Courier>) => {
  return updateDoc(doc(db, `organizations/${orgId}/couriers`, id), updates);
};

export const apiDeleteCourier = (orgId: string, id: string) => {
  return deleteDoc(doc(db, `organizations/${orgId}/couriers`, id));
};

export const subscribeDentistPayments = (orgId: string, cb: (p: DentistPayment[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, `organizations/${orgId}/dentistPayments`), orderBy('paymentDate', 'desc'));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({ 
            id: d.id, ...d.data() as any, 
            paymentDate: toDate(d.data().paymentDate),
            createdAt: toDate(d.data().createdAt)
        } as DentistPayment)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeDentistPayments: ${error.code}`));
};

export const apiAddDentistPayment = (orgId: string, payment: DentistPayment) => setDoc(doc(db, `organizations/${orgId}/dentistPayments`, payment.id), payment);
export const apiUpdateDentistPayment = (orgId: string, id: string, updates: Partial<DentistPayment>) => updateDoc(doc(db, `organizations/${orgId}/dentistPayments`, id), updates);

// --- PATIENT FINANCES ---
export const subscribePatientPayments = (orgId: string, cb: (p: import('../types').PatientPayment[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, `organizations/${orgId}/patientPayments`), orderBy('paymentDate', 'desc'));
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({
            id: d.id, ...d.data() as any,
            paymentDate: toDate(d.data().paymentDate),
            createdAt: toDate(d.data().createdAt)
        } as import('../types').PatientPayment)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePatientPayments: ${error.code}`));
};

export const apiAddPatientPayment = (orgId: string, payment: import('../types').PatientPayment) => setDoc(doc(db, `organizations/${orgId}/patientPayments`, payment.id), payment);
export const apiUpdatePatientPayment = (orgId: string, id: string, updates: Partial<import('../types').PatientPayment>) => updateDoc(doc(db, `organizations/${orgId}/patientPayments`, id), updates);
export const apiDeletePatientPayment = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/patientPayments`, id));

export const subscribePatientBillingBatches = (orgId: string, cb: (b: import('../types').PatientBillingBatch[]) => void) => {
    if (!orgId) return () => {};
    const q = query(
        collection(db, `organizations/${orgId}/patientBillingBatches`),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap: any) => {
        cb(snap.docs.map((d: any) => ({
            id: d.id, ...d.data() as any,
            createdAt: toDate(d.data().createdAt),
            billingDate: toDate(d.data().billingDate),
            dueDate: toDate(d.data().dueDate)
        } as import('../types').PatientBillingBatch)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribePatientBillingBatches: ${error.code}`));
};

export const apiAddPatientBillingBatch = (orgId: string, batch: import('../types').PatientBillingBatch) => setDoc(doc(db, `organizations/${orgId}/patientBillingBatches`, batch.id), batch);
export const apiUpdatePatientBillingBatchStatus = (orgId: string, batchId: string, status: import('../types').PatientBillingBatch['status']) => 
    updateDoc(doc(db, `organizations/${orgId}/patientBillingBatches`, batchId), { status });
export const apiDeletePatientBillingBatch = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/patientBillingBatches`, id));


// --- CARD MACHINES ---
export const subscribeCardMachines = (orgId: string, cb: (machines: CardMachine[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/cardMachines`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
            createdAt: toDate(d.data().createdAt)
        } as CardMachine)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeCardMachines: ${error.code}`));
};
export const apiAddCardMachine = (orgId: string, machine: CardMachine) => setDoc(doc(db, `organizations/${orgId}/cardMachines`, machine.id), machine);
export const apiUpdateCardMachine = (orgId: string, id: string, u: Partial<CardMachine>) => updateDoc(doc(db, `organizations/${orgId}/cardMachines`, id), u);
export const apiDeleteCardMachine = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/cardMachines`, id));

// --- BANK ACCOUNTS ---
export const subscribeBankAccounts = (orgId: string, cb: (accounts: BankAccount[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/bankAccounts`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
            createdAt: toDate(d.data().createdAt)
        } as BankAccount)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeBankAccounts: ${error.code}`));
};
export const apiAddBankAccount = (orgId: string, account: BankAccount) => setDoc(doc(db, `organizations/${orgId}/bankAccounts`, account.id), account);
export const apiUpdateBankAccount = (orgId: string, id: string, u: Partial<BankAccount>) => updateDoc(doc(db, `organizations/${orgId}/bankAccounts`, id), u);
export const apiDeleteBankAccount = (orgId: string, id: string) => deleteDoc(doc(db, `organizations/${orgId}/bankAccounts`, id));

export const apiUpdateBillingBatchStatus = (orgId: string, batchId: string, status: BillingBatch['status']) => 
    updateDoc(doc(db, `organizations/${orgId}/billingBatches`, batchId), { status });

export const apiAddBillingBatch = (orgId: string, batch: BillingBatch) => 
    setDoc(doc(db, `organizations/${orgId}/billingBatches`, batch.id), batch);

// --- LAB COUPONS ---
export const subscribeLabCoupons = (orgId: string, cb: (coupons: LabCoupon[]) => void) => {
    if (!orgId) return () => {};
    return onSnapshot(collection(db, `organizations/${orgId}/labCoupons`), (snap: any) => {
        cb(snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
        } as LabCoupon)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeLabCoupons: ${error.code}`));
};

export const apiAddLabCoupon = (orgId: string, coupon: LabCoupon) => setDoc(doc(doc(db, 'organizations', orgId), 'labCoupons', coupon.id), coupon);
export const apiUpdateLabCoupon = (orgId: string, id: string, u: Partial<LabCoupon>) => updateDoc(doc(doc(db, 'organizations', orgId), 'labCoupons', id), u);
export const apiDeleteLabCoupon = (orgId: string, id: string) => deleteDoc(doc(doc(db, 'organizations', orgId), 'labCoupons', id));

export const apiValidateLabCoupon = async (orgId: string, code: string): Promise<LabCoupon | null> => {
    try {
        const q = query(
            collection(db, `organizations/${orgId}/labCoupons`),
            where('code', '==', code.toUpperCase()),
            where('active', '==', true)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        const coupon = { id: d.id, ...d.data() } as LabCoupon;
        
        if (coupon.validUntil) {
            const expDate = new Date(coupon.validUntil);
            if (expDate < new Date()) return null;
        }
        
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return null;
        
        return coupon;
    } catch (e) {
        console.error("Erro ao validar cupom do lab", e);
        return null;
    }
};

export const subscribeTutorials = (cb: (t: Tutorial[]) => void) => {
    return onSnapshot(collection(db, 'tutorials'), (snap: any) => {
        cb(snap.docs.map((d: any) => ({ id: d.id, ...d.data() as any } as Tutorial)));
    }, (error: any) => console.warn(`[Firestore] Erro em subscribeTutorials: ${error.code}`));
};

export const apiAddTutorial = (t: Tutorial) => setDoc(doc(db, 'tutorials', t.id), t);
export const apiUpdateTutorial = (id: string, u: Partial<Tutorial>) => updateDoc(doc(db, 'tutorials', id), u);
export const apiDeleteTutorial = (id: string) => deleteDoc(doc(db, 'tutorials', id));

