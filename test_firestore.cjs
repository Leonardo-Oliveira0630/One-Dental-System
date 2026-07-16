const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function run() {
  const orgs = await db.collection('organizations').limit(1).get();
  if (!orgs.empty) {
     const org = orgs.docs[0].data();
     console.log("Org ID:", orgs.docs[0].id);
     console.log("hasWhatsappModule:", org.hasWhatsappModule);
     console.log("Templates:", org.whatsappTemplates);
  }
  
  const global = await db.collection('settings').doc('global').get();
  if (global.exists) {
     console.log("Global templates:", global.data().globalWhatsappTemplates);
  }
}

run().catch(console.error);
