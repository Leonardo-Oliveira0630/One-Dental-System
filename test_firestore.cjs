const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

async function getLogs() {
    const snap = await db.collection('message_logs').orderBy('createdAt', 'desc').limit(5).get();
    snap.docs.forEach(d => console.log(d.id, d.data()));
}
getLogs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
