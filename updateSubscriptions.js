const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services/firebaseService.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newSubscriptions = `
export const subscribeDentistOnlineRequisitions = (labIds: string[], dentistId: string, cb: (reqs: OnlineRequisition[]) => void) => {
    if (!labIds || labIds.length === 0 || !dentistId) {
        cb([]);
        return () => {};
    }
    const unsubs: any[] = [];
    const itemsMap = new Map<string, OnlineRequisition[]>();

    labIds.forEach(labId => {
        const q = query(
            collection(db, 'organizations', labId, 'requisitions'),
            where('dentistId', '==', dentistId)
        );
        const unsub = onSnapshot(q, (snap: any) => {
            const list = snap.docs.map((d: any) => ({
                id: d.id, ...d.data() as any,
                createdAt: toDate(d.data().createdAt)
            } as OnlineRequisition));
            itemsMap.set(labId, list);
            const aggregated = Array.from(itemsMap.values()).flat();
            aggregated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            cb(aggregated);
        }, (error: any) => console.warn(\`[Firestore] Erro em subscribeDentistOnlineRequisitions para lab \${labId}: \${error.code}\`));
        unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
};

export const subscribeDentistConnectedJobs = (labIds: string[], dentistId: string, manualDentistId: string | undefined, cb: (jobs: Job[]) => void) => {
    if (!labIds || labIds.length === 0 || !dentistId) {
        cb([]);
        return () => {};
    }
    const unsubs: any[] = [];
    const jobsMap = new Map<string, Job[]>();

    const dentistIds = Array.from(new Set([dentistId, manualDentistId].filter(Boolean))) as string[];

    labIds.forEach(labId => {
        const q1 = query(
            collection(db, \`organizations/\${labId}/jobs\`),
            where('dentistId', 'in', dentistIds),
            limit(100)
        );
        const q2 = query(
            collection(db, \`organizations/\${labId}/jobs\`),
            where('dentistUserId', '==', dentistId),
            limit(100)
        );

        let cache1: Map<string, Job> = new Map();
        let cache2: Map<string, Job> = new Map();

        const processSnap = (snap: any, cache: Map<string, Job>, otherCache: Map<string, Job>) => {
            snap.docChanges().forEach((change: any) => {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                    cache.delete(docId);
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
                        }))
                    } as Job;
                    if (!otherCache.has(docId)) {
                        cache.set(docId, job);
                    }
                }
            });
            const merged = [...Array.from(cache1.values()), ...Array.from(cache2.values())];
            const deduped = Array.from(new Map(merged.map(j => [j.id, j])).values());
            
            jobsMap.set(labId, deduped);
            const aggregated = Array.from(jobsMap.values()).flat();
            cb(aggregated);
        };

        const unsub1 = onSnapshot(q1, (snap) => processSnap(snap, cache1, cache2), (e: any) => console.warn(e));
        const unsub2 = onSnapshot(q2, (snap) => processSnap(snap, cache2, cache1), (e: any) => console.warn(e));
        
        unsubs.push(unsub1, unsub2);
    });

    return () => unsubs.forEach(u => u());
};
`;

const oldSubscribeDentistOnlineRequisitions = `export const subscribeDentistOnlineRequisitions = (labId: string, dentistId: string, cb: (reqs: OnlineRequisition[]) => void) => {
    if (!labId || !dentistId) return () => {};
    const q = query(
        collection(db, 'organizations', labId, 'requisitions'),
        where('dentistId', '==', dentistId)
    );
    return onSnapshot(q, (snap: any) => {
        const list = snap.docs.map((d: any) => ({
            id: d.id, ...d.data() as any,
            createdAt: toDate(d.data().createdAt)
        } as OnlineRequisition));
        // Sort in memory by createdAt descending
        list.sort((a: OnlineRequisition, b: OnlineRequisition) => b.createdAt.getTime() - a.createdAt.getTime());
        cb(list);
    }, (error: any) => console.warn(\`[Firestore] Erro em subscribeDentistOnlineRequisitions para lab \${labId}, dentist \${dentistId}: \${error.code}\`));
};`;

content = content.replace(oldSubscribeDentistOnlineRequisitions, newSubscriptions);
fs.writeFileSync(filePath, content);
