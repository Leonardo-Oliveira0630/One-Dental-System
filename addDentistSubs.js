import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'context/AppContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const newEffect = `
  // Special subscriptions for Dentists (CLINIC users) to track jobs and requisitions from all their connected labs
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'CLIENT') return;
    if (currentOrg?.orgType !== 'CLINIC') return;

    const unsubs: any[] = [];
    
    // Extract lab IDs from userConnections
    const connectedLabIds = userConnections
        .filter(c => c.status === 'ACTIVE')
        .map(c => c.organizationId);

    // Also include connectedLabId if present directly on user
    if ((currentUser as any).connectedLabId && !connectedLabIds.includes((currentUser as any).connectedLabId)) {
        connectedLabIds.push((currentUser as any).connectedLabId);
    }

    if (connectedLabIds.length === 0) {
        setJobs([]);
        setOnlineRequisitions([]);
        return;
    }
    
    const manualDentistId = activeManualDentistId || (currentUser as any).manualDentistId;

    unsubs.push(api.subscribeDentistConnectedJobs(
        connectedLabIds, 
        currentUser.id, 
        manualDentistId, 
        (labJobs) => {
            setJobs(prev => {
                const myOrgId = currentUser.organizationId;
                const localJobs = prev.filter(j => j.organizationId === myOrgId);
                const merged = [...localJobs, ...labJobs];
                return Array.from(new Map(merged.map(j => [j.id, j])).values());
            });
        }
    ));

    unsubs.push(api.subscribeDentistOnlineRequisitions(
        connectedLabIds,
        currentUser.id,
        (reqs) => {
            setOnlineRequisitions(reqs);
        }
    ));

    return () => unsubs.forEach(u => u());
  }, [currentUser, currentOrg, userConnections, activeManualDentistId]);
`;

const searchStr = "  }, [currentUser, activeDataId, activeManualDentistId]);";
content = content.replace(searchStr, searchStr + "\n" + newEffect);

fs.writeFileSync(filePath, content);
