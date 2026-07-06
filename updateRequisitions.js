const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages/dentist/DentistRequisitions.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "const { \n    currentUser, \n    currentOrg, \n    onlineRequisitions, \n    addOnlineRequisition,\n    patients,\n    uploadFile,\n    jobs,\n    activeManualDentistId,\n    activeOrganization,\n    switchActiveOrganization\n  } = useApp();",
  "const { \n    currentUser, \n    currentOrg, \n    onlineRequisitions, \n    addOnlineRequisition,\n    patients,\n    uploadFile,\n    jobs,\n    activeManualDentistId,\n    activeOrganization,\n    switchActiveOrganization,\n    userConnections,\n    allLaboratories\n  } = useApp();"
);

// Replace fetchConnectedLabs
const oldFetchConnectedLabs = `    const fetchConnectedLabs = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const fetchedLabs: LaboratoryOption[] = [];

        // 1. Check direct connection via connectedLabId
        if (userAny?.connectedLabId) {
          const directLabDoc = await getDoc(doc(db, 'organizations', userAny.connectedLabId));
          if (directLabDoc.exists()) {
            fetchedLabs.push({
              id: userAny.connectedLabId,
              name: directLabDoc.data().name || 'Laboratório Conveniado'
            });
          }
        }

        // 2. Check connections in standard subcollection /organizations/{myOrgId}/connections
        if (userAny?.organizationId) {
          const connSnap = await getDocs(collection(db, 'organizations', userAny.organizationId, 'connections'));
          connSnap.forEach((docRef: any) => {
            const data = docRef.data();
            if (data.status === 'ACTIVE' && data.organizationId !== userAny.connectedLabId) {
              fetchedLabs.push({
                id: data.organizationId,
                name: data.organizationName || 'Laboratório'
              });
            }
          });
        }

        setLabs(fetchedLabs);
        if (fetchedLabs.length > 0) {
          setSelectedLabId(fetchedLabs[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching partner laboratories:', err);
        setError('Falha ao carregar laboratórios parceiros relacionados.');
        setLoading(false);
      }
    };

    fetchConnectedLabs();
  }, [currentUser]);`;

const newFetchConnectedLabs = `    const fetchConnectedLabs = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const fetchedLabs: LaboratoryOption[] = [];

        // Helper to check if lab has a valid plan for receiving requisitions
        const isValidLabPlan = (planId: string | undefined) => {
            return planId !== 'free_lab' && planId !== 'free';
        };

        // 1. Check direct connection via connectedLabId
        if (userAny?.connectedLabId) {
          const directLabDoc = await getDoc(doc(db, 'organizations', userAny.connectedLabId));
          if (directLabDoc.exists()) {
            const data = directLabDoc.data();
            if (isValidLabPlan(data.planId)) {
                fetchedLabs.push({
                  id: userAny.connectedLabId,
                  name: data.name || 'Laboratório Conveniado'
                });
            }
          }
        }

        // 2. Use userConnections from AppContext
        for (const conn of userConnections) {
            if (conn.status === 'ACTIVE' && conn.organizationId !== userAny?.connectedLabId) {
               const labData = allLaboratories.find(l => l.id === conn.organizationId);
               if (labData) {
                   if (isValidLabPlan(labData.planId)) {
                       fetchedLabs.push({
                           id: conn.organizationId,
                           name: labData.name || conn.organizationName || 'Laboratório'
                       });
                   }
               } else {
                   const labDoc = await getDoc(doc(db, 'organizations', conn.organizationId));
                   if (labDoc.exists()) {
                       const docData = labDoc.data();
                       if (isValidLabPlan(docData.planId)) {
                           fetchedLabs.push({
                               id: conn.organizationId,
                               name: docData.name || conn.organizationName || 'Laboratório'
                           });
                       }
                   }
               }
            }
        }

        setLabs(fetchedLabs);
        if (fetchedLabs.length > 0 && !selectedLabId) {
          setSelectedLabId(fetchedLabs[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching partner laboratories:', err);
        setError('Falha ao carregar laboratórios parceiros relacionados.');
        setLoading(false);
      }
    };

    fetchConnectedLabs();
  }, [currentUser, userConnections, allLaboratories]);`;

content = content.replace(oldFetchConnectedLabs, newFetchConnectedLabs);
fs.writeFileSync(filePath, content);
