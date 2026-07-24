const fs = require('fs');
let code = fs.readFileSync('context/AppContext.tsx', 'utf8');

const newDismissAlert = `
  const dismissAlert = async (id: string) => {
      const orgId = activeDataId;
      if(!orgId || !currentUser) return;
      
      const alertToDismiss = alerts.find(a => a.id === id);
      
      if (alertToDismiss && alertToDismiss.repeatInterval && (alertToDismiss.repeatCount || 0) > (alertToDismiss.repeatedCount || 0)) {
          // Re-schedule
          const nextRepeatedCount = (alertToDismiss.repeatedCount || 0) + 1;
          const nextScheduledFor = new Date();
          nextScheduledFor.setMinutes(nextScheduledFor.getMinutes() + alertToDismiss.repeatInterval);
          
          await api.apiUpdateAlert(orgId, id, {
              readBy: [],
              repeatedCount: nextRepeatedCount,
              scheduledFor: nextScheduledFor
          });
      } else {
          await api.apiMarkAlertAsRead(orgId, id, currentUser.id);
      }
      
      setActiveAlert(null); 
  }
`;

code = code.replace(/const dismissAlert = async \(id: string\) => \{[\s\S]*?setActiveAlert\(null\);\s*\}/, newDismissAlert.trim());

fs.writeFileSync('context/AppContext.tsx', code);
console.log("Patched dismissAlert in AppContext.tsx");
