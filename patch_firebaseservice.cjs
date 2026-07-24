const fs = require('fs');
let code = fs.readFileSync('services/firebaseService.ts', 'utf8');

const addition = `export const apiMarkAlertAsRead = (orgId: string, id: string, userId: string) => updateDoc(doc(db, \`organizations/\${orgId}/alerts\`, id), { readBy: arrayUnion(userId) });\nexport const apiUpdateAlert = (orgId: string, id: string, updates: Partial<JobAlert>) => updateDoc(doc(db, \`organizations/\${orgId}/alerts\`, id), updates);`;

code = code.replace(/export const apiMarkAlertAsRead = [^\n]+;/, addition);

fs.writeFileSync('services/firebaseService.ts', code);
console.log("Patched firebaseService.ts");
