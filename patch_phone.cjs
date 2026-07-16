const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

const oldPhoneLogic = `       // Try users first
       let userSnap = await db.collection("users").doc(dId).get();
       if (userSnap.exists) {
         phone = (userSnap.data() as any)?.phone || "";
       } else {
         let manualSnap = await db.collection("organizations").doc(orgId).collection("manualDentists").doc(dId).get();
         if (manualSnap.exists) phone = (manualSnap.data() as any)?.phone || "";
       }`;

const newPhoneLogic = `       // Try users first
       let userSnap = await db.collection("users").doc(dId).get();
       if (userSnap.exists) {
         const data = userSnap.data() as any;
         phone = data?.phone || data?.whatsapp || "";
       } else {
         let manualSnap = await db.collection("organizations").doc(orgId).collection("manualDentists").doc(dId).get();
         if (manualSnap.exists) {
            const data = manualSnap.data() as any;
            phone = data?.phone || data?.whatsapp || "";
         }
       }`;

code = code.replace(oldPhoneLogic, newPhoneLogic);
fs.writeFileSync('functions/src/index.ts', code);
